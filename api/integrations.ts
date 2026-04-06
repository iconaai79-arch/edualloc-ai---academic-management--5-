import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

// Self-contained Supabase service client factory to avoid external lib crashes
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Support parameters from both body (POST) and query (GET)
    const paramsMap = req.method === 'GET' ? req.query : req.body;

    // Safely extract and normalize parameters (handling possible arrays from req.query)
    const getParam = (key: string): string => {
        const val = paramsMap[key];
        if (Array.isArray(val)) return val[0] || '';
        return (val as string) || '';
    };

    const action = getParam('action');
    const recipient = getParam('recipient');
    const message = getParam('message');
    const subject = getParam('subject');
    const amountStr = getParam('amount');
    const amount = amountStr ? parseFloat(amountStr) : 0;
    const institutionIdOverride = getParam('institutionId');
    const unitsParam = getParam('units');
    const unitsToDeduct = unitsParam ? parseInt(unitsParam) : 1;
    const bodyConfig = paramsMap.config;

    // Detect system messages (OTPs, recovery links) early for auth bypass
    const msgLower = (message || '').toLowerCase();
    const isSystemMessage = msgLower.includes('verification code') ||
        msgLower.includes('otp') ||
        msgLower.includes('eduai code') ||
        msgLower.includes('your verification code') ||
        msgLower.includes('verificaiton code') || // Typo tolerance
        msgLower.includes('password reset') ||
        msgLower.includes('recovery link') ||
        msgLower.includes('resettoken=');

    // Robust phone normalization function
    const normalizePhone = (p: string): string => {
        if (!p) return '';
        let digits = p.replace(/[^\d]/g, '');
        // Handle 2540... case: strip the leading 0 after 254
        if (digits.startsWith('2540')) digits = '254' + digits.substring(4);
        if (digits.startsWith('0')) digits = '254' + digits.substring(1);
        if (digits.length === 9) digits = '254' + digits;
        return digits;
    };

    const getPhoneVariants = (p: string): string[] => {
        if (!p) return [];
        const normalized = normalizePhone(p);
        const rawDigits = p.replace(/[^\d]/g, '');
        const variants = new Set([p, rawDigits, normalized]);

        if (normalized.startsWith('254') && normalized.length === 12) {
            const base = normalized.substring(3);
            variants.add('0' + base);
            variants.add(base);
            variants.add('+' + normalized);
        }

        return Array.from(variants).filter(v => v.length > 0);
    };

    function toCamelCase(obj: any): any {
        if (obj === null || obj === undefined || typeof obj !== 'object' || obj instanceof Date) return obj;
        if (Array.isArray(obj)) return obj.map((item: any) => toCamelCase(item));
        const newObj: any = {};
        Object.keys(obj).forEach(key => {
            const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
            newObj[camelKey] = toCamelCase(obj[key]);
        });
        return newObj;
    }

    const safeParseJson = async (res: Response, defaultErrorPrefix = 'NCBA Gateway error') => {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            // If not JSON, extract a snippet of the response (e.g., "A server error...")
            const snippet = text.substring(0, 150).trim().replace(/<[^>]*>?/gm, ''); // Strip HTML tags if any
            throw new Error(`${defaultErrorPrefix}: ${snippet || 'Invalid response format'}`);
        }
    };

    try {
        if (!action) {
            if (req.method === 'GET') return res.status(200).json({ status: 'Online', timestamp: new Date().toISOString(), mode: 'Integration Bridge' });
            return res.status(400).json({ success: false, message: 'Missing action' });
        }

        const authHeader = req.headers.authorization || (req.query.token as string ? `Bearer ${req.query.token}` : undefined);
        const supabase = getSupabase();

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
                user = { ...dbUser, id: dbUser.id || token, role: dbUser.role, user_metadata: { institutionId: dbUser.institution_id || dbUser.institutionId } };
                authError = null;
            } else {
                console.warn(`[Auth Bridge] Database lookup failed. No user found for ID: ${token?.substring(0, 8)}...`);
            }
        }

        // Priority 3: Special bypass for Unauthenticated Actions (Callbacks & Recovery)
        if (!user && (action === 'forgotPassword' || action === 'verifyResetOtp' || action === 'resetPasswordWithToken' || action === 'sendEmail' || action === 'sendSms' || action === 'mpesa-callback' || action === 'ncbaWebhook')) {
            console.log(`[Auth Bridge] Checking unauthenticated bypass for ${action}`);

            // For callbacks, we allow the bypass directly
            if (action === 'mpesa-callback' || action === 'ncbaWebhook') {
                // Verified below in specialized handlers
            } else if (action === 'forgotPassword' || action === 'sendEmail' || action === 'sendSms') {
                let query = supabase.from('users').select('*');

                if (action === 'sendSms' && recipient) {
                    // Normalize Kenyan phone numbers for robust database search
                    const normalized = normalizePhone(recipient);
                    const rawDigits = recipient.replace(/[^\d]/g, '');
                    let searchNumbers: string[] = [recipient, rawDigits, normalized];

                    // Generate common variants for lookup
                    if (normalized.startsWith('254') && normalized.length === 12) {
                        const base = normalized.substring(3);
                        searchNumbers.push('0' + base);
                        searchNumbers.push(base);
                    }

                    // Remove duplicates
                    const uniqueSearch = Array.from(new Set(searchNumbers.filter(n => n.length > 0)));
                    const orClauses = uniqueSearch.map(n => `phone_number.eq.${n}`).join(',');

                    query = query.or(orClauses);
                } else if (recipient) {
                    query = query.eq('email', recipient);
                }

                const { data: targetUser } = await query.maybeSingle();

                if (targetUser) {
                    console.log(`[Auth Bridge] Bypass granted for ${action} to ${recipient} (Match: ${targetUser.id})`);
                    // Create a system context but preserve the original role for configuration selection
                    user = { ...targetUser, id: 'system', originalRole: targetUser.role };
                    authError = null;
                } else if (isSystemMessage) {
                    // Critical fix: Allow OTPs/Recovery links even if user lookup fails
                    console.log(`[Auth Bridge] Generic system bypass granted for ${action} to ${recipient}`);
                    user = { id: 'system', role: 'system', user_metadata: { institutionId: 'SYSTEM' } };
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

        // Fetch global platform settings (bypass RLS as we are on the server)
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data || {};

        if (action === 'sendEmail') {
            const adminRoles = ['admin', 'super_admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'county_admin', 'county_staff', 'county_cec', 'county_governor', 'academics_officer'];
            // Regular authenticated sendEmail requires admin privileges. 
            // 'system' user or isSystemMessage (OTP, Reset) is allowed for all categories
            if (!adminRoles.includes(user.role) && user.id !== 'system' && !isSystemMessage) {
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
                html: (message || '').replace(/\n/g, '<br>'),
                attachments: paramsMap.attachments // Supports { filename: string, content: string (base64) / Buffer, contentType: string }
            });

            return res.status(200).json({ success: true, message: 'Email sent successfully.', messageId: info.messageId });
        }

        if (action === 'sendSms') {
            const adminRoles = ['admin', 'super_admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'county_admin', 'county_staff', 'county_cec', 'county_governor', 'academics_officer'];

            if (!adminRoles.includes(user.role) && user.id !== 'system' && !isSystemMessage) {
                return res.status(403).json({ success: false, message: 'Permission denied: Only administrative accounts can send system SMS.' });
            }

            // SMS Balance Check Logic (OTPs bypass this check and are free)
            const institutionId = institutionIdOverride || user.user_metadata?.institutionId ||
                (user.role === 'super_admin' ? (paramsMap.institutionId || 'SYSTEM') : (user.institution_id || user.institutionId || 'SYSTEM'));

            console.log(`[SMS Gateway] Target Institution: ${institutionId}`);

            // Security: System messages (OTPs, Recovery links) default to system configuration
            // but we allow institution-specific override if an institutionId is provided.
            const effectiveRole = user.role === 'system' ? (user.originalRole || 'system') : user.role;
            let smsConfig = { ...(settings.sms_config || {}) };

            // If a custom config was provided in the body (mostly for Super Admin tests), use it
            if (bodyConfig && effectiveRole === 'super_admin') {
                Object.assign(smsConfig, bodyConfig);
                console.log(`[SMS Gateway] Using provided body configuration (Super Admin override)`);
            }

            // Load institution-specific config if available
            // We allow this even for 'system' user (unauthenticated OTPs) if institutionId is set
            if (institutionId !== 'SYSTEM') {
                const { data: institution, error: configError } = await supabase
                    .from('institutions')
                    .select('sms_balance, sms_config')
                    .eq('id', institutionId)
                    .maybeSingle();

                if (!configError && institution && institution.sms_config) {
                    // Check balance for non-system messages
                    if (user.id !== 'system' && !isSystemMessage && (institution.sms_balance || 0) < unitsToDeduct) {
                        return res.status(402).json({
                            success: false,
                            message: `Insufficient SMS balance. This message requires ${unitsToDeduct} units, but your current balance is ${institution?.sms_balance || 0}.`,
                            balance: institution?.sms_balance || 0,
                            required: unitsToDeduct,
                            buy_url: '/settings?tab=billing'
                        });
                    }

                    // Prefer institution-specific SMS gateway if configured
                    if (institution.sms_config.apiKey || institution.sms_config.api_key || institution.sms_config.username || institution.sms_config.userId) {
                        console.log(`[SMS Gateway] Using institution-specific configuration for ${institutionId}`);
                        // Priority Fix: Start fresh with institution config to avoid collisions 
                        // with differently named keys in system settings (e.g. apiKey vs api_key)
                        smsConfig = { ...institution.sms_config };
                    }
                }
            }

            console.log(`[SMS Gateway] Processing send for ${recipient}`);
            console.log(`[SMS Gateway] System Message: ${isSystemMessage}, User Role: ${user.role}`);

            // Validation: Ensure we have at least one valid key alias
            const hasAuthKey = smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId || smsConfig.apikey;
            if (!smsConfig || !hasAuthKey) {
                console.error(`[SMS Gateway] Configuration missing or invalid for ${isSystemMessage ? 'system' : 'custom'} message`);
                return res.status(400).json({ success: false, message: 'SMS configuration is missing or invalid.' });
            }

            const provider = smsConfig.provider || 'Zettatel';

            // Normalize Kenyan phone numbers to strict 254 format
            const phone = normalizePhone(recipient);

            // Provider-specific logic
            if (provider === 'ABMIS' || provider === 'Zettatel') {
                // Allow override from config
                const defaultUrls: Record<string, string> = {
                    'ABMIS': 'https://sms.abmis.co.ke/SMSApi/send',
                    'Zettatel': 'https://sms.zettatel.com/smsapi/send'
                };

                let baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? defaultUrls['Zettatel'] : defaultUrls['ABMIS']);

                // Force correct endpoint for Zettatel if it looks like the generic ABMIS one or is empty / incorrect
                if (provider === 'Zettatel' && (!baseUrl || baseUrl.includes('abmis.co.ke') || !baseUrl.startsWith('http'))) {
                    console.log(`[SMS Gateway] Correcting Zettatel URL from ${baseUrl} to ${defaultUrls['Zettatel']}`);
                    baseUrl = defaultUrls['Zettatel'];
                }

                console.log(`[SMS Gateway] Provider: ${provider}, URL: ${baseUrl.replace(/\/\/.*@/, '//***@')}`);

                const finalParams: Record<string, string> = {
                    userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId || smsConfig.apikey || '',
                    password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password || smsConfig.apisecret || '',
                    mobile: phone,
                    msg: message || '',
                    senderid: smsConfig.fromNumber || provider,
                    msgType: 'text',
                    output: 'json'
                };

                // Add custom parameters from config
                if (Array.isArray(smsConfig.params)) {
                    smsConfig.params.forEach((p: { name: string; value: string }) => {
                        if (p.name) finalParams[p.name] = p.value;
                    });
                }

                const urlParams = new URLSearchParams(finalParams);
                const method = smsConfig.method || 'GET';
                const dispatchUrl = method === 'GET' ? `${baseUrl}?${urlParams.toString()}` : baseUrl;
                const maskedUrl = dispatchUrl.replace(/password=[^&]*/, 'password=********').replace(/userid=[^&]*/, 'userid=********');

                console.log(`[SMS Gateway] Attempted Gateway: ${provider}. Dispatching to ${phone}. Method: ${method}. URL: ${maskedUrl}`);
                try {
                    const customHeaders: Record<string, string> = {};
                    if (Array.isArray(smsConfig.headers)) {
                        smsConfig.headers.forEach((h: { name: string; value: string }) => {
                            if (h.name && h.value) customHeaders[h.name] = h.value;
                        });
                    }

                    const fetchOptions: any = {
                        method,
                        headers: {
                            'Accept': 'application/json',
                            ...customHeaders
                        }
                    };

                    if (method === 'POST') {
                        // Use JSON if Content-Type is application/json, otherwise URL-encode
                        if (customHeaders['Content-Type'] === 'application/json') {
                            fetchOptions.body = JSON.stringify(finalParams);
                        } else {
                            fetchOptions.body = urlParams.toString();
                            if (!customHeaders['Content-Type']) {
                                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                            }
                        }
                    }

                    console.log(`[SMS Gateway] Dispatching to ${dispatchUrl}`);
                    const smsRes = await fetchWithTimeout(dispatchUrl, fetchOptions);
                    const smsRaw = await smsRes.text();

                    console.log(`[SMS Gateway] HTTP Status: ${smsRes.status}`);
                    console.log(`[SMS Gateway] Raw Response: ${smsRaw.substring(0, 300)}`);

                    const isHtml = smsRaw.includes('<!DOCTYPE') || smsRaw.includes('<html') || (smsRes.headers.get('content-type')?.includes('text/html'));

                    let smsDetail: any;
                    let parseError = false;
                    try {
                        smsDetail = JSON.parse(smsRaw);
                    } catch (e) {
                        smsDetail = { raw: smsRaw.length > 500 ? smsRaw.substring(0, 500) + '...' : smsRaw };
                        parseError = true;
                    }

                    // Zettatel/ABMIS usually return a JSON with status or response field
                    // Example success: {"response":"Success","msgid":"123"}
                    // Example error: {"response":"Error","error":"Invalid Login"}
                    // Improve error detection: don't just look for "error" in the raw text, 
                    // as it could be part of the message text.
                    const isError = !smsRes.ok ||
                        isHtml ||
                        (smsDetail.response && smsDetail.response.toLowerCase() === 'error') ||
                        (smsDetail.status && smsDetail.status.toLowerCase().includes('error')) ||
                        (parseError && (
                            smsRaw.toLowerCase().includes('error') ||
                            smsRaw.toLowerCase().includes('invalid login') ||
                            smsRaw.toLowerCase().includes('access denied') ||
                            smsRaw.toLowerCase().includes('authentication failed')
                        ));

                    if (isError) {
                        let cleanMessage = `Gateway ${provider} reported an error (Status: ${smsRes.status}).`;
                        if (isHtml) {
                            cleanMessage += " The gateway returned an HTML error page instead of JSON. This often means the API endpoint is incorrect, or your IP/Account is blocked by a firewall.";
                        } else if (parseError) {
                            cleanMessage += " The gateway returned an invalid non-JSON response.";
                        }

                        const rawSnippet = smsRaw.substring(0, 500).replace(/<[^>]*>?/gm, ' ').trim();

                        return res.status(502).json({
                            success: false,
                            message: `Gateway ${provider} returned an error. ${isHtml ? 'HTML page returned — check your SMS gateway URL or IP whitelist.' : parseError ? 'Invalid non-JSON response.' : smsRaw.substring(0, 200)}`,
                            response_hint: rawSnippet,
                            recipient: phone,
                            provider,
                            url: dispatchUrl.replace(/\/\/.*@/, '//***@')
                        });
                    }

                    // Check if it's explicitly success or at least doesn't look like an error
                    const isExplicitSuccess = (smsRes.ok && !parseError) && (
                        smsRaw.toLowerCase().includes('success') ||
                        smsRaw.toLowerCase().includes('ok') ||
                        (smsDetail.response && smsDetail.response.toLowerCase() === 'success') ||
                        (smsDetail.msgid || smsDetail.msg_id || smsDetail.id) // If there's a message ID, it's usually success
                    );

                    if (!isExplicitSuccess && !isError && smsRes.ok) {
                        // If it's not explicitly success but we have a 200 OK and no error detected, 
                        // and it's not HTML, we'll treat it as success.
                        console.log(`[SMS Gateway] Treating ambiguous but non-error response from ${provider} as success:`, smsRaw);
                    }

                        // Success! Decrement balance (except for generic system messages without institution)
                        // OTPs and other system messages correctly bypass balance deduction
                        if (institutionId !== 'SYSTEM' && user.id !== 'system' && !isSystemMessage) {
                            await supabase.rpc('decrement_sms_balance', { inst_id: institutionId, amount: unitsToDeduct });

                            // NEW: If super admin sent it, add it back immediately (deduct then add back)
                            if (user.role === 'super_admin') {
                                console.log(`[SMS Balance] Restoring ${unitsToDeduct} units for super_admin send.`);
                                await supabase.rpc('increment_sms_balance', { inst_id: institutionId, amount: unitsToDeduct });
                            }

                            try {
                                await supabase.from('sms_logs').insert({
                                    institution_id: institutionId,
                                    sender_id: (user.id === 'system' || !user.id) ? null : user.id,
                                    recipient: phone,
                                    message: message,
                                    units: unitsToDeduct,
                                    status: 'sent',
                                    provider: provider,
                                    gateway_response: smsDetail
                                });
                            } catch (logErr) {
                                console.error('[SMS Logging] Failed to record log:', logErr);
                            }
                        }

                        return res.status(200).json({
                            success: true,
                            message: 'SMS sent successfully.',
                            detail: smsDetail,
                            recipient: phone
                        });
                    } catch (e: any) {
                        return res.status(504).json({ success: false, message: 'SMS gateway connection timeout.', error: e.message });
                    }
            } else if (provider === 'Sematime') {
                // Placeholder for Sematime implementation
                return res.status(501).json({ success: false, message: 'Sematime integration is currently under maintenance. Please use ABMIS or Zettatel.' });
            }

            return res.status(400).json({ success: false, message: `Unsupported SMS provider: ${provider}` });
        }

        if (action === 'forgotPassword') {
            const method = getParam('method') || 'email';
            
            if (method === 'phone') {
                const phoneVariants = getPhoneVariants(recipient);
                const phone = phoneVariants[0]; // Primary normalized variant
                const orClauses = phoneVariants.map(v => `phone_number.eq.${v}`).join(',');
                
                console.log(`[Forgot Password] Phone lookup for: ${recipient}. Variants: ${phoneVariants.join(', ')}`);

                const { data: targetUser } = await supabase
                    .from('users')
                    .select('*')
                    .or(orClauses)
                    .maybeSingle();

                if (!targetUser) return res.status(404).json({ success: false, message: 'No registered account found with this phone number.' });

                // Generate a 6-digit numeric OTP
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                const expires = new Date(Date.now() + 600000).toISOString(); // 10 minutes

                const { error: updateError } = await supabase
                    .from('users')
                    .update({ reset_otp: otp, reset_otp_expires: expires })
                    .eq('id', targetUser.id);

                if (updateError) return res.status(500).json({ success: false, message: 'Failed to generate recovery code.' });

                // Send OTP via SMS
                const smsConfig = settings.sms_config;
                if (!smsConfig) return res.status(400).json({ success: false, message: 'SMS gateway not configured for password recovery.' });

                const otpMessage = `Your EduAi Password Reset Code is: ${otp}. Valid for 10 minutes.`;
                
                // Re-using SMS dispatch logic (simplified for this specific context)
                const provider = smsConfig.provider || 'Zettatel';
                const baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                
                const finalParams: Record<string, string> = {
                    userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId || '',
                    password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password || '',
                    mobile: phone,
                    msg: otpMessage,
                    senderid: smsConfig.fromNumber || provider,
                    msgType: 'text',
                    output: 'json'
                };

                const urlParams = new URLSearchParams(finalParams);
                try {
                    await fetchWithTimeout(`${baseUrl}?${urlParams.toString()}`, { method: 'GET' });
                    return res.status(200).json({ success: true, message: 'Verification code sent to your phone.' });
                } catch (e: any) {
                    return res.status(502).json({ success: false, message: 'Verification code generated but SMS delivery failed.', hint: e.message });
                }
            }

            // Default Email Recovery
            const emailConfig = bodyConfig || settings.email_config || settings.emailConfig;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'Email configuration is missing.' });

            // We use the 'user' object populated during the auth phase
            if (!user || user.id === 'system' && !user.email) return res.status(404).json({ success: false, message: 'Account not found.' });

            // Generate a secure reset token
            const token = randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

            // Store the token in the database
            const { error: updateError } = await supabase
                .from('users')
                .update({ reset_token: token, reset_token_expires: expires })
                .eq('email', recipient);

            if (updateError) {
                console.error('[Forgot Password] Failed to store reset token:', updateError);
                return res.status(500).json({ success: false, message: 'Failed to initiate recovery. System storage error.', details: updateError.message });
            }

            // Handle both snake_case and camelCase keys
            const host = emailConfig.host;
            const port = emailConfig.port;
            const username = emailConfig.username;
            const password = emailConfig.password;
            const fromEmail = emailConfig.from_email || emailConfig.fromEmail || username;
            const fromName = emailConfig.from_name || emailConfig.fromName || 'EduAi Notification';

            if (!host || !username || !password) {
                return res.status(400).json({ success: false, message: 'Email gateway configuration is incomplete. Host, username, and password are required.' });
            }

            console.log(`[Forgot Password] Dispatching recovery link to: ${recipient} using ${host}:${port}`);

            const transporter = nodemailer.createTransport({
                host: host,
                port: Number(port || 587),
                secure: Number(port) === 465,
                auth: { user: username, pass: password },
                tls: { rejectUnauthorized: false }
            });

            const protocol = String(req.headers['x-forwarded-proto'] || 'https');
            const hostHeader = req.headers.host || 'eduai.co.ke';
            const resetLink = `${protocol}://${hostHeader}/?resetToken=${token}`;

            const recoverySubject = "Password Reset Request - Eduai Automation";
            const recoveryBody = `Dear ${user.name || 'User'},\n\nYou requested a password reset for your account on the Eduai Automation System.\n\nPlease click the link below to set a new password. This link is valid for 1 hour:\n\n${resetLink}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n\nBest Regards,\nEduai Automation System`;

            const info = await transporter.sendMail({
                from: `"${fromName}" <${fromEmail}>`,
                to: recipient,
                subject: recoverySubject,
                text: recoveryBody,
                html: recoveryBody.replace(/\n/g, '<br>').replace(resetLink, `<a href="${resetLink}">${resetLink}</a>`)
            });

            console.log(`[Forgot Password] Recovery link sent successfully via Email. Message ID: ${info.messageId}`);

            // NEW: Dispatch recovery link via SMS if phone number is available
            let smsSuccess = false;
            if (user.phone_number) {
                console.log(`[Forgot Password] Dispatching recovery link via SMS to: ${user.phone_number}`);
                const smsMessage = `Eduai Automation Password Reset: Click the link below to set a new password. Link valid for 1 hour: ${resetLink}`;

                const smsConfig = settings.sms_config;
                if (smsConfig) {
                    try {
                        let phone = user.phone_number.replace(/[^\d]/g, '');
                        if (phone.startsWith('254')) {
                            const afterPrefix = phone.substring(3);
                            if (afterPrefix.startsWith('0')) phone = '254' + afterPrefix.substring(1);
                        } else if (phone.startsWith('0')) {
                            phone = '254' + phone.substring(1);
                        } else if (phone.length === 9) {
                            phone = '254' + phone;
                        }

                        const provider = smsConfig.provider || 'Zettatel';
                        const defaultUrls: Record<string, string> = {
                            'ABMIS': 'https://sms.abmis.co.ke/SMSApi/send',
                            'Zettatel': 'https://sms.zettatel.com/smsapi/send'
                        };
                        const baseUrl = smsConfig.baseUrl || smsConfig.api_url || defaultUrls[provider] || defaultUrls['Zettatel'];

                        const finalParams: Record<string, string> = {
                            userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId,
                            password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password,
                            mobile: phone,
                            msg: smsMessage,
                            senderid: smsConfig.fromNumber || provider,
                            msgType: 'text',
                            output: 'json'
                        };

                        const urlParams = new URLSearchParams(finalParams);
                        const method = smsConfig.method || 'GET';
                        const dispatchUrl = method === 'GET' ? `${baseUrl}?${urlParams.toString()}` : baseUrl;
                        const fetchOptions: any = { method, headers: { 'Accept': 'application/json' } };
                        if (method === 'POST') fetchOptions.body = urlParams.toString();

                        const smsRes = await fetchWithTimeout(dispatchUrl, fetchOptions, 15000);
                        const smsResultText = await smsRes.text();
                        console.log(`[Forgot Password] SMS Gateway Response: ${smsResultText.substring(0, 100)}`);
                        smsSuccess = true;
                    } catch (e: any) {
                        console.error(`[Forgot Password] SMS Dispatch Failed: ${e.message}`);
                    }
                }
            }

            return res.status(200).json({
                success: true,
                message: smsSuccess ? 'Recovery link sent via Email and SMS.' : 'Recovery link sent via Email.',
                messageId: info.messageId
            });
        }

        if (action === 'resetPasswordWithToken') {
            const { token: resetToken, newPassword } = paramsMap;
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

        if (action === 'verifyResetOtp') {
            const phone = getParam('phone') || getParam('recipient');
            const otpCode = getParam('code') || getParam('message');
            
            if (!phone || !otpCode) return res.status(400).json({ success: false, message: 'Missing phone number or verification code.' });

            const phoneVariants = getPhoneVariants(phone);
            const orClauses = phoneVariants.map(v => `phone_number.eq.${v}`).join(',');

            console.log(`[Verify Reset OTP] Looking for phone variants: ${phoneVariants.join(', ')} with code: ${otpCode}`);

            const { data: targetUser } = await supabase
                .from('users')
                .select('*')
                .or(orClauses)
                .eq('reset_otp', otpCode)
                .gt('reset_otp_expires', new Date().toISOString())
                .maybeSingle();

            if (!targetUser) return res.status(400).json({ success: false, message: 'Invalid or expired verification code.' });

            // On successful OTP verification, generate a reset token
            const resetToken = randomBytes(32).toString('hex');
            const tokenExpires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

            await supabase
                .from('users')
                .update({ 
                    reset_token: resetToken, 
                    reset_token_expires: tokenExpires,
                    reset_otp: null, // Consume the OTP
                    reset_otp_expires: null
                })
                .eq('id', targetUser.id);

            return res.status(200).json({ success: true, resetToken });
        }
        // --- NCBA Bank Helpers (2024 Spec) ---
        const normalizeNcbaUrl = (url?: string): string => {
            if (!url) return 'https://c2bapis.ncbagroup.com';
            let normalized = url.trim().replace(/\/+$/, '');
            if (!normalized.startsWith('http')) normalized = 'https://' + normalized;
            
            // Legacy Migration: Auto-swap old host for new gateway
            if (normalized.includes('api.ncbagroup.com')) {
                console.log(`[NCBA Integration] Auto-migrating legacy URL: ${normalized} -> https://c2bapis.ncbagroup.com`);
                normalized = normalized.replace('api.ncbagroup.com', 'c2bapis.ncbagroup.com');
            }
            return normalized;
        };
        
        // --- NCBA Credential Hardening & Sanitization ---
        // Strips non-printable characters (Control chars, \r, zero-width spaces) 
        // that frequently cause '401 Unauthorized' failures in bank gateways.
        const sanitizeNcbaVal = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim();
        
        const getNcbaCredentials = (config: any) => {
            const callbackUser = sanitizeNcbaVal(config.callbackUsername || config.callback_username || '');
            
            // Strictly use Callback Username as the primary ID if provided, ignoring the 32-char Client ID
            const id = callbackUser || sanitizeNcbaVal(config.clientId || config.client_id || config.consumerKey || config.consumer_key || '');
            const sec = sanitizeNcbaVal(config.clientSecret || config.client_secret || config.secretKey || config.secret_key || config.consumerSecret || config.consumer_secret || '');
            
            return { id, sec, callbackUser };
        };

        const getNcbaToken = async (ncbaConfig: any) => {
            const isMock = ncbaConfig.isMock === true || ncbaConfig.isMock === 'true';
            if (isMock) {
                console.log('[NCBA Auth] Mock Mode active. Returning dummy token.');
                return 'mock-access-token-ncba-12345';
            }

            const { id: cId, sec: cSec, callbackUser } = getNcbaCredentials(ncbaConfig);
            const fingerprint = `ID: ${cId.substring(0, 4)}... (Len: ${cId.length}), Secret: *** (Len: ${cSec.length})`;
            
            if (!cId || !cSec) throw new Error(`NCBA Configuration incomplete: ${!cId ? 'Client ID' : 'Client Secret'} is missing.`);
            
            // Debugging: Show fingerprint to user (Safe for production logs)
            console.log(`[NCBA Debug] Attempting authentication with: ${fingerprint}, Method: ${ncbaConfig.authMethod || 'bearer'}`);
            
            // If authMethod is 'basic', we skip fetching a token as we'll use Basic Auth directly on the request
            if (ncbaConfig.authMethod === 'basic') {
                console.log('[NCBA Auth] Direct Basic Auth requested. Skipping token generation.');
                return null; 
            }
            
            const tokenBase = normalizeNcbaUrl(ncbaConfig.baseUrl || ncbaConfig.base_url);
            const isNewEndpoint = tokenBase.includes('c2bapis.ncbagroup.com');
            const tokenPath = isNewEndpoint ? '/payments/oauth/v1/generate' : '/oauth/v1/generate';

            // --- NCBA Smart Auth Strategy (2024 Hardening) ---
            // Tier 1: Standard RFC 6749 Header-based Basic Auth
            // Tier 2: Body-only Auth (Credentials strictly in the body)
            // This handles inconsistent WSO2/NCBA gateway configurations.

            const tokenUrl = tokenBase.endsWith('/') && tokenPath.startsWith('/') 
                ? tokenBase + tokenPath.substring(1) 
                : (!tokenBase.endsWith('/') && !tokenPath.startsWith('/') ? tokenBase + '/' + tokenPath : tokenBase + tokenPath);
            const auth = Buffer.from(`${cId}:${cSec}`).toString('base64');
            
            const makeTokenRequest = async (authType: 'header' | 'body') => {
                const bodyObj = new URLSearchParams();
                bodyObj.append('grant_type', 'client_credentials');
                
                const headers: Record<string, string> = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'X-API-Key': ncbaConfig.apiKey || ncbaConfig.api_key || '',
                    'X-Correlation-ID': `edualloc-auth-${Date.now()}`,
                    'User-Agent': 'EduAlloc-AI/1.0.1 (Bank-Auth-Client)',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                };

                if (authType === 'header') {
                    headers['Authorization'] = `Basic ${auth}`;
                } else {
                    // Body-based auth (Alternative for stricter/picky gateways)
                    bodyObj.append('client_id', cId);
                    bodyObj.append('client_secret', cSec);
                }

                process.stdout.write(`[NCBA Auth] Attempting ${authType}-based token retrieval from: ${tokenUrl}...\n`);
                
                const res = await fetchWithTimeout(tokenUrl, {
                    method: 'POST',
                    headers,
                    body: bodyObj.toString(),
                    redirect: 'manual'
                }, 15000);

                if (res.status === 301 || res.status === 302) {
                    const loc = res.headers.get('location');
                    throw new Error(`NCBA Gateway Redirect (${res.status}) to ${loc}. Check Base URL.`);
                }
                return res;
            };

            let tokenRes = await makeTokenRequest('header');

            // Fallback: If 401/400 (Unauthorized/Bad Request), try Body-based Auth
            if (tokenRes.status === 401 || tokenRes.status === 400) {
                const errBody = await tokenRes.clone().text().catch(() => 'No body');
                console.warn(`[NCBA Auth] Attempt 1 (Header-based) rejected: ${tokenRes.status}. Details: ${errBody}. Retrying with Body-based Auth...`);
                tokenRes = await makeTokenRequest('body');
            }

            if (!tokenRes.ok) {
                const finalErrBody = await tokenRes.text().catch(() => 'No body');
                console.error(`[NCBA Auth] Permanent Failure: ${tokenRes.status} - ${finalErrBody}`);
                
                let hint = `Check your credentials. Actually using ${fingerprint}.`;
                if (tokenRes.status === 401) {
                    hint = `Gateway persists 401. If ${fingerprint} is correct, your server IP might not be whitelisted at NCBA. Ref: ${finalErrBody}`;
                } else if (tokenRes.status === 404) {
                    hint = `NCBA Endpoint not found. Verify your Base URL and Path. Check if they match the 2024 spec.`;
                }
                throw new Error(`NCBA Authentication failed (${tokenRes.status}): ${hint}`);
            }

            const data = await safeParseJson(tokenRes) as any;
            if (!data.access_token) {
                console.error('[NCBA Auth] Response missing access_token:', JSON.stringify(data));
                throw new Error('NCBA Auth succeeded but No access_token returned.');
            }
            
            console.log(`[NCBA Auth] Token successfully retrieved via fallback strategy.`);
            return data.access_token;
        };

        const initiateNcbaPayment = async (ncbaConfig: any, amount: number, phone: string) => {
            const isMock = ncbaConfig.isMock === true || ncbaConfig.isMock === 'true';
            if (isMock) {
                console.log('[NCBA STK] Mock Mode active. Returning successful initiation.');
                return {
                    ResponseCode: '0',
                    ResponseDescription: 'Success. Request accepted for processing (Mock Mode)',
                    MerchantRequestID: `mock-mrid-${Date.now()}`,
                    CheckoutRequestID: `mock-crid-${Math.random().toString(36).substring(7)}`,
                    CustomerMessage: 'Success. Request accepted for processing (Mock Mode)'
                };
            }
            const { id: cId, sec: cSec, callbackUser } = getNcbaCredentials(ncbaConfig);
            const fingerprint = `ID: ${cId.substring(0, 4)}... (Len: ${cId.length}), Secret: *** (Len: ${cSec.length})`;
            
            if (!cSec || (!cId && !callbackUser)) {
                throw new Error(`NCBA Configuration incomplete: Your ${!cSec ? 'Secret Key' : 'ID'} is missing from your global/institution settings.`);
            }
            
            // Standard: Bearer (OAuth2). Alternative: Basic (Bank Direct).
            const authMethod = (ncbaConfig.authMethod || 'bearer').toLowerCase();
            let authHeader = '';

            if (authMethod === 'basic') {
                const basic = Buffer.from(`${cId}:${cSec}`).toString('base64');
                authHeader = `Basic ${basic}`;
                console.log(`[NCBA STK] Using DIRECT Basic Auth (${cId}) instead of OAuth2 Bearer token.`);
            } else {
                try {
                    const token = await getNcbaToken(ncbaConfig);
                    const maskedToken = token ? `${token.substring(0, 8)}...${token.substring(token.length - 8)}` : 'null';
                    authHeader = `Bearer ${token}`;
                    console.log(`[NCBA STK] Using Bearer Token: ${maskedToken}`);
                } catch (tokenErr: any) {
                    if (tokenErr.message.includes('401') || tokenErr.message.includes('Unauthorized')) {
                        console.warn(`[NCBA STK] Bearer Token generation failed (401). Falling back to Direct Basic Auth...`);
                        const basic = Buffer.from(`${cId}:${cSec}`).toString('base64');
                        authHeader = `Basic ${basic}`;
                    } else {
                        throw tokenErr;
                    }
                }
            }
            
            // Priority: stkPushBaseUrl (new) -> baseUrl (legacy)
            const effectiveBase = normalizeNcbaUrl(ncbaConfig.stkPushBaseUrl || ncbaConfig.stk_push_base_url || ncbaConfig.baseUrl || ncbaConfig.base_url);
            if (!effectiveBase) throw new Error('NCBA Base URL or STK Push Base URL is missing in the configuration.');
            
            // Priority: pushStkUrl (new) -> 2024 spec default
            const effectivePath = ncbaConfig.pushStkUrl || '/payments/api/v1/stk-push/initiate';
            // If the path field contains a full URL, use it directly; otherwise join with base
            const fullUrl = effectivePath.startsWith('http')
                ? effectivePath
                : (effectiveBase.endsWith('/') && effectivePath.startsWith('/') 
                    ? effectiveBase + effectivePath.substring(1) 
                    : (!effectiveBase.endsWith('/') && !effectivePath.startsWith('/') ? effectiveBase + '/' + effectivePath : effectiveBase + effectivePath));

            console.log(`[NCBA STK] Initiation request to: ${fullUrl}`);
            let res: Response;
            try {
                res = await fetchWithTimeout(fullUrl, {
                    method: 'POST',
                    headers: mergeHeaders({
                        'Authorization': authHeader,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-API-Key': ncbaConfig.apiKey || ncbaConfig.api_key || '',
                        'X-Callback-Username': callbackUser,
                        'X-Correlation-ID': `edualloc-${Date.now()}`,
                        'User-Agent': 'EduAlloc-AI/1.0.1 (Bank-Integration-Client)'
                    }, ncbaConfig.headers),
                    body: JSON.stringify(mergeParams({
                        TelephoneNo: normalizePhoneNCBA(phone),
                        Amount: String(amount),
                        PayBillNo: ncbaConfig.paybill || '880100',
                        AccountNo: ncbaConfig.accountNumber || ncbaConfig.account_number,
                        CallbackUserName: callbackUser || ncbaConfig.accountNumber || ncbaConfig.account_number,
                        Network: 'Safaricom',
                        TransactionType: 'CustomerPayBillOnline'
                    }, ncbaConfig.params)),
                    redirect: 'manual'
                }, 25000);

                if (res.status === 301 || res.status === 302) {
                    const location = res.headers.get('location');
                    throw new Error(`NCBA STK Initiation Redirect detected (${res.status}). Target: ${location}. This usually indicates an incorrect STK Push path configured in your settings.`);
                }
            } catch (fetchErr: any) {
                if (fetchErr.message.includes('Redirect')) throw fetchErr;
                const isAbort = fetchErr?.name === 'AbortError';
                throw new Error(
                    isAbort
                        ? `NCBA STK Push timed out (25s). The gateway at ${fullUrl} did not respond. Check the STK Push Base URL.`
                        : `NCBA STK network error: ${fetchErr.message}. Could not reach ${fullUrl}. Verify the STK Push Base URL.`
                );
            }

            if (!res.ok) {
                const errData = await safeParseJson(res, 'NCBA STK initiation rejected').catch(e => ({ success: false, StatusCode: 'ERROR', StatusDescription: e.message }));
                const bodyStr = JSON.stringify(errData);
                console.error(`[NCBA STK] Initiation failed (${res.status}): ${bodyStr}`);
                
                // Enrich the error object with diagnostic context
                return {
                    ...errData,
                    success: false,
                    diagHint: res.status === 401 
                        ? `Gateway rejected your credentials during STK push. (Using ${fingerprint}). Bank response: ${bodyStr}` 
                        : `NCBA Gateway error ${res.status}: ${bodyStr}`,
                };
            }
            return await safeParseJson(res);
        };

        const queryNcbaStkStatus = async (ncbaConfig: any, checkoutRequestId: string) => {
            const isMock = ncbaConfig.isMock === true || ncbaConfig.isMock === 'true';
            if (isMock || (checkoutRequestId && checkoutRequestId.startsWith('mock-'))) {
                console.log(`[NCBA Query] Mock Mode active for CRID: ${checkoutRequestId}. Returning COMPLETED.`);
                return {
                    ResponseCode: '0',
                    ResponseDescription: 'The service request has been accepted successfully (Mock Mode)',
                    ResultCode: '0',
                    ResultDesc: 'The service request has been accepted successfully (Mock Mode)',
                    MerchantRequestID: 'mock-mrid',
                    CheckoutRequestID: checkoutRequestId,
                    Amount: '1',
                    MpesaReceiptNumber: `MOCK${Date.now()}`,
                    TransactionDate: new Date().toISOString(),
                    PhoneNumber: '254700000000',
                    ResultDescription: 'The service request has been accepted successfully (Mock Mode)'
                };
            }
            const token = await getNcbaToken(ncbaConfig);
            const authMethod = (ncbaConfig.authMethod || 'bearer').toLowerCase();
            const { id: cId, sec: cSec, callbackUser } = getNcbaCredentials(ncbaConfig);
            const authHeader = authMethod === 'basic' 
                ? `Basic ${Buffer.from(`${cId}:${cSec}`).toString('base64')}`
                : `Bearer ${token}`;
            
            let effectiveBase = (ncbaConfig.stkPushBaseUrl || ncbaConfig.stk_push_base_url || ncbaConfig.baseUrl || ncbaConfig.base_url || '').trim();
            if (!effectiveBase) throw new Error('NCBA Base URL is missing.');
            if (!effectiveBase.startsWith('http')) effectiveBase = 'https://' + effectiveBase;

            const effectivePath = ncbaConfig.queryStkUrl || ncbaConfig.query_stk_url || '/payments/api/v1/stk-push/query';
            // If the path field contains a full URL, use it directly; otherwise join with base
            const fullUrl = effectivePath.startsWith('http')
                ? effectivePath
                : (effectiveBase.endsWith('/') && effectivePath.startsWith('/') 
                    ? effectiveBase + effectivePath.substring(1) 
                    : (!effectiveBase.endsWith('/') && !effectivePath.startsWith('/') ? effectiveBase + '/' + effectivePath : effectiveBase + effectivePath));

            console.log(`[NCBA Query] Status request for: ${checkoutRequestId} to: ${fullUrl} (Auth: ${authMethod})`);
            const res = await fetchWithTimeout(fullUrl, {
                method: 'POST',
                headers: mergeHeaders({
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                }, ncbaConfig.headers),
                body: JSON.stringify(mergeParams({
                    TransactionID: checkoutRequestId
                }, ncbaConfig.params))
            });

            if (!res.ok) {
                return await safeParseJson(res, 'NCBA Query rejected').catch(e => ({ success: false, StatusCode: 'ERROR', StatusDescription: e.message }));
            }
            return await safeParseJson(res);
        };

        const generateNcbaQr = async (ncbaConfig: any, amount: number) => {
            const token = await getNcbaToken(ncbaConfig);
            const authMethod = (ncbaConfig.authMethod || 'bearer').toLowerCase();
            const { id: cId, sec: cSec, callbackUser } = getNcbaCredentials(ncbaConfig);
            const authHeader = authMethod === 'basic' 
                ? `Basic ${Buffer.from(`${cId}:${cSec}`).toString('base64')}`
                : `Bearer ${token}`;

            // 2024 Spec: POST /payments/api/v1/qr/generate
            const res = await fetchWithTimeout(`${ncbaConfig.baseUrl || ncbaConfig.base_url}/payments/api/v1/qr/generate`, {
                method: 'POST',
                headers: mergeHeaders({
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                }, ncbaConfig.headers),
                body: JSON.stringify(mergeParams({
                    till: ncbaConfig.accountNumber || ncbaConfig.account_number, // Till/Shortcode usually
                    amount: amount
                }, ncbaConfig.params))
            });

            if (!res.ok) {
                return await safeParseJson(res, 'NCBA QR generation rejected').catch(e => ({ success: false, StatusCode: 'ERROR', StatusDescription: e.message }));
            }
            return await safeParseJson(res);
        };

        const normalizePhoneNCBA = (phone: string) => {
            let p = phone.replace(/[^\d]/g, '');
            if (p.startsWith('0')) p = '254' + p.substring(1);
            if (p.length === 9) p = '254' + p;
            return p; // Expected format: 254XXXXXXXXX
        };

        const mergeHeaders = (base: any, customHeaders?: { name: string; value: string }[]) => {
            if (!customHeaders || customHeaders.length === 0) return base;
            const extra = customHeaders
                .filter(h => h.name && h.name.trim())
                .reduce((acc, h) => ({ ...acc, [h.name.trim()]: h.value }), {});
            return { ...base, ...extra };
        };

        const mergeParams = (base: any, customParams?: { name: string; value: string }[]) => {
            if (!customParams || customParams.length === 0) return base;
            const extra = customParams
                .filter(p => p.name && p.name.trim())
                .reduce((acc, p) => ({ ...acc, [p.name.trim()]: p.value }), {});
            return { ...base, ...extra };
        };

        // Internal Helper for Reconciliation
        const reconcilePayment = async (txn: any) => {
            if (!txn || txn.metadata?.reconciled) return;

            const meta = txn.metadata || {};
            const instId = txn.institution_id;
            const amt = txn.amount;

            console.log(`[Reconcile] Processing transaction ${txn.id} for ${instId}`);

            // 1. Fetch Institution
            const { data: inst } = await supabase.from('institutions').select('*').eq('id', instId).maybeSingle();
            if (!inst) {
                console.error(`[Reconcile] Institution ${instId} not found.`);
                return;
            }

            let invId = meta.invoiceId;

            // 2. Handle Subscription
            if (meta.type === 'subscription' || meta.type === 'license') {
                const days = meta.plan === 'yearly' ? 365 : 30;
                const currentEnd = inst.subscription_ends_at ? new Date(inst.subscription_ends_at) : new Date();
                const baseDate = Math.max(currentEnd.getTime(), Date.now());
                const newEndDate = new Date(baseDate + (days * 24 * 60 * 60 * 1000));

                await supabase.from('institutions').update({
                    subscription_ends_at: newEndDate.toISOString(),
                    status: 'active'
                }).eq('id', instId);

                if (!invId) {
                    invId = `inv_sub_${Date.now()}`;
                    await supabase.from('invoices').insert({
                        id: invId,
                        invoice_number: `INV-SUB-${Date.now().toString().slice(-6)}`,
                        institution_id: instId,
                        issue_date: new Date().toISOString().split('T')[0],
                        due_date: new Date().toISOString().split('T')[0],
                        total_amount: amt,
                        status: 'paid',
                        items: JSON.stringify([{
                            description: `${meta.plan === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
                            quantity: 1,
                            unitPrice: amt,
                            amount: amt
                        }])
                    });
                } else {
                    await supabase.from('invoices').update({ status: 'paid' }).eq('id', invId);
                }
            } 
            // 3. Handle SMS
            else if (meta.type === 'sms') {
                const units = parseInt(meta.units || "0");
                if (units > 0) {
                    await supabase.rpc('increment_sms_balance', { inst_id: instId, amount: units });
                }

                if (!invId) {
                    invId = `inv_sms_${Date.now()}`;
                    await supabase.from('invoices').insert({
                        id: invId,
                        invoice_number: `INV-SMS-${Date.now().toString().slice(-6)}`,
                        institution_id: instId,
                        issue_date: new Date().toISOString().split('T')[0],
                        due_date: new Date().toISOString().split('T')[0],
                        total_amount: amt,
                        status: 'paid',
                        items: JSON.stringify([{
                            description: `SMS Top-up (${units} units)`,
                            quantity: 1,
                            unitPrice: amt / (units || 1),
                            amount: amt
                        }])
                    });
                } else {
                    await supabase.from('invoices').update({ status: 'paid' }).eq('id', invId);
                }
            }
            // 4. Handle generic Invoice
            else if (meta.type === 'invoice' && invId) {
                await supabase.from('invoices').update({ status: 'paid' }).eq('id', invId);
            }

            // 5. Create Receipt
            if (invId) {
                await supabase.from('receipts').insert({
                    id: `rec_${Date.now()}`,
                    receipt_number: `REC-${Date.now().toString().slice(-6)}`,
                    institution_id: instId,
                    invoice_id: invId,
                    amount_paid: amt,
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: txn.provider || 'M-Pesa',
                    related_transaction_id: txn.id
                });
            }

            // 6. Mark Transaction as Reconciled
            const table = txn.provider === 'ncba' ? 'ncba_transactions' : 
                          txn.provider === 'airtel' ? 'airtel_transactions' : 
                          'mpesa_transactions';

            await supabase.from(table).update({
                metadata: { ...meta, reconciled: true, reconciled_at: new Date().toISOString() }
            }).eq('id', txn.id);

            // 7. Send Notifications
            try {
                const isSms = meta.type === 'sms';
                const units = parseInt(meta.units || "0");
                const notifyMessage = isSms 
                    ? `Dear Admin, your payment of KES ${amt} for ${units.toLocaleString()} SMS units for ${inst.name} has been verified. New balance reflected in dashboard. Ref: ${txn.id}`
                    : `Dear Admin, your payment of KES ${amt} for ${inst.name} subscription (${meta.plan || 'License'}) has been verified. Account active until ${new Date(inst.subscription_ends_at).toLocaleDateString()}. Ref: ${txn.id}`;

                // Email Notification
                const emailConfig = settings?.email_config || settings?.emailConfig;
                if (emailConfig && inst.email) {
                    try {
                        const transporter = nodemailer.createTransport({
                            host: emailConfig.host, port: Number(emailConfig.port || 587),
                            auth: { user: emailConfig.username, pass: emailConfig.password },
                            tls: { rejectUnauthorized: false }
                        });
                        await transporter.sendMail({
                            from: `"${emailConfig.fromName || 'EduAi'}" <${emailConfig.fromEmail || emailConfig.username}>`,
                            to: inst.email,
                            subject: isSms ? 'SMS Top-up Verified' : 'Payment Verified Successfully',
                            text: notifyMessage
                        });
                    } catch (e) {
                        console.error('[Reconcile] Email failed:', e.message);
                    }
                }

                // SMS Notification
                const smsConfig = settings?.sms_config || settings?.smsConfig;
                if (smsConfig && txn.phone_number) {
                    try {
                        const provider = smsConfig.provider || 'Zettatel';
                        const baseUrl = smsConfig.baseUrl || smsConfig.api_url || 'https://sms.zettatel.com/smsapi/send';
                        const params = new URLSearchParams({
                            userid: smsConfig.apiKey || smsConfig.api_key,
                            password: smsConfig.apiSecret || smsConfig.api_secret,
                            mobile: txn.phone_number.replace(/[^\d]/g, ''),
                            msg: notifyMessage, senderid: smsConfig.fromNumber || provider,
                            msgType: 'text', output: 'json'
                        });
                        await fetch(`${baseUrl}?${params.toString()}`);
                    } catch (e) {
                        console.error('[Reconcile] SMS failed:', e.message);
                    }
                }

                // In-App Notification
                if (meta.requesterId) {
                    await supabase.from('app_notifications').insert({
                        id: `ntf_rec_${Date.now()}`,
                        user_id: meta.requesterId,
                        message: notifyMessage,
                        type: 'success',
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (notifyErr) {
                console.error('[Reconcile] Notification process error:', notifyErr);
            }

            console.log(`[Reconcile] Finished for ${txn.id}`);
        };

        if (action === 'queryPaymentStatus') {
            const provider = getParam('provider') || 'mpesa';
            const checkoutRequestId = getParam('checkoutRequestId');
            
            if (!checkoutRequestId) return res.status(400).json({ success: false, message: 'Missing checkoutRequestId' });

            const table = provider === 'ncba' ? 'ncba_transactions' : 'mpesa_transactions';
            const { data: transaction } = await supabase
                .from(table)
                .select('*')
                .eq('checkout_request_id', checkoutRequestId)
                .maybeSingle();

            if (transaction && transaction.status !== 'pending') {
                return res.status(200).json({ success: true, status: transaction.status, source: 'database', metadata: transaction.metadata });
            }

            // 2. Poll external API if still pending
            let finalStatus = 'pending';
            let externalData: any = {};

            const mpesa = bodyConfig || settings?.mpesa_config || settings?.mpesaConfig || {};

            if (provider === 'mpesa') {
                // Simplified poll for M-Pesa (inline logic from queryStkStatus)
                const consumerKey = (mpesa.consumerKey || mpesa.consumer_key || '').trim();
                const consumerSecret = (mpesa.consumerSecret || mpesa.consumer_secret || '').trim();
                const paybill = (mpesa.paybillNumber || mpesa.paybill_number || '').trim();
                const passkey = (mpesa.passkey || '').trim();
                
                if (consumerKey && consumerSecret && paybill && passkey) {
                    try {
                        const authStr = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
                        const baseUrl = mpesa.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
                        const oauthReq = await fetchWithTimeout(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
                            headers: { 'Authorization': `Basic ${authStr}` }
                        });
                        if (oauthReq.ok) {
                            const { access_token } = await oauthReq.json() as any;
                            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
                            const password = Buffer.from(paybill + passkey + timestamp).toString('base64');
                            
                            const statusRes = await fetchWithTimeout(`${baseUrl}/mpesa/stkpush/v1/query`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    BusinessShortCode: paybill, 
                                    Password: password, 
                                    Timestamp: timestamp, 
                                    CheckoutRequestID: checkoutRequestId 
                                })
                            });
                            
                            const statusData = await statusRes.json() as any;
                            externalData = statusData;
                            if (String(statusData.ResultCode) === '0') finalStatus = 'completed';
                            else if (statusData.errorCode === '500.002.1001') finalStatus = 'pending'; // In progress
                            else if (statusData.ResultCode) finalStatus = 'failed';
                        }
                    } catch (e) {
                        console.error('[M-Pesa Status] Error polling Safaricom:', e);
                    }
                }
            } else if (provider === 'intasend') {
                const intasend = bodyConfig || settings?.intasend_config || settings?.intasendConfig || {};
                if (intasend && intasend.publishableKey) {
                    const baseUrl = intasend.environment === 'production' ? 'https://payment.intasend.com/api/v1' : 'https://sandbox.intasend.com/api/v1';
                    try {
                        const checkRes = await fetchWithTimeout(`${baseUrl}/checkout/${checkoutRequestId}/status/`, {
                            headers: { 'X-IntaSend-Publishable-Key': intasend.publishableKey }
                        });
                        if (checkRes.ok) {
                            const checkData = await checkRes.json() as any;
                            externalData = checkData;
                            if (checkData.status === 'COMPLETED' || checkData.status === 'SUCCESS') finalStatus = 'completed';
                            else if (checkData.status === 'FAILED') finalStatus = 'failed';
                        }
                    } catch (e) {}
                }
            } else if (provider === 'ncba') {
                const ncba = bodyConfig || settings?.ncba_config || settings?.ncbaConfig || {};
                if (ncba && (ncba.clientId || ncba.client_id)) {
                    try {
                        const token = await getNcbaToken(ncba);
                        const authHeader = token ? `Bearer ${token}` : `Basic ${Buffer.from(`${ncba.clientId || ncba.client_id}:${ncba.clientSecret || ncba.client_secret}`).toString('base64')}`;
                        
                        const resStatus = await fetchWithTimeout(`${ncba.baseUrl}/payments/v1/status/${checkoutRequestId}`, {
                            headers: { 'Authorization': authHeader, 'X-API-Key': ncba.apiKey }
                        });
                        if (resStatus.ok) {
                            const statusData = await resStatus.json() as any;
                            externalData = statusData;
                            if (statusData.status === 'COMPLETED' || String(statusData.ResultCode) === '0') finalStatus = 'completed';
                            else if (statusData.status === 'FAILED' || String(statusData.ResultCode) === '1') finalStatus = 'failed';
                        }
                    } catch (e) {
                        console.error('[NCBA Status] Error polling NCBA:', e);
                    }
                }
            } else if (provider === 'airtel') {
                // Mock success for Airtel testing
                if (checkoutRequestId.startsWith('airtel_')) {
                    finalStatus = 'completed';
                }
            }

            if (finalStatus !== 'pending' && transaction) {
                await supabase.from(table).update({ status: finalStatus }).eq('checkout_request_id', checkoutRequestId);
                
                if (finalStatus === 'completed') {
                    await reconcilePayment({ ...transaction, status: finalStatus, provider: provider as any });
                }
            }

            return res.status(200).json({ success: true, status: finalStatus, details: externalData });
        }

        if (action === 'initiateAirtelMoneyStk') {
            const airtel = bodyConfig || settings?.airtel_money_config || settings?.airtelMoneyConfig || {};
            if (!airtel || !airtel.apiKey) return res.status(400).json({ success: false, message: 'Airtel Money configuration is missing.' });

            console.log(`[Airtel Money] Initiating STK push for ${recipient} (Amount: ${amount})`);
            
            // Mocking Airtel STK response for now as real implementation depends on their specific region API
            // Usually involves: 1. Get Token, 2. POST /merchant/v1/payments/
            const requestId = `airtel_${Date.now()}`;
            
            await supabase.from('mpesa_transactions').insert({
                id: `txn_${Date.now()}`,
                transaction_id: `AIRTEL_${requestId}`,
                checkout_request_id: requestId,
                institution_id: paramsMap.metadata?.institutionId || user?.user_metadata?.institutionId || 'SYSTEM',
                amount: amount,
                phone_number: recipient,
                status: 'pending',
                provider: 'airtel',
                metadata: paramsMap.metadata || {}
            });

            return res.status(200).json({ 
                success: true, 
                message: 'Airtel Money STK prompt initiated.', 
                requestId,
                checkoutRequestId: requestId 
            });
        }

        if (action === 'initiateIntasendPayment') {
            const intasend = bodyConfig || settings?.intasend_config || settings?.intasendConfig || {};
            if (!intasend || !intasend.publishableKey) return res.status(400).json({ success: false, message: 'IntaSend configuration is missing.' });

            const baseUrl = intasend.environment === 'production' ? 'https://payment.intasend.com/api/v1' : 'https://sandbox.intasend.com/api/v1';
            
            try {
                const response = await fetchWithTimeout(`${baseUrl}/checkout/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-IntaSend-Publishable-Key': intasend.publishableKey },
                    body: JSON.stringify({
                        amount: amount,
                        currency: "KES",
                        email: user?.email || '',
                        phone_number: recipient.replace(/[^\d]/g, ''),
                        first_name: user?.name?.split(' ')[0] || "User",
                        last_name: user?.name?.split(' ')[1] || "Customer",
                        method: "M-PESA",
                        redirect_url: `https://${req.headers.host}/payment-success`,
                    })
                });

                const data = await response.json() as any;
                if (response.ok) {
                    const checkoutId = data.id || data.checkout_id;
                    await supabase.from('mpesa_transactions').insert({
                        id: `txn_${Date.now()}`,
                        transaction_id: `INTASEND_${checkoutId}`,
                        checkout_request_id: checkoutId,
                        institution_id: paramsMap.metadata?.institutionId || user?.user_metadata?.institutionId || 'SYSTEM',
                        amount: amount,
                        phone_number: recipient,
                        status: 'pending',
                        provider: 'intasend',
                        metadata: paramsMap.metadata || {}
                    });
                    return res.status(200).json({ success: true, url: data.url, checkoutRequestId: checkoutId });
                }
                return res.status(response.status).json({ success: false, message: data.message || 'IntaSend request failed.' });
            } catch (e: any) {
                return res.status(500).json({ success: false, message: e.message });
            }
        }

        if (action === 'initiateStkPush') {
            const mpesa = bodyConfig || settings?.mpesa_config || settings?.mpesaConfig || {};
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
                        CallBackURL: `https://${req.headers['x-forwarded-host'] || req.headers.host}/api/mpesa-callback`,
                        AccountReference: (paramsMap.metadata?.institutionCode || "Sub/SMS").substring(0, 12),
                        TransactionDesc: `${paramsMap.metadata?.type === 'sms' ? 'SMS Units' : 'License'}: ${paramsMap.metadata?.institutionName || "Acct"}`.substring(0, 20)
                    })
                }, 15000); // 15s timeout for the actual prompt
            } catch (e: any) {
                console.error('[M-Pesa STK] Request failed:', e.message);
                return res.status(504).json({ success: false, message: 'M-Pesa gateway timed out sending the prompt.' });
            }

            const stkData = (await stkRes.json()) as any;
            if (stkRes.ok && stkData.ResponseCode === '0') {
                const institutionId = paramsMap.metadata?.institutionId || user?.user_metadata?.institutionId || 'SYSTEM';
                await supabase.from('mpesa_transactions').insert({
                    id: `txn_${Date.now()}`,
                    transaction_id: `STK_${stkData.CheckoutRequestID}`,
                    checkout_request_id: stkData.CheckoutRequestID,
                    institution_id: institutionId,
                    amount: amount,
                    phone_number: recipient,
                    status: 'pending',
                    metadata: paramsMap.metadata || {}
                });
                return res.status(200).json({ success: true, message: 'M-Pesa prompt sent.', data: stkData });
            }
            return res.status(stkRes.status).json({ success: false, message: stkData.CustomerMessage || 'M-Pesa gateway rejected the request.', details: stkData });
        }

        if (action === 'testNcbaAuth') {
            const ncba = bodyConfig || settings?.ncba_config || settings?.ncbaConfig || {};
            const diagnostics: any = {
                fields: {},
                connection: {},
                tips: []
            };

            const fields = [
                'clientId', 'client_id', 'consumerKey', 'consumer_key', 
                'callbackUsername', 'callback_username',
                'clientSecret', 'client_secret', 'secretKey', 'secret_key',
                'consumerSecret', 'consumer_secret'
            ];

            fields.forEach(f => {
                const val = ncba[f];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    const strVal = String(val);
                    const sanitized = strVal.replace(/[^\x20-\x7E]/g, '').trim();
                    diagnostics.fields[f] = {
                        present: true,
                        fingerprint: sanitized.substring(0, 4),
                        length: strVal.length,
                        validChars: strVal === sanitized
                    };
                }
            });

            const authMethod = (ncba.authMethod || 'bearer').toLowerCase();
            diagnostics.connection = {
                authMethod,
                baseUrl: !!(ncba.baseUrl || ncba.base_url),
                stkPushUrl: !!(ncba.stkPushBaseUrl || ncba.stk_push_base_url || ncba.baseUrl || ncba.base_url),
                isMock: ncba.isMock === true || ncba.isMock === 'true',
                serverIp: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip).catch(() => 'Unknown')
            };

            try {
                // Attempt a real token generation to verify credentials
                const token = await getNcbaToken(ncba);
                
                if (token) {
                    diagnostics.tokenStatus = 'Success';
                    diagnostics.gatewayReachable = true;
                    return res.status(200).json({ success: true, diagnostics, hint: 'Authentication successful!' });
                } else {
                    diagnostics.tokenStatus = 'Failed: No token returned';
                    return res.status(200).json({ success: false, diagnostics, hint: 'Bank server reached, but no token was issued.' });
                }
            } catch (err: any) {
                diagnostics.tokenStatus = `Failed: ${err.message}`;
                // Fallback: check if the gateway is at least reachable
                const testUrl = normalizeNcbaUrl(ncba.baseUrl || ncba.base_url);
                const headRes = await fetchWithTimeout(testUrl, { method: 'HEAD' }).catch(() => null);
                diagnostics.gatewayReachable = !!headRes;

                return res.status(200).json({ 
                    success: false, 
                    diagnostics, 
                    error: err.message,
                    hint: err.message.includes('401') 
                        ? `Bank rejected your 10-char ID/Secret. Error: ${err.message}` 
                        : `Network timeout or unreachable URL. Gateway: ${diagnostics.gatewayReachable ? 'UP' : 'DOWN'}`
                });
            }
        }

        if (action === 'verifyTransactionManually') {
            if (user.role !== 'super_admin') {
                return res.status(403).json({ success: false, message: 'Permission denied: Manual verification requires Super Admin privileges.' });
            }

            const { transactionId } = paramsMap;
            if (!transactionId) return res.status(400).json({ success: false, message: 'Missing transactionId' });

            // 1. Fetch transaction
            const { data: transaction } = await supabase.from('mpesa_transactions').select('*').eq('id', transactionId).maybeSingle();
            if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found.' });

            if (transaction.status === 'completed' && transaction.metadata?.reconciled) {
                return res.status(200).json({ success: true, message: 'Transaction is already verified and reconciled.' });
            }

            // 2. Update status and metadata
            await supabase.from('mpesa_transactions').update({ 
                status: 'completed'
            }).eq('id', transactionId);

            // 3. Trigger reconciliation
            await reconcilePayment({ ...transaction, status: 'completed' });
            return res.status(200).json({ success: true, message: 'Transaction verified manually and reconciled successfully.' });
        }

        if (action === 'ncbaInitiateStk') {
            const { institutionId, phone } = paramsMap;
            const isPlatformService = ['sms', 'subscription', 'one-off'].includes(paramsMap.metadata?.type);
            
            // Prioritize config from request body (for testing unsaved changes)
            let ncbaConfig = bodyConfig ? toCamelCase(bodyConfig) : null;
            let targetInstId = institutionId;

            if (!ncbaConfig) {
                // Try institution-specific config first
                const { data: inst } = await supabase.from('institutions').select('*').eq('id', institutionId || user?.user_metadata?.institutionId).maybeSingle();
                
                if (inst && inst.ncbaConfig) {
                    ncbaConfig = toCamelCase(inst.ncbaConfig);
                    targetInstId = inst.id;
                } else if (isPlatformService) {
                    // Fallback to Global Super Admin config for platform services (SMS/Subscription)
                    ncbaConfig = toCamelCase(settings.ncba_config || settings.ncbaConfig);
                    targetInstId = institutionId || user?.user_metadata?.institutionId || 'SYSTEM';
                    console.log(`[NCBA Gateway] Falling back to normalized global configuration for ${paramsMap.metadata?.type} purchase.`);
                }

                if (!ncbaConfig) {
                    return res.status(400).json({ 
                        success: false, 
                        message: isPlatformService 
                            ? 'NCBA Integration not configured. Please contact Super Admin to set up global payments.' 
                            : 'NCBA Integration not configured for this institution.' 
                    });
                }
            }

            try {
                const result = await initiateNcbaPayment(ncbaConfig, amount, phone || recipient);
                const resData = result as any;
                
                if (resData.StatusCode === '0' || resData.TransactionID) {
                    await supabase.from('ncba_transactions').insert({
                        id: `ncba_${Date.now()}`,
                        transaction_id: resData.TransactionID || resData.ReferenceID,
                        checkout_request_id: resData.TransactionID,
                        institution_id: targetInstId || 'SYSTEM',
                        amount: amount,
                        phone_number: phone || recipient,
                        status: 'pending',
                        metadata: paramsMap.metadata || {}
                    });
                    return res.status(200).json({ success: true, message: 'NCBA Direct Debit request initiated.', data: resData });
                }
                return res.status(400).json({ success: false, message: resData.StatusDescription || 'NCBA gateway error.', details: resData });
            } catch (err: any) {
                console.error(`[NCBA STK Fatal] Request failed for ${paramsMap.phone || recipient}:`, err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'NCBA initiation failed.', 
                    error: err.message,
                    hint: err.message.includes('fetch') ? 'The server could not reach the NCBA gateway. Check your Base URL and ensure it is publicly accessible.' : undefined
                });
            }
        }

        if (action === 'ncbaGenerateQr') {
            const { institutionId } = paramsMap;
            const isPlatformService = paramsMap.metadata?.type === 'sms';

            let ncbaConfig = bodyConfig ? toCamelCase(bodyConfig) : null;
            let targetInstId = institutionId;

            if (!ncbaConfig) {
                const { data: inst } = await supabase.from('institutions').select('*').eq('id', institutionId || user?.user_metadata?.institutionId).maybeSingle();
                if (inst && inst.ncbaConfig) {
                    ncbaConfig = toCamelCase(inst.ncbaConfig);
                    targetInstId = inst.id;
                } else if (isPlatformService) {
                    // Normalize global fallback
                    ncbaConfig = toCamelCase(settings?.ncba_config || settings?.ncbaConfig);
                    targetInstId = institutionId || user?.user_metadata?.institutionId || 'SYSTEM';
                }
            }

            if (!ncbaConfig) {
                return res.status(400).json({ success: false, message: 'NCBA Integration not configured.' });
            }

            try {
                const result = await generateNcbaQr(ncbaConfig, amount);
                return res.status(200).json({ success: true, qrData: result });
            } catch (err: any) {
                console.error(`[NCBA QR Fatal] Generation failed:`, err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'NCBA QR generation failed.', 
                    error: err.message,
                    hint: 'Verify the Base URL and ensure the gateway is reachable.'
                });
            }
        }

        if (action === 'ncbaQueryStatus') {
            const { checkoutRequestId, institutionId } = paramsMap;

            // Prioritize config from request body
            let ncbaConfig = bodyConfig;
            if (!ncbaConfig) {
                const { data: inst } = await supabase.from('institutions').select('*').eq('id', institutionId).maybeSingle();
                if (!inst || !inst.ncbaConfig) return res.status(400).json({ success: false, message: 'Config missing' });
                ncbaConfig = inst.ncbaConfig;
            }

            try {
                const token = await getNcbaToken(ncbaConfig);
                const effectiveBase = (ncbaConfig.stkPushBaseUrl || ncbaConfig.baseUrl || '').trim();
                const queryPath = ncbaConfig.queryStkUrl || '/payments/api/v1/stk-push/query';
                // If queryStkUrl is a full URL, use it directly; otherwise join with base
                const queryUrl = queryPath.startsWith('http')
                    ? queryPath
                    : (effectiveBase + (effectiveBase.endsWith('/') ? queryPath.replace(/^\//, '') : queryPath.startsWith('/') ? queryPath : '/' + queryPath));
                console.log(`[NCBA ncbaQueryStatus] Query URL: ${queryUrl}`);
                const resStatus = await fetchWithTimeout(queryUrl, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(mergeParams({ TransactionID: checkoutRequestId }, ncbaConfig.params))
                });
                if (resStatus.ok) {
                    const statusData = await resStatus.json() as any;
                    if (statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED' || String(statusData.ResultCode) === '0') {
                        const { data: txn } = await supabase.from('ncba_transactions').update({ status: 'completed' }).eq('transaction_id', checkoutRequestId).select().single();
                        if (txn) await reconcilePayment({ ...txn, provider: 'ncba' });
                        return res.status(200).json({ success: true, status: 'completed', data: statusData });
                    }
                    return res.status(200).json({ success: true, status: statusData.status || 'pending', data: statusData });
                }
                return res.status(resStatus.status).json({ success: false, message: 'Failed to query NCBA status.' });
            } catch (err: any) {
                return res.status(500).json({ success: false, message: 'Error querying NCBA status.', error: err.message });
            }
        }

        if (action === 'ncbaQueryStk') {
            const { institutionId, checkoutRequestId } = paramsMap;
            const isPlatformService = true; // Status check is always allowed if we have config

            let ncbaConfig = bodyConfig ? toCamelCase(bodyConfig) : null;
            if (!ncbaConfig) {
                const { data: inst } = await supabase.from('institutions').select('*').eq('id', institutionId || user?.user_metadata?.institutionId).maybeSingle();
                if (inst && inst.ncbaConfig) {
                    ncbaConfig = toCamelCase(inst.ncbaConfig);
                } else {
                    ncbaConfig = toCamelCase(settings?.ncba_config || settings?.ncbaConfig);
                }
            }

            if (!ncbaConfig) return res.status(400).json({ success: false, message: 'NCBA Integration not configured.' });

            try {
                const result = await queryNcbaStkStatus(ncbaConfig, checkoutRequestId);
                return res.status(200).json({ success: true, status: result });
            } catch (err: any) {
                console.error(`[NCBA Query Fatal]:`, err);
                return res.status(500).json({ success: false, message: 'NCBA Status Query failed.', error: err.message });
            }
        }

        if (action === 'ncbaWebhook') {
            const body = req.body;
            const institutionId = paramsMap.institutionId;
            console.log(`[NCBA Webhook] Received callback for Institution ${institutionId || 'Unknown'}:`, JSON.stringify(body));

            // 1. Fetch Config for Authentication
            let ncbaConfig = null;
            if (institutionId) {
                const { data: inst } = await supabase.from('institutions').select('ncba_config').eq('id', institutionId).maybeSingle();
                if (inst?.ncba_config) ncbaConfig = toCamelCase(inst.ncba_config);
            }
            
            if (!ncbaConfig) {
                ncbaConfig = toCamelCase(settings?.ncba_config || settings?.ncbaConfig);
            }

            // 2. Verify Authentication if configured
            const expectedUser = ncbaConfig?.callbackUsername;
            const expectedPass = ncbaConfig?.callbackSecret;

            if (expectedUser && expectedPass) {
                const authHeader = req.headers.authorization || '';
                const expectedAuth = `Basic ${Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64')}`;
                
                if (authHeader !== expectedAuth) {
                    console.warn(`[NCBA Webhook] Unauthorized access attempt for institution ${institutionId}`);
                    return res.status(401).json({ success: false, message: 'Unauthorized' });
                }
            }

            // NCBA Spec: Payload contains TransactionID, ResultCode, etc.
            const checkoutRequestId = body.TransactionID || body.CheckoutRequestID;
            if (!checkoutRequestId) return res.status(400).json({ success: false, message: 'No TransactionID' });

            if (String(body.ResultCode) === '0' || body.status === 'SUCCESS' || body.status === 'COMPLETED') {
                const { data: txn } = await supabase.from('ncba_transactions').update({ 
                    status: 'completed',
                    external_data: body,
                    completed_at: new Date().toISOString()
                }).eq('transaction_id', checkoutRequestId).select().single();
                
                if (txn) {
                    await reconcilePayment({ ...txn, provider: 'ncba' });
                    return res.status(200).json({ success: true, message: 'Payment reconciled' });
                }
            }
            return res.status(200).json({ success: true, message: 'Callback received' });
        }

        return res.status(400).json({ success: false, message: 'Action not supported.' });

    } catch (e: any) {
        console.error('[Fatal Error]', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error', details: e.message });
    }
}
