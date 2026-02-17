
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
    if (req.method === 'GET') return res.status(200).json({ status: 'Online', timestamp: new Date().toISOString() });

    console.log('[Integration] Receiving Interaction request....');

    try {
        // Verify Auth
        const authHeader = req.headers.authorization;
        const supabase = createServerClient(authHeader);
        if (!supabase) {
            return res.status(503).json({
                success: false,
                message: 'Server Misconfigured: Missing SUPABASE_SERVICE_ROLE_KEY. API methods requiring administrative access are disabled.',
                error: 'Database service unavailable'
            });
        }

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
            const { data: settingsRecord, error: tableError } = await supabase.from('system_settings').select('data').eq('id', 1).single();

            if (tableError && tableError.code === 'PGRST116') {
                // Table exists but no record with ID 1
            } else if (tableError) {
                console.error("[Integrations] Table Error:", tableError);
                return res.status(500).json({
                    success: false,
                    message: "System configuration error. Please contact administrator.",
                    // error: tableError.message // HIDDEN
                });
            }

            const systemSettings = settingsRecord?.data || {};

            if (action === 'test') {
                return res.status(200).json({
                    success: true,
                    message: "Integration API is reachable.",
                    dbStatus: "Connected",
                    user: user.email,
                    hasConfig: !!systemSettings.mpesa_config
                });
            }

            if (action === 'sendSms') {
                const hasBodyConfig = bodyConfig?.apiKey || bodyConfig?.api_key || bodyConfig?.api_secret;
                const smsConfig = hasBodyConfig ? bodyConfig : systemSettings.sms_config;
                if (!smsConfig) return res.status(400).json({ success: false, message: "SMS configuration is missing. Please set it up in the Super Admin settings." });

                console.log(`[SMS] Sending to ${recipient} using ${hasBodyConfig ? 'provided config' : 'system settings'}`);

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
                        const params = new URLSearchParams({
                            userid: apiKey,
                            password: apiSecret as string,
                            mobile: cleanPhone,
                            msg: message || '',
                            senderid: fromNumber || 'ABMIS',
                            msgType: 'text',
                            duplicatecheck: 'true',
                            sendMethod: 'quick',
                            output: 'json'
                        });
                        response = await fetch(`https://portal.zettatel.com/SMSApi/send?${params.toString()}`, {
                            method: 'POST', // or GET, most gateways support both for query params
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
                            message: "SMS Gateway rejected the request.",
                            // detail: data // HIDDEN
                        });
                    }

                    return res.status(200).json({ success: true, data });
                } catch (error: any) {
                    console.error("SMS Gateway Request Crash:", error);
                    return res.status(500).json({ success: false, message: "Internal SMS Gateway connection failed." });
                }
            }

            if (action === 'sendEmail') {
                const hasBodyConfig = bodyConfig?.host || bodyConfig?.resendApiKey;
                const emailConfig = hasBodyConfig ? bodyConfig : systemSettings.email_config;

                if (!emailConfig) {
                    console.error("[Email] No configuration found.");
                    return res.status(400).json({ success: false, message: "Email configuration is missing. Please set it up in the Super Admin settings." });
                }

                const provider = emailConfig.provider || 'smtp';
                const fromName = emailConfig.fromName || emailConfig.from_name || "EduAi Notification";
                const fromEmail = emailConfig.fromEmail || emailConfig.from_email || "notifications@edualloc.ai";

                // --- PROVIDER 1: RESEND (Recommended Lasting Solution) ---
                if (provider === 'resend' || emailConfig.resendApiKey) {
                    const resendApiKey = emailConfig.resendApiKey || emailConfig.apiKey;
                    if (!resendApiKey) return res.status(400).json({ success: false, message: "Resend API Key is missing." });

                    console.log(`[Email] Sending via Resend to ${recipient}`);
                    try {
                        const resendResponse = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${resendApiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                from: `${fromName} <${fromEmail}>`,
                                to: [recipient],
                                subject: subject || "EduAi Notification",
                                text: message,
                                html: (message || '').replace(/\n/g, '<br>')
                            })
                        });

                        const resendData = await resendResponse.json();
                        if (!resendResponse.ok) throw new Error(resendData.message || JSON.stringify(resendData));

                        return res.status(200).json({ success: true, message: "Email dispatched via Resend.", messageId: resendData.id });
                    } catch (error: any) {
                        console.error('[Email] Resend API Failed:', error);
                        return res.status(500).json({ success: false, message: `Resend Error: ${error.message}` });
                    }
                }

                // --- PROVIDER 2: SMTP (Classic) ---
                const host = emailConfig.host;
                const port = Number(emailConfig.port || 587);
                const username = emailConfig.username;
                const smtpPassword = emailConfig.password;
                const encryption = emailConfig.encryption || 'tls'; // tls, ssl, none

                if (!host || !username || !smtpPassword) {
                    return res.status(400).json({ success: false, message: "SMTP credentials incomplete." });
                }

                console.log(`[Email] Dispatching via SMTP: ${host}:${port} (${encryption})`);

                // DYNAMIC IMPORT NODEMAILER
                const nodemailer = (await import('nodemailer')).default;

                const transporter = nodemailer.createTransport({
                    host,
                    port,
                    // Port 465 usually uses secure: true, Port 587 starts as plain then uses STARTTLS
                    secure: port === 465 || encryption === 'ssl',
                    auth: { user: username, pass: smtpPassword },
                    connectionTimeout: 15000, // Increased for serverless environments
                    greetingTimeout: 10000,   // Wait for the server to greet
                    socketTimeout: 20000,
                    tls: {
                        // Crucial for some private/corporate SMTP servers
                        rejectUnauthorized: encryption !== 'none',
                        minVersion: 'TLSv1.2'
                    }
                });

                try {
                    const info = await transporter.sendMail({
                        from: `"${fromName}" <${fromEmail}>`,
                        to: recipient,
                        subject: subject || "EduAi Notification",
                        text: message,
                        html: (message || '').replace(/\n/g, '<br>')
                    });
                    console.log('[Email] Success:', info.messageId);
                    return res.status(200).json({ success: true, message: "Email dispatched via SMTP.", messageId: info.messageId });
                } catch (error: any) {
                    console.error('[Email] SMTP Error Trace:', error.code, error.command, error.message);

                    let hint = "Check your SMTP credentials and port settings.";
                    if (error.code === 'EAUTH') hint = "Invalid username or password.";
                    if (error.code === 'ESOCKET') hint = "Connection timed out. Check if port is open or host is correct.";
                    if (error.code === 'EENVELOPE') hint = "Invalid 'From' address. Make sure it matches your SMTP user permission.";

                    return res.status(500).json({
                        success: false,
                        message: `Email Relay Failure: ${error.message}`,
                        hint
                    });
                }
            }

            if (action === 'initiateStkPush') {
                console.log('[M-Pesa] Initiating STK Push...');

                // --- RATE LIMITING ---
                // Prevents toll fraud/bombing by limiting requests per user/phone
                const cleanPhone = (recipient || '').replace('+', '').replace(/\s+/g, '').trim();
                const now = new Date();
                const oneMinuteAgo = new Date(now.getTime() - 60000).toISOString();

                // FIX: Use 'timestamp' column instead of 'created_at' as per mpesa_transactions schema
                const { data: recentTxns, error: rateError } = await supabase
                    .from('mpesa_transactions')
                    .select('id')
                    .eq('phone_number', cleanPhone)
                    .gt('timestamp', oneMinuteAgo);

                if (rateError) {
                    console.error('[M-Pesa] Rate limit check failed:', rateError);
                    // Skip rate limiting if check fails (log but don't block)
                } else if (recentTxns && recentTxns.length >= 2) {
                    return res.status(429).json({
                        success: false,
                        message: "Too many requests. Please wait a minute before trying again."
                    });
                }
                // ---------------------

                const hasBodyConfig = bodyConfig?.consumerKey || bodyConfig?.consumer_key;
                const mpesaConfig = hasBodyConfig ? bodyConfig : systemSettings.mpesa_config;
                if (!mpesaConfig) return res.status(400).json({ success: false, message: "M-Pesa configuration is missing. Please set it up in the Super Admin settings." });

                console.log(`[M-Pesa] Initiating payment using ${hasBodyConfig ? 'provided config' : 'system settings'}`);

                const consumerKey = mpesaConfig.consumer_key || mpesaConfig.consumerKey;
                const consumerSecret = mpesaConfig.consumer_secret || mpesaConfig.consumerSecret;
                const paybillNumber = mpesaConfig.paybill_number || mpesaConfig.paybillNumber;
                const passkey = mpesaConfig.passkey;
                const environment = mpesaConfig.environment;

                if (!consumerKey || !consumerSecret || !paybillNumber || !passkey) {
                    const missing = [];
                    if (!consumerKey) missing.push('Consumer Key');
                    if (!consumerSecret) missing.push('Consumer Secret');
                    if (!paybillNumber) missing.push('Paybill Number');
                    if (!passkey) missing.push('Passkey');

                    console.error('[M-Pesa] Config incomplete:', { paybillNumber, hasKey: !!consumerKey, hasSecret: !!consumerSecret, hasPasskey: !!passkey });
                    return res.status(400).json({
                        success: false,
                        message: `M-Pesa credentials incomplete. Missing: ${missing.join(', ')}. Please update in System Settings.`
                    });
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

                    const host = req.headers.host;
                    const protocol = req.headers['x-forwarded-proto'] || 'https';
                    const callbackUrl = `${protocol}://${host}/api/mpesa-callback`;

                    console.log('[M-Pesa] Using Callback URL:', callbackUrl);

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
                            const metadata = req.body.metadata || {};

                            await supabase.from('mpesa_transactions').insert({
                                id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                transaction_id: `PENDING_${stkData.CheckoutRequestID}`, // Temp ID until receipt arrives
                                checkout_request_id: stkData.CheckoutRequestID,
                                institution_id: userData?.institution_id || 'SYSTEM',
                                amount: Math.round(amount),
                                phone_number: cleanPhone,
                                payer_name: userData?.name || 'System Test',
                                status: 'pending',
                                metadata: metadata
                            });
                            console.log('[M-Pesa] Pending transaction saved to database with metadata:', metadata);
                        } catch (dbError) {
                            console.error('[M-Pesa] Failed to save pending transaction:', dbError);
                            // We still return success to the user as the push was dispatched
                        }

                        return res.status(200).json({ success: true, message: "Prompt dispatched.", data: stkData });
                    }

                    return res.status(400).json({
                        success: false,
                        message: "M-Pesa Gateway rejected the request.",
                        // errorDetail: stkData // HIDDEN
                    });
                } catch (error: any) {
                    console.error("[M-Pesa] Gateway Error Snapshot:", error);
                    return res.status(500).json({
                        success: false,
                        message: "M-Pesa Gateway connection error.",
                        // error: error.message // HIDDEN
                    });
                }
            }

            if (action === 'queryStkStatus') {
                const { checkoutRequestId, config: providedConfig } = req.body;
                if (!checkoutRequestId) return res.status(400).json({ success: false, message: "CheckoutRequestID is required." });

                const mpesaConfig = providedConfig || systemSettings?.mpesa_config || {};
                const { paybillNumber, consumerKey, consumerSecret, passkey, environment } = mpesaConfig;

                if (!paybillNumber || !consumerKey || !consumerSecret || !passkey) {
                    return res.status(400).json({ success: false, message: "M-Pesa credentials incomplete." });
                }

                const isSandbox = environment !== 'production';
                const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

                try {
                    // 1. Get Auth Token
                    const authCredentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
                    const oauthResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                        method: "GET",
                        headers: { "Authorization": `Basic ${authCredentials}` }
                    });

                    if (!oauthResponse.ok) return res.status(401).json({ success: false, message: "Auth Failed." });
                    const { access_token } = await oauthResponse.json();

                    // 2. Build Query Request
                    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
                    const password = Buffer.from(paybillNumber + passkey + timestamp).toString('base64');

                    const queryResponse = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${access_token}`, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            BusinessShortCode: paybillNumber,
                            Password: password,
                            Timestamp: timestamp,
                            CheckoutRequestID: checkoutRequestId
                        })
                    });

                    const queryData = await queryResponse.json();
                    console.log(`[M-Pesa Query] Result for ${checkoutRequestId}:`, queryData.ResultDesc);

                    // 3. Update Status if finalized
                    if (queryData.ResultCode === "0") {
                        // Update DB as completed
                        const { data: transaction } = await supabase.from('mpesa_transactions').select('*').eq('checkout_request_id', checkoutRequestId).single();

                        if (transaction && transaction.status === 'pending') {
                            await supabase.from('mpesa_transactions').update({ status: 'completed' }).eq('id', transaction.id);

                            // Execute side-effects if needed (duplicate logic from callback for fallback)
                            const meta = transaction.metadata;
                            if (meta?.type === 'subscription' && meta.plan) {
                                const days = meta.plan === 'monthly' ? 30 : 365;
                                const { data: inst } = await supabase.from('institutions').select('subscription_ends_at').eq('id', transaction.institution_id).single();
                                const currentEnd = inst?.subscription_ends_at ? new Date(inst.subscription_ends_at) : new Date();
                                const newEnd = new Date(Math.max(currentEnd.getTime(), Date.now()) + (days * 24 * 60 * 60 * 1000)).toISOString();
                                await supabase.from('institutions').update({ subscription_ends_at: newEnd, status: 'active' }).eq('id', transaction.institution_id);
                            } else if (meta?.type === 'invoice' && meta.invoiceId) {
                                await supabase.from('invoices').update({ status: 'paid' }).eq('id', meta.invoiceId);
                                await supabase.from('receipts').insert({
                                    id: `rec_${Date.now()}`,
                                    receipt_number: `REC-${Date.now().toString().slice(-6)}`,
                                    institution_id: transaction.institution_id,
                                    invoice_id: meta.invoiceId,
                                    amount_paid: transaction.amount,
                                    payment_date: new Date().toISOString().split('T')[0],
                                    payment_method: 'M-Pesa',
                                    related_transaction_id: transaction.id
                                });
                            }
                        }
                        return res.status(200).json({ success: true, status: 'completed', data: queryData });
                    } else if (queryData.errorCode) {
                        // Gateway error or timeout
                        return res.status(200).json({ success: true, status: 'pending', message: queryData.errorMessage || 'Safaricom is still processing.' });
                    } else {
                        // Failed transaction (ResultCode "1", "1032", etc)
                        if (queryData.ResultCode) {
                            await supabase.from('mpesa_transactions').update({ status: 'failed' }).eq('checkout_request_id', checkoutRequestId);
                        }
                        return res.status(200).json({ success: true, status: queryData.ResultCode === "0" ? 'completed' : 'failed', message: queryData.ResultDesc });
                    }
                } catch (err: any) {
                    return res.status(500).json({ success: false, message: err.message });
                }
            }

            return res.status(400).json({ success: false, error: 'Invalid action.' });
        } catch (globalError: any) {
            console.error("[Integrations] Runtime Error:", globalError);
            return res.status(500).json({
                success: false,
                message: "Internal server error.",
                // error: globalError.message // HIDDEN
            });
        }
    } catch (topLevelError: any) {
        console.error("CRITICAL API HANDLER CRASH:", topLevelError);
        return res.status(500).json({
            success: false,
            message: "Critical Server Error: The handler crashed before initialization.",
            details: topLevelError.message
        });
    }
}
