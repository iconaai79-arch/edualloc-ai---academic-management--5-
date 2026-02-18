
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const config = {
    maxDuration: 15,
};

const getSupabaseClient = (authHeader?: string) => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!url || !key) return null;
    return createClient(url, key, {
        global: {
            headers: authHeader ? { Authorization: authHeader } : undefined
        }
    });
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
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: 'Authorization session missing',
                hint: 'No security token found. Please log out and log back in to refresh your session.'
            });
        }

        const supabase = getSupabaseClient(authHeader);

        if (!supabase) {
            return res.status(503).json({
                success: false,
                message: 'Server configuration error: Database keys missing.',
                hint: 'Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in Vercel settings.'
            });
        }

        // Auth check with detailed error reporting
        const token = authHeader?.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            console.error('[Auth Failure]', authError);
            return res.status(401).json({
                success: false,
                message: 'Unauthorized',
                details: authError?.message || 'No active session found.',
                hint: 'Please try logging out and logging back in to refresh your security token.'
            });
        }

        // Fetch settings (bypass RLS as we are on the server)
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data;

        if (action === 'sendEmail') {
            const emailConfig = bodyConfig || settings.email_config;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'Email configuration is missing.' });

            const { default: nodemailer } = await import('nodemailer');
            const transporter = nodemailer.createTransport({
                host: emailConfig.host,
                port: Number(emailConfig.port || 587),
                secure: Number(emailConfig.port) === 465,
                auth: { user: emailConfig.username, pass: emailConfig.password },
                tls: { rejectUnauthorized: false }
            });

            const info = await transporter.sendMail({
                from: `"${emailConfig.fromName || 'EduAi'}" <${emailConfig.fromEmail || 'notifications@edualloc.ai'}>`,
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
