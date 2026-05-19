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
    }
};

/**
 * KCB IPN (Instant Payment Notification) Callback Handler
 * 
 * Used for receiving B2C, C2B, and other standard notifications from KCB.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    console.log('--- KCB IPN Received ---');
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body));
    
    const body = req.body;
    const supabase = getSupabase();

    if (!supabase) return res.status(503).json({ error: 'Database context missing' });

    try {
        // Log the raw IPN
        const { error: logError } = await supabase.from('integration_logs').insert({
            provider: 'kcb_ipn',
            payload: body,
            status: 'received',
            created_at: new Date().toISOString()
        });

        if (logError) console.warn('[KCB IPN] Failed to log IPN:', logError);

        const header = body.header || {};
        const messageID = header.messageID || `MSG_${Date.now()}`;
        const originatorConversationID = header.originatorConversationID || header.conversationID || '';
        const primaryData = body.requestPayload?.primaryData || {};
        const businessKey = primaryData.businessKey || '';

        const additionalData = body.requestPayload?.additionalData || {};
        const notificationData = additionalData.notificationData || {};

        const transactionID = notificationData.transactionID || businessKey || `KCB_IPN_${Date.now()}`;
        const amount = parseFloat(notificationData.transactionAmt || '0');
        const phone = notificationData.debitMSISDN || '';
        const payerName = `${notificationData.firstName || ''} ${notificationData.lastName || ''}`.trim();

        // 1. Locate matching transaction
        const lookupKey = businessKey || originatorConversationID || '';
        let { data: transaction } = await supabase
            .from('mpesa_transactions')
            .select('*')
            .or(`checkout_request_id.eq.${lookupKey},transaction_id.eq.${transactionID}`)
            .maybeSingle();

        // 2. If no transaction, check if businessKey corresponds to institution ID or code (C2B Paybill fallback)
        let inst: any = null;
        if (!transaction && businessKey && amount > 0) {
            const { data: instById } = await supabase.from('institutions').select('*').eq('id', businessKey).maybeSingle();
            inst = instById;
            if (!inst) {
                const { data: instByCode } = await supabase.from('institutions').select('*').eq('code', businessKey).maybeSingle();
                inst = instByCode;
            }

            if (inst) {
                // Insert transaction on the fly
                const { data: newTxn, error: insertErr } = await supabase.from('mpesa_transactions').insert({
                    id: `txn_${Date.now()}`,
                    transaction_id: transactionID,
                    checkout_request_id: transactionID,
                    institution_id: inst.id,
                    amount: amount,
                    phone_number: phone,
                    status: 'completed',
                    provider: 'kcb',
                    metadata: {
                        type: 'sms', // assume SMS units top-up for direct Paybill C2B payments
                        units: 0,
                        payerPhoneNumber: phone,
                        payerName: payerName
                    }
                }).select().single();

                if (!insertErr && newTxn) {
                    transaction = newTxn;
                } else {
                    console.error('[KCB IPN] Failed to create transaction on the fly:', insertErr);
                }
            }
        }

        // 3. Process reconciliation and notifications if transaction is active and completed
        if (transaction) {
            // Update transaction to completed if it was pending
            if (transaction.status === 'pending') {
                await supabase
                    .from('mpesa_transactions')
                    .update({
                        status: 'completed',
                        transaction_id: transactionID
                    })
                    .eq('id', transaction.id);
                transaction.status = 'completed';
                transaction.transaction_id = transactionID;
            }

            const metadata = transaction.metadata || {};
            const isReconciled = metadata.reconciled === true || metadata.reconciled === 'true';

            if (transaction.status === 'completed' && !isReconciled) {
                const instId = transaction.institution_id;
                const amt = transaction.amount || 0;
                const type = metadata.type || 'sms';

                // Fetch settings
                let settings: any = {};
                try {
                    const { data: sData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
                    if (sData?.data) settings = sData.data;
                } catch (e) {
                    console.error('[KCB IPN] Failed to fetch settings:', e);
                }

                if (!inst && instId && instId !== 'SYSTEM' && instId !== 'GLOBAL') {
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
                        console.log(`[KCB IPN - Reconcile] Adding ${unitsToCredit} units to ${instId}`);
                        await supabase.rpc('increment_sms_balance', {
                            inst_id: instId || 'SYSTEM',
                            amount: unitsToCredit
                        });

                        // Fetch new balance
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
                            description: `SMS Units Purchase - ${unitsToCredit} units (KCB C2B)`,
                            quantity: 1,
                            unitPrice: amt / (unitsToCredit || 1),
                            amount: amt
                        }])
                    });

                    await supabase.from('receipts').insert({
                        id: `rec_sms_${Date.now()}`,
                        receipt_number: transactionID || `REC-SMS-${Date.now().toString().slice(-6)}`,
                        institution_id: instId || 'SYSTEM',
                        invoice_id: invoiceId,
                        amount_paid: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
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
                            description: `${metadata.plan === 'yearly' ? 'Yearly' : 'Monthly'} Subscription (KCB IPN)`,
                            quantity: 1,
                            unitPrice: amt,
                            amount: amt
                        }])
                    });

                    await supabase.from('receipts').insert({
                        id: `rec_sub_${Date.now()}`,
                        receipt_number: transactionID || `REC-SUB-${Date.now().toString().slice(-6)}`,
                        institution_id: instId,
                        invoice_id: invoiceId,
                        amount_paid: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'KCB IPN',
                        related_transaction_id: transaction.id
                    });

                    if (metadata.requesterId) {
                        await supabase.from('app_notifications').insert({
                            id: `ntf_sub_${Date.now()}`,
                            user_id: metadata.requesterId,
                            message: `Successfully renewed subscription via KCB IPN! New expiry: ${newEndDate.toLocaleDateString()}`,
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
                const smsConfig = settings.sms_config || settings.smsConfig;
                const payerPhone = metadata.payerPhoneNumber || transaction.phone_number || phone;

                if (smsConfig && payerPhone) {
                    let smsMessage = '';
                    if (type === 'sms' || type === 'sms_topup') {
                        smsMessage = `Payment successful via KCB! ${unitsToCredit.toLocaleString()} SMS units added. New Balance: ${newBalance.toLocaleString()} units. Ref: ${transactionID}. Thank you for choosing Eduai Automation.`;
                    } else {
                        smsMessage = `Payment confirmed via KCB! KES ${amt} received. Ref: ${transactionID}. Thank you for choosing Eduai Automation.`;
                    }

                    try {
                        const provider = smsConfig.provider || 'Zettatel';
                        const normalizedPayerPhone = normalizePhone(payerPhone);

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
                        console.log(`[KCB IPN] SMS Notification dispatched to ${normalizedPayerPhone}`);
                    } catch (smsErr) {
                        console.error('[KCB IPN] Failed to send SMS confirmation:', smsErr);
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
                    transactionId: transactionID
                }
            }
        });

    } catch (err: any) {
        console.error('[KCB IPN Fatal]', err);
        return res.status(500).json({ message: 'Internal processing error' });
    }
}
