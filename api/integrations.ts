
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 15,
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
        // if JWT check failed or if token is a custom ID.
        if ((!user || authError) && token && !isJwt) {
            console.log(`[Auth Bridge] Attempting database verification for custom ID: ${token?.substring(0, 8)}...`);
            const { data: dbUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', token)
                .maybeSingle();

            if (dbUser && (['admin', 'super_admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'county_admin'].includes(dbUser.role))) {
                console.log('[Auth Bridge] Verified admin via database lookup:', dbUser.email);
                user = { id: dbUser.id, email: dbUser.email, role: dbUser.role, user_metadata: { institutionId: dbUser.institutionId } };
                authError = null;
            }
        }

        // Priority 3: Special bypass for Password Recovery (Unauthenticated)
        if (!user && action === 'forgotPassword') {
            console.log(`[Auth Bridge] Checking unauthenticated bypass for forgotPassword to ${recipient}`);
            const { data: targetUser } = await supabase
                .from('users')
                .select('*')
                .eq('email', recipient)
                .maybeSingle();

            if (targetUser) {
                console.log(`[Auth Bridge] Bypass granted: ${recipient} is a registered user.`);
                // We use 'targetUser' as the context for the forgotPassword action below
                user = { ...targetUser, id: 'system', role: 'system' };
                authError = null;
            } else {
                return res.status(404).json({ success: false, message: 'No registered account found with this email address.' });
            }
        }

        if (!user || authError) {
            return res.status(401).json({
                success: false,
                message: authHeader ? 'Unauthorized: Identity verification failed.' : 'Authorization session missing.',
                details: authError?.message || 'Access restricted to administrators or verified recovery requests.',
                hint: authHeader ? 'Ensure your role has administrative privileges.' : 'Please log in or ensure you are requesting recovery for a valid account.'
            });
        }

        // Fetch settings (bypass RLS as we are on the server)
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data;

        if (action === 'sendEmail') {
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
            const mpesa = bodyConfig || settings.mpesa_config;
            if (!mpesa) return res.status(400).json({ success: false, message: 'M-Pesa configuration is missing.' });

            const authStr = Buffer.from(`${mpesa.consumerKey}:${mpesa.consumerSecret}`).toString('base64');
            const baseUrl = mpesa.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

            const oauth = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { 'Authorization': `Basic ${authStr}` }
            });

            if (!oauth.ok) return res.status(401).json({ success: false, message: 'M-Pesa authentication failed. Check Consumer Key/Secret.' });
            const { access_token } = (await oauth.json()) as any;

            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from(mpesa.paybillNumber + mpesa.passkey + timestamp).toString('base64');

            const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    BusinessShortCode: mpesa.paybillNumber,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: Math.round(amount),
                    PartyA: recipient.replace(/[^\d]/g, ''),
                    PartyB: mpesa.paybillNumber,
                    PhoneNumber: recipient.replace(/[^\d]/g, ''),
                    CallBackURL: `https://${req.headers.host}/api/mpesa-callback`,
                    AccountReference: "Subscription",
                    TransactionDesc: "License Payment"
                })
            });

            const stkData = (await stkRes.json()) as any;
            if (stkRes.ok && stkData.ResponseCode === '0') {
                await supabase.from('mpesa_transactions').insert({
                    id: `txn_${Date.now()}`,
                    transaction_id: `STK_${stkData.CheckoutRequestID}`,
                    checkout_request_id: stkData.CheckoutRequestID,
                    institution_id: user.user_metadata?.institutionId || 'SYSTEM',
                    amount: amount,
                    phone_number: recipient,
                    status: 'pending'
                });
                return res.status(200).json({ success: true, message: 'M-Pesa prompt sent.', data: stkData });
            }
            return res.status(stkRes.status).json({ success: false, message: stkData.CustomerMessage || 'M-Pesa gateway rejected the request.', details: stkData });
        }

        return res.status(400).json({ success: false, message: 'Action not supported.' });

    } catch (e: any) {
        console.error('[Fatal Error]', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error', details: e.message });
    }
}
