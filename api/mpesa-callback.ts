import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 15,
};

/**
 * M-Pesa Callback Handler
 * 
 * This endpoint receives payment notifications from Safaricom's Daraja API
 * and automatically processes subscription renewals and account reactivation.
 * 
 * Flow:
 * 1. Receive callback from Safaricom with payment status
 * 2. Update transaction record in database
 * 3. If payment successful, automatically reactivate tenant account
 * 4. Extend subscription period based on plan (monthly/yearly)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    console.log('========================================');
    console.log('[M-Pesa Callback] Received notification from Safaricom');
    console.log('[M-Pesa Callback] Raw Body:', JSON.stringify(req.body, null, 2));
    console.log('========================================');

    try {
        // Initialize Supabase client (service role for backend operations)
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[M-Pesa Callback] Missing Supabase credentials');
            return res.status(500).json({
                ResultCode: 1,
                ResultDesc: 'Server configuration error'
            });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Parse M-Pesa callback data
        const { Body } = req.body;

        if (!Body || !Body.stkCallback) {
            console.error('[M-Pesa Callback] Invalid callback structure');
            return res.status(400).json({
                ResultCode: 1,
                ResultDesc: 'Invalid callback data'
            });
        }

        const { stkCallback } = Body;
        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = stkCallback;

        console.log(`[M-Pesa Callback] CheckoutRequestID: ${CheckoutRequestID}`);
        console.log(`[M-Pesa Callback] ResultCode: ${ResultCode}`);
        console.log(`[M-Pesa Callback] ResultDesc: ${ResultDesc}`);

        // Find the pending transaction
        const { data: transaction, error: fetchError } = await supabase
            .from('mpesa_transactions')
            .select('*')
            .eq('checkout_request_id', CheckoutRequestID)
            .single();

        if (fetchError || !transaction) {
            console.error('[M-Pesa Callback] Transaction not found:', CheckoutRequestID);
            return res.status(404).json({
                ResultCode: 1,
                ResultDesc: 'Transaction not found'
            });
        }

        console.log(`[M-Pesa Callback] Found transaction: ${transaction.id}`);
        console.log(`[M-Pesa Callback] Institution: ${transaction.institution_id}`);
        console.log(`[M-Pesa Callback] Amount: KES ${transaction.amount}`);

        // ResultCode "0" means success
        if (ResultCode === "0" || ResultCode === 0) {
            console.log('[M-Pesa Callback] ✅ Payment SUCCESSFUL');

            // Extract payment details from callback metadata
            let mpesaReceiptNumber = '';
            let transactionDate = '';
            let phoneNumber = transaction.phone_number;

            if (CallbackMetadata && CallbackMetadata.Item) {
                CallbackMetadata.Item.forEach((item: any) => {
                    if (item.Name === 'MpesaReceiptNumber') {
                        mpesaReceiptNumber = item.Value;
                    } else if (item.Name === 'TransactionDate') {
                        transactionDate = item.Value;
                    } else if (item.Name === 'PhoneNumber') {
                        phoneNumber = item.Value;
                    }
                });
            }

            console.log(`[M-Pesa Callback] Receipt Number: ${mpesaReceiptNumber}`);
            console.log(`[M-Pesa Callback] Transaction Date: ${transactionDate}`);

            // Update transaction status to completed
            const { error: updateError } = await supabase
                .from('mpesa_transactions')
                .update({
                    status: 'completed',
                    transaction_id: mpesaReceiptNumber || `MPESA_${CheckoutRequestID}`,
                    phone_number: phoneNumber
                })
                .eq('id', transaction.id);

            if (updateError) {
                console.error('[M-Pesa Callback] Failed to update transaction:', updateError);
            } else {
                console.log('[M-Pesa Callback] ✅ Transaction updated to COMPLETED');
            }

            // Process subscription renewal and account reactivation
            const metadata = transaction.metadata || {};

            if (metadata.type === 'subscription' && metadata.plan) {
                console.log(`[M-Pesa Callback] Processing ${metadata.plan} subscription renewal...`);

                // Calculate subscription extension
                const days = metadata.plan === 'monthly' ? 30 : 365;

                // Fetch current institution data
                const { data: institution, error: instError } = await supabase
                    .from('institutions')
                    .select('subscription_ends_at, status')
                    .eq('id', transaction.institution_id)
                    .single();

                if (instError) {
                    console.error('[M-Pesa Callback] Failed to fetch institution:', instError);
                } else {
                    // Calculate new subscription end date
                    const currentEnd = institution?.subscription_ends_at
                        ? new Date(institution.subscription_ends_at)
                        : new Date();

                    // Extend from whichever is later: current end date or now
                    const baseDate = Math.max(currentEnd.getTime(), Date.now());
                    const newEndDate = new Date(baseDate + (days * 24 * 60 * 60 * 1000));

                    console.log(`[M-Pesa Callback] Current subscription ends: ${currentEnd.toISOString()}`);
                    console.log(`[M-Pesa Callback] New subscription ends: ${newEndDate.toISOString()}`);

                    // Update institution: reactivate account and extend subscription
                    const { error: activationError } = await supabase
                        .from('institutions')
                        .update({
                            subscription_ends_at: newEndDate.toISOString(),
                            status: 'active' // Automatically reactivate the account
                        })
                        .eq('id', transaction.institution_id);

                    if (activationError) {
                        console.error('[M-Pesa Callback] Failed to reactivate account:', activationError);
                    } else {
                        console.log('[M-Pesa Callback] ✅ ACCOUNT REACTIVATED');
                        console.log(`[M-Pesa Callback] ✅ Subscription extended by ${days} days`);
                        console.log(`[M-Pesa Callback] ✅ New expiry: ${newEndDate.toISOString()}`);
                    }
                }
            } else if (metadata.type === 'invoice' && metadata.invoiceId) {
                console.log(`[M-Pesa Callback] Processing invoice payment: ${metadata.invoiceId}`);

                // Mark invoice as paid
                const { error: invoiceError } = await supabase
                    .from('invoices')
                    .update({ status: 'paid' })
                    .eq('id', metadata.invoiceId);

                if (invoiceError) {
                    console.error('[M-Pesa Callback] Failed to update invoice:', invoiceError);
                } else {
                    console.log('[M-Pesa Callback] ✅ Invoice marked as PAID');
                }

                // Create receipt
                const { error: receiptError } = await supabase
                    .from('receipts')
                    .insert({
                        id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        receipt_number: mpesaReceiptNumber || `REC-${Date.now().toString().slice(-6)}`,
                        institution_id: transaction.institution_id,
                        invoice_id: metadata.invoiceId,
                        amount_paid: transaction.amount,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'M-Pesa',
                        related_transaction_id: transaction.id
                    });

                if (receiptError) {
                    console.error('[M-Pesa Callback] Failed to create receipt:', receiptError);
                } else {
                    console.log('[M-Pesa Callback] ✅ Receipt created');
                }
            }

            console.log('[M-Pesa Callback] ========================================');
            console.log('[M-Pesa Callback] PAYMENT PROCESSING COMPLETE');
            console.log('[M-Pesa Callback] ========================================');

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: 'Payment processed successfully'
            });

        } else {
            // Payment failed or cancelled
            console.log(`[M-Pesa Callback] ❌ Payment FAILED: ${ResultDesc}`);

            const { error: updateError } = await supabase
                .from('mpesa_transactions')
                .update({ status: 'failed' })
                .eq('id', transaction.id);

            if (updateError) {
                console.error('[M-Pesa Callback] Failed to update transaction status:', updateError);
            } else {
                console.log('[M-Pesa Callback] Transaction marked as FAILED');
            }

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: 'Callback received'
            });
        }

    } catch (error: any) {
        console.error('[M-Pesa Callback] ERROR:', error);
        return res.status(500).json({
            ResultCode: 1,
            ResultDesc: 'Internal server error'
        });
    }
}