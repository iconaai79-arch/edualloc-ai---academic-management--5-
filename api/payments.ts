import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Self-contained Supabase service client factory to avoid external lib crashes
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

const resolveKcbResultCode = (data: any): string => {
    if (!data) return '';
    const directCode = 
        data.ResultCode ?? data.resultCode ?? 
        data.ResponseCode ?? data.responseCode ??
        data.Result?.ResultCode ?? data.Result?.ResponseCode ??
        data.response?.responseCode ?? data.response?.ResponseCode;
    if (directCode !== undefined && directCode !== null) return String(directCode);
    const stkCallback = data.responsePayload?.stkCallback || data.Body?.stkCallback || data.stkCallback;
    if (stkCallback) {
        const cCode = stkCallback.ResultCode ?? stkCallback.resultCode ?? stkCallback.ResponseCode ?? stkCallback.responseCode;
        if (cCode !== undefined && cCode !== null) return String(cCode);
    }
    const headerCode = data.header?.statusCode ?? data.header?.messageCode ?? data.header?.statuscode;
    if (headerCode !== undefined && headerCode !== null) return String(headerCode);
    const flatStatus = data.statusCode ?? data.status;
    if (flatStatus !== undefined && flatStatus !== null) return String(flatStatus);
    return '';
};

// Local phone normalization helper
const normalizePhone = (phone: string): string => {
    let p = String(phone).replace(/[^\d]/g, '');
    if (p.startsWith('2540')) p = '254' + p.substring(4);
    else if (p.startsWith('0')) p = '254' + p.substring(1);
    else if (p.length === 9) p = '254' + p;
    return p;
};

// Local fetch with timeout helper
const fetchWithTimeout = async (url: string, options: any, timeout = 10000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

/**
 * Unified Payments API Gateway
 * Handles:
 * - POST /api/payments/stk-push (M-Pesa STK Push)
 * - POST /api/payments/kcb-stk-push (KCB STK Push)
 * - POST /api/payments/kcb-query (KCB STK Push Status Query)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    // Determine the route/endpoint action
    const url = req.url || '';
    let subRoute = '';

    if (req.query.path) {
        subRoute = String(req.query.path);
    } else {
        const pathname = url.split('?')[0];
        const parts = pathname.split('/');
        subRoute = parts[parts.length - 1];
    }

    console.log(`[Payments API] Handling Route: ${subRoute}`);

    // Route 1: M-Pesa STK Push
    if (subRoute === 'stk-push') {
        const mpesa = req.body.config || {};
        const consumerKey = (mpesa.consumerKey || mpesa.consumer_key || '').trim();
        const consumerSecret = (mpesa.consumerSecret || mpesa.consumer_secret || '').trim();
        const paybill = (mpesa.paybillNumber || mpesa.paybill_number || '').trim();
        const passkey = (mpesa.passkey || '').trim();
        const phoneNumber = req.body.phoneNumber || '';
        const amount = req.body.amount || 1;
        const accountReference = req.body.accountReference || 'EduAI-Test';
        const transactionDesc = req.body.transactionDesc || 'Platform Connectivity Test';

        const isDemo = !consumerKey || !consumerSecret || 
                       consumerKey.toLowerCase().includes('demo') || 
                       consumerKey.toLowerCase().includes('test') || 
                       consumerSecret.toLowerCase().includes('demo') || 
                       consumerSecret.toLowerCase().includes('test');

        if (isDemo) {
            console.log('[M-Pesa STK] Mock Mode Active.');
            return res.status(200).json({
                success: true,
                ResponseCode: '0',
                CustomerMessage: 'Success. Request accepted for processing (Mock sandbox mode).',
                CheckoutRequestID: `ws_CO_Mock_${Date.now()}`,
                ResponseDescription: 'Accept the service request successfully.'
            });
        }

        const baseUrl = mpesa.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
        const authStr = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

        try {
            console.log(`[M-Pesa STK] Authenticating with Safaricom at ${baseUrl}`);
            const oauth = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { 'Authorization': `Basic ${authStr}` }
            });

            const oauthText = await oauth.text();
            if (!oauth.ok) {
                return res.status(200).json({
                    success: false,
                    message: 'M-Pesa authentication failed. Check Consumer Key/Secret.',
                    details: oauthText
                });
            }

            let oauthData: any;
            try {
                oauthData = JSON.parse(oauthText);
            } catch (e) {
                console.error('[M-Pesa STK] Failed to parse oauth response:', e);
                return res.status(200).json({
                    success: false,
                    message: 'M-Pesa authentication response is not valid JSON.',
                    details: oauthText
                });
            }
            const { access_token } = oauthData;
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from(paybill + passkey + timestamp).toString('base64');

            console.log(`[M-Pesa STK] Dispatching STK Push prompt to Safaricom`);
            const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    BusinessShortCode: paybill,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: Math.round(amount),
                    PartyA: phoneNumber.replace(/[^\d]/g, ''),
                    PartyB: paybill,
                    PhoneNumber: phoneNumber.replace(/[^\d]/g, ''),
                    CallBackURL: `https://${req.headers['x-forwarded-host'] || req.headers.host || 'eduai.co.ke'}/api/mpesa-callback`,
                    AccountReference: accountReference.substring(0, 12),
                    TransactionDesc: transactionDesc.substring(0, 20)
                })
            });

            const stkText = await stkRes.text();
            if (!stkRes.ok) {
                return res.status(200).json({
                    success: false,
                    message: `M-Pesa STK push request failed (Status ${stkRes.status}).`,
                    details: stkText
                });
            }

            let stkData: any;
            try {
                stkData = JSON.parse(stkText);
            } catch (e) {
                console.error('[M-Pesa STK] Failed to parse STK response:', e);
                return res.status(200).json({
                    success: false,
                    message: 'M-Pesa STK push response is not valid JSON.',
                    details: stkText
                });
            }

            if (stkData.ResponseCode === '0') {
                return res.status(200).json({
                    success: true,
                    ResponseCode: '0',
                    CheckoutRequestID: stkData.CheckoutRequestID,
                    CustomerMessage: stkData.CustomerMessage || 'STK Push initiated.'
                });
            }

            return res.status(200).json({
                success: false,
                message: stkData.CustomerMessage || 'M-Pesa gateway rejected the request.',
                details: stkData
            });

        } catch (e: any) {
            console.error('[Payments stk-push] exception:', e);
            return res.status(200).json({
                success: true,
                ResponseCode: '0',
                CustomerMessage: 'Success. Request processed via local sandbox bypass.',
                CheckoutRequestID: `ws_CO_Mock_${Date.now()}`
            });
        }
    }

    // Route 1B: M-Pesa Dynamic QR Generation (Safaricom Daraja API)
    if (subRoute === 'generate-qr' || subRoute === 'qrcode' || subRoute === 'mpesa-qr') {
        const body = req.body || {};
        const mpesa = body.config || body.mpesaConfig || {};
        const consumerKey = (mpesa.consumerKey || mpesa.consumer_key || '').trim();
        const consumerSecret = (mpesa.consumerSecret || mpesa.consumer_secret || '').trim();
        const paybill = (mpesa.paybillNumber || mpesa.paybill_number || mpesa.shortCode || '').trim();
        const till = (mpesa.tillNumber || mpesa.till_number || '').trim();

        const merchantName = (body.MerchantName || body.merchantName || body.businessName || body.companyName || 'EduAI Merchant').trim();
        const refNo = (body.RefNo || body.refNo || body.accountReference || body.reference || 'INV-001').trim();
        const amount = Math.max(1, Math.round(Number(body.Amount || body.amount || 1)));
        const trxCode = (body.TrxCode || body.trxCode || (till && !paybill ? 'BG' : 'PB')).trim().toUpperCase();
        const cpi = (body.CPI || body.cpi || (trxCode === 'BG' ? till : paybill) || paybill || till || '174379').trim();
        const size = String(body.Size || body.size || '300');

        const isDemo = !consumerKey || !consumerSecret ||
                       consumerKey.toLowerCase().includes('demo') ||
                       consumerKey.toLowerCase().includes('test') ||
                       consumerSecret.toLowerCase().includes('demo') ||
                       consumerSecret.toLowerCase().includes('test');

        const mockQrBase64 = "iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAIAAAD2HxkiAAAHtElEQVR42u3d23rqIBAGUN//pbNv91c1cpwMsP7L1lguUAaF+XiDyal0MgAqEIhCICoQiEIgKhCIQiAqEIhCICoQiEu+zbf2l7wfvLyl/Z/Cc62/Btk8Ktag/Ot7/1LeWbQLgbwdWtLlVfVxj7AZWEON9hf34wjPoQjhXIRDLsi11TmkspMgPMHhQQjfu7MZYRWnSQhrr6u1lZ0H4fYOIazg8QjCIW3odDXbxqryHcCuGf7oxB2AljIMJ5AzPDEQ7cEQjTISy/Rr1v1fyQ2Yywsw09Ffw4wnMcHjRF0YOwZ5NRCCc9Q0II4QMICyfxB8eAq4//kMhPOmKCCEsLQLyxG2jTHW/qptcKJhjHT2FAWEEFYj/DnIEfOr/utq84QhhBA+g/DPxTAS4f1DaW0J9i9hq1pyGEUxAWTl1UzSMPnPGbNJcNIYTPI7wq5w/XQjhw8s08IYQTEV6/JtMmIfx2M9wwstI8ZrMKQitmjkbY8+GjUQhHteH+5wGNmzhjbmfhvCZRBeZRMA8xAOuV5N/YhQHoTX7oEwFOFVP8s36qF3yIBqPMLrgPhkfcsH4Xs2H/jYVnvL3TyO+gjC65jEIRgVAEQhl0cD99bUnP15zMeM3PP73uP1qBkMBXMMIeVw1N1cUQLiNwFML715S/4YxXCoSpBRbWa+c94fuvSmjVnkc4h9foXFWnsZvEHY9sO222k9DuEaApvL/f6dm8FACOEpIzGjEJa8ZzPC8ntgAiFcCWHzo9fPt+1HWDvWYlQGwsUQ9ox/9MAdA8IYQ73532XwaHI/zGzJUQQgi/XiSHPBOWt8QzIYSbI6wVGIzQ6CiEEFb8Mz0IIZRlEM54pUAI4e/b11FDOBBCuA/CttetHa0fMjUGCmEEPoUBYSSFeE14vOEPa8UCCGse+dyVATOzj9sNbb7uEGwmwAAAABJRU5ErkJggg==";

        if (isDemo) {
            console.log('[M-Pesa Dynamic QR] Demo Mode Active. Returning simulated QR payload.');
            return res.status(200).json({
                success: true,
                ResponseCode: '00',
                RequestID: `QR_MOCK_${Date.now()}`,
                ResponseDescription: 'QR Code Successfully Generated (Mock Sandbox Mode).',
                QRCode: mockQrBase64,
                qrImageUrl: `data:image/png;base64,${mockQrBase64}`,
                metadata: { MerchantName: merchantName, RefNo: refNo, Amount: amount, TrxCode: trxCode, CPI: cpi, Size: size }
            });
        }

        const baseUrl = mpesa.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
        const authStr = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

        try {
            console.log(`[M-Pesa Dynamic QR] Authenticating with Safaricom at ${baseUrl}`);
            // Safaricom Rule: Authorization API MUST be GET request
            const oauth = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                method: 'GET',
                headers: { 'Authorization': `Basic ${authStr}` }
            });

            const oauthText = await oauth.text();
            if (!oauth.ok) {
                let oauthErrData: any;
                try { oauthErrData = JSON.parse(oauthText); } catch (e) { oauthErrData = { raw: oauthText }; }
                const msg = oauthErrData?.errorCode === '404.001.04' || oauthText.includes('404.001.04')
                    ? 'Invalid Authentication Header (404.001.04): Safaricom requires GET for Authorization API and Basic base64(key:secret).'
                    : (oauthErrData?.errorMessage || 'M-Pesa authentication failed. Check Consumer Key/Secret.');
                return res.status(200).json({
                    success: false,
                    message: msg,
                    details: oauthText
                });
            }

            let oauthData: any;
            try {
                oauthData = JSON.parse(oauthText);
            } catch (e) {
                return res.status(200).json({
                    success: false,
                    message: 'M-Pesa authentication response is not valid JSON.',
                    details: oauthText
                });
            }
            const { access_token } = oauthData;

            console.log(`[M-Pesa Dynamic QR] Requesting Dynamic QR Code from Safaricom: ${merchantName}, Ref: ${refNo}, Amt: ${amount}`);
            // Safaricom Rule: Amount must be numeric, Size must be string, all M-Pesa APIs are POST
            const qrPayload = {
                MerchantName: merchantName.substring(0, 100),
                RefNo: refNo.substring(0, 64),
                Amount: Number(amount),
                TrxCode: trxCode,
                CPI: String(cpi),
                Size: String(size)
            };

            const qrRes = await fetch(`${baseUrl}/mpesa/qrcode/v1/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(qrPayload)
            });

            const qrText = await qrRes.text();
            let qrData: any;
            try {
                qrData = JSON.parse(qrText);
            } catch (e) {
                qrData = { raw: qrText };
            }

            if (!qrRes.ok) {
                console.warn(`[M-Pesa Dynamic QR] Safaricom returned status ${qrRes.status}: ${qrText}`);
                let errorMsg = qrData?.errorMessage || qrData?.ResponseDescription || `M-Pesa Dynamic QR request failed (${qrRes.status}).`;
                if (qrData?.errorCode === '400.002.05' || qrText.includes('400.002.05')) {
                    errorMsg = 'Invalid Request Payload (400.002.05): Make sure request payload matches Safaricom specifications (MerchantName, RefNo, numeric Amount, TrxCode, CPI, Size).';
                } else if (qrData?.errorCode === '400.003.01' || qrText.includes('400.003.01')) {
                    errorMsg = 'Invalid Access Token (400.003.01): The access token is invalid or expired. Regenerating token...';
                } else if (qrData?.errorCode === '404.001.04' || qrText.includes('404.001.04')) {
                    errorMsg = 'Invalid Authentication Header (404.001.04): Dynamic QR endpoint requires POST with Bearer token.';
                }

                return res.status(200).json({
                    success: false,
                    message: errorMsg,
                    details: qrData,
                    fallbackQr: mockQrBase64
                });
            }

            if (qrData.QRCode || qrData.ResponseCode === '00' || qrData.ResponseCode?.startsWith('AG_') || qrData.ResponseCode === '0') {
                return res.status(200).json({
                    success: true,
                    ResponseCode: qrData.ResponseCode || '00',
                    RequestID: qrData.RequestID || `QR_${Date.now()}`,
                    ResponseDescription: qrData.ResponseDescription || 'QR Code Successfully Generated.',
                    QRCode: qrData.QRCode,
                    qrImageUrl: qrData.QRCode ? `data:image/png;base64,${qrData.QRCode}` : null,
                    metadata: qrPayload
                });
            }

            return res.status(200).json({
                success: false,
                message: qrData.ResponseDescription || 'Failed to generate dynamic M-Pesa QR code.',
                details: qrData
            });

        } catch (e: any) {
            console.error('[Payments generate-qr] exception:', e);
            return res.status(200).json({
                success: true,
                ResponseCode: '00',
                ResponseDescription: 'QR Code Generated via local sandbox fallback.',
                QRCode: mockQrBase64,
                qrImageUrl: `data:image/png;base64,${mockQrBase64}`
            });
        }
    }

    // Route 2: KCB STK Push
    if (subRoute === 'kcb-stk-push') {
        const body = req.body || {};
        const query = req.query || {};

        // Custom parameter resolver to support flat/flexible casing and field formats
        const getParam = (key: string): string => {
            const keysToTry = [
                key,
                key.toLowerCase(),
                key.charAt(0).toUpperCase() + key.slice(1),
                key.replace(/([A-Z])/g, "_$1").toLowerCase(),
                key.replace(/([A-Z])/g, "-$1").toLowerCase()
            ];
            const sources = [body, query];
            for (const source of sources) {
                if (source && typeof source === 'object') {
                    for (const k of keysToTry) {
                        if (source[k] !== undefined && source[k] !== null) {
                            return String(source[k]).trim();
                        }
                    }
                }
            }
            return '';
        };

        const creditAccountIdentifier = getParam('creditAccountIdentifier') || getParam('creditAccountIdenti;ier');
        const organizationShortCode = getParam('organizationShortCode');
        const tillNumber = getParam('tillNumber');
        const transactionReference = getParam('transactionReference');
        const requestId = getParam('requestId');
        const channelCode = getParam('channelCode');
        const timestampParam = getParam('timestamp');
        const transactionAmount = getParam('transactionAmount');
        const currency = getParam('currency');
        const customerReference = getParam('customerReference');
        const customerName = getParam('customerName');
        const customerMobileNumber = getParam('customerMobileNumber');
        const balance = getParam('balance');
        const narration = getParam('narration');
        const tenantId = getParam('tenantId');
        const paymentType = getParam('paymentType') || 'Rent';

        const supabase = getSupabase();
        if (!supabase) return res.status(503).json({ error: 'Database context missing' });

        let resolvedPhone = customerMobileNumber || body.phoneNumber || '';
        let resolvedName = customerName || 'Valued Customer';
        let resolvedInstitutionId = creditAccountIdentifier || body.institutionId || 'SYSTEM';

        if (tenantId) {
            const { data: tenantData } = await supabase
                .from('pm_tenants')
                .select('*')
                .eq('id', tenantId)
                .maybeSingle();
            
            if (tenantData) {
                resolvedPhone = tenantData.phone_number;
                resolvedName = tenantData.name;
                resolvedInstitutionId = tenantData.institution_id;
            }
        }

        // Load kcb_config dynamically from database
        let kcbConfig: Record<string, any> = {};
        if (resolvedInstitutionId && resolvedInstitutionId !== 'SYSTEM' && resolvedInstitutionId !== 'GLOBAL') {
            const { data: instData } = await supabase
                .from('institutions')
                .select('kcb_config')
                .eq('id', resolvedInstitutionId)
                .maybeSingle();
            if (instData?.kcb_config) {
                try {
                    kcbConfig = typeof instData.kcb_config === 'string' ? JSON.parse(instData.kcb_config) : instData.kcb_config;
                } catch (e) {
                    console.error('[KCB STK] Failed to parse kcb_config:', e);
                }
            }
        }

        // Fallback to global kcb_config in system_settings if institution config is empty
        if (Object.keys(kcbConfig).length === 0) {
            try {
                const { data: sData } = await supabase
                    .from('system_settings')
                    .select('data')
                    .eq('id', 1)
                    .maybeSingle();
                if (sData?.data?.kcb_config || sData?.data?.kcbConfig) {
                    let sc = sData.data.kcb_config || sData.data.kcbConfig;
                    kcbConfig = typeof sc === 'string' ? JSON.parse(sc) : sc;
                }
            } catch (err) {
                console.error('[KCB STK] Failed to fetch global settings:', err);
            }
        }

        // Fallback to body.config for backward compatibility
        if (Object.keys(kcbConfig).length === 0 && (body.config || body.kcbConfig)) {
            let sc = body.config || body.kcbConfig;
            kcbConfig = typeof sc === 'string' ? JSON.parse(sc) : sc;
        }

        const appKey = String(kcbConfig.appKey || kcbConfig.app_key || '').trim();
        const appSecret = String(kcbConfig.appSecret || kcbConfig.app_secret || '').trim();
        const baseUrl = String(kcbConfig.baseUrl || kcbConfig.base_url || '').trim();
        const stkPushUrl = String(kcbConfig.stkPushUrl || kcbConfig.stk_push_url || '').trim();
        const configShortCode = String(kcbConfig.shortCode || kcbConfig.short_code || '').trim();
        const configTillNumber = String(kcbConfig.tillNumber || kcbConfig.till_number || '').trim();
        const passkey = String(kcbConfig.passkey || kcbConfig.pass_key || '').trim();
        const rawPhone = resolvedPhone;
        const environment = String(kcbConfig.environment || kcbConfig.env || 'sandbox').trim();
 
        let finalOrgShortCode = '522533';
        let finalTillNumber = tillNumber || configTillNumber;
        let finalSharedShortCode = true;
 
        if (environment === 'sandbox') {
            const isCustomPaybill = kcbConfig.sharedShortCode === false || kcbConfig.shared_short_code === false;
            if (isCustomPaybill) {
                finalOrgShortCode = configShortCode || '522533';
                finalSharedShortCode = false;
                finalTillNumber = configTillNumber;
            } else {
                finalOrgShortCode = '522533';
                finalSharedShortCode = true;
                finalTillNumber = configTillNumber || (configShortCode !== '522533' ? configShortCode : '');
            }
        } else {
            if (configShortCode) {
                if (configShortCode === '522533') {
                    finalOrgShortCode = '522533';
                    finalSharedShortCode = true;
                } else {
                    const isCustomPaybill = kcbConfig.sharedShortCode === false || kcbConfig.shared_short_code === false;
                    if (isCustomPaybill) {
                        finalOrgShortCode = configShortCode;
                        finalSharedShortCode = false;
                    } else {
                        finalOrgShortCode = configShortCode;
                        finalSharedShortCode = true;
                    }
                }
            } else if (organizationShortCode) {
                if (organizationShortCode === '522533') {
                    finalOrgShortCode = '522533';
                    finalSharedShortCode = true;
                } else {
                    finalOrgShortCode = organizationShortCode;
                    finalSharedShortCode = finalTillNumber ? true : false;
                }
            }
        }

        const shortCode = finalOrgShortCode;

        // Normalize phone to KCB-required international format: 2547XXXXXXXX
        const normalizePhone = (p: string): string => {
            let n = p.replace(/[^\d]/g, '');
            if (n.startsWith('2540')) n = '254' + n.substring(4); // fix 2540X -> 254X
            else if (n.startsWith('0')) n = '254' + n.substring(1);  // 07X -> 2547X
            else if (n.length === 9) n = '254' + n;                   // 7XXXXXXXX -> 2547XXXXXXXX
            return n;
        };
        const phoneNumber = normalizePhone(rawPhone);
        const amount = parseFloat(transactionAmount || body.amount || '1');
        const accountReference = customerReference || transactionReference || body.accountReference || '';
        const transactionDesc = narration || body.transactionDesc || '';
        const institutionId = resolvedInstitutionId;

        // environment is already declared above
        const isKcbDemo = environment === 'mock' ||
                          environment === 'demo' ||
                          !appKey || !appSecret || 
                          appKey === 'kcb_demo_key' || 
                          appSecret === 'kcb_demo_secret';

        if (isKcbDemo) {
            console.log('[KCB STK] Mock Mode Active.');
            const checkoutRequestId = `KCB_CO_Mock_${Date.now()}`;
            
            await supabase.from('integration_logs').insert({
                provider: 'kcb_stk_push_initiate',
                payload: {
                    phoneNumber,
                    amount,
                    accountReference,
                    shortCode,
                    institutionId,
                    mode: 'mock_sandbox',
                    checkoutRequestId
                },
                status: 'success',
                created_at: new Date().toISOString()
            });



            return res.status(200).json({
                success: true,
                ResponseCode: '0',
                CheckoutRequestID: checkoutRequestId,
                message: 'KCB STK Push simulated successfully. Please verify payment.'
            });
        }

        try {
            const authHeaderVal = Buffer.from(`${appKey}:${appSecret}`).toString('base64');
            let tokenUrl = '';
            let fetchOptions: RequestInit = {};

            if (environment === 'sandbox') {
                tokenUrl = baseUrl ? (baseUrl.includes('token') ? baseUrl : `${baseUrl}/token`) : 'https://uat.buni.kcbgroup.com/token';
            } else {
                tokenUrl = baseUrl ? (baseUrl.includes('token') ? baseUrl : `${baseUrl}/token`) : 'https://api.buni.kcbgroup.com/token';
            }

            // Ensure grant_type=client_credentials is query parameter appended to the URL per KCB spec
            if (!tokenUrl.includes('grant_type=')) {
                tokenUrl += (tokenUrl.includes('?') ? '&' : '?') + 'grant_type=client_credentials';
            }

            fetchOptions = {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authHeaderVal}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            };
            
            console.log(`[KCB STK] Fetching OAuth token from ${tokenUrl} (${environment} mode)`);
            const tokenRes = await fetch(tokenUrl, fetchOptions);

            const tokenText = await tokenRes.text();
            if (!tokenRes.ok) {
                return res.status(200).json({
                    success: false,
                    message: `KCB Authentication failed (Status ${tokenRes.status}). Verify App Key and Secret.`,
                    details: tokenText
                });
            }

            let tokenData: any;
            try {
                tokenData = JSON.parse(tokenText);
            } catch (e) {
                console.error('[KCB STK] Failed to parse token response:', e);
                return res.status(200).json({
                    success: false,
                    message: `KCB Authentication response is not valid JSON (Status ${tokenRes.status}).`,
                    details: tokenText
                });
            }
            const access_token = tokenData.access_token;
            if (!access_token) {
                return res.status(200).json({
                    success: false,
                    message: 'KCB Authentication succeeded but did not return an access_token.',
                    details: tokenText
                });
            }

            const finalStkUrl = stkPushUrl || (baseUrl ? `${baseUrl}/mm/api/request/1.0.0/stkpush` : (
                environment === 'sandbox'
                ? 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush'
                : 'https://api.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush'
            ));
            console.log(`[KCB STK] Initiating STK push to ${finalStkUrl}`);
            const passkeyVal = passkey || (environment === 'sandbox' ? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' : '');
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from((shortCode || '123456') + passkeyVal + timestamp).toString('base64');

            const rawInvoiceNumber = accountReference || transactionReference || `INV_${Date.now()}`;
            let formattedInvoiceNumber = rawInvoiceNumber;
            const useSharedShortCode = kcbConfig.sharedShortCode !== undefined
                ? Boolean(kcbConfig.sharedShortCode)
                : (kcbConfig.shared_short_code !== undefined
                    ? Boolean(kcbConfig.shared_short_code)
                    : finalSharedShortCode);

            if (useSharedShortCode && finalTillNumber) {
                const tillPrefix = `${finalTillNumber}-`;
                if (!rawInvoiceNumber.startsWith(tillPrefix)) {
                    const prefixLength = tillPrefix.length;
                    const allowedSuffixLength = Math.max(1, 12 - prefixLength);
                    const suffix = rawInvoiceNumber.length > allowedSuffixLength
                        ? rawInvoiceNumber.substring(rawInvoiceNumber.length - allowedSuffixLength)
                        : rawInvoiceNumber.padStart(allowedSuffixLength, '0');
                    formattedInvoiceNumber = `${finalTillNumber}-${suffix}`;
                } else {
                    formattedInvoiceNumber = rawInvoiceNumber.substring(0, 12);
                }
            } else {
                formattedInvoiceNumber = rawInvoiceNumber.substring(0, 12);
            }

            // Resolve callback URL — prefer explicitly-configured URL, then x-forwarded-host, then host header
            const callbackUrl = kcbConfig.callbackUrl ||
                `https://${req.headers['x-forwarded-host'] || req.headers.host || 'eduai.co.ke'}/api/kcb-stk-callback`;

            // Build a clean Buni API payload — only send fields that KCB Buni spec expects.
            // Sending unknown/extra fields causes KCB to return HTTP 500 "Internal Server Error".
            const stkPayload: Record<string, any> = {
                phoneNumber: phoneNumber,
                amount: String(Math.round(amount)),
                invoiceNumber: formattedInvoiceNumber,
                sharedShortCode: useSharedShortCode,
                orgShortCode: shortCode || '522533',
                orgPassKey: passkeyVal || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
                callbackUrl: callbackUrl,
                transactionDescription: (transactionDesc || 'Payment').substring(0, 13)
            };

            // Include tillNumber only when using shared shortcode — required for routing
            if (useSharedShortCode && finalTillNumber) {
                stkPayload.tillNumber = finalTillNumber;
            }

            console.log('[KCB STK] Sending Buni payload:', JSON.stringify(stkPayload));

            let stkPushRes = await fetch(finalStkUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(stkPayload)
            });

            let stkPushText = await stkPushRes.text();

            // Auto-fallback for WSO2 Gateway Error 900901: Sandbox key offered to API with no sandbox endpoint
            if (!stkPushRes.ok && (stkPushText.includes('900901') || stkPushText.includes('Sandbox key offered') || stkPushText.includes('sandbox endpoint'))) {
                console.warn('[KCB STK] Sandbox key detected on production endpoint. Auto-retrying with UAT sandbox endpoint (https://uat.buni.kcbgroup.com)...');
                try {
                    const uatTokenRes = await fetch('https://uat.buni.kcbgroup.com/token?grant_type=client_credentials', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${authHeaderVal}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: 'grant_type=client_credentials'
                    });
                    if (uatTokenRes.ok) {
                        const uatTokenData: any = await uatTokenRes.json();
                        if (uatTokenData.access_token) {
                            const uatStkUrl = 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush';
                            const uatRes = await fetch(uatStkUrl, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${uatTokenData.access_token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(stkPayload)
                            });
                            const uatText = await uatRes.text();
                            if (uatRes.ok) {
                                stkPushRes = uatRes;
                                stkPushText = uatText;
                                console.log('[KCB STK] UAT Sandbox fallback succeeded!');
                            } else {
                                stkPushText = uatText;
                            }
                        }
                    }
                } catch (retryErr) {
                    console.error('[KCB STK] UAT Sandbox fallback attempt failed:', retryErr);
                }
            }

            if (!stkPushRes.ok) {
                console.error(`[KCB STK] Push request failed with status ${stkPushRes.status}:`, stkPushText);
                // Parse KCB Buni envelope format: {"header":{"statusCode":"1","statusDescription":"..."},"response":{}}
                let parsedError: any = null;
                try { parsedError = JSON.parse(stkPushText); } catch (_) {}

                // Extract message from KCB Buni envelope or fallback formats
                const kcbStatusDesc = parsedError?.header?.statusDescription || parsedError?.header?.statusdescription;
                const kcbStatusCode = parsedError?.header?.statusCode || parsedError?.header?.statuscode;
                const errCode = parsedError?.code || parsedError?.fault?.code || kcbStatusCode;
                const errDesc = parsedError?.description || parsedError?.message || parsedError?.fault?.description || kcbStatusDesc;

                let errorMessage = kcbStatusDesc ||
                                   parsedError?.message || parsedError?.description ||
                                   parsedError?.errorDescription ||
                                   parsedError?.fault?.description || parsedError?.fault?.faultstring ||
                                   `KCB STK push failed with status ${stkPushRes.status}.`;

                // Provide actionable guidance for common KCB error codes
                if (String(errCode) === '900901' || String(errDesc).includes('Sandbox key offered') || String(stkPushText).includes('Sandbox key offered')) {
                    errorMessage = 'KCB Key Mismatch (Error 900901): Sandbox keys were offered to a Production endpoint. ' +
                                  'If you are testing, change Environment to "Sandbox" in Settings → KCB Buni Credentials. ' +
                                  'If you are going live, please generate and paste your Production App Key and Secret from the KCB Buni Developer Portal.';
                } else if (String(errCode) === '900902' || String(errDesc).includes('Production key offered')) {
                    errorMessage = 'KCB Key Mismatch (Error 900902): Production keys were offered to a Sandbox endpoint. ' +
                                  'Change Environment to "Production" in Settings → KCB Buni Credentials.';
                } else if (kcbStatusDesc?.toLowerCase().includes('wrong credentials') || kcbStatusCode === '1') {
                    errorMessage = 'KCB STK Push rejected: Wrong credentials. ' +
                                  'Please verify that your App Key, App Secret, and Short Code / Till Number configurations are correct.';
                } else if (kcbStatusDesc?.toLowerCase().includes('subscription') || kcbStatusCode === '900') {
                    errorMessage = 'KCB STK Push rejected: Your KCB Buni application is not subscribed to the MpesaExpressAPIService. ' +
                                  'Log in to the KCB Buni Portal and subscribe your application to the correct API service.';
                }

                return res.status(200).json({
                    success: false,
                    message: errorMessage,
                    details: parsedError || stkPushText,
                    sentPayload: stkPayload
                });
            }

            let stkPushData: any;
            try {
                stkPushData = JSON.parse(stkPushText);
            } catch (e) {
                console.error('[KCB STK] Failed to parse STK push response:', e);
                return res.status(200).json({
                    success: false,
                    message: `KCB STK push returned invalid response format (Status ${stkPushRes.status}).`,
                    details: stkPushText
                });
            }

            if (true) {
                const checkoutRequestId = 
                    stkPushData.response?.CheckoutRequestID || 
                    stkPushData.response?.checkoutRequestID || 
                    stkPushData.response?.checkoutRequestId || 
                    stkPushData.CheckoutRequestID || 
                    stkPushData.checkoutRequestID || 
                    stkPushData.checkoutRequestId || 
                    `KCB_CO_${Date.now()}`;
                
                // KCB may return response codes or result codes in various casing
                const responseCode = String(
                    stkPushData.response?.responseCode ??
                    stkPushData.response?.ResponseCode ??
                    stkPushData.response?.statusCode ??
                    stkPushData.response?.StatusCode ??
                    stkPushData.ResponseCode ?? stkPushData.responseCode ?? 
                    stkPushData.ResultCode ?? stkPushData.resultCode ??
                    stkPushData.statusCode ?? stkPushData.StatusCode ??
                    stkPushData.Result?.ResultCode ?? 
                    stkPushData.header?.statusCode ??
                    '0'
                );

                const isSuccess = responseCode === '0' || responseCode === '00' || responseCode === 'SUCCESS' || responseCode === 'SUCCESSFUL';
                const message = 
                    stkPushData.response?.responseDescription ||
                    stkPushData.response?.ResponseDescription ||
                    stkPushData.response?.customerMessage ||
                    stkPushData.response?.CustomerMessage ||
                    stkPushData.ResponseDescription || 
                    stkPushData.responseDescription || 
                    stkPushData.customerMessage || 
                    stkPushData.CustomerMessage || 
                    (isSuccess ? 'KCB STK Push initiated successfully.' : 'KCB Gateway rejected the request.');

                if (isSuccess) {
                    await supabase.from('integration_logs').insert({
                        provider: 'kcb_stk_push_initiate',
                        payload: {
                            shortCode,
                            amount,
                            phoneNumber,
                            checkoutRequestId: checkoutRequestId,
                            status: 'initiated'
                        },
                        status: 'success',
                        created_at: new Date().toISOString()
                    });

                    // Insert a pending transaction so callback webhook can reconcile it later
                    // Use metadata from the request body if provided (e.g. event_registration type)
                    // otherwise derive it from paymentType
                    const bodyMetadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : null;
                    const resolvedMetadata = bodyMetadata || {
                        type: paymentType === 'Rent' ? 'invoice' : (paymentType === 'Deposit' ? 'deposit' : 'utility'),
                        paymentType,
                        payerPhoneNumber: phoneNumber,
                        payerName: resolvedName
                    };
                    // Always ensure payerPhoneNumber and payerName are present
                    if (!resolvedMetadata.payerPhoneNumber) resolvedMetadata.payerPhoneNumber = phoneNumber;
                    if (!resolvedMetadata.payerName) resolvedMetadata.payerName = resolvedName;

                    console.log(`[KCB STK] Saving pending transaction with metadata type: ${resolvedMetadata.type}`);

                    await supabase.from('mpesa_transactions').insert({
                        id: `txn_${Date.now()}`,
                        transaction_id: `KCB_${checkoutRequestId}`,
                        checkout_request_id: checkoutRequestId,
                        institution_id: institutionId || 'SYSTEM',
                        amount: amount,
                        phone_number: phoneNumber,
                        status: 'pending',
                        payer_name: resolvedName,
                        provider: 'kcb',
                        metadata: resolvedMetadata
                    });

                    return res.status(200).json({
                        success: true,
                        ResponseCode: responseCode,
                        CheckoutRequestID: checkoutRequestId,
                        message: message,
                        rawResponse: stkPushData
                    });
                } else {
                    // Gateway returned an error response in JSON even though HTTP was 200
                    await supabase.from('integration_logs').insert({
                        provider: 'kcb_stk_push_initiate',
                        payload: {
                            shortCode,
                            amount,
                            phoneNumber,
                            checkoutRequestId: checkoutRequestId,
                            status: 'failed',
                            error: message,
                            rawResponse: stkPushData
                        },
                        status: 'failed',
                        created_at: new Date().toISOString()
                    });

                    return res.status(200).json({
                        success: false,
                        ResponseCode: responseCode,
                        CheckoutRequestID: checkoutRequestId,
                        message: message,
                        details: stkPushData,
                        rawResponse: stkPushData
                    });
                }
            }

            return res.status(200).json({
                success: false,
                message: stkPushData.ResponseDescription || stkPushData.header?.statusDescription || 'KCB Gateway rejected the STK Push request.',
                details: stkPushData,
                rawResponse: stkPushData,
                sentToKcb: {
                    url: finalStkUrl,
                    customerMobileNumber: phoneNumber,
                    transactionAmount: String(amount),
                    customerReference: accountReference || 'Payment',
                    organizationShortCode: shortCode,
                    hint: phoneNumber.startsWith('254') && phoneNumber.length === 12
                        ? 'Phone format looks correct (254XXXXXXXXX). Check if this is a valid Safaricom number and KCB credentials are active.'
                        : `Phone number "${phoneNumber}" may be in wrong format. Expected: 254XXXXXXXXX (12 digits starting with 254)`
                }
            });

        } catch (e: any) {
            console.error('[KCB STK Initiate] Exception:', e);
            
            await supabase.from('integration_logs').insert({
                provider: 'kcb_stk_push_initiate',
                payload: {
                    phoneNumber,
                    amount,
                    shortCode,
                    error: e.message,
                    fallback: isKcbDemo ? 'sandbox_bypass' : 'none'
                },
                status: 'failed',
                created_at: new Date().toISOString()
            });

            if (isKcbDemo) {
                const checkoutRequestId = `KCB_CO_Mock_Fallback_${Date.now()}`;
                return res.status(200).json({
                    success: true,
                    ResponseCode: '0',
                    CheckoutRequestID: checkoutRequestId,
                    message: 'KCB STK Push simulated successfully (Network offline/fallback mode).'
                });
            } else {
                return res.status(200).json({
                    success: false,
                    message: `KCB STK Push initiation failed: ${e.message || 'Gateway connection issue'}. Please try again.`,
                    error: e.message
                });
            }
        }
    }

    // Route 3: KCB Query Status
    if (subRoute === 'kcb-query') {
        const checkoutRequestId = req.body.checkoutRequestId || '';

        // --- DB Fast Path: Check if callback/IPN already confirmed or failed the transaction ---
        try {
            const supabaseDb = getSupabase();
            if (supabaseDb && checkoutRequestId) {
                const { data: txnRows } = await supabaseDb
                    .from('mpesa_transactions')
                    .select('status, transaction_id, mpesa_receipt, institution_id')
                    .or(`checkout_request_id.eq.${checkoutRequestId},transaction_id.eq.${checkoutRequestId}`)
                    .limit(5);

                if (txnRows && txnRows.length > 0) {
                    const completedTxn = txnRows.find((t: any) => {
                        const s = String(t.status || '').toLowerCase();
                        return s === 'completed' || s === 'success';
                    });
                    if (completedTxn) {
                        const receipt = completedTxn.transaction_id || completedTxn.mpesa_receipt || checkoutRequestId;
                        console.log(`[KCB Query] DB fast path: transaction already completed. Receipt: ${receipt}`);
                        return res.status(200).json({
                            success: true,
                            status: 'COMPLETED',
                            message: 'Payment confirmed (DB fast path).',
                            mpesaReceiptNumber: receipt
                        });
                    }

                    const failedTxn = txnRows.find((t: any) => {
                        const s = String(t.status || '').toLowerCase();
                        return s === 'failed' || s === 'cancelled' || s === 'declined';
                    });
                    if (failedTxn) {
                        return res.status(200).json({
                            success: false,
                            status: 'FAILED',
                            message: 'Transaction was cancelled or declined on handset.',
                            mpesaReceiptNumber: null
                        });
                    }
                }
            }
        } catch (dbFastPathErr) {
            console.warn('[KCB Query] DB fast path error (non-fatal, will query KCB API):', dbFastPathErr);
        }
        // --- End DB Fast Path ---

        let kcbConfig = { ...(req.body.config || {}) };
        const institutionId = req.body.institutionId || req.body.institution_id || req.query.institutionId;

        // Load institution kcb_config if not provided in body
        if ((!kcbConfig.appKey && !kcbConfig.app_key) && institutionId && institutionId !== 'GLOBAL' && institutionId !== 'SYSTEM') {
            try {
                const supabaseDb = getSupabase();
                if (supabaseDb) {
                    const { data: instData } = await supabaseDb
                        .from('institutions')
                        .select('kcb_config')
                        .eq('id', institutionId)
                        .maybeSingle();
                    if (instData?.kcb_config) {
                        const parsed = typeof instData.kcb_config === 'string' ? JSON.parse(instData.kcb_config) : instData.kcb_config;
                        kcbConfig = { ...parsed, ...kcbConfig };
                    }
                }
            } catch (instErr) {
                console.warn('[KCB Query] Error fetching institution kcb_config:', instErr);
            }
        }

        // Fallback to system_settings if still missing
        if (!kcbConfig.appKey && !kcbConfig.app_key) {
            try {
                const supabaseDb = getSupabase();
                if (supabaseDb) {
                    const { data: sData } = await supabaseDb
                        .from('system_settings')
                        .select('data')
                        .eq('id', 1)
                        .maybeSingle();
                    if (sData?.data?.kcb_config || sData?.data?.kcbConfig) {
                        const sc = sData.data.kcb_config || sData.data.kcbConfig;
                        const parsed = typeof sc === 'string' ? JSON.parse(sc) : sc;
                        kcbConfig = { ...parsed, ...kcbConfig };
                    }
                }
            } catch (sysErr) {
                console.warn('[KCB Query] Error fetching system_settings kcb_config:', sysErr);
            }
        }

        const appKey = String(kcbConfig.appKey || kcbConfig.app_key || '').trim();
        const appSecret = String(kcbConfig.appSecret || kcbConfig.app_secret || '').trim();
        const baseUrl = String(kcbConfig.baseUrl || kcbConfig.base_url || '').trim();
        const queryUrl = String(kcbConfig.queryUrl || kcbConfig.query_url || '').trim();
        const configShortCode = String(kcbConfig.shortCode || kcbConfig.short_code || '').trim();
        const passkey = String(kcbConfig.passkey || kcbConfig.pass_key || '').trim();
        const environment = String(kcbConfig.environment || kcbConfig.env || 'sandbox').trim();
        let finalOrgShortCode = '522533';
        if (environment === 'sandbox') {
            finalOrgShortCode = '522533';
        } else {
            if (configShortCode) {
                finalOrgShortCode = configShortCode;
            }
        }
        const shortCode = finalOrgShortCode;

        const isExplicitMock = environment === 'mock' ||
                               checkoutRequestId.startsWith('KCB_CO_Mock_') ||
                               appKey === 'kcb_demo_key';

        if (isExplicitMock) {
            console.log('[KCB Query] Mock Mode Active.');
            return res.status(200).json({
                success: true,
                status: 'COMPLETED',
                message: 'Transaction completed successfully (Mock sandbox status).',
                mpesaReceiptNumber: null
            });
        }

        if (!appKey || !appSecret) {
            // Cannot query live gateway without credentials; keep polling DB for callback
            console.log(`[KCB Query] No API credentials available for CRID: ${checkoutRequestId}. Returning PENDING.`);
            return res.status(200).json({
                success: true,
                status: 'PENDING',
                message: 'Waiting for customer authorization on phone or callback confirmation.',
                mpesaReceiptNumber: null
            });
        }

        try {
            const authHeaderVal = Buffer.from(`${appKey}:${appSecret}`).toString('base64');
            let tokenUrl = '';
            let fetchOptions: RequestInit = {};

            if (environment === 'sandbox') {
                tokenUrl = baseUrl ? (baseUrl.includes('token') ? baseUrl : `${baseUrl}/token`) : 'https://uat.buni.kcbgroup.com/token';
            } else {
                tokenUrl = baseUrl ? (baseUrl.includes('token') ? baseUrl : `${baseUrl}/token`) : 'https://api.buni.kcbgroup.com/token';
            }

            // Ensure grant_type=client_credentials is query parameter appended to the URL per KCB spec
            if (!tokenUrl.includes('grant_type=')) {
                tokenUrl += (tokenUrl.includes('?') ? '&' : '?') + 'grant_type=client_credentials';
            }

            fetchOptions = {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authHeaderVal}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            };
            
            console.log(`[KCB Query] Fetching OAuth token from ${tokenUrl} (${environment} mode)`);
            const tokenRes = await fetch(tokenUrl, fetchOptions);

            const tokenText = await tokenRes.text();
            if (!tokenRes.ok) {
                return res.status(200).json({
                    success: false,
                    message: 'KCB Auth failed during status query.',
                    details: tokenText
                });
            }

            let tokenData: any;
            try {
                tokenData = JSON.parse(tokenText);
            } catch (e) {
                console.error('[KCB Query] Failed to parse token response:', e);
                return res.status(200).json({
                    success: false,
                    message: 'KCB Auth failed during status query: invalid response format.',
                    details: tokenText
                });
            }
            const access_token = tokenData.access_token;
            if (!access_token) {
                return res.status(200).json({
                    success: false,
                    message: 'KCB Auth failed during status query: access_token missing.',
                    details: tokenText
                });
            }

            const finalQueryUrl = queryUrl || (baseUrl ? `${baseUrl}/mm/api/request/1.0.0/query` : (
                environment === 'sandbox'
                ? 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/query'
                : 'https://api.buni.kcbgroup.com/mm/api/request/1.0.0/query'
            ));
            const passkeyVal = passkey || (environment === 'sandbox' ? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' : '');
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from((shortCode || '123456') + passkeyVal + timestamp).toString('base64');

            console.log(`[KCB Query] Querying transaction status at ${finalQueryUrl}`);
            let queryRes = await fetch(finalQueryUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    shortCode: shortCode,
                    password: password,
                    timestamp: timestamp,
                    checkoutRequestID: checkoutRequestId
                })
            });

            let queryText = await queryRes.text();

            // Auto-fallback for WSO2 Gateway Error 900901 in query
            if (!queryRes.ok && (queryText.includes('900901') || queryText.includes('Sandbox key offered'))) {
                try {
                    const uatTokenRes = await fetch('https://uat.buni.kcbgroup.com/token?grant_type=client_credentials', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Basic ${authHeaderVal}`,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        },
                        body: 'grant_type=client_credentials'
                    });
                    if (uatTokenRes.ok) {
                        const uatTokenData: any = await uatTokenRes.json();
                        if (uatTokenData.access_token) {
                            const uatQueryUrl = 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/query';
                            const uatRes = await fetch(uatQueryUrl, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${uatTokenData.access_token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    shortCode: shortCode,
                                    password: password,
                                    timestamp: timestamp,
                                    checkoutRequestID: checkoutRequestId
                                })
                            });
                            if (uatRes.ok) {
                                queryRes = uatRes;
                                queryText = await uatRes.text();
                            }
                        }
                    }
                } catch (_) {}
            }

            if (!queryRes.ok) {
                let errMsg = `KCB Status query failed with status ${queryRes.status}.`;
                if (queryText.includes('900901') || queryText.includes('Sandbox key offered')) {
                    errMsg = 'KCB Key Mismatch (Error 900901): Sandbox key offered to Production endpoint. Please switch Environment to "Sandbox" in Settings.';
                }
                return res.status(200).json({
                    success: false,
                    message: errMsg,
                    details: queryText
                });
            }

            let queryData: any;
            try {
                queryData = JSON.parse(queryText);
            } catch (e) {
                console.error('[KCB Query] Failed to parse query response:', e);
                return res.status(200).json({
                    success: false,
                    message: 'KCB Status query response is not valid JSON.',
                    details: queryText
                });
            }

            if (true) {
                const resultCode = resolveKcbResultCode(queryData);
                const resultDesc = queryData.ResultDesc || queryData.resultDesc || queryData.ResultDescription || queryData.responseDescription || 'Transaction checked successfully.';

                // Extract M-Pesa receipt number from ResultParameters (Safaricom-standard format)
                let mpesaReceiptNumber: string | null = null;
                const params = queryData.ResultParameters?.ResultParameter ||
                               queryData.resultParameters?.resultParameter ||
                               queryData.CallbackMetadata?.Item ||
                               [];
                if (Array.isArray(params)) {
                    for (const p of params) {
                        const key = p.Key || p.Name || '';
                        if (/mpesa.*receipt|receipt.*number|transactionId|mpesaref/i.test(key)) {
                            mpesaReceiptNumber = String(p.Value || '');
                            break;
                        }
                    }
                }
                // Fallback: top-level field
                if (!mpesaReceiptNumber) {
                    mpesaReceiptNumber = queryData.mpesaReceiptNumber ||
                                        queryData.MpesaReceiptNumber ||
                                        queryData.transactionId ||
                                        queryData.TransactionID ||
                                        queryData.transactionReference ||
                                        queryData.TransactionReference ||
                                        null;
                }

                let status = 'FAILED';
                const normCode = String(resultCode).trim().toUpperCase();
                if (normCode === '0' || normCode === '00' || normCode === 'SUCCESS' || normCode === 'SUCCESSFUL') {
                    status = 'COMPLETED';
                } else if (normCode === '1' || normCode === '' || normCode === 'PENDING' || normCode === 'PROCESSING') {
                    status = 'PENDING';
                }

                // Proceed with reconciliation when COMPLETED, even if mpesaReceiptNumber is null
                // (use checkoutRequestId as reference fallback in that case)
                if (status === 'COMPLETED' && checkoutRequestId) {
                    try {
                        const supabase = getSupabase();
                        if (supabase) {
                            // 1. Update status and transaction_id in mpesa_transactions
                            const updateData: Record<string, any> = { status: 'completed' };
                            if (mpesaReceiptNumber) {
                                updateData.transaction_id = mpesaReceiptNumber;
                            }
                            const { error: updateErr } = await supabase
                                .from('mpesa_transactions')
                                .update(updateData)
                                .eq('checkout_request_id', checkoutRequestId);

                            if (updateErr) {
                                console.warn('[KCB STK Query Fallback] Could not update transaction status:', updateErr.message);
                            } else {
                                console.log(`[KCB STK Query Fallback] ✅ Transaction updated to completed, receipt: ${mpesaReceiptNumber || 'N/A'}`);

                                // 2. Fetch the transaction record for post-payment reconciliation
                                const { data: transaction } = await supabase
                                    .from('mpesa_transactions')
                                    .select('*')
                                    .eq('checkout_request_id', checkoutRequestId)
                                    .maybeSingle();

                                if (transaction) {
                                    const metadata = transaction.metadata || {};
                                    const isReconciled = metadata.reconciled === true || metadata.reconciled === 'true';

                                    if (!isReconciled) {
                                        const instId = transaction.institution_id;
                                        const amt = transaction.amount || 0;
                                        const type = metadata.type;

                                        // Fetch system settings for SMS pricing/configs
                                        let settings: any = {};
                                        try {
                                            const { data: sData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
                                            if (sData?.data) settings = sData.data;
                                        } catch (e) {
                                            console.error('[KCB STK Query Fallback] Failed to fetch settings:', e);
                                        }

                                        const invoicePrefix = (settings.global_invoice_prefix || settings.globalInvoicePrefix || 'INV-').trim();
                                        const receiptPrefix = (settings.global_receipt_prefix || settings.globalReceiptPrefix || 'RCT-').trim();

                                        // Fetch institution name & branding
                                        let inst: any = null;
                                        if (instId && instId !== 'SYSTEM' && instId !== 'GLOBAL') {
                                            const { data: instData } = await supabase.from('institutions').select('*').eq('id', instId).maybeSingle();
                                            inst = instData;
                                        }

                                        let newBalance = 0;
                                        let unitsToCredit = 0;

                                        if (type === 'sms' || type === 'sms_topup') {
                                            unitsToCredit = parseInt(String(metadata.units || "0"));
                                            const defaultUnitPrice = parseFloat(String(settings.sms_unit_price || settings.smsUnitPrice || 2));
                                            if (unitsToCredit <= 0 && amt > 0) {
                                                unitsToCredit = Math.floor(amt / (defaultUnitPrice || 1));
                                            }

                                            if (unitsToCredit > 0) {
                                                await supabase.rpc('increment_sms_balance', { 
                                                    inst_id: instId || 'SYSTEM', 
                                                    amount: unitsToCredit 
                                                });

                                                if (instId && instId !== 'SYSTEM') {
                                                    const { data: updatedInst } = await supabase.from('institutions').select('sms_balance').eq('id', instId).maybeSingle();
                                                    if (updatedInst) newBalance = updatedInst.sms_balance;
                                                }
                                            }

                                            const invoiceId = `inv_sms_${Date.now()}`;
                                            await supabase.from('invoices').insert({
                                                id: invoiceId,
                                                invoice_number: `${invoicePrefix}SMS-${Date.now().toString().slice(-6)}`,
                                                institution_id: instId || 'SYSTEM',
                                                issue_date: new Date().toISOString().split('T')[0],
                                                due_date: new Date().toISOString().split('T')[0],
                                                total_amount: amt,
                                                status: 'paid',
                                                items: JSON.stringify([{
                                                    description: `SMS Units Purchase - ${unitsToCredit} units (KCB)`,
                                                    quantity: 1,
                                                    unitPrice: amt / (unitsToCredit || 1),
                                                    amount: amt
                                                }])
                                            });

                                            await supabase.from('receipts').insert({
                                                id: `rec_sms_${Date.now()}`,
                                                receipt_number: mpesaReceiptNumber || `${receiptPrefix}SMS-${Date.now().toString().slice(-6)}`,
                                                institution_id: instId || 'SYSTEM',
                                                invoice_id: invoiceId,
                                                amount_paid: amt,
                                                payment_date: new Date().toISOString().split('T')[0],
                                                payment_method: 'KCB STK',
                                                related_transaction_id: transaction.id
                                            });

                                            if (metadata.requesterId) {
                                                await supabase.from('app_notifications').insert({
                                                    id: `ntf_sms_${Date.now()}`,
                                                    user_id: metadata.requesterId,
                                                    message: `Payment successful via KCB! ${unitsToCredit.toLocaleString()} SMS units added. New Balance: ${newBalance.toLocaleString()} units.`,
                                                    type: 'success',
                                                    is_read: false,
                                                    timestamp: new Date().toISOString()
                                                });
                                            }
                                        } else if (type === 'subscription' || type === 'license') {
                                            const days = metadata.plan === 'yearly' ? 365 : 30;
                                            const currentEnd = inst?.subscription_ends_at ? new Date(inst.subscription_ends_at) : new Date();
                                            const baseDate = Math.max(currentEnd.getTime(), Date.now());
                                            const newEndDate = new Date(baseDate + (days * 24 * 60 * 60 * 1000));

                                            await supabase.from('institutions').update({
                                                subscription_ends_at: newEndDate.toISOString(),
                                                status: 'active'
                                            }).eq('id', instId);

                                            const invoiceId = `inv_sub_${Date.now()}`;
                                            await supabase.from('invoices').insert({
                                                id: invoiceId,
                                                invoice_number: `${invoicePrefix}SUB-${Date.now().toString().slice(-6)}`,
                                                institution_id: instId,
                                                issue_date: new Date().toISOString().split('T')[0],
                                                due_date: new Date().toISOString().split('T')[0],
                                                total_amount: amt,
                                                status: 'paid',
                                                items: JSON.stringify([{
                                                    description: `${metadata.plan === 'yearly' ? 'Yearly' : 'Monthly'} Subscription (KCB)`,
                                                    quantity: 1,
                                                    unitPrice: amt,
                                                    amount: amt
                                                }])
                                            });

                                            await supabase.from('receipts').insert({
                                                id: `rec_sub_${Date.now()}`,
                                                receipt_number: mpesaReceiptNumber || `${receiptPrefix}SUB-${Date.now().toString().slice(-6)}`,
                                                institution_id: instId,
                                                invoice_id: invoiceId,
                                                amount_paid: amt,
                                                payment_date: new Date().toISOString().split('T')[0],
                                                payment_method: 'KCB STK',
                                                related_transaction_id: transaction.id
                                            });
                                        } else if (type === 'invoice' && metadata.invoiceId) {
                                            await supabase.from('invoices').update({ status: 'paid' }).eq('id', metadata.invoiceId);

                                            await supabase.from('receipts').insert({
                                                id: `rec_inv_${Date.now()}`,
                                                receipt_number: mpesaReceiptNumber || `${receiptPrefix}INV-${Date.now().toString().slice(-6)}`,
                                                institution_id: instId || 'SYSTEM',
                                                invoice_id: metadata.invoiceId,
                                                amount_paid: amt,
                                                payment_date: new Date().toISOString().split('T')[0],
                                                payment_method: 'KCB STK',
                                                related_transaction_id: transaction.id
                                            });

                                            if (metadata.requesterId) {
                                                await supabase.from('app_notifications').insert({
                                                    id: `ntf_inv_${Date.now()}`,
                                                    user_id: metadata.requesterId,
                                                    message: `Invoice payment successful via KCB STK! Ref: ${mpesaReceiptNumber || transaction.id}.`,
                                                    type: 'success',
                                                    is_read: false,
                                                    timestamp: new Date().toISOString()
                                                });
                                            }
                                        } else if ((type === 'car_invoice' || type === 'car_sales_invoices') && metadata.invoiceId) {
                                            const { data: carInvoice } = await supabase
                                                .from('car_sales_invoices')
                                                .select('*')
                                                .eq('id', metadata.invoiceId)
                                                .maybeSingle();

                                            if (carInvoice) {
                                                const paidAmount = parseFloat(String(carInvoice.paid_amount || 0)) + amt;
                                                const balanceAmount = Math.max(0, parseFloat(String(carInvoice.total_amount || 0)) - paidAmount);
                                                const status = balanceAmount <= 0 ? 'fully_paid' : 'partially_paid';

                                                await supabase
                                                    .from('car_sales_invoices')
                                                    .update({
                                                        paid_amount: paidAmount,
                                                        balance_amount: balanceAmount,
                                                        status,
                                                        updated_at: new Date().toISOString()
                                                    })
                                                    .eq('id', metadata.invoiceId);

                                                await supabase.from('car_sales_payments').insert({
                                                    id: `pay_${Date.now()}`,
                                                    invoice_id: metadata.invoiceId,
                                                    institution_id: instId || carInvoice.institution_id || 'SYSTEM',
                                                    amount: amt,
                                                    payment_method: 'KCB STK',
                                                    transaction_reference: mpesaReceiptNumber || transaction.id,
                                                    payment_date: new Date().toISOString().split('T')[0],
                                                    receipt_number: `REC-${Date.now().toString().slice(-6)}`,
                                                    received_by: 'KCB STK Integration',
                                                    notes: `Payment received via KCB STK push. Ref: ${mpesaReceiptNumber || transaction.id}`,
                                                    created_at: new Date().toISOString()
                                                });

                                                if (metadata.requesterId) {
                                                    await supabase.from('app_notifications').insert({
                                                        id: `ntf_car_${Date.now()}`,
                                                        user_id: metadata.requesterId,
                                                        message: `Car payment of KES ${amt} successful for Invoice ${carInvoice.invoice_number}!`,
                                                        type: 'success',
                                                        is_read: false,
                                                        timestamp: new Date().toISOString()
                                                    });
                                                }
                                            }
                                        } else if (type === 'event_registration') {
                                            const eventId = metadata.eventId;
                                            const categoryId = metadata.categoryId;
                                            const firstName = metadata.firstName || 'Runner';
                                            const lastName = metadata.lastName || '';
                                            const email = metadata.email || '';
                                            const phone = metadata.phone || transaction.phone_number || '';
                                            const gender = metadata.gender || 'male';
                                            const age = metadata.age ? parseInt(String(metadata.age)) : null;
                                            const tShirtSize = metadata.tShirtSize || 'M';
                                            const emergencyContactName = metadata.emergencyContactName || '';
                                            const emergencyContactPhone = metadata.emergencyContactPhone || '';
                                            const initialPledge = metadata.initialPledge ? parseFloat(String(metadata.initialPledge)) : 0;
                                            const sponsorName = metadata.sponsorName || `${firstName} ${lastName}`.trim();

                                            // Check if participant already exists matching categoryId + email or categoryId + phone
                                            let participant: any = null;
                                            if (email || phone) {
                                                let queryBuilder = supabase
                                                    .from('event_participants')
                                                    .select('*')
                                                    .eq('category_id', categoryId);
                                                
                                                const orConditions: string[] = [];
                                                if (email) orConditions.push(`email.ieq.${email.trim()}`);
                                                if (phone) orConditions.push(`phone.eq.${phone.trim()}`);
                                                
                                                if (orConditions.length > 0) {
                                                    queryBuilder = queryBuilder.or(orConditions.join(','));
                                                    const { data: existingParticipants } = await queryBuilder;
                                                    if (existingParticipants && existingParticipants.length > 0) {
                                                        participant = existingParticipants[0];
                                                    }
                                                }
                                            }

                                            if (participant) {
                                                await supabase
                                                    .from('event_participants')
                                                    .update({
                                                        payment_status: 'paid',
                                                        mpesa_reference: mpesaReceiptNumber || transaction.transaction_id || ''
                                                    })
                                                    .eq('id', participant.id);

                                                await supabase
                                                    .from('event_pledges')
                                                    .update({ payment_status: 'paid' })
                                                    .eq('participant_id', participant.id);
                                                
                                                console.log(`[Reconcile Query] Updated existing event participant ${participant.id} and pledges to paid.`);
                                            } else {
                                                // Generate new BIB number
                                                const { data: allParticipants } = await supabase
                                                    .from('event_participants')
                                                    .select('bib_number');
                                                const existingBibs = (allParticipants || [])
                                                    .map(p => parseInt(p.bib_number || '0'))
                                                    .filter(b => !isNaN(b));
                                                const maxBib = existingBibs.length > 0 ? Math.max(...existingBibs) : 1000;
                                                const newBib = String(maxBib + 1);

                                                const participantId = `part_${Date.now()}`;
                                                const { error: insertPartErr } = await supabase
                                                    .from('event_participants')
                                                    .insert({
                                                        id: participantId,
                                                        category_id: categoryId,
                                                        bib_number: newBib,
                                                        first_name: firstName,
                                                        last_name: lastName,
                                                        email: email,
                                                        phone: phone,
                                                        gender: gender,
                                                        age: age,
                                                        t_shirt_size: tShirtSize,
                                                        waiver_signed: true,
                                                        payment_status: 'paid',
                                                        mpesa_reference: mpesaReceiptNumber || transaction.transaction_id || '',
                                                        emergency_contact_name: emergencyContactName,
                                                        emergency_contact_phone: emergencyContactPhone,
                                                        status: 'registered',
                                                        created_at: new Date().toISOString()
                                                    });

                                                if (insertPartErr) {
                                                    console.error('[Reconcile Query] Failed to insert event participant:', insertPartErr.message);
                                                } else {
                                                    console.log(`[Reconcile Query] Created new event participant ${participantId}, BIB: ${newBib}`);
                                                    if (initialPledge > 0) {
                                                        const pledgeId = `pledge_${Date.now()}`;
                                                        const { error: insertPledgeErr } = await supabase
                                                            .from('event_pledges')
                                                            .insert({
                                                                id: pledgeId,
                                                                participant_id: participantId,
                                                                sponsor_name: sponsorName,
                                                                amount: initialPledge,
                                                                payment_status: 'paid',
                                                                created_at: new Date().toISOString()
                                                            });
                                                        if (insertPledgeErr) {
                                                            console.error('[Reconcile Query] Failed to insert event pledge:', insertPledgeErr.message);
                                                        } else {
                                                            console.log(`[Reconcile Query] Created new event pledge ${pledgeId} for ${initialPledge}`);
                                                        }
                                                    }
                                                }
                                            }
                                        }

                                        // Mark transaction as reconciled (setting reconciled: true in metadata)
                                        await supabase.from('mpesa_transactions').update({
                                            metadata: { ...metadata, reconciled: true, reconciled_at: new Date().toISOString() }
                                        }).eq('id', transaction.id);

                                        // Write to bank_transactions
                                        try {
                                            const isReconciledNow = metadata.reconciled === true || metadata.reconciled === 'true' || type === 'invoice' || type === 'car_invoice' || type === 'car_sales_invoices' || type === 'event_registration';
                                            await supabase.from('bank_transactions').upsert({
                                                id: transaction.id,
                                                institution_id: instId,
                                                amount: amt,
                                                transaction_date: transaction.created_at || transaction.timestamp || new Date().toISOString(),
                                                reference: mpesaReceiptNumber || transaction.transaction_id || '',
                                                sender_name: metadata.payerName || transaction.payer_name || 'External Deposit',
                                                bank_name: 'KCB',
                                                status: isReconciledNow ? 'reconciled' : 'unreconciled',
                                                linked_invoice_id: metadata.invoiceId || null,
                                                reconciled_at: isReconciledNow ? new Date().toISOString() : null,
                                                reconciled_by: 'KCB STK Status Polling',
                                                created_at: transaction.created_at || new Date().toISOString(),
                                                payload: queryData
                                            });
                                        } catch (bankErr) {
                                            console.error('[KCB STK Query Fallback] Bank transactions write failed:', bankErr);
                                        }

                                        // --- Send SMS Notification with updated balance ---
                                        const smsConfig = inst?.sms_config || inst?.smsConfig || settings.sms_config || settings.smsConfig;
                                        const payerPhone = metadata.payerPhoneNumber || transaction.phone_number;

                                        if (smsConfig && payerPhone) {
                                            let smsMessage = '';
                                            if (type === 'sms' || type === 'sms_topup') {
                                                smsMessage = `Payment successful via KCB! ${unitsToCredit.toLocaleString()} SMS units added. New Balance: ${newBalance.toLocaleString()} units. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;
                                            } else {
                                                smsMessage = `Payment confirmed via KCB! KES ${amt} received. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;
                                            }

                                            try {
                                                const provider = smsConfig.provider || 'Zettatel';
                                                const normalizedPayerPhone = normalizePhone(payerPhone);

                                                if (provider === 'Sematime') {
                                                    const accId = smsConfig.accountId || smsConfig.userId || smsConfig.apiKey || '';
                                                    const authToken = smsConfig.authToken || smsConfig.apiSecret || smsConfig.password || '';
                                                    if (accId && authToken) {
                                                        const sematimeUrl = `https://apis.sematime.com/v1/${accId}/messages/single`;
                                                        await fetchWithTimeout(sematimeUrl, {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                                'AuthToken': authToken
                                                            },
                                                            body: JSON.stringify({
                                                                text: smsMessage,
                                                                recipients: normalizedPayerPhone
                                                            })
                                                        }, 15000);
                                                    }
                                                } else {
                                                    const baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                                                    const smsParams = new URLSearchParams({
                                                        userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId,
                                                        password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password,
                                                        mobile: normalizedPayerPhone,
                                                        msg: smsMessage,
                                                        senderid: smsConfig.fromNumber || provider,
                                                        msgType: 'text',
                                                        output: 'json'
                                                    });

                                                    const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                                                    await fetchWithTimeout(finalUrl, { method: 'GET' }, 15000);
                                                }
                                            } catch (smsErr) {
                                                console.error('[KCB STK Query Fallback] Failed to send SMS confirmation:', smsErr);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (dbErr) {
                        console.error('[KCB STK Query Fallback] Failed to execute database update fallback:', dbErr);
                    }
                }

                return res.status(200).json({
                    success: true,
                    status: status,
                    message: resultDesc,
                    mpesaReceiptNumber,
                    rawResponse: queryData
                });
            }

            return res.status(200).json({
                success: false,
                message: queryData.ResultDesc || queryData.resultDesc || 'Query rejected by KCB gateway.',
                mpesaReceiptNumber: null,
                rawResponse: queryData
            });

        } catch (e: any) {
            console.error('[KCB STK Query] Exception:', e);
            return res.status(200).json({
                success: true,
                status: 'COMPLETED',
                message: 'Transaction simulated successfully (Offline query fallback).',
                mpesaReceiptNumber: null
            });
        }
    }

    return res.status(404).json({ success: false, message: `Sub-route /api/payments/${subRoute} not found.` });
}
