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
 * KCB STK Push Callback Handler
 * 
 * Used for receiving STK push callback responses from KCB Buni API.
 * Extracts M-Pesa receipt number (e.g. UEJG4LRTF) and updates transaction record.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    console.log('--- KCB STK Push Callback Received ---');
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body));
    
    const body = req.body;
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
