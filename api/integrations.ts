
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
    const authHeader = req.headers.authorization;
    const supabase = createAuthenticatedClient(authHeader);
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    let user: any = null;
    try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError || !data?.user) return res.status(401).json({ error: 'Unauthorized: Session invalid' });
        user = data.user;
    } catch (e: any) {
        return res.status(401).json({ error: `Unauthorized: ${e.message}` });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!req.body) return res.status(400).json({ error: 'Missing request body' });

    try {
        const { action, recipient, message, subject, amount, config: integrationConfig } = req.body;

        if (action === 'sendSms') {
            if (!integrationConfig?.apiKey) return res.status(400).json({ success: false, message: "SMS config missing." });
            const { apiKey, apiSecret, fromNumber, provider } = integrationConfig;
            const cleanPhone = (recipient || '').replace('+', '').replace(/\s+/g, '');

            try {
                if (provider === 'Zettatel') {
                    // Refined Zettatel implementation (Standard API v1)
                    const response = await fetch('https://sms.zettatel.com/api/v1/sms/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userid: apiKey,
                            password: apiSecret,
                            mobile: cleanPhone,
                            msg: message,
                            senderid: fromNumber || 'EduAi',
                            output: 'json'
                        })
                    });
                    const data = await response.json();
                    return res.status(200).json({ success: data.status === "success", data });
                } else if (provider === 'Sematime') {
                    const response = await fetch('https://api.sematime.com/api/v1/sms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                        body: JSON.stringify({
                            recipient: cleanPhone,
                            message,
                            senderId: fromNumber || 'EduAlloc'
                        })
                    });
                    const data = await response.json();
                    return res.status(200).json({ success: response.ok, data });
                } else {
                    // Default to ABMIS / Generic HTTP GET Gateway
                    const params = new URLSearchParams({
                        userid: apiKey,
                        password: apiSecret,
                        mobile: cleanPhone,
                        msg: message || '',
                        senderid: fromNumber || 'ABMIS',
                        msgType: 'text',
                        output: 'json'
                    });
                    const response = await fetch(`https://sms.abmis.co.ke/smsapi/send?${params.toString()}`);
                    const data = await response.json();
                    return res.status(200).json({ success: true, data });
                }
            } catch (error: any) {
                console.error("SMS Gateway Error:", error);
                return res.status(500).json({ success: false, message: `Gateway error: ${error.message}` });
            }
        }

        if (action === 'sendEmail') {
            if (!integrationConfig) return res.status(400).json({ success: false, message: "SMTP config missing." });
            const { host, port, username, password: smtpPassword, fromName, fromEmail } = integrationConfig;

            const transporter = nodemailer.createTransport({
                host,
                port: Number(port),
                secure: Number(port) === 465,
                auth: { user: username, pass: smtpPassword },
                connectionTimeout: 10000,
                tls: { rejectUnauthorized: false }
            });

            try {
                const info = await transporter.sendMail({
                    from: `"${fromName || 'EduAi System'}" <${fromEmail}>`,
                    to: recipient,
                    subject: subject || "EduAi Notification",
                    text: message,
                    html: (message || '').replace(/\n/g, '<br>')
                });
                return res.status(200).json({ success: true, message: "Email dispatched.", messageId: info.messageId });
            } catch (error: any) {
                return res.status(500).json({ success: false, message: `SMTP Error: ${error.message}` });
            }
        }

        if (action === 'initiateStkPush') {
            if (!integrationConfig) return res.status(400).json({ success: false, message: "M-Pesa config missing." });
            const { consumerKey, consumerSecret, paybillNumber, passkey } = integrationConfig;
            if (!consumerKey || !consumerSecret || !paybillNumber || !passkey)
                return res.status(400).json({ success: false, message: "M-Pesa credentials incomplete." });

            const isSandbox = integrationConfig.environment !== 'production';
            const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

            try {
                const authCredentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
                const oauthResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                    method: "GET",
                    headers: { "Authorization": `Basic ${authCredentials}` }
                });

                if (!oauthResponse.ok) return res.status(401).json({ success: false, message: "Daraja Auth Failed." });
                const { access_token } = await oauthResponse.json();

                const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
                const stkPassword = Buffer.from(paybillNumber + passkey + timestamp).toString('base64');
                const cleanPhone = (recipient || '').replace('+', '').replace(/\s+/g, '').trim();

                // Use relative callback or env if available, else fallback
                const host = req.headers.host || 'eduai-academic.vercel.app';
                const callbackUrl = `https://${host}/api/mpesa-callback`;

                const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        BusinessShortCode: paybillNumber,
                        Password: stkPassword,
                        Timestamp: timestamp,
                        TransactionType: "CustomerPayBillOnline",
                        Amount: Math.round(amount),
                        PartyA: cleanPhone,
                        PartyB: paybillNumber,
                        PhoneNumber: cleanPhone,
                        CallBackURL: callbackUrl,
                        AccountReference: "SUBSCRIPTION",
                        TransactionDesc: "License Activation"
                    })
                });

                const stkData = await stkResponse.json();
                if (stkResponse.ok && (stkData.ResponseCode === "0")) {
                    return res.status(200).json({ success: true, message: "Prompt dispatched.", data: stkData });
                }
                return res.status(400).json({ success: false, message: stkData.CustomerMessage || stkData.errorMessage || "Push rejected." });
            } catch (error: any) {
                return res.status(500).json({ success: false, message: `Gateway error: ${error.message}` });
            }
        }


        return res.status(400).json({ success: false, error: 'Invalid action.' });
    } catch (globalError: any) { return res.status(500).json({ success: false, message: "Internal error." }); }
}