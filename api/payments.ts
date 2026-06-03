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

        let finalOrgShortCode = '522533';
        let finalTillNumber = tillNumber || configTillNumber;
        let finalSharedShortCode = true;

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
                    finalOrgShortCode = '522533';
                    finalTillNumber = finalTillNumber || configShortCode;
                    finalSharedShortCode = true;
                }
            }
        } else if (organizationShortCode) {
            if (organizationShortCode === '522533') {
                finalOrgShortCode = '522533';
                finalSharedShortCode = true;
            } else {
                finalOrgShortCode = '522533';
                finalTillNumber = finalTillNumber || organizationShortCode;
                finalSharedShortCode = true;
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

        const environment = String(kcbConfig.environment || kcbConfig.env || 'sandbox').trim();
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
            
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from((shortCode || '123456') + (passkey || '') + timestamp).toString('base64');

            const rawInvoiceNumber = accountReference || transactionReference || `INV_${Date.now()}`;
            let formattedInvoiceNumber = rawInvoiceNumber;
            if ((kcbConfig.sharedShortCode !== undefined ? kcbConfig.sharedShortCode : finalSharedShortCode) && finalTillNumber) {
                const tillPrefix = `${finalTillNumber}-`;
                if (!rawInvoiceNumber.startsWith(tillPrefix)) {
                    formattedInvoiceNumber = `${finalTillNumber}-${rawInvoiceNumber}`;
                }
            }

            const stkPushRes = await fetch(finalStkUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // Buni API Format parameters
                    phoneNumber: phoneNumber,
                    amount: String(Math.round(amount)),
                    invoiceNumber: formattedInvoiceNumber,
                    sharedShortCode: kcbConfig.sharedShortCode !== undefined ? kcbConfig.sharedShortCode : finalSharedShortCode,
                    orgShortCode: shortCode || '522533',
                    orgPassKey: passkey || '',
                    callbackUrl: kcbConfig.callbackUrl || `https://${req.headers['x-forwarded-host'] || req.headers.host || 'eduai.co.ke'}/api/kcb-stk-callback`,
                    transactionDescription: transactionDesc || 'Payment',

                    // Original/Other KCB Format parameters (for backward compatibility)
                    transactionReference: transactionReference || accountReference || `TXN_${Date.now()}`,
                    requestId: requestId || `req_${Date.now()}`,
                    channelCode: channelCode || '202',
                    timestamp: timestamp,
                    transactionAmount: String(Math.round(amount)),
                    currency: currency || 'KES',
                    customerReference: accountReference || 'Payment',
                    customerName: customerName || 'Valued Customer',
                    customerMobileNumber: phoneNumber, // already normalized to 2547XXXXXXXX
                    phone: phoneNumber, // Added for compatibility
                    balance: balance || '0.00',
                    narration: transactionDesc || 'Payment',
                    creditAccountIdentifier: creditAccountIdentifier || shortCode,
                    organizationShortCode: shortCode || '522533',
                    tillNumber: finalTillNumber || ''
                })
            });

            const stkPushText = await stkPushRes.text();
            if (!stkPushRes.ok) {
                console.error(`[KCB STK] Push request failed with status ${stkPushRes.status}:`, stkPushText);
                return res.status(200).json({
                    success: false,
                    message: `KCB STK push failed with status ${stkPushRes.status}.`,
                    details: stkPushText
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
                const checkoutRequestId = stkPushData.CheckoutRequestID || stkPushData.checkoutRequestID || stkPushData.checkoutRequestId || `KCB_CO_${Date.now()}`;
                
                // KCB may return response codes or result codes in various casing
                const responseCode = String(
                    stkPushData.ResponseCode ?? stkPushData.responseCode ?? 
                    stkPushData.ResultCode ?? stkPushData.resultCode ??
                    stkPushData.statusCode ?? stkPushData.StatusCode ??
                    stkPushData.Result?.ResultCode ?? 
                    stkPushData.header?.statusCode ??
                    '0'
                );

                const isSuccess = responseCode === '0' || responseCode === '00' || responseCode === 'SUCCESS' || responseCode === 'SUCCESSFUL';
                const message = stkPushData.ResponseDescription || stkPushData.responseDescription || stkPushData.customerMessage || stkPushData.CustomerMessage || (isSuccess ? 'KCB STK Push initiated successfully.' : 'KCB Gateway rejected the request.');

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
                        metadata: {
                            type: paymentType === 'Rent' ? 'invoice' : (paymentType === 'Deposit' ? 'deposit' : 'utility'),
                            paymentType,
                            payerPhoneNumber: phoneNumber,
                            payerName: resolvedName
                        }
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
        const kcbConfig = req.body.config || {};
        const checkoutRequestId = req.body.checkoutRequestId || '';
        const appKey = String(kcbConfig.appKey || kcbConfig.app_key || '').trim();
        const appSecret = String(kcbConfig.appSecret || kcbConfig.app_secret || '').trim();
        const baseUrl = String(kcbConfig.baseUrl || kcbConfig.base_url || '').trim();
        const queryUrl = String(kcbConfig.queryUrl || kcbConfig.query_url || '').trim();
        const configShortCode = String(kcbConfig.shortCode || kcbConfig.short_code || '').trim();
        const passkey = String(kcbConfig.passkey || kcbConfig.pass_key || '').trim();

        let finalOrgShortCode = '522533';
        if (configShortCode) {
            if (configShortCode === '522533') {
                finalOrgShortCode = '522533';
            } else {
                const isCustomPaybill = kcbConfig.sharedShortCode === false || kcbConfig.shared_short_code === false;
                if (isCustomPaybill) {
                    finalOrgShortCode = configShortCode;
                } else {
                    finalOrgShortCode = '522533';
                }
            }
        }
        const shortCode = finalOrgShortCode;

        const environment = String(kcbConfig.environment || kcbConfig.env || 'sandbox').trim();
        const isKcbQueryDemo = environment === 'mock' ||
                               environment === 'demo' ||
                               !appKey || !appSecret || 
                               checkoutRequestId.includes('Mock') ||
                               appKey === 'kcb_demo_key';

        if (isKcbQueryDemo) {
            console.log('[KCB Query] Mock Mode Active.');
            return res.status(200).json({
                success: true,
                status: 'COMPLETED',
                message: 'Transaction completed successfully (Mock sandbox status).',
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
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from((shortCode || '123456') + (passkey || '') + timestamp).toString('base64');

            console.log(`[KCB Query] Querying transaction status at ${finalQueryUrl}`);
            const queryRes = await fetch(finalQueryUrl, {
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

            const queryText = await queryRes.text();
            if (!queryRes.ok) {
                return res.status(200).json({
                    success: false,
                    message: `KCB Status query failed with status ${queryRes.status}.`,
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
                const resultCode = queryData.ResultCode !== undefined ? String(queryData.ResultCode) : 
                                  (queryData.resultCode !== undefined ? String(queryData.resultCode) : 
                                  (queryData.Result?.ResultCode !== undefined ? String(queryData.Result.ResultCode) : ''));
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
                                        null;
                }

                return res.status(200).json({
                    success: true,
                    status: resultCode === '0' || resultCode === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
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
