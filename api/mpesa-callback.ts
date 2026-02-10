
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with Service Role Key for background updates (bypassing RLS for system processes)
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    console.log('[M-Pesa Callback] Received notification:', JSON.stringify(req.body));

    try {
        const { Body } = req.body;
        if (!Body?.stkCallback) {
            return res.status(400).json({ ResultCode: 1, ResultDesc: "Invalid payload structure" });
        }

        const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

        // 1. Find the pending transaction
        const { data: transaction, error: findError } = await supabase
            .from('mpesa_transactions')
            .select('*')
            .eq('checkout_request_id', CheckoutRequestID)
            .single();

        if (findError || !transaction) {
            console.error('[M-Pesa Callback] Transaction not found for ID:', CheckoutRequestID);
            // We return 0 to Safaricom to acknowledge receipt even if we can't find it locally
            return res.status(200).json({ ResultCode: 0, ResultDesc: "Success (Logged but row missing)" });
        }

        // 2. Extract Metadata if successful
        let receiptNumber = '';
        let transactionDate = new Date().toISOString();

        if (ResultCode === 0 && CallbackMetadata?.Item) {
            const items = CallbackMetadata.Item;
            receiptNumber = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || '';
        }

        // 3. Update Transaction Status
        const status = ResultCode === 0 ? 'completed' : 'failed';
        const { error: updateError } = await supabase
            .from('mpesa_transactions')
            .update({
                status,
                transaction_id: receiptNumber || transaction.transaction_id, // Use receipt if we have it
                payer_name: ResultCode === 0 ? (transaction.payer_name || 'M-Pesa User') : transaction.payer_name
            })
            .eq('id', transaction.id);

        if (updateError) throw updateError;

        console.log(`[M-Pesa Callback] Updated txn ${transaction.id} to ${status}`);

        // 4. Return Acknowledgment to Safaricom
        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: "Success"
        });

    } catch (error: any) {
        console.error('[M-Pesa Callback] Internal Error:', error);
        return res.status(500).json({ ResultCode: 1, ResultDesc: "Internal server error" });
    }
}
