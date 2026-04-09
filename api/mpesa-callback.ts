import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';

export const config = {
    maxDuration: 60,
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
        const supabase = createServiceClient();

        // Helper for fetch with timeout
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

        // Fetch settings (bypass RLS as we are on the server)
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data;

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

                        // Create an invoice for the subscription
                        const invoiceId = `inv_${Date.now()}`;
                        await supabase.from('invoices').insert({
                            id: invoiceId,
                            invoice_number: `INV-SUB-${Date.now().toString().slice(-6)}`,
                            institution_id: transaction.institution_id,
                            issue_date: new Date().toISOString().split('T')[0],
                            due_date: new Date().toISOString().split('T')[0],
                            total_amount: transaction.amount,
                            status: 'paid',
                            items: JSON.stringify([{
                                description: `${metadata.plan.charAt(0).toUpperCase() + metadata.plan.slice(1)} Subscription renewal`,
                                quantity: 1,
                                unitPrice: transaction.amount,
                                amount: transaction.amount
                            }])
                        });

                        // Create a receipt
                        await supabase.from('receipts').insert({
                            id: `rec_${Date.now()}`,
                            receipt_number: mpesaReceiptNumber || `REC-${Date.now().toString().slice(-6)}`,
                            institution_id: transaction.institution_id,
                            invoice_id: invoiceId,
                            amount_paid: transaction.amount,
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_method: 'M-Pesa',
                            related_transaction_id: transaction.id
                        });

                        console.log(`[M-Pesa Callback] ✅ Subscription extended by ${days} days`);
                        console.log(`[M-Pesa Callback] ✅ New expiry: ${newEndDate.toISOString()}`);

                        // Create notification for subscription
                        if (metadata.requesterId) {
                            await supabase.from('app_notifications').insert({
                                id: `ntf_${Date.now()}`,
                                user_id: metadata.requesterId,
                                message: `Successfully renewed ${metadata.plan} subscription! New expiry: ${newEndDate.toLocaleDateString()}`,
                                type: 'success',
                                is_read: false,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                }
            } else if (metadata.type === 'sms' && metadata.units) {
                console.log(`[M-Pesa Callback] Crediting SMS units: ${metadata.units} for ${transaction.institution_id}`);

                const unitsToCredit = parseInt(metadata.units);
                const { error: smsCreditError } = await supabase.rpc('increment_sms_balance', {
                    inst_id: transaction.institution_id,
                    amount: unitsToCredit
                });

                if (smsCreditError) {
                    console.error('[M-Pesa Callback] RPC Error crediting SMS:', smsCreditError);
                    // Fallback to direct update if RPC fails
                    await supabase.from('institutions')
                        .update({ sms_balance: supabase.rpc('increment', { amount: unitsToCredit }) })
                        .eq('id', transaction.institution_id);
                }

                // Create invoice & receipt for SMS
                const invoiceId = `inv_sms_${Date.now()}`;
                await supabase.from('invoices').insert({
                    id: invoiceId,
                    invoice_number: `INV-SMS-${Date.now().toString().slice(-6)}`,
                    institution_id: transaction.institution_id,
                    issue_date: new Date().toISOString().split('T')[0],
                    due_date: new Date().toISOString().split('T')[0],
                    total_amount: transaction.amount,
                    status: 'paid',
                    items: JSON.stringify([{
                        description: `SMS Units Purchase - ${unitsToCredit} units`,
                        quantity: 1,
                        unitPrice: transaction.amount,
                        amount: transaction.amount
                    }])
                });

                await supabase.from('receipts').insert({
                    id: `rec_sms_${Date.now()}`,
                    receipt_number: mpesaReceiptNumber || `REC-SMS-${Date.now().toString().slice(-6)}`,
                    institution_id: transaction.institution_id,
                    invoice_id: invoiceId,
                    amount_paid: transaction.amount,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'M-Pesa',
                    related_transaction_id: transaction.id
                });

                // Fetch new balance for accurate notifications
                const { data: updatedInst } = await supabase
                    .from('institutions')
                    .select('sms_balance, email')
                    .eq('id', transaction.institution_id)
                    .single();

                const newBalance = updatedInst?.sms_balance || 0;

                console.log(`[M-Pesa Callback] ✅ SMS Units Credited: ${unitsToCredit}. New Total: ${newBalance}`);

                // Create notification if requesterId exists
                if (metadata.requesterId) {
                    await supabase.from('app_notifications').insert({
                        id: `ntf_sms_${Date.now()}`,
                        user_id: metadata.requesterId,
                        message: `Payment successful! ${unitsToCredit.toLocaleString()} SMS units have been added to your institution's balance. New Balance: ${newBalance.toLocaleString()} units.`,
                        type: 'success',
                        is_read: false,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`[M-Pesa Callback] Notification created for user: ${metadata.requesterId}`);
                }

                // Send Email confirmation
                const emailConfig = settings.email_config || settings.emailConfig;
                if (emailConfig && updatedInst?.email) {
                    try {
                        const { default: nodemailer } = await import('nodemailer');
                        const transporter = nodemailer.createTransport({
                            host: emailConfig.host,
                            port: Number(emailConfig.port || 587),
                            auth: { user: emailConfig.username, pass: emailConfig.password },
                            tls: { rejectUnauthorized: false }
                        });
                        
                        const unitsCount = unitsToCredit.toLocaleString();
                        const purpose = `SMS Top-up (${unitsCount} units)`;
                        const emailMessage = `Dear Admin, payment confirmed! ${unitsCount} SMS units have been added to your balance. Your new balance is ${newBalance.toLocaleString()} units. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;

                        const htmlTemplate = `
                            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                <div style="background-color: #4f46e5; padding: 32px 24px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Payment Verified</h1>
                                </div>
                                <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
                                    <p style="margin-top: 0; font-weight: 600; font-size: 18px;">Hello,</p>
                                    <p style="margin-bottom: 24px;">Your payment of <strong>KES ${transaction.amount.toLocaleString()}</strong> for SMS units has been successfully verified.</p>
                                    
                                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                                        <table style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 40%;">Amount Paid</td>
                                                <td style="padding: 8px 0; color: #1e293b; font-weight: 800; font-size: 15px;">KES ${transaction.amount.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Purpose</td>
                                                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 15px;">${purpose}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Reference</td>
                                                <td style="padding: 8px 0; color: #1e293b; font-family: monospace; font-size: 14px;">${mpesaReceiptNumber || transaction.id}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">New SMS Balance</td>
                                                <td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 15px;">${newBalance.toLocaleString()} Units</td>
                                            </tr>
                                        </table>
                                    </div>
                                    
                                    <p style="margin-bottom: 0;">Thank you for your continued partnership with the Eduai Automation Platform.</p>
                                </div>
                                <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; color: #64748b; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
                                    <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px;">&copy; 2024 Eduai Automation Hub. All rights reserved.</p>
                                </div>
                            </div>
                        `;

                        await transporter.sendMail({
                            from: `"${emailConfig.fromName || 'Eduai Automation Hub'}" <${emailConfig.fromEmail || emailConfig.username}>`,
                            to: updatedInst.email,
                            subject: 'SMS Units Topped Up Successfully',
                            text: emailMessage,
                            html: htmlTemplate
                        });
                    } catch (emailErr) {
                        console.error('[M-Pesa Callback] Email notification failed:', emailErr);
                    }
                }

                // Send SMS confirmation if payerPhoneNumber exists
                const smsConfig = settings.sms_config;
                const payerPhone = metadata.payerPhoneNumber || phoneNumber;

                if (smsConfig && payerPhone) {
                    const unitsCount = unitsToCredit.toLocaleString();
                    const smsMessage = `Payment successful! ${unitsCount} SMS units have been added to your institution's balance. New Balance: ${newBalance.toLocaleString()} units. Ref: ${mpesaReceiptNumber || transaction.id}. Thank you for choosing Eduai Automation.`;

                    try {
                        const provider = smsConfig.provider || 'Zettatel';
                        let phone = (payerPhone as string).replace(/[^\d]/g, '');

                        // Normalize phone (254 spec)
                        if (phone.startsWith('2540')) phone = '254' + phone.substring(4);
                        else if (phone.startsWith('0')) phone = '254' + phone.substring(1);
                        else if (phone.length === 9) phone = '254' + phone;

                        const baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                        
                        const smsParams = new URLSearchParams({
                            userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId,
                            password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password,
                            mobile: phone,
                            msg: smsMessage,
                            senderid: smsConfig.fromNumber || provider,
                            msgType: 'text',
                            output: 'json'
                        });

                        const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                        await fetchWithTimeout(finalUrl, { method: 'GET' }, 15000);
                    } catch (smsErr) {
                        console.error('[M-Pesa Callback] Failed to send SMS confirmation:', smsErr);
                    }
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