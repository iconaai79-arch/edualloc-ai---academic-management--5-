
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
        let confirmedAmount = transaction.amount;
        let transactionDate = new Date().toISOString();

        if (ResultCode === 0 && CallbackMetadata?.Item) {
            const items = CallbackMetadata.Item;
            receiptNumber = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || '';
            const amountVal = items.find((i: any) => i.Name === 'Amount')?.Value;
            if (amountVal) confirmedAmount = Number(amountVal);

            const dateVal = items.find((i: any) => i.Name === 'TransactionDate')?.Value;
            if (dateVal) {
                // Safaricom date is YYYYMMDDHHMMSS
                const s = String(dateVal);
                const formattedDate = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}`;
                transactionDate = new Date(formattedDate).toISOString();
            }
        }

        // 3. Update Transaction Status
        const status = ResultCode === 0 ? 'completed' : 'failed';
        const { error: updateError } = await supabase
            .from('mpesa_transactions')
            .update({
                status,
                transaction_id: receiptNumber || transaction.transaction_id,
                payer_name: ResultCode === 0 ? (transaction.payer_name || 'M-Pesa User') : transaction.payer_name,
                amount: confirmedAmount,
                timestamp: transactionDate
            })
            .eq('id', transaction.id);

        if (updateError) throw updateError;
        console.log(`[M-Pesa Callback] Updated txn ${transaction.id} to ${status}`);

        // 4. Handle side-effects for successful payments
        if (status === 'completed' && transaction.metadata) {
            const meta = transaction.metadata;
            if (meta.type === 'subscription') {
                const plan = meta.plan || 'monthly';
                const monthsToAdd = plan === 'yearly' ? 12 : 1;

                // Calculate NEW expiration date
                const { data: inst } = await supabase.from('institutions').select('subscription_ends_at, trial_ends_at, status').eq('id', transaction.institution_id).single();

                let currentExpiry = new Date();
                if (inst?.subscription_ends_at) {
                    const existing = new Date(inst.subscription_ends_at);
                    if (existing > currentExpiry) currentExpiry = existing;
                } else if (inst?.trial_ends_at) {
                    const trial = new Date(inst.trial_ends_at);
                    if (trial > currentExpiry) currentExpiry = trial;
                }

                const newExpiry = new Date(currentExpiry);
                newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);

                console.log(`[M-Pesa Callback] Renewing sub for ${transaction.institution_id}. Plan: ${plan}, New Expiry: ${newExpiry.toISOString()}`);

                await supabase.from('institutions').update({
                    status: 'active',
                    subscription_ends_at: newExpiry.toISOString(),
                    trial_ends_at: null // Clear trial once they pay
                }).eq('id', transaction.institution_id);
            } else if (meta.type === 'invoice' && meta.invoiceId) {
                console.log(`[M-Pesa Callback] Handling invoice payment for ${meta.invoiceId}`);

                // Update Invoice Status
                await supabase.from('invoices').update({ status: 'paid' }).eq('id', meta.invoiceId);

                // Create Receipt
                const receiptId = `rec_${Date.now()}`;
                const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;

                await supabase.from('receipts').insert({
                    id: receiptId,
                    receipt_number: receiptNumber,
                    institution_id: transaction.institution_id,
                    invoice_id: meta.invoiceId,
                    amount_paid: transaction.amount,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'M-Pesa',
                    related_transaction_id: transaction.id
                });

                console.log(`[M-Pesa Callback] Receipt ${receiptNumber} created for invoice ${meta.invoiceId}`);
            }
        }

        // 5. Return Acknowledgment to Safaricom
        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: "Success"
        });

    } catch (error: any) {
        console.error('[M-Pesa Callback] Internal Error:', error);
        return res.status(500).json({ ResultCode: 1, ResultDesc: "Internal server error" });
    }
}
