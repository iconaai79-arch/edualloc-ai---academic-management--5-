
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
        const { action, recipient, message, subject, amount, config: bodyConfig } = req.body;

        // Fetch Global System Settings from Supabase
        const { data: settingsRecord } = await supabase.from('system_settings').select('data').eq('id', 1).single();
        const systemSettings = settingsRecord?.data || {};

        if (action === 'sendSms') {
            const smsConfig = (bodyConfig?.apiKey || bodyConfig?.api_key) ? bodyConfig : (systemSettings.sms_config || bodyConfig);
            if (!smsConfig?.api_key && !smsConfig?.apiKey) return res.status(400).json({ success: false, message: "SMS config missing." });

            const apiKey = smsConfig.api_key || smsConfig.apiKey;
            const apiSecret = smsConfig.api_secret || smsConfig.apiSecret;
            const fromNumber = smsConfig.from_number || smsConfig.fromNumber;
            const provider = smsConfig.provider;

            // Format to 254... (Standard for Kenyan gateways)
            let cleanPhone = (recipient || '').replace('+', '').replace(/\s+/g, '').trim();
            if (cleanPhone.startsWith('0')) cleanPhone = '254' + cleanPhone.substring(1);
            if (cleanPhone.startsWith('7') || cleanPhone.startsWith('1')) cleanPhone = '254' + cleanPhone;

            try {
                let response;
                if (provider === 'Zettatel') {
                    response = await fetch('https://sms.zettatel.com/api/v1/sms/send', {
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
                } else if (provider === 'Sematime') {
                    response = await fetch('https://api.sematime.com/api/v1/sms', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
                        body: JSON.stringify({
                            recipient: cleanPhone,
                            message,
                            senderId: fromNumber || 'EduAlloc'
                        })
                    });
                } else {
                    const params = new URLSearchParams({
                        userid: apiKey,
                        password: apiSecret as string,
                        mobile: cleanPhone,
                        msg: message || '',
                        senderid: fromNumber || 'ABMIS',
                        msgType: 'text',
                        output: 'json'
                    });
                    response = await fetch(`https://sms.abmis.co.ke/smsapi/send?${params.toString()}`);
                }

                const rawText = await response.text();
                let data: any = {};
                try {
                    data = JSON.parse(rawText);
                } catch {
                    console.error("[SMS] Non-JSON response received:", rawText);
                    return res.status(502).json({
                        success: false,
                        message: "Gateway returned an invalid response.",
                        raw: rawText.substring(0, 200)
                    });
                }

                if (!response.ok) {
                    return res.status(400).json({
                        success: false,
                        message: data.message || data.error || `Gateway Error: ${response.status}`,
                        detail: data
                    });
                }

                return res.status(200).json({ success: true, data });
            } catch (error: any) {
                console.error("SMS Gateway Request Crash:", error);
                return res.status(500).json({ success: false, message: `Gateway connection failed: ${error.message}` });
            }
        }

        if (action === 'sendEmail') {
            const emailConfig = (bodyConfig?.host && bodyConfig?.username) ? bodyConfig : (systemSettings.email_config || bodyConfig);
            if (!emailConfig) return res.status(400).json({ success: false, message: "SMTP config missing." });

            const host = emailConfig.host;
            const port = emailConfig.port;
            const username = emailConfig.username;
            const smtpPassword = emailConfig.password;
            const fromName = emailConfig.from_name || emailConfig.fromName;
            const fromEmail = emailConfig.from_email || emailConfig.fromEmail;

            if (!host || !username || !smtpPassword) {
                return res.status(400).json({ success: false, message: "SMTP credentials incomplete. Please configure in System Settings." });
            }

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
            console.log('[M-Pesa] Initiating STK Push...');
            const mpesaConfig = (bodyConfig?.consumerKey || bodyConfig?.consumer_key) ? bodyConfig : (systemSettings.mpesa_config || bodyConfig);
            if (!mpesaConfig) return res.status(400).json({ success: false, message: "M-Pesa config missing." });

            const consumerKey = mpesaConfig.consumer_key || mpesaConfig.consumerKey;
            const consumerSecret = mpesaConfig.consumer_secret || mpesaConfig.consumerSecret;
            const paybillNumber = mpesaConfig.paybill_number || mpesaConfig.paybillNumber;
            const passkey = mpesaConfig.passkey;
            const environment = mpesaConfig.environment;

            if (!consumerKey || !consumerSecret || !paybillNumber || !passkey) {
                console.error('[M-Pesa] Config incomplete:', { paybillNumber, hasKey: !!consumerKey, hasSecret: !!consumerSecret, hasPasskey: !!passkey });
                return res.status(400).json({ success: false, message: "M-Pesa credentials incomplete." });
            }

            const isSandbox = environment !== 'production';
            const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
            console.log(`[M-Pesa] Target Environment: ${isSandbox ? 'Sandbox' : 'Production'} (${baseUrl})`);

            try {
                const authCredentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
                const oauthResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                    method: "GET",
                    headers: { "Authorization": `Basic ${authCredentials}` }
                });

                if (!oauthResponse.ok) {
                    const authErr = await oauthResponse.text();
                    console.error('[M-Pesa] Daraja Auth Failed:', oauthResponse.status, authErr);
                    return res.status(401).json({ success: false, message: "Daraja Auth Failed. Check credentials." });
                }

                const { access_token } = await oauthResponse.json();
                console.log('[M-Pesa] Auth successful, token acquired.');

                const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
                const stkPassword = Buffer.from(paybillNumber + passkey + timestamp).toString('base64');
                const cleanPhone = (recipient || '').replace('+', '').replace(/\s+/g, '').trim();

                const callbackUrl = 'https://eduai.co.ke/api/mpesa-callback';

                console.log('[M-Pesa] Dispatching STK Push to:', cleanPhone);
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
                console.log('[M-Pesa] Gateway Response:', stkData);

                if (stkResponse.ok && (stkData.ResponseCode === "0")) {
                    // PERSIST PENDING TRANSACTION
                    try {
                        const { data: userData } = await supabase.from('users').select('name, institution_id').eq('id', user.id).single();

                        await supabase.from('mpesa_transactions').insert({
                            id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                            transaction_id: `PENDING_${stkData.CheckoutRequestID}`, // Temp ID until receipt arrives
                            checkout_request_id: stkData.CheckoutRequestID,
                            institution_id: userData?.institution_id || 'SYSTEM',
                            amount: Math.round(amount),
                            phone_number: cleanPhone,
                            payer_name: userData?.name || 'System Test',
                            status: 'pending'
                        });
                        console.log('[M-Pesa] Pending transaction saved to database.');
                    } catch (dbError) {
                        console.error('[M-Pesa] Failed to save pending transaction:', dbError);
                        // We still return success to the user as the push was dispatched
                    }

                    return res.status(200).json({ success: true, message: "Prompt dispatched.", data: stkData });
                }

                return res.status(400).json({
                    success: false,
                    message: stkData.CustomerMessage || stkData.errorMessage || "Push rejected by gateway.",
                    errorDetail: stkData
                });
            } catch (error: any) {
                console.error("[M-Pesa] Gateway Error Snapshot:", error);
                return res.status(500).json({
                    success: false,
                    message: "Gateway connection error.",
                    error: error.message
                });
            }
        }

        return res.status(400).json({ success: false, error: 'Invalid action.' });
    } catch (globalError: any) {
        console.error("[Integrations] Runtime Error:", globalError);
        return res.status(500).json({
            success: false,
            message: "Internal server error during integration processing.",
            error: globalError.message
        });
    }
}