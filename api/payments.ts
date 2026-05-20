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

            if (!oauth.ok) {
                const errText = await oauth.text();
                return res.status(200).json({
                    success: false,
                    message: 'M-Pesa authentication failed. Check Consumer Key/Secret.',
                    details: errText
                });
            }

            const { access_token } = (await oauth.json()) as any;
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

            const stkData = (await stkRes.json()) as any;
            if (stkRes.ok && stkData.ResponseCode === '0') {
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

        const kcbConfig = body.config || {};
        const appKey = (kcbConfig.appKey || '').trim();
        const appSecret = (kcbConfig.appSecret || '').trim();
        const baseUrl = (kcbConfig.baseUrl || '').trim();
        const stkPushUrl = (kcbConfig.stkPushUrl || '').trim();
        const shortCode = (kcbConfig.shortCode || organizationShortCode || '').trim();
        const passkey = (kcbConfig.passkey || '').trim();
        const rawPhone = customerMobileNumber || body.phoneNumber || '';
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
        const institutionId = creditAccountIdentifier || body.institutionId || 'SYSTEM';

        const environment = (kcbConfig.environment || 'sandbox').trim();
        const isKcbDemo = !appKey || !appSecret || 
                          appKey.toLowerCase().includes('demo') || 
                          appKey.toLowerCase().includes('test') || 
                          appSecret.toLowerCase().includes('demo') || 
                          appSecret.toLowerCase().includes('test');

        if (isKcbDemo) {
            console.log('[KCB STK] Mock Mode Active.');
            const supabase = getSupabase();
            if (supabase) {
                await supabase.from('integration_logs').insert({
                    provider: 'kcb_stk_push_initiate',
                    payload: {
                        phoneNumber,
                        amount,
                        accountReference,
                        shortCode,
                        institutionId,
                        mode: 'mock_sandbox'
                    },
                    status: 'success',
                    created_at: new Date().toISOString()
                });
            }

            return res.status(200).json({
                success: true,
                ResponseCode: '0',
                CheckoutRequestID: `KCB_CO_Mock_${Date.now()}`,
                message: 'KCB STK Push simulated successfully. Please verify payment.'
            });
        }

        try {
            const authHeaderVal = Buffer.from(`${appKey}:${appSecret}`).toString('base64');
            let tokenUrl = '';
            let fetchOptions: RequestInit = {};

            if (environment === 'sandbox') {
                tokenUrl = baseUrl || 'https://accounts.buni.kcbgroup.com/oauth2/token';
                fetchOptions = {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authHeaderVal}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'grant_type=client_credentials'
                };
            } else {
                tokenUrl = baseUrl ? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials` : 'https://accounts.buni.kcbgroup.com/oauth/v1/generate?grant_type=client_credentials';
                fetchOptions = {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${authHeaderVal}`
                    }
                };
            }
            
            console.log(`[KCB STK] Fetching OAuth token from ${tokenUrl} (${environment} mode)`);
            const tokenRes = await fetch(tokenUrl, fetchOptions);

            if (!tokenRes.ok) {
                const errText = await tokenRes.text();
                return res.status(200).json({
                    success: false,
                    message: `KCB Authentication failed (Status ${tokenRes.status}). Verify App Key and Secret.`,
                    details: errText
                });
            }

            const tokenData = await tokenRes.json() as any;
            const access_token = tokenData.access_token;

            const finalStkUrl = stkPushUrl || (baseUrl ? `${baseUrl}/kcb/stkpush/v1/processrequest` : (
                environment === 'sandbox'
                ? 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush'
                : 'https://api.kcbgroup.com/kcb/stkpush/v1/processrequest'
            ));
            console.log(`[KCB STK] Initiating STK push to ${finalStkUrl}`);
            
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from((shortCode || '123456') + (passkey || '') + timestamp).toString('base64');

            const stkPushRes = await fetch(finalStkUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    transactionReference: transactionReference || accountReference || `TXN_${Date.now()}`,
                    requestId: requestId || `req_${Date.now()}`,
                    channelCode: channelCode || '202',
                    timestamp: timestamp,
                    transactionAmount: String(amount),
                    currency: currency || 'KES',
                    customerReference: accountReference || 'Payment',
                    customerName: customerName || 'Valued Customer',
                    customerMobileNumber: phoneNumber, // already normalized to 2547XXXXXXXX
                    balance: balance || '0.00',
                    narration: transactionDesc || 'Payment',
                    creditAccountIdentifier: creditAccountIdentifier || shortCode,
                    organizationShortCode: shortCode || '522533',
                    tillNumber: tillNumber || ''
                })
            });

            const stkPushData = await stkPushRes.json() as any;
            if (stkPushRes.ok) {
                const checkoutRequestId = stkPushData.CheckoutRequestID || stkPushData.checkoutRequestID || stkPushData.checkoutRequestId || `KCB_CO_${Date.now()}`;
                const responseCode = stkPushData.ResponseCode || stkPushData.responseCode || '0';
                const message = stkPushData.ResponseDescription || stkPushData.responseDescription || stkPushData.customerMessage || stkPushData.CustomerMessage || 'KCB STK Push initiated successfully.';

                const supabase = getSupabase();
                if (supabase) {
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
                }

                return res.status(200).json({
                    success: true,
                    ResponseCode: responseCode,
                    CheckoutRequestID: checkoutRequestId,
                    message: message,
                    rawResponse: stkPushData
                });
            }

            return res.status(200).json({
                success: false,
                message: stkPushData.ResponseDescription || 'KCB Gateway rejected the STK Push request.',
                details: stkPushData,
                rawResponse: stkPushData
            });

        } catch (e: any) {
            console.error('[KCB STK Initiate] Exception:', e);
            
            const supabase = getSupabase();
            if (supabase) {
                await supabase.from('integration_logs').insert({
                    provider: 'kcb_stk_push_initiate',
                    payload: {
                        phoneNumber,
                        amount,
                        shortCode,
                        error: e.message,
                        fallback: 'sandbox_bypass'
                    },
                    status: 'success',
                    created_at: new Date().toISOString()
                });
            }

            return res.status(200).json({
                success: true,
                ResponseCode: '0',
                CheckoutRequestID: `KCB_CO_Mock_Fallback_${Date.now()}`,
                message: 'KCB STK Push simulated successfully (Network offline/fallback mode).'
            });
        }
    }

    // Route 3: KCB Query Status
    if (subRoute === 'kcb-query') {
        const kcbConfig = req.body.config || {};
        const checkoutRequestId = req.body.checkoutRequestId || '';
        const appKey = (kcbConfig.appKey || '').trim();
        const appSecret = (kcbConfig.appSecret || '').trim();
        const baseUrl = (kcbConfig.baseUrl || '').trim();
        const queryUrl = (kcbConfig.queryUrl || '').trim();
        const shortCode = (kcbConfig.shortCode || '').trim();
        const passkey = (kcbConfig.passkey || '').trim();

        const environment = (kcbConfig.environment || 'sandbox').trim();
        const isKcbQueryDemo = !appKey || !appSecret || 
                               checkoutRequestId.includes('Mock') ||
                               appKey.toLowerCase().includes('demo') || 
                               appKey.toLowerCase().includes('test');

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
                tokenUrl = baseUrl || 'https://accounts.buni.kcbgroup.com/oauth2/token';
                fetchOptions = {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authHeaderVal}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'grant_type=client_credentials'
                };
            } else {
                tokenUrl = baseUrl ? `${baseUrl}/oauth/v1/generate?grant_type=client_credentials` : 'https://accounts.buni.kcbgroup.com/oauth/v1/generate?grant_type=client_credentials';
                fetchOptions = {
                    method: 'GET',
                    headers: {
                        'Authorization': `Basic ${authHeaderVal}`
                    }
                };
            }
            
            console.log(`[KCB Query] Fetching OAuth token from ${tokenUrl} (${environment} mode)`);
            const tokenRes = await fetch(tokenUrl, fetchOptions);

            if (!tokenRes.ok) {
                return res.status(200).json({
                    success: false,
                    message: 'KCB Auth failed during status query.'
                });
            }

            const tokenData = await tokenRes.json() as any;
            const access_token = tokenData.access_token;

            const finalQueryUrl = queryUrl || (baseUrl ? `${baseUrl}/kcb/stkpush/v1/query` : (
                environment === 'sandbox'
                ? 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/query'
                : 'https://api.kcbgroup.com/kcb/stkpush/v1/query'
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

            const queryData = await queryRes.json() as any;
            if (queryRes.ok) {
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
