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
};

// Case-insensitive, source-flexible param resolver
const getParam = (body: any, query: any, key: string): string => {
    const keysToTry = [
        key,
        key.toLowerCase(),
        key.charAt(0).toUpperCase() + key.slice(1), // PascalCase
        key.replace(/([A-Z])/g, "_$1").toLowerCase(), // snake_case
        key.replace(/([A-Z])/g, "-$1").toLowerCase() // kebab-case
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

/**
 * KCB STK Push Callback Handler
 * 
 * Used for receiving STK push callback responses from KCB Buni API.
 * Extracts M-Pesa receipt number (e.g. UEJG4LRTF) and updates transaction record.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    console.log('--- KCB STK Push Callback Received ---');
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body));
    
    let body = req.body || {};
    if (body && Buffer.isBuffer(body)) {
        body = body.toString('utf-8');
    }
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.error('[KCB STK] Failed to parse stringified body:', e);
            body = {};
        }
    }

    if (typeof body !== 'object' || Array.isArray(body)) {
        body = {};
    }

    const hasQueryFields = req.query && Object.keys(req.query).length > 0;
    const hasBodyFields = body && Object.keys(body).length > 0;

    if (!hasQueryFields && !hasBodyFields) {
        return res.status(400).json({ message: 'Missing or empty request payload' });
    }

    const supabase = getSupabase();

    if (!supabase) return res.status(503).json({ error: 'Database context missing' });

    try {
        // Log the raw Callback
        const { error: logError } = await supabase.from('integration_logs').insert({
            provider: 'kcb_stk_callback',
            payload: body,
            status: 'received',
            created_at: new Date().toISOString()
        });

        if (logError) console.warn('[KCB STK] Failed to log STK Callback:', logError);

        // --- Parse KCB callback structure ---
        // KCB Buni format uses nested header + requestPayload.primaryData
        const header = body.header || {};
        const messageID = header.messageID || `MSG_${Date.now()}`;
        const originatorConversationID = header.originatorConversationID || header.conversationID || '';
        const primaryData = body.requestPayload?.primaryData || {};
        const businessKey = primaryData.businessKey || '';

        // ResultCode / status: check multiple formats KCB may send
        const resultCode = String(
            body.ResultCode ?? body.resultCode ??
            body.Result?.ResultCode ?? primaryData.resultCode ?? ''
        );
        const resultDesc = body.ResultDesc || body.resultDesc || body.Result?.ResultDesc || primaryData.resultDescription || '';

        // Checkout request ID - used to match the pending transaction
        const checkoutRequestId = 
            body.CheckoutRequestID ||
            body.checkoutRequestID ||
            body.checkoutRequestId ||
            primaryData.checkoutRequestID ||
            originatorConversationID ||
            '';

        // ---- Extract M-Pesa receipt reference ----
        // KCB/Safaricom format 1: CallbackMetadata.Item array
        let mpesaReceiptNumber = '';
        if (body.CallbackMetadata?.Item && Array.isArray(body.CallbackMetadata.Item)) {
            for (const item of body.CallbackMetadata.Item) {
                if (/mpesa.*receipt|receipt.*number/i.test(item.Name || item.Key || '')) {
                    mpesaReceiptNumber = String(item.Value || '');
                    break;
                }
            }
        }
        // KCB Buni format 2: ResultParameters.ResultParameter array
        if (!mpesaReceiptNumber && body.ResultParameters?.ResultParameter) {
            for (const p of body.ResultParameters.ResultParameter) {
                if (/mpesa.*receipt|receipt.*number|transactionId|mpesaref/i.test(p.Key || p.Name || '')) {
                    mpesaReceiptNumber = String(p.Value || '');
                    break;
                }
            }
        }
        // KCB Buni format 3: primaryData.mpesaReceiptNumber or businessKey
        if (!mpesaReceiptNumber) {
            mpesaReceiptNumber =
                primaryData.mpesaReceiptNumber ||
                primaryData.MpesaReceiptNumber ||
                primaryData.transactionId ||
                body.MpesaReceiptNumber ||
                body.mpesaReceiptNumber ||
                businessKey ||
                '';
        }

        console.log(`[KCB STK Callback] CheckoutRequestID: ${checkoutRequestId}`);
        console.log(`[KCB STK Callback] ResultCode: ${resultCode}`);
        console.log(`[KCB STK Callback] M-Pesa Receipt: ${mpesaReceiptNumber || '(not provided)'}`);

        // Update the matching transaction if we have enough context
        if (checkoutRequestId) {
            const isSuccess = resultCode === '0' || resultCode === 'SUCCESS' || resultCode === '';
            const updateData: Record<string, any> = {
                status: isSuccess ? 'completed' : 'failed',
            };
            if (mpesaReceiptNumber) {
                updateData.transaction_id = mpesaReceiptNumber;
            }

            const { error: updateErr } = await supabase
                .from('mpesa_transactions')
                .update(updateData)
                .eq('checkout_request_id', checkoutRequestId);

            if (updateErr) {
                console.warn('[KCB STK Callback] Could not update transaction:', updateErr.message);
            } else {
                console.log(`[KCB STK Callback] ✅ Transaction updated: ${isSuccess ? 'completed' : 'failed'}, receipt: ${mpesaReceiptNumber || 'N/A'}`);
                
                if (isSuccess) {
                    console.log(`[KCB STK Callback] Initiating post-payment reconciliation and SMS notification for checkoutRequestId: ${checkoutRequestId}`);
                    
                    // Fetch the transaction record
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
                                console.error('[KCB STK Callback] Failed to fetch settings:', e);
                            }

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
                                    console.log(`[KCB STK Callback - Reconcile] Adding ${unitsToCredit} units to ${instId}`);
                                    await supabase.rpc('increment_sms_balance', { 
                                        inst_id: instId || 'SYSTEM', 
                                        amount: unitsToCredit 
                                    });

                                    // Fetch updated balance
                                    if (instId && instId !== 'SYSTEM') {
                                        const { data: updatedInst } = await supabase.from('institutions').select('sms_balance').eq('id', instId).maybeSingle();
                                        if (updatedInst) {
                                            newBalance = updatedInst.sms_balance;
                                        }
                                    }
                                }

                                // Create Invoice & Receipt
                                const invoiceId = `inv_sms_${Date.now()}`;
                                await supabase.from('invoices').insert({
                                    id: invoiceId,
                                    invoice_number: `INV-SMS-${Date.now().toString().slice(-6)}`,
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
                                    receipt_number: mpesaReceiptNumber || `REC-SMS-${Date.now().toString().slice(-6)}`,
                                    institution_id: instId || 'SYSTEM',
                                    invoice_id: invoiceId,
                                    amount_paid: amt,
                                    payment_date: new Date().toISOString().split('T')[0],
                                    payment_method: 'KCB STK',
                                    related_transaction_id: transaction.id
                                });

                                // Create Notification
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
                                    invoice_number: `INV-SUB-${Date.now().toString().slice(-6)}`,
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
                                    receipt_number: mpesaReceiptNumber || `REC-SUB-${Date.now().toString().slice(-6)}`,
                                    institution_id: instId,
                                    invoice_id: invoiceId,
                                    amount_paid: amt,
                                    payment_date: new Date().toISOString().split('T')[0],
                                    payment_method: 'KCB STK',
                                    related_transaction_id: transaction.id
                                });

                                if (metadata.requesterId) {
                                    await supabase.from('app_notifications').insert({
                                        id: `ntf_sub_${Date.now()}`,
                                        user_id: metadata.requesterId,
                                        message: `Successfully renewed subscription via KCB! New expiry: ${newEndDate.toLocaleDateString()}`,
                                        type: 'success',
                                        is_read: false,
                                        timestamp: new Date().toISOString()
                                    });
                                }
                            }

                            // Mark transaction as reconciled (setting reconciled: true in metadata)
                            await supabase.from('mpesa_transactions').update({
                                metadata: { ...metadata, reconciled: true, reconciled_at: new Date().toISOString() }
                            }).eq('id', transaction.id);

                            // --- Send SMS Notification with updated balance ---
                            const smsConfig = inst?.sms_config || inst?.smsConfig || settings.sms_config || settings.smsConfig;
                            const payerPhone = metadata.payerPhoneNumber || transaction.phone_number || body.phoneNumber;

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
                                            console.log(`[KCB STK Callback] SMS Notification dispatched via Sematime to ${normalizedPayerPhone}`);
                                        }
                                    } else {
                                        // Zettatel / ABMIS / Generic GET
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
                                        console.log(`[KCB STK Callback] SMS Notification dispatched via ${provider} to ${normalizedPayerPhone}`);
                                    }
                                } catch (smsErr) {
                                    console.error('[KCB STK Callback] Failed to send SMS confirmation:', smsErr);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Acknowledge receipt to KCB strictly following the expected KCBIPNResponse schema
        return res.status(200).json({
            header: {
                messageID,
                originatorConversationID,
                statusCode: "0",
                statusMessage: "Success"
            },
            responsePayload: {
                transactionInfo: {
                    transactionId: mpesaReceiptNumber || businessKey || `TXN_${Date.now()}`
                }
            }
        });

    } catch (err: any) {
        console.error('[KCB STK Fatal]', err);
        return res.status(500).json({ message: 'Internal processing error' });
    }
}
