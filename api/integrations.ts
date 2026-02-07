
import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { Buffer } from 'buffer';

import { createAuthenticatedClient } from '../lib/supabase';

export const config = {
    maxDuration: 15,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Verify Auth
    const supabase = createAuthenticatedClient(req.headers.authorization);
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { action, recipient, message, subject, amount, config: integrationConfig } = req.body;

        if (action === 'sendSms') {
            if (!integrationConfig?.apiKey) return res.status(400).json({ success: false, message: "SMS config missing." });
            const { apiKey, apiSecret, fromNumber, provider } = integrationConfig;
            const cleanPhone = (recipient || '').replace('+', '').replace(/\s+/g, '');
            try {
                if (provider === 'Zettatel') {
                    // Ensure endpoint is correct for live env. Using generic structure as per integration norms.
                    const response = await fetch('https://api.zettatel.com/v1/sms/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                        body: JSON.stringify({ mobile: cleanPhone, message, shortcode: fromNumber || 'EduAi', partnerID: apiSecret })
                    });
                    const data = await response.json();
                    console.log('Zettatel SMS Response:', data);
                    // Adjust check based on standard success responses
                    const isSuccess = (data.status === "success" || data.status === 200 || data.code === 200);
                    return res.status(200).json({ success: isSuccess, data });
                } else {
                    const params = new URLSearchParams({ userid: apiKey, password: apiSecret, sendMethod: 'quick', mobile: cleanPhone, msg: message || '', senderid: fromNumber || 'ABMIS', msgType: 'text', duplicatecheck: 'true', output: 'json' });
                    const response = await fetch(`https://sms.abmis.co.ke/SMSApi/send?${params.toString()}`);
                    const data = await response.json();
                    return res.status(200).json({ success: true, data });
                }
            } catch (error: any) {
                console.error("SMS Gateway Error:", error);
                return res.status(500).json({ success: false, message: "Gateway error." });
            }
        }

        if (action === 'sendEmail') {
            if (!integrationConfig) return res.status(400).json({ success: false, message: "SMTP config missing." });
            const { host, port, username, password: smtpPassword, fromName, fromEmail } = integrationConfig;
            const transporter = nodemailer.createTransport({ host, port: Number(port), secure: Number(port) === 465, auth: { user: username, pass: smtpPassword }, connectionTimeout: 8000, tls: { rejectUnauthorized: false } });
            try {
                const info = await transporter.sendMail({ from: `"${fromName || 'EduAi System'}" <${fromEmail}>`, to: recipient, subject: subject || "EduAi Notification", text: message, html: (message || '').replace(/\n/g, '<br>') });
                return res.status(200).json({ success: true, message: "Email dispatched.", messageId: info.messageId });
            } catch (error: any) { return res.status(500).json({ success: false, message: `SMTP Error: ${error.message}` }); }
        }

        if (action === 'initiateStkPush') {
            if (!integrationConfig) return res.status(400).json({ success: false, message: "M-Pesa config missing." });
            const { consumerKey, consumerSecret, paybillNumber, passkey } = integrationConfig;
            if (!consumerKey || !consumerSecret || !paybillNumber || !passkey) return res.status(400).json({ success: false, message: "M-Pesa credentials incomplete." });

            const isSandbox = integrationConfig.environment !== 'production';
            const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

            try {
                const authCredentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
                const oauthResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, { method: "GET", headers: { "Authorization": `Basic ${authCredentials}` } });
                if (!oauthResponse.ok) return res.status(401).json({ success: false, message: "Daraja Auth Failed." });
                const { access_token } = await oauthResponse.json();
                const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
                const stkPassword = Buffer.from(paybillNumber + passkey + timestamp).toString('base64');
                const cleanPhone = (recipient || '').replace('+', '').replace(/\s+/g, '').trim();
                const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ BusinessShortCode: paybillNumber, Password: stkPassword, Timestamp: timestamp, TransactionType: "CustomerPayBillOnline", Amount: Math.round(amount), PartyA: cleanPhone, PartyB: paybillNumber, PhoneNumber: cleanPhone, CallBackURL: "https://eduai-academic.vercel.app/api/mpesa-callback", AccountReference: "SUBSCRIPTION", TransactionDesc: "License Activation" })
                });
                const stkData = await stkResponse.json();
                if (stkResponse.ok && (stkData.ResponseCode === "0")) return res.status(200).json({ success: true, message: "Prompt dispatched.", data: stkData });
                return res.status(400).json({ success: false, message: stkData.CustomerMessage || "Push rejected." });
            } catch (error: any) { return res.status(500).json({ success: false, message: "Gateway timeout." }); }
        }

        return res.status(400).json({ success: false, error: 'Invalid action.' });
    } catch (globalError: any) { return res.status(500).json({ success: false, message: "Internal error." }); }
}