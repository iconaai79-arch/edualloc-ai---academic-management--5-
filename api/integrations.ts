
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 60,
};

const getSupabaseClient = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) return null;
    // We use a clean client without global headers to avoid the "invalid jwt" error 
    // when the token is a custom User ID instead of a Supabase JWT.
    return createClient(url, key);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).json({ status: 'Online', timestamp: new Date().toISOString() });

    try {
        if (!req.body) return res.status(400).json({ success: false, message: 'Missing body' });
        const { action, recipient, message, subject, amount, config: bodyConfig } = req.body;

        const authHeader = req.headers.authorization;
        const supabase = getSupabaseClient();

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

        if (!supabase) {
            return res.status(503).json({
                success: false,
                message: 'Server configuration error: Database keys missing.',
                hint: 'Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel settings.'
            });
        }

        // Auth check logic
        const token = authHeader?.replace('Bearer ', '');
        let user: any = null;
        let authError: any = null;

        // Determine if token is a JWT (contains three parts separated by dots)
        const isJwt = token?.includes('.') && token?.split('.').length === 3;

        if (isJwt && token) {
            try {
                // Priority 1: Check standard Supabase Auth for real JWTs
                const authResponse = await supabase.auth.getUser(token);
                user = authResponse.data.user;
                authError = authResponse.error;
            } catch (e) {
                authError = e;
            }
        }

        // Priority 2: Auth Bridge - Fallback to verifying against custom 'users' table 
        if ((!user || authError) && token && !isJwt) {
            console.log(`[Auth Bridge] Attempting database verification for custom ID: ${token?.substring(0, 8)}...`);
            const { data: dbUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', token)
                .maybeSingle();

            if (dbUser) {
                console.log(`[Auth Bridge] Verified identity for ${dbUser.email} (Role: ${dbUser.role})`);
                user = { id: dbUser.id, email: dbUser.email, role: dbUser.role, user_metadata: { institutionId: dbUser.institutionId } };
                authError = null;
            } else {
                console.warn(`[Auth Bridge] Database lookup failed. No user found for ID: ${token?.substring(0, 8)}...`);
            }
        }

        // Priority 3: Special bypass for Unauthenticated Actions (Password Recovery & Registration)
        if (!user && (action === 'forgotPassword' || action === 'resetPasswordWithToken' || action === 'sendEmail')) {
            console.log(`[Auth Bridge] Checking unauthenticated bypass for ${action}`);

            // For forgotPassword and sendEmail, we verify the recipient is a registered user
            if (action === 'forgotPassword' || action === 'sendEmail') {
                const { data: targetUser } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', recipient)
                    .maybeSingle();

                if (targetUser) {
                    console.log(`[Auth Bridge] Bypass granted for ${action} to ${recipient}`);
                    user = { ...targetUser, id: 'system', role: 'system' };
                    authError = null;
                } else if (action === 'forgotPassword') {
                    return res.status(404).json({ success: false, message: 'No registered account found with this email address.' });
                }
            }

            // For resetPasswordWithToken, we verify the token itself later in the action handler
            // But we need to set a 'system' user context to pass the auth check
            if (action === 'resetPasswordWithToken') {
                user = { id: 'system', role: 'system' };
                authError = null;
            }
        }

        if (!user || authError) {
            console.error('[Auth Bridge] Final verification failed.', { hasToken: !!token, isJwt, authError: authError?.message });
            return res.status(401).json({
                success: false,
                message: authHeader ? 'Unauthorized: Identity verification failed.' : 'Authorization session missing.',
                details: authError?.message || 'Access restricted to registered users or verified recovery requests.',
                hint: authHeader ? 'Ensure you are logged in or using a valid User ID.' : 'Please log in again.'
            });
        }

        // Fetch settings (bypass RLS as we are on the server)
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data;

        if (action === 'sendEmail') {
            const adminRoles = ['admin', 'super_admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'county_admin', 'county_staff', 'county_cec', 'county_governor', 'academics_officer'];
            // Regular authenticated sendEmail requires admin privileges. 
            // 'system' user is for unauthenticated bypasses like password reset.
            if (!adminRoles.includes(user.role) && user.id !== 'system') {
                return res.status(403).json({ success: false, message: 'Permission denied: Only administrative accounts can send system emails.' });
            }

            const emailConfig = bodyConfig || settings.email_config || settings.emailConfig;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'Email configuration is missing.' });

            // Handle both snake_case and camelCase keys
            const host = emailConfig.host;
            const port = emailConfig.port;
            const username = emailConfig.username;
            const password = emailConfig.password;
            const fromEmail = emailConfig.from_email || emailConfig.fromEmail || username;
            const fromName = emailConfig.from_name || emailConfig.fromName || 'EduAi';

            const { default: nodemailer } = await import('nodemailer');
            const transporter = nodemailer.createTransport({
                host: host,
                port: Number(port || 587),
                secure: Number(port) === 465,
                auth: { user: username, pass: password },
                tls: { rejectUnauthorized: false }
            });

            const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: recipient,
                subject: subject || 'EduAi Notification',
                text: message,
                html: (message || '').replace(/\n/g, '<br>')
            });

            return res.status(200).json({ success: true, message: 'Email dispatched successfully.', messageId: info.messageId });
        }

        if (action === 'sendSms') {
            const adminRoles = ['admin', 'super_admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'county_admin', 'county_staff', 'county_cec', 'county_governor', 'academics_officer'];
            if (!adminRoles.includes(user.role)) {
                return res.status(403).json({ success: false, message: 'Permission denied: Only administrative accounts can send bulk SMS.' });
            }

            const smsConfig = bodyConfig || settings.sms_config;
            if (!smsConfig) return res.status(400).json({ success: false, message: 'SMS configuration is missing.' });

            const params = new URLSearchParams({
                userid: smsConfig.apiKey || smsConfig.api_key,
                password: smsConfig.apiSecret || smsConfig.api_secret,
                mobile: recipient.replace(/[^\d]/g, ''),
                msg: message || '',
                senderid: smsConfig.fromNumber || 'ABMIS',
                msgType: 'text', output: 'json'
            });

            const smsRes = await fetch(`https://sms.abmis.co.ke/smsapi/send?${params.toString()}`);
            const smsDetail = await smsRes.text();
            return res.status(200).json({ success: true, message: 'SMS request sent.', detail: smsDetail });
        }

        if (action === 'forgotPassword') {
            const emailConfig = bodyConfig || settings.email_config || settings.emailConfig;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'Email configuration is missing.' });

            // We use the 'user' object populated during the auth phase
            if (!user || user.id === 'system' && !user.email) return res.status(404).json({ success: false, message: 'Account not found.' });

            // Generate a secure reset token
            const { randomBytes } = await import('crypto');
            const token = randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

            // Store the token in the database
            const { error: updateError } = await supabase
                .from('users')
                .update({ reset_token: token, reset_token_expires: expires })
                .eq('email', recipient);

            if (updateError) {
                console.error('[Forgot Password] Failed to store reset token:', updateError);
                return res.status(500).json({ success: false, message: 'Failed to initiate recovery. System storage error.' });
            }

            // Handle both snake_case and camelCase keys
            const host = emailConfig.host;
            const port = emailConfig.port;
            const username = emailConfig.username;
            const password = emailConfig.password;
            const fromEmail = emailConfig.from_email || emailConfig.fromEmail || username;
            const fromName = emailConfig.from_name || emailConfig.fromName || 'EduAi Notification';

            console.log(`[Forgot Password] Dispatching recovery link to: ${recipient} using ${host}:${port}`);

            const { default: nodemailer } = await import('nodemailer');
            const transporter = nodemailer.createTransport({
                host: host,
                port: Number(port || 587),
                secure: Number(port) === 465,
                auth: { user: username, pass: password },
                tls: { rejectUnauthorized: false }
            });

            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const resetLink = `${protocol}://${req.headers.host}/?resetToken=${token}`;

            const recoverySubject = "Password Reset Request - EduAlloc Hub";
            const recoveryBody = `Dear ${user.name},\n\nYou requested a password reset for your account on the EduAlloc Academic Management System.\n\nPlease click the link below to set a new password. This link is valid for 1 hour:\n\n${resetLink}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n\nBest Regards,\nSystem Admin`;

            const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: recipient,
                subject: recoverySubject,
                text: recoveryBody,
                html: recoveryBody.replace(/\n/g, '<br>').replace(resetLink, `<a href="${resetLink}">${resetLink}</a>`)
            });

            console.log(`[Forgot Password] Recovery link sent successfully. Message ID: ${info.messageId}`);
            return res.status(200).json({ success: true, message: 'Recovery link dispatched.', messageId: info.messageId });
        }

        if (action === 'resetPasswordWithToken') {
            const { token: resetToken, newPassword } = req.body;
            if (!resetToken || !newPassword) return res.status(400).json({ success: false, message: 'Missing token or new password.' });

            const { data: targetUser, error: fetchError } = await supabase
                .from('users')
                .select('*')
                .eq('reset_token', resetToken)
                .gt('reset_token_expires', new Date().toISOString())
                .maybeSingle();

            if (fetchError || !targetUser) {
                return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({ password: newPassword, reset_token: null, reset_token_expires: null })
                .eq('id', targetUser.id);

            if (updateError) {
                return res.status(500).json({ success: false, message: 'Failed to update password.' });
            }

            return res.status(200).json({ success: true, message: 'Password updated successfully. You can now log in.' });
        }

        if (action === 'initiateStkPush') {
            const mpesa = bodyConfig || settings.mpesa_config || settings.mpesaConfig;
            if (!mpesa) return res.status(400).json({ success: false, message: 'M-Pesa configuration is missing.' });

            const consumerKey = (mpesa.consumerKey || mpesa.consumer_key || '').trim();
            const consumerSecret = (mpesa.consumerSecret || mpesa.consumer_secret || '').trim();
            const paybill = (mpesa.paybillNumber || mpesa.paybill_number || '').trim();
            const passkey = (mpesa.passkey || '').trim();

            if (!consumerKey || !consumerSecret) {
                return res.status(400).json({ success: false, message: 'M-Pesa Consumer Key or Secret is missing in config.' });
            }

            const baseUrl = mpesa.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

            console.log(`[M-Pesa] Initiating STK push for ${recipient} (Amount: ${amount}) using ${mpesa.environment || 'sandbox'}`);

            const authStr = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

            let oauth;
            try {
                oauth = await fetchWithTimeout(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                    headers: { 'Authorization': `Basic ${authStr}` }
                }, 10000);
            } catch (e: any) {
                console.error('[M-Pesa OAuth] Request failed:', e.message);
                return res.status(504).json({ success: false, message: 'M-Pesa gateway timed out during authentication.' });
            }

            if (!oauth.ok) {
                const errorBody = await oauth.text();
                console.error('[M-Pesa OAuth] Failed:', errorBody);
                return res.status(401).json({
                    success: false,
                    message: 'M-Pesa authentication failed. Check Consumer Key/Secret.',
                    details: errorBody
                });
            }
            const { access_token } = (await oauth.json()) as any;

            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from(paybill + passkey + timestamp).toString('base64');

            let stkRes;
            try {
                stkRes = await fetchWithTimeout(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        BusinessShortCode: paybill,
                        Password: password,
                        Timestamp: timestamp,
                        TransactionType: "CustomerPayBillOnline",
                        Amount: Math.round(amount),
                        PartyA: recipient.replace(/[^\d]/g, ''),
                        PartyB: paybill,
                        PhoneNumber: recipient.replace(/[^\d]/g, ''),
                        CallBackURL: `https://${req.headers.host}/api/mpesa-callback`,
                        AccountReference: (req.body.metadata?.institutionCode || "Subscription").substring(0, 12),
                        TransactionDesc: `License: ${req.body.metadata?.institutionName || "Subscription"}`.substring(0, 20)
                    })
                }, 15000); // 15s timeout for the actual prompt
            } catch (e: any) {
                console.error('[M-Pesa STK] Request failed:', e.message);
                return res.status(504).json({ success: false, message: 'M-Pesa gateway timed out sending the prompt.' });
            }

            const stkData = (await stkRes.json()) as any;
            if (stkRes.ok && stkData.ResponseCode === '0') {
                await supabase.from('mpesa_transactions').insert({
                    id: `txn_${Date.now()}`,
                    transaction_id: `STK_${stkData.CheckoutRequestID}`,
                    checkout_request_id: stkData.CheckoutRequestID,
                    institution_id: req.body.metadata?.institutionId || user.user_metadata?.institutionId || 'SYSTEM',
                    amount: amount,
                    phone_number: recipient,
                    status: 'pending',
                    metadata: req.body.metadata || {}
                });
                return res.status(200).json({ success: true, message: 'M-Pesa prompt sent.', data: stkData });
            }
            return res.status(stkRes.status).json({ success: false, message: stkData.CustomerMessage || 'M-Pesa gateway rejected the request.', details: stkData });
        }

        if (action === 'queryStkStatus') {
            const mpesa = bodyConfig || settings.mpesa_config || settings.mpesaConfig;
            if (!mpesa) return res.status(400).json({ success: false, message: 'M-Pesa configuration is missing.' });

            const { checkoutRequestId } = req.body;
            if (!checkoutRequestId) return res.status(400).json({ success: false, message: 'Missing checkoutRequestId' });

            // 1. Check DB first (in case callback arrived already)
            const { data: existingTxn } = await supabase
                .from('mpesa_transactions')
                .select('status')
                .eq('checkout_request_id', checkoutRequestId)
                .maybeSingle();

            if (existingTxn && existingTxn.status && existingTxn.status !== 'pending') {
                console.log(`[queryStkStatus] Returning status from DB: ${existingTxn.status}`);
                return res.status(200).json({ success: true, status: existingTxn.status, source: 'database' });
            }

            const consumerKey = (mpesa.consumerKey || mpesa.consumer_key || '').trim();
            const consumerSecret = (mpesa.consumerSecret || mpesa.consumer_secret || '').trim();
            const paybill = (mpesa.paybillNumber || mpesa.paybill_number || '').trim();
            const passkey = (mpesa.passkey || '').trim();

            const authStr = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
            const baseUrl = mpesa.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

            const oauth = await fetchWithTimeout(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { 'Authorization': `Basic ${authStr}` }
            }, 10000);

            if (!oauth.ok) return res.status(401).json({ success: false, message: 'M-Pesa Auth failed during status query.' });
            const { access_token } = (await oauth.json()) as any;

            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from(paybill + passkey + timestamp).toString('base64');

            const statusRes = await fetchWithTimeout(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    BusinessShortCode: paybill,
                    Password: password,
                    Timestamp: timestamp,
                    CheckoutRequestID: checkoutRequestId
                })
            }, 10000);

            const statusData = (await statusRes.json()) as any;
            let finalStatus = 'pending';

            // ResultCode 0 is success. 
            // We use loose comparison or String() to handle both string and number types from Daraja API
            if (statusRes.ok && String(statusData.ResultCode) === '0') {
                finalStatus = 'completed';
            }
            // If we have a ResultCode that is NOT 0, it's generally a failure (cancelled, invalid PIN, etc.)
            else if (statusRes.ok && statusData.ResultCode && String(statusData.ResultCode) !== '0') {
                finalStatus = 'failed';
            }
            // Note: If statusRes.ok is false, it often means Safaricom returned 400 or 404 
            // because the transaction is still "In Process". In these cases, we keep status as 'pending'.

            // Sync with DB
            if (finalStatus !== 'pending') {
                console.log(`[queryStkStatus] Transaction ${checkoutRequestId} finished with status: ${finalStatus}`);
                await supabase.from('mpesa_transactions').update({ status: finalStatus }).eq('checkout_request_id', checkoutRequestId);
            }

            return res.status(200).json({ success: true, status: finalStatus, details: statusData });
        }

        if (action === 'verifyTransactionManually') {
            if (user.role !== 'super_admin') {
                return res.status(403).json({ success: false, message: 'Permission denied: Manual verification requires Super Admin privileges.' });
            }

            const { transactionId } = req.body;
            if (!transactionId) return res.status(400).json({ success: false, message: 'Missing transactionId' });

            // 1. Fetch transaction
            const { data: transaction, error: fetchError } = await supabase
                .from('mpesa_transactions')
                .select('*')
                .eq('id', transactionId)
                .single();

            if (fetchError || !transaction) {
                return res.status(404).json({ success: false, message: 'Transaction not found for manual verification.' });
            }

            if (transaction.status === 'completed') {
                return res.status(200).json({ success: true, message: 'Transaction is already completed.' });
            }

            // 2. Update status
            const { error: updateTxnError } = await supabase
                .from('mpesa_transactions')
                .update({
                    status: 'completed',
                    metadata: { ...transaction.metadata, verified_manually: true, verified_at: new Date().toISOString() }
                })
                .eq('id', transactionId);

            if (updateTxnError) return res.status(500).json({ success: false, message: 'Failed to update transaction status.' });

            // 3. Trigger reactivation logic (similar to callback but simplified for manual)
            const metadata = transaction.metadata || {};
            if (metadata.type === 'subscription' && metadata.plan) {
                const days = metadata.plan === 'monthly' ? 30 : 365;

                const { data: institution } = await supabase
                    .from('institutions')
                    .select('subscription_ends_at, id')
                    .eq('id', transaction.institution_id)
                    .single();

                if (institution) {
                    const currentEnd = institution.subscription_ends_at ? new Date(institution.subscription_ends_at) : new Date();
                    const baseDate = Math.max(currentEnd.getTime(), Date.now());
                    const newEndDate = new Date(baseDate + (days * 24 * 60 * 60 * 1000));

                    await supabase.from('institutions').update({
                        subscription_ends_at: newEndDate.toISOString(),
                        status: 'active'
                    }).eq('id', institution.id);

                    // Create invoice & receipt
                    const invoiceId = `inv_manual_${Date.now()}`;
                    await supabase.from('invoices').insert({
                        id: invoiceId,
                        invoice_number: `INV-MAN-${Date.now().toString().slice(-6)}`,
                        institution_id: institution.id,
                        issue_date: new Date().toISOString().split('T')[0],
                        due_date: new Date().toISOString().split('T')[0],
                        total_amount: transaction.amount,
                        status: 'paid',
                        items: JSON.stringify([{
                            description: `Manual Verification: ${metadata.plan} Subscription`,
                            quantity: 1,
                            unitPrice: transaction.amount,
                            amount: transaction.amount
                        }])
                    });

                    await supabase.from('receipts').insert({
                        id: `rec_manual_${Date.now()}`,
                        receipt_number: `REC-MAN-${Date.now().toString().slice(-6)}`,
                        institution_id: institution.id,
                        invoice_id: invoiceId,
                        amount_paid: transaction.amount,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: 'Manual Verification',
                        related_transaction_id: transaction.id
                    });
                }
            } else if (metadata.type === 'invoice' && metadata.invoiceId) {
                await supabase.from('invoices').update({ status: 'paid' }).eq('id', metadata.invoiceId);
                await supabase.from('receipts').insert({
                    id: `rec_inv_manual_${Date.now()}`,
                    receipt_number: `REC-INV-MAN-${Date.now().toString().slice(-6)}`,
                    institution_id: transaction.institution_id,
                    invoice_id: metadata.invoiceId,
                    amount_paid: transaction.amount,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: 'Manual Verification',
                    related_transaction_id: transaction.id
                });
            }

            // 4. Send Notifications
            try {
                const { data: inst } = await supabase.from('institutions').select('name, email').eq('id', transaction.institution_id).single();
                if (inst) {
                    const notifyMessage = `Dear Admin, your payment of KES ${transaction.amount} for ${inst.name} has been manually verified. Your account is now active and your subscription has been extended. Thank you for choosing EduAi.`;

                    // Send Email
                    const emailConfig = settings.email_config || settings.emailConfig;
                    if (emailConfig && inst.email) {
                        try {
                            const { default: nodemailer } = await import('nodemailer');
                            const transporter = nodemailer.createTransport({
                                host: emailConfig.host,
                                port: Number(emailConfig.port || 587),
                                auth: { user: emailConfig.username, pass: emailConfig.password },
                                tls: { rejectUnauthorized: false }
                            });
                            await transporter.sendMail({
                                from: `"${emailConfig.fromName || 'EduAi Notification'}" <${emailConfig.fromEmail || emailConfig.username}>`,
                                to: inst.email,
                                subject: 'Payment Verified & Account Reactivated',
                                text: notifyMessage,
                                html: `<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
                                    <h2 style="color: #4f46e5;">Payment Verified Successfully</h2>
                                    <p>${notifyMessage.replace(/\n/g, '<br>')}</p>
                                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                                    <p style="font-size: 12px; color: #64748b;">This is an automated notification from the EduAi Academic Management Platform.</p>
                                </div>`
                            });
                            console.log(`[Manual Verify] Email sent to ${inst.email}`);
                        } catch (emailErr) {
                            console.error('[Manual Verify] Email notification failed:', emailErr);
                        }
                    }

                    // Send SMS
                    const smsConfig = settings.sms_config;
                    if (smsConfig && transaction.phone_number) {
                        try {
                            const params = new URLSearchParams({
                                userid: smsConfig.apiKey || smsConfig.api_key,
                                password: smsConfig.apiSecret || smsConfig.api_secret,
                                mobile: transaction.phone_number.replace(/[^\d]/g, ''),
                                msg: notifyMessage,
                                senderid: smsConfig.fromNumber || 'ABMIS',
                                msgType: 'text', output: 'json'
                            });
                            await fetch(`https://sms.abmis.co.ke/smsapi/send?${params.toString()}`);
                            console.log(`[Manual Verify] SMS sent to ${transaction.phone_number}`);
                        } catch (smsErr) {
                            console.error('[Manual Verify] SMS notification failed:', smsErr);
                        }
                    }
                }
            } catch (notifyErr) {
                console.error('[Manual Verify] Notification process encountered an error:', notifyErr);
            }

            return res.status(200).json({ success: true, message: 'Transaction verified manually, account reactivated, and notifications sent.' });
        }

        return res.status(400).json({ success: false, message: 'Action not supported.' });

    } catch (e: any) {
        console.error('[Fatal Error]', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error', details: e.message });
    }
}
