
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../lib/supabase';

export const config = {
    maxDuration: 15,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Health Check / Options
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).json({ status: 'Online', nodeVersion: process.version, timestamp: new Date().toISOString() });

    console.log(`[Integration] Processing ${req.method} request...`);

    try {
        // 1. Check Body
        if (!req.body) return res.status(400).json({ success: false, message: 'Missing request body.' });
        const { action, recipient, message, subject, amount, config: bodyConfig, checkoutRequestId } = req.body;

        // 2. Initialize Supabase
        const authHeader = req.headers.authorization;
        const supabase = createServerClient(authHeader);
        if (!supabase) {
            return res.status(503).json({
                success: false,
                message: 'Database connection parameters missing in environment.'
            });
        }

        // 3. Authenticate
        let user: any = null;
        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData?.user) {
                return res.status(401).json({
                    success: false,
                    message: `Authentication failed: ${authError?.message || 'Invalid session'}`,
                    hint: 'Ensure you are signed in and your session is active.'
                });
            }
            user = authData.user;
        } catch (e: any) {
            return res.status(401).json({ success: false, message: `Auth Crash: ${e.message}` });
        }

        // 4. Fetch Global Config (Only if not provided in request)
        let systemSettings: any = {};
        try {
            const { data, error } = await supabase.from('system_settings').select('data').eq('id', 1).single();
            if (!error && data) systemSettings = data.data;
        } catch (e) {
            console.warn('[Integrations] Could not fetch system_settings:', e);
        }

        // 5. Action Logic
        if (action === 'test') {
            return res.status(200).json({ success: true, message: 'API connection established.', user: user.email });
        }

        // --- EMAIL LOGIC ---
        if (action === 'sendEmail') {
            const emailConfig = bodyConfig || systemSettings?.email_config;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'Email configuration not found.' });

            const provider = emailConfig.provider || 'smtp';
            const fromName = emailConfig.fromName || emailConfig.from_name || "EduAi Notification";
            const fromEmail = emailConfig.fromEmail || emailConfig.from_email || "notifications@edualloc.ai";

            if (provider === 'resend' || emailConfig.resendApiKey) {
                const apiKey = emailConfig.resendApiKey || emailConfig.apiKey;
                if (!apiKey) return res.status(400).json({ success: false, message: 'Resend API key missing.' });

                const fetchRes = await fetch('https://api.resend.com/emails', {
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
                const resData = await fetchRes.json();
                if (!fetchRes.ok) return res.status(502).json({ success: false, message: 'Resend Error', details: resData });
                return res.status(200).json({ success: true, id: resData.id });
            }

            // SMTP - Dynamic Import to prevent cold start bloat
            const nodemailer = (await import('nodemailer')).default;
            const transporter = nodemailer.createTransport({
                host: emailConfig.host,
                port: Number(emailConfig.port || 587),
                secure: Number(emailConfig.port) === 465,
                auth: { user: emailConfig.username, pass: emailConfig.password },
                tls: { rejectUnauthorized: false }
            });

            try {
                const info = await transporter.sendMail({
                    from: `"${fromName}" <${fromEmail}>`,
                    to: recipient,
                    subject: subject || "Notification",
                    text: message,
                    html: (message || '').replace(/\n/g, '<br>')
                });
                return res.status(200).json({ success: true, messageId: info.messageId });
            } catch (err: any) {
                return res.status(500).json({ success: false, message: `SMTP Failure: ${err.message}`, code: err.code });
            }
        }

        // --- SMS LOGIC ---
        if (action === 'sendSms') {
            const smsConfig = bodyConfig || systemSettings?.sms_config;
            if (!smsConfig) return res.status(400).json({ success: false, message: 'SMS configuration not found.' });

            const apiKey = smsConfig.api_key || smsConfig.apiKey;
            const apiSecret = smsConfig.api_secret || smsConfig.apiSecret;
            const fromNumber = smsConfig.from_number || smsConfig.fromNumber;
            const provider = smsConfig.provider || 'ABMIS';

            let cleanPhone = (recipient || '').replace('+', '').replace(/\s+/g, '').trim();
            if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
            if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) cleanPhone = '254' + cleanPhone;

            const params = new URLSearchParams({
                userid: apiKey,
                password: apiSecret as string,
                mobile: cleanPhone,
                msg: message || '',
                senderid: fromNumber || 'ABMIS',
                msgType: 'text',
                output: 'json'
            });

            const smsResponse = await fetch(`https://sms.abmis.co.ke/smsapi/send?${params.toString()}`);
            const smsText = await smsResponse.text();
            return res.status(200).json({ success: true, response: smsText });
        }

        // --- MPESA STK PUSH ---
        if (action === 'initiateStkPush') {
            console.log('[M-Pesa] Processing STK Push...');
            const mpesaConfig = bodyConfig || systemSettings?.mpesa_config;
            if (!mpesaConfig) return res.status(400).json({ success: false, message: 'M-Pesa configuration not found.' });

            const consumerKey = mpesaConfig.consumer_key || mpesaConfig.consumerKey;
            const consumerSecret = mpesaConfig.consumer_secret || mpesaConfig.consumerSecret;
            const paybillNumber = mpesaConfig.paybill_number || mpesaConfig.paybillNumber;
            const passkey = mpesaConfig.passkey;
            const isSandbox = mpesaConfig.environment !== 'production';

            const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
            const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

            const oauthRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            if (!oauthRes.ok) return res.status(401).json({ success: false, message: 'Daraja Auth failed.' });
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
                    PartyA: recipient.replace('+', '').trim(),
                    PartyB: paybillNumber,
                    PhoneNumber: recipient.replace('+', '').trim(),
                    CallBackURL: callbackUrl,
                    AccountReference: "License",
                    TransactionDesc: "Payment"
                })
            });

            const stkData = await stkPushRes.json();
            if (stkPushRes.ok && stkData.ResponseCode === '0') {
                // Track in DB
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
            return res.status(400).json({ success: false, details: stkData });
        }

        return res.status(400).json({ success: false, message: 'Unsupported action.' });

    } catch (err: any) {
        console.error('[Integrations] Fatal Crash:', err);
        return res.status(500).json({
            success: false,
            message: 'Integration service encountered a fatal error.',
            error: err.message,
            stack: err.stack
        });
    }
}
