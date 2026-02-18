
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../lib/supabase';
import nodemailer from 'nodemailer';
import { Buffer } from 'node:buffer';

export const config = {
    maxDuration: 15,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 0. Handle CORS and Options first
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'Online', timestamp: new Date().toISOString() });
    }

    // 1. Validate Request
    if (!req.body) {
        return res.status(400).json({ success: false, message: 'Request body is required.' });
    }

    const { action, recipient, message, subject, amount, config: bodyConfig, checkoutRequestId } = req.body;
    console.log(`[Integrations] Action: ${action} to ${recipient}`);

    try {
        // 2. Initialize Backend Client
        const authHeader = req.headers.authorization;
        const supabase = createServerClient(authHeader);

        if (!supabase) {
            console.error('[Integrations] Supabase client initialization failed. Check environment variables.');
            return res.status(503).json({
                success: false,
                message: 'Internal configuration error: Database service unavailable.',
                hint: 'Check Vercel Environment Variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
            });
        }

        // 3. Authenticate User Session
        let user: any = null;
        try {
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
            if (authError || !authUser) {
                return res.status(401).json({
                    success: false,
                    message: authError?.message || 'Access Denied: Invalid Session',
                    hint: 'Please sign in again.'
                });
            }
            user = authUser;
        } catch (e: any) {
            console.error('[Integrations] Auth Error:', e);
            return res.status(401).json({ success: false, message: 'Authentication Service Error' });
        }

        // 4. Load System Settings (Fallback)
        let systemSettings: any = {};
        try {
            const { data, error } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
            if (data) systemSettings = data.data;
        } catch (e) {
            console.warn('[Integrations] System settings lookup failed:', e);
        }

        // --- EMAIL ACTION ---
        if (action === 'sendEmail') {
            const emailConfig = bodyConfig || systemSettings?.email_config;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'No email configuration provided.' });

            const provider = emailConfig.provider || 'smtp';
            const fromName = emailConfig.fromName || emailConfig.from_name || "EduAi Notification";
            const fromEmail = emailConfig.fromEmail || emailConfig.from_email || "notifications@edualloc.ai";

            // Resend Flow
            if (provider === 'resend' || emailConfig.resendApiKey) {
                const apiKey = emailConfig.resendApiKey || emailConfig.apiKey;
                if (!apiKey) return res.status(400).json({ success: false, message: 'Resend API key missing.' });

                const resendResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: `${fromName} <${fromEmail}>`,
                        to: [recipient],
                        subject: subject || "Notification",
                        text: message,
                        html: (message || '').replace(/\n/g, '<br>')
                    })
                });

                const resendData = await resendResponse.json();
                if (!resendResponse.ok) {
                    return res.status(502).json({ success: false, message: 'Resend delivery failed.', details: resendData });
                }
                return res.status(200).json({ success: true, message: 'Email sent via Resend.', messageId: resendData.id });
            }

            // SMTP Flow
            const port = Number(emailConfig.port || 587);
            const encryption = emailConfig.encryption || 'tls';

            if (!emailConfig.host || !emailConfig.username) {
                return res.status(400).json({ success: false, message: 'SMTP settings incomplete. Host and Username required.' });
            }

            const transporter = nodemailer.createTransport({
                host: emailConfig.host,
                port: port,
                secure: port === 465 || encryption === 'ssl',
                auth: {
                    user: emailConfig.username,
                    pass: emailConfig.password
                },
                tls: {
                    rejectUnauthorized: false,
                    minVersion: 'TLSv1.2'
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000
            });

            try {
                const info = await transporter.sendMail({
                    from: `"${fromName}" <${fromEmail}>`,
                    to: recipient,
                    subject: subject || "Notification",
                    text: message,
                    html: (message || '').replace(/\n/g, '<br>')
                });
                return res.status(200).json({ success: true, message: 'SMTP Relay Success', messageId: info.messageId });
            } catch (err: any) {
                console.error('[Integrations] SMTP Error:', err);
                let hint = "Double check your SMTP credentials and port settings.";
                if (err.code === 'EAUTH') hint = "Invalid SMTP credentials. Check username/password.";
                if (err.message.includes('Relay')) hint = "Sender email address not authorized for this relay.";

                return res.status(500).json({
                    success: false,
                    message: `SMTP Failure: ${err.message}`,
                    hint,
                    code: err.code
                });
            }
        }

        // --- SMS ACTION ---
        if (action === 'sendSms') {
            const smsConfig = bodyConfig || systemSettings?.sms_config;
            if (!smsConfig) return res.status(400).json({ success: false, message: 'SMS configuration not found.' });

            const apiKey = smsConfig.api_key || smsConfig.apiKey;
            const apiSecret = smsConfig.api_secret || smsConfig.apiSecret;
            const fromNumber = smsConfig.from_number || smsConfig.fromNumber;

            if (!apiKey || !apiSecret) return res.status(400).json({ success: false, message: 'SMS credentials missing.' });

            let cleanPhone = (recipient || '').replace(/[^\d+]/g, '').trim();
            if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
            if (!cleanPhone.startsWith('254') && !cleanPhone.startsWith('+')) cleanPhone = '254' + cleanPhone;

            const params = new URLSearchParams({
                userid: apiKey,
                password: apiSecret as string,
                mobile: cleanPhone,
                msg: message || '',
                senderid: fromNumber || 'ABMIS',
                msgType: 'text',
                output: 'json'
            });

            try {
                const smsRes = await fetch(`https://sms.abmis.co.ke/smsapi/send?${params.toString()}`);
                const smsText = await smsRes.text();
                return res.status(200).json({ success: true, response: smsText });
            } catch (e: any) {
                return res.status(502).json({ success: false, message: 'SMS Gateway unreachable.', error: e.message });
            }
        }

        // --- MPESA ACTION ---
        if (action === 'initiateStkPush') {
            const mpesaConfig = bodyConfig || systemSettings?.mpesa_config;
            if (!mpesaConfig) return res.status(400).json({ success: false, message: 'M-Pesa configuration not found.' });

            const consumerKey = mpesaConfig.consumer_key || mpesaConfig.consumerKey;
            const consumerSecret = mpesaConfig.consumer_secret || mpesaConfig.consumerSecret;
            const paybillNumber = mpesaConfig.paybill_number || mpesaConfig.paybillNumber;
            const passkey = mpesaConfig.passkey;
            const isSandbox = mpesaConfig.environment !== 'production';

            if (!consumerKey || !consumerSecret || !paybillNumber || !passkey) {
                return res.status(400).json({ success: false, message: 'M-Pesa Daraja credentials incomplete.' });
            }

            const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
            const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

            const oauthRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });

            if (!oauthRes.ok) return res.status(401).json({ success: false, message: 'Daraja Auth failed. Check credentials.' });
            const { access_token } = await oauthRes.json();

            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from(paybillNumber + passkey + timestamp).toString('base64');
            const callbackUrl = `https://${req.headers.host}/api/mpesa-callback`;

            const stkPushRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    BusinessShortCode: paybillNumber,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: "CustomerPayBillOnline",
                    Amount: Math.round(amount),
                    PartyA: recipient.replace(/[^\d]/g, '').trim(),
                    PartyB: paybillNumber,
                    PhoneNumber: recipient.replace(/[^\d]/g, '').trim(),
                    CallBackURL: callbackUrl,
                    AccountReference: "License",
                    TransactionDesc: "Payment"
                })
            });

            const stkData = await stkPushRes.json();
            if (stkPushRes.ok && stkData.ResponseCode === '0') {
                // Record transaction
                await supabase.from('mpesa_transactions').insert({
                    id: `txn_${Date.now()}`,
                    transaction_id: `STK_${stkData.CheckoutRequestID}`,
                    checkout_request_id: stkData.CheckoutRequestID,
                    institution_id: user.user_metadata?.institutionId || 'SYSTEM',
                    amount: amount,
                    phone_number: recipient,
                    status: 'pending'
                });
                return res.status(200).json({ success: true, data: stkData });
            }
            return res.status(400).json({ success: false, message: stkData.CustomerMessage || 'Gateway rejected request.', details: stkData });
        }

        return res.status(400).json({ success: false, message: 'Action not supported.' });

    } catch (globalError: any) {
        console.error('[Integrations] Global Handler Error:', globalError);
        return res.status(500).json({
            success: false,
            message: 'Internal Handler Error',
            error: globalError.message,
            stack: globalError.stack
        });
    }
}
