
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Vercel config
export const config = {
    maxDuration: 15,
};

// Helper inside the file to avoid relative import issues during bundling
const getSupabaseClient = (authHeader?: string) => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) return null;
    return createClient(url, key, {
        global: {
            headers: authHeader ? { Authorization: authHeader } : undefined
        }
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // 0. Handle CORS and Options first
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).json({ status: 'Online', timestamp: new Date().toISOString() });

    try {
        if (!req.body) return res.status(400).json({ success: false, message: 'Missing body' });

        const { action, recipient, message, subject, amount, config: bodyConfig } = req.body;
        console.log(`[Action] ${action} -> ${recipient}`);

        const supabase = getSupabaseClient(req.headers.authorization);
        if (!supabase) return res.status(503).json({ success: false, message: 'DB Config Missing' });

        // Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Settings - Use any to avoid property access errors
        let settings: any = {};
        const { data } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (data) settings = data.data;

        if (action === 'sendEmail') {
            const emailConfig = bodyConfig || settings.email_config;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'Email config missing' });

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
                subject: subject || 'Notification',
                text: message,
                html: (message || '').replace(/\n/g, '<br>')
            });

            return res.status(200).json({ success: true, messageId: info.messageId });
        }

        if (action === 'sendSms') {
            const smsConfig = bodyConfig || settings.sms_config;
            if (!smsConfig) return res.status(400).json({ success: false, message: 'SMS config missing' });

            const params = new URLSearchParams({
                userid: smsConfig.apiKey || smsConfig.api_key,
                password: smsConfig.apiSecret || smsConfig.api_secret,
                mobile: recipient.replace(/[^\d]/g, ''),
                msg: message || '',
                senderid: smsConfig.fromNumber || 'ABMIS',
                msgType: 'text', output: 'json'
            });

            const smsRes = await fetch(`https://sms.abmis.co.ke/smsapi/send?${params.toString()}`);
            return res.status(200).json({ success: true, detail: await smsRes.text() });
        }

        if (action === 'initiateStkPush') {
            const mpesa = bodyConfig || settings.mpesa_config;
            const auth = Buffer.from(`${mpesa.consumerKey}:${mpesa.consumerSecret}`).toString('base64');
            const baseUrl = mpesa.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

            const oauthRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            const { access_token } = (await oauthRes.json()) as any;

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
                    AccountReference: "License",
                    TransactionDesc: "Payment"
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
            }
            return res.status(stkRes.status).json(stkData);
        }

        return res.status(400).json({ success: false, message: 'Unknown action' });

    } catch (e: any) {
        console.error(e);
        return res.status(500).json({ success: false, error: e.message });
    }
}
