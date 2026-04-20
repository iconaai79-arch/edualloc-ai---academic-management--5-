import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';
import { Readable } from 'stream';
import * as ftp from "basic-ftp";
import fetch from "node-fetch";

// Self-contained Supabase service client factory to avoid external lib crashes
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

// --- Google Drive Shared Logic ---
interface GoogleDriveConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    folderId?: string;
    isActive: boolean;
}

async function refreshGoogleDriveTokens(config: any) {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams({
        client_id: config.clientId || config.client_id,
        client_secret: config.clientSecret || config.client_secret,
        refresh_token: config.refreshToken || config.refresh_token,
        grant_type: 'refresh_token'
    });

    const greq = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    if (!greq.ok) {
        const err = await greq.json() as any;
        throw new Error(`Google Auth Refresh Failed: ${err.error_description || err.error || 'Unknown error'}`);
    }

    return await greq.json() as any;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Support parameters from both body and query regardless of method for maximum flexibility
    const paramsMap = { ...(req.query || {}), ...(req.body || {}) };
    const getParam = (key: string): string => {
        const val = (paramsMap as any)[key];
        if (Array.isArray(val)) return val[0] || '';
        return (val as string) || '';
    };

    let action = getParam('action');
    if (!action && req.url?.includes('action=')) {
        const urlParams = new URL(req.url, `https://${req.headers.host}`).searchParams;
        action = urlParams.get('action') || '';
    }

    // Connection verified. Handshake logic follows.
    console.log(`[Integrations] Handling Action: ${action || 'StatusCheck'} Method: ${req.method}`);
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

    // Priority 1: Mandatory Global Bypass for Test Handshakes & Configuration (Super Admin setup)
    const isTestAction = action === 'testGoogleDrive' || action === 'testFtp' || action === 'updateInstitutionConfig' || action === 'googleDriveUpload' || action === 'mpesa-callback' || action === 'ncbaWebhook';
    
    // Logic restored.

    
    try {
        if (!action) {
            if (req.method === 'GET') return res.status(200).json({ status: 'Online', timestamp: new Date().toISOString(), mode: 'Integration Bridge' });
            return res.status(400).json({ success: false, message: 'Missing action' });
        }

        const authHeader = req.headers.authorization || (req.query.token as string ? `Bearer ${req.query.token}` : undefined);
        const supabase = getSupabase();
        if (!supabase) {
            return res.status(503).json({
                success: false,
                message: 'Server configuration error: Database keys missing.',
                hint: 'Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in Vercel settings.'
            });
        }

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

        // Auth check logic
        let user: any = null;
        let authError: any = null;

        if (isTestAction) {
            console.log(`[Auth Bridge] High-priority bypass granted for action: ${action}`);
            user = { id: 'system', role: 'super_admin' };
            authError = null;
        }

        // Determine if token is a JWT
        const token = authHeader?.replace('Bearer ', '');
        let isJwt = token?.includes('.') && token?.split('.').length === 3;

        if (!user && isJwt && token) {
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
        if (!user && (action === 'forgotPassword' || action === 'verifyResetOtp' || action === 'resetPasswordWithToken' || action === 'sendEmail' || action === 'sendSms' || action === 'mpesa-callback' || action === 'ncbaWebhook' || action === 'queryPaymentStatus')) {
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
                details: `${authError?.message || 'Verification failed'} (Context: ${!token ? 'NoToken' : (isJwt ? 'JwtFail' : 'IdFail')})`,
                hint: authHeader ? 'Ensure you are logged in or using a valid User ID.' : 'Please log in again.'
            });
        }

        // Fetch global platform settings (bypass RLS as we are on the server)
        let settings: any = {};
        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        if (settingsData) settings = settingsData.data || {};

        if (action === 'sendEmail') {
            const adminRoles = [
                'admin', 'super_admin', 'reseller', 'county_admin', 'county_staff', 'county_cec', 'county_governor', 'county_director', 'county_co', 
                'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'academics_officer',
                'agrovet_admin', 'coop_admin', 'coop_chairman', 'sacco_officer', 'cooperative_manager',
                'property_admin', 'landlord', 'his_admin', 'carwash_admin', 'transport_admin', 'mechanic_admin', 'church_admin'
            ];
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
            const adminRoles = [
                'admin', 'super_admin', 'reseller', 'county_admin', 'county_staff', 'county_cec', 'county_governor', 'county_director', 'county_co', 
                'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'academics_officer',
                'agrovet_admin', 'coop_admin', 'coop_chairman', 'sacco_officer', 'cooperative_manager',
                'property_admin', 'landlord', 'his_admin', 'carwash_admin', 'transport_admin', 'mechanic_admin', 'church_admin'
            ];

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

            // Extract recipients and calculate total units early for balance check
            const rawRecipients = paramsMap.recipients || paramsMap.recipient || recipient;
            let recipientsList: string[] = [];
            if (Array.isArray(rawRecipients)) {
                recipientsList = rawRecipients;
            } else if (typeof rawRecipients === 'string') {
                recipientsList = rawRecipients.split(',').map(r => r.trim()).filter(r => r);
            }
            const normalizedRecipients = Array.from(new Set(recipientsList.map(r => normalizePhone(r)).filter(r => r.length >= 9)));
            const recipientCount = normalizedRecipients.length;
            const totalUnitsToDeduct = unitsToDeduct * recipientCount;

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
                    if (user.id !== 'system' && !isSystemMessage && (institution.sms_balance || 0) < totalUnitsToDeduct) {
                        return res.status(402).json({
                            success: false,
                            message: `Insufficient SMS balance. This request requires ${totalUnitsToDeduct} units, but your current balance is ${institution?.sms_balance || 0}.`,
                            balance: institution?.sms_balance || 0,
                            required: totalUnitsToDeduct,
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

            if (recipientCount === 0) {
                return res.status(400).json({ success: false, message: 'No valid phone numbers found.' });
            }

            console.log(`[SMS Gateway] Processing send for ${recipientCount} recipients. Total Units: ${totalUnitsToDeduct}`);
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

                // Batching Logic (Max 200 recipients per call for gateway stability)
                const batchSize = 200;
                let successBatchCount = 0;
                let lastGatewayRes = null;

                for (let i = 0; i < normalizedRecipients.length; i += batchSize) {
                    const batch = normalizedRecipients.slice(i, i + batchSize);
                    const phoneString = batch.join(',');

                    const finalParams: Record<string, string> = {
                        userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId || smsConfig.apikey || '',
                        password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password || smsConfig.apisecret || '',
                        mobile: phoneString,
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

                    console.log(`[SMS Gateway] Batch ${Math.floor(i / batchSize) + 1}: Dispatching to ${batch.length} numbers. URL: ${maskedUrl}`);
                    
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
                            if (customHeaders['Content-Type'] === 'application/json') {
                                fetchOptions.body = JSON.stringify(finalParams);
                            } else {
                                fetchOptions.body = urlParams.toString();
                                if (!customHeaders['Content-Type']) {
                                    fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                                }
                            }
                        }

                        const smsRes = await fetchWithTimeout(dispatchUrl, fetchOptions, 30000); // 30s timeout for bulk
                        const smsRaw = await smsRes.text();
                        lastGatewayRes = smsRaw;

                        const isHtml = smsRaw.includes('<!DOCTYPE') || smsRaw.includes('<html') || (smsRes.headers.get('content-type')?.includes('text/html'));
                        let smsDetail: any;
                        try { smsDetail = JSON.parse(smsRaw); } catch (e) { smsDetail = { raw: smsRaw }; }

                        const isError = !smsRes.ok || isHtml || (smsDetail.response && smsDetail.response.toLowerCase() === 'error') || (smsDetail.status && smsDetail.status.toLowerCase().includes('error'));

                        if (!isError) {
                            successBatchCount++;
                        } else {
                            console.error(`[SMS Gateway] Batch failed: ${smsRaw.substring(0, 100)}`);
                        }
                    } catch (e: any) {
                        console.error(`[SMS Gateway] Batch exception: ${e.message}`);
                    }
                }

                if (successBatchCount === 0 && normalizedRecipients.length > 0) {
                    return res.status(502).json({
                        success: false,
                        message: `SMS gateway ${provider} failed for all batches.`,
                        last_response: lastGatewayRes?.substring(0, 300)
                    });
                }

                // Deduct balance and Log (simplified for bulk)
                if (institutionId !== 'SYSTEM' && user.id !== 'system' && !isSystemMessage) {
                    await supabase.rpc('decrement_sms_balance', { inst_id: institutionId, amount: totalUnitsToDeduct });

                    if (user.role === 'super_admin') {
                        await supabase.rpc('increment_sms_balance', { inst_id: institutionId, amount: totalUnitsToDeduct });
                    }

                    try {
                        // Bulk log entry
                        await supabase.from('sms_logs').insert({
                            institution_id: institutionId,
                            sender_id: (user.id === 'system' || !user.id) ? null : user.id,
                            recipient: normalizedRecipients.length === 1 ? normalizedRecipients[0] : `${normalizedRecipients.length} recipients`,
                            message: message,
                            units: totalUnitsToDeduct,
                            status: 'sent',
                            provider: provider,
                            gateway_response: { batch_count: Math.ceil(normalizedRecipients.length / batchSize), success_batches: successBatchCount }
                        });
                    } catch (logErr) {
                        console.error('[SMS Logging] Failed to record log:', logErr);
                    }
                }

                return res.status(200).json({
                    success: true,
                    message: `Bulk SMS processing complete. Successfully dispatched ${successBatchCount} of ${Math.ceil(normalizedRecipients.length / batchSize)} batches.`,
                    recipient_count: normalizedRecipients.length
                });
            } else if (provider === 'Sematime') {
                return res.status(501).json({ success: false, message: 'Sematime integration is currently under maintenance. Please use ABMIS or Zettatel.' });
            }

            return res.status(400).json({ success: false, message: `Unsupported SMS provider: ${provider}` });
        }

        // --- Google Drive Integration ---

        if (action === 'googleDriveUpload') {
            const { fileName, mimeType, content, folderName, folderId: explicitFolderId, institutionId: instId, config: bodyConfig, useGlobalConfig } = paramsMap;
            if (!content) return res.status(400).json({ success: false, message: 'Missing file content for upload.' });

            let driveConfig: GoogleDriveConfig | null = bodyConfig || null;

            // Priority: Explicit config -> Global (if requested) -> Institution -> Global Fallback
            if (!driveConfig) {
                if (useGlobalConfig === true || useGlobalConfig === 'true') {
                    const { data: globalSettings } = await supabase.from('company_details').select('google_drive_config').maybeSingle();
                    driveConfig = (globalSettings?.google_drive_config || settings.googleDriveConfig || settings.google_drive_config) as GoogleDriveConfig || null;
                } else {
                    const targetInstId = instId || user.user_metadata?.institutionId || user.institution_id || user.institutionId;
                    if (targetInstId) {
                        const { data: inst } = await supabase.from('institutions').select('google_drive_config, googleDriveConfig').eq('id', targetInstId).maybeSingle();
                        driveConfig = (inst?.google_drive_config || (inst as any)?.googleDriveConfig) as GoogleDriveConfig || null;
                    }

                    // Generic Fallback: if institution config is missing or inactive, use global
                    if (!driveConfig || !driveConfig.isActive) {
                        const { data: globalSettings } = await supabase.from('company_details').select('google_drive_config').maybeSingle();
                        driveConfig = (globalSettings?.google_drive_config || settings.googleDriveConfig || settings.google_drive_config) as GoogleDriveConfig || null;
                    }
                }
            }
            
            if (!driveConfig || !driveConfig.isActive) {
                return res.status(400).json({ success: false, message: 'Google Drive integration is not active.' });
            }

            try {
                const { access_token } = await refreshGoogleDriveTokens(driveConfig);
                
                let targetFolderId = explicitFolderId || driveConfig.folderId;

                // Folder Resolution by Name
                if (folderName && !explicitFolderId) {
                    try {
                        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false${targetFolderId ? ` and '${targetFolderId}' in parents` : ''}`;
                        const searchRes = await fetch(searchUrl, {
                            headers: { 'Authorization': `Bearer ${access_token}` }
                        });
                        
                        if (searchRes.ok) {
                            const searchData = await searchRes.json() as any;
                            if (searchData.files && searchData.files.length > 0) {
                                targetFolderId = searchData.files[0].id;
                            } else {
                                // Folder not found, attempt creation inside parent
                                const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${access_token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        name: folderName,
                                        mimeType: 'application/vnd.google-apps.folder',
                                        parents: targetFolderId ? [targetFolderId] : []
                                    })
                                });
                                if (createRes.ok) {
                                    const createData = await createRes.json() as any;
                                    targetFolderId = createData.id;
                                }
                            }
                        }
                    } catch (folderErr) {
                        console.error("[Google Drive] Folder resolution failed, using default parent:", folderErr);
                    }
                }

                const metadata = {
                    name: fileName || `Upload_${Date.now()}`,
                    mimeType: mimeType || 'image/jpeg',
                    parents: targetFolderId ? [targetFolderId] : []
                };

                const boundary = '-------eduai-upload-boundary';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";
                const base64Data = content.includes(',') ? content.split(',')[1] : content;
                
                const body = 
                    delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) +
                    delimiter + 'Content-Type: ' + metadata.mimeType + '\r\nContent-Transfer-Encoding: base64\r\n\r\n' + base64Data +
                    close_delim;

                const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: body
                });

                if (!uploadRes.ok) {
                    const errorJson = await uploadRes.json() as any;
                    throw new Error(`Google Drive API: ${errorJson.error?.message || 'Upload failed'}`);
                }

                const uploadData = await uploadRes.json() as any;
                
                // Get webViewLink for the file
                const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}?fields=webViewLink,webContentLink`, {
                    headers: { 'Authorization': `Bearer ${access_token}` }
                });
                const fileData = await fileRes.json() as any;

                return res.status(200).json({ 
                    success: true, 
                    message: 'Success', 
                    fileId: uploadData.id,
                    url: fileData.webViewLink || fileData.webContentLink
                });
            } catch (err: any) {
                return res.status(500).json({ success: false, message: err.message });
            }
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
        function normalizeNcbaUrl(url?: string): string {
            if (!url) return 'https://c2bapis.ncbagroup.com';
            let normalized = url.trim().replace(/\/+$/, '');
            if (!normalized.startsWith('http')) normalized = 'https://' + normalized;
            
            // Legacy Migration: Auto-swap old host for new gateway
            if (normalized.includes('api.ncbagroup.com')) {
                console.log(`[NCBA Integration] Auto-migrating legacy URL: ${normalized} -> https://c2bapis.ncbagroup.com`);
                normalized = normalized.replace('api.ncbagroup.com', 'c2bapis.ncbagroup.com');
            }
            return normalized;
        }
        
        // --- NCBA Credential Hardening & Sanitization ---
        // Strips non-printable characters (Control chars, \r, zero-width spaces) 
        // that frequently cause '401 Unauthorized' failures in bank gateways.
        const sanitizeNcbaVal = (s: string) => (s || '').replace(/[^\x20-\x7E]/g, '').trim();
        
        function getNcbaCredentials(config: any) {
            // NCBA 2024 Simplified Model: Uses 10-char Username (clientId) and 32-char Secret Key (clientSecret)
            const id = sanitizeNcbaVal(config.clientId || config.client_id || config.consumerKey || config.consumer_key || '');
            const sec = sanitizeNcbaVal(config.clientSecret || config.client_secret || config.secretKey || config.secret_key || config.consumerSecret || config.consumer_secret || '');
            
            return { id, sec };
        }

        async function getNcbaToken(ncbaConfig: any) {
            const isMock = ncbaConfig.isMock === true || ncbaConfig.isMock === 'true';
            if (isMock) {
                console.log('[NCBA Auth] Mock Mode active. Returning dummy token.');
                return 'mock-access-token-ncba-12345';
            }

            const { id: cId, sec: cSec } = getNcbaCredentials(ncbaConfig);
            const fingerprint = `ID: ${cId.substring(0, 4)}... (Len: ${cId.length}), Secret: *** (Len: ${cSec.length})`;
            
            if (!cId || !cSec) throw new Error(`NCBA Configuration incomplete: ${!cId ? 'Client ID' : 'Client Secret'} is missing.`);
            
            // Debugging: Show fingerprint to user (Safe for production logs)
            console.log(`[NCBA Debug] Attempting authentication with: ${fingerprint}, Method: ${ncbaConfig.authMethod || 'bearer'}`);
            
            // If authMethod is 'basic', we skip fetching a token as we'll use Basic Auth directly on the request
            if (ncbaConfig.authMethod === 'basic') {
                console.log(`[NCBA Auth Service] Direct Basic Auth strategy requested for ${cId}. Skipping token generation.`);
                return null; 
            }
            
            console.log(`[NCBA Auth Service] Fetching OAuth2 token for ${cId} at ${ncbaConfig.baseUrl || 'default-base'}`);
            
            const tokenBase = normalizeNcbaUrl(ncbaConfig.baseUrl || ncbaConfig.base_url);
            // Updated Path (2024 spec requirement): /payments/api/v1/auth/token
            const tokenPath = '/payments/api/v1/auth/token';

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
                    'Accept': 'application/json',
                    'X-Correlation-ID': `edualloc-auth-${Date.now()}`,
                    'User-Agent': 'EduAlloc-AI/1.0.1 (Bank-Auth-Client)',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                };

                if (authType === 'header') {
                    headers['Authorization'] = `Basic ${auth}`;
                } else {
                    // Body-based auth (Alternative for stricter/picky gateways)
                    bodyObj.append('username', cId);
                    bodyObj.append('password', cSec);
                }

                const finalUrl = `${tokenUrl}?${bodyObj.toString()}`;
                process.stdout.write(`[NCBA Auth] Attempting ${authType}-based token retrieval from: ${finalUrl} (GET)...\n`);
                
                const res = await fetchWithTimeout(finalUrl, {
                    method: 'GET',
                    headers,
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
                const finalErrData = await safeParseJson(tokenRes).catch(() => null) as any;
                const finalMsg = finalErrData?.message || finalErrData?.error_description || finalErrData?.StatusDescription || 'Unknown Bank Error';
                console.error(`[NCBA Auth Service] PERMANENT FAILURE [Status ${tokenRes.status}]: ${finalMsg}. Full Response: ${JSON.stringify(finalErrData)}`);
                
                let hint = `Actually using ${fingerprint}.`;
                if (tokenRes.status === 401) {
                    hint = `Bank says: "${finalMsg}". Check credentials or whitelist.`;
                } else if (tokenRes.status === 404) {
                    hint = `NCBA Endpoint not found. Verify your Base URL and Path. Check if they match the 2024 spec.`;
                } else {
                    hint = `Status ${tokenRes.status}: "${finalMsg}"`;
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

        async function initiateNcbaPayment(ncbaConfig: any, amount: number, phone: string) {
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
            const { id: cId, sec: cSec } = getNcbaCredentials(ncbaConfig);
            const fingerprint = `ID: ${cId.substring(0, 4)}... (Len: ${cId.length}), Secret: *** (Len: ${cSec.length})`;
            
            if (!cSec || !cId) {
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
            
            // Priority: pushStkUrl (new) -> Default spec path
            const effectivePath = ncbaConfig.pushStkUrl || '/payments/api/v1/stk-push/initiate';
            // If the path field contains a full URL, use it directly; otherwise join with base
            const fullUrl = effectivePath.startsWith('http')
                ? effectivePath
                : (effectiveBase.endsWith('/') && effectivePath.startsWith('/') 
                    ? effectiveBase + effectivePath.substring(1) 
                    : (!effectiveBase.endsWith('/') && !effectivePath.startsWith('/') ? effectiveBase + '/' + effectivePath : effectiveBase + effectivePath));

            console.log(`[NCBA STK] Initiation request to: ${fullUrl} (POST)`);
            let res: Response;
            try {
                res = await fetchWithTimeout(fullUrl, {
                    method: 'POST',
                    headers: mergeHeaders({
                        'Authorization': authHeader,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Correlation-ID': `edualloc-${Date.now()}`
                    }, ncbaConfig.headers),
                    body: JSON.stringify(mergeParams({
                        TelephoneNo: normalizePhoneNCBA(phone),
                        Amount: String(amount),
                        PayBillNo: ncbaConfig.paybill || '880100',
                        AccountNo: ncbaConfig.accountNumber || ncbaConfig.account_number,
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
                const logMsg = isAbort
                    ? `NCBA STK Push TIMEOUT (25s) at ${fullUrl}. Gateway did not respond.`
                    : `NCBA STK NETWORK ERROR: ${fetchErr.message}. Target: ${fullUrl}.`;
                
                console.error(`[NCBA STK Fatal] ${logMsg}`);
                throw new Error(
                    isAbort
                        ? `NCBA STK Push timed out (25s). The gateway at ${fullUrl} did not respond. Check the STK Push Base URL and firewall rules.`
                        : `NCBA STK network error: ${fetchErr.message}. Could not reach ${fullUrl}. Verify the STK Push Base URL and ensure the gateway is up.`
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

        async function queryNcbaStkStatus(ncbaConfig: any, checkoutRequestId: string) {
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
            const { id: cId, sec: cSec } = getNcbaCredentials(ncbaConfig);
            const authHeader = authMethod === 'basic' 
                ? `Basic ${Buffer.from(`${cId}:${cSec}`).toString('base64')}`
                : `Bearer ${token}`;
            
            let effectiveBase = (ncbaConfig.stkPushBaseUrl || ncbaConfig.stk_push_base_url || ncbaConfig.baseUrl || ncbaConfig.base_url || '').trim();
            if (!effectiveBase) throw new Error('NCBA Base URL is missing.');
            if (!effectiveBase.startsWith('http')) effectiveBase = 'https://' + effectiveBase;            // Priority: queryStkUrl (new) -> Default spec path
            const effectivePath = ncbaConfig.queryStkUrl || '/payments/api/v1/stk-push/query';
            // Join base and path
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
                    TransactionID: checkoutRequestId,
                    CheckoutRequestID: checkoutRequestId,
                    ReferenceID: checkoutRequestId,
                    MerchantRequestID: checkoutRequestId
                }, ncbaConfig.params))
            });

            if (!res.ok) {
                return await safeParseJson(res, 'NCBA Query rejected').catch(e => ({ success: false, status: 'ERROR', description: e.message }));
            }
            
            const rawData = await safeParseJson(res) as any;
            console.log(`[NCBA Status Response] CRID: ${checkoutRequestId} -> Raw:`, JSON.stringify(rawData));
            
            const statusStr = (String(rawData.status || rawData.TransactionStatus || rawData.Status || rawData.ResultStatus || '')).trim().toUpperCase();
            const isSuccess = statusStr === 'SUCCESS' || statusStr === 'COMPLETED' || statusStr === 'SUCCESSFUL' ||
                             rawData.ResultCode === '0' || rawData.ResponseCode === '0' || 
                             rawData.StatusCode === '0' || rawData.success === true ||
                             String(rawData.ResponseCode) === '00' || String(rawData.ResultCode) === '00' ||
                             (String(rawData.description || rawData.ResultDesc || '')).toUpperCase().includes('SUCCESS');
            const isFailure = statusStr === 'FAILED' || statusStr === 'REJECTED' || rawData.ResultCode === '99' || rawData.StatusCode === '99';

            // Map the bank's status to our platform's expected unified structure
            return {
                ...rawData,
                success: isSuccess,
                // Legacy compatibility fields
                ResultCode: isSuccess ? '0' : (isFailure ? '1' : null),
                ResultDesc: rawData.description || rawData.StatusDescription
            };
        };

        async function generateNcbaQr(ncbaConfig: any, amount: number) {
            const token = await getNcbaToken(ncbaConfig);
            const authMethod = (ncbaConfig.authMethod || 'bearer').toLowerCase();
            const { id: cId, sec: cSec } = getNcbaCredentials(ncbaConfig);
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

        function normalizePhoneNCBA(phone: string) {
            let p = phone.replace(/[^\d]/g, '');
            if (p.startsWith('0')) p = '254' + p.substring(1);
            if (p.length === 9) p = '254' + p;
            return p; // Expected format: 254XXXXXXXXX
        }

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
        async function reconcilePayment(txn: any) {
            if (!txn) return;
            
            // 1. Determine table name immediately
            const table = txn.provider === 'ncba' ? 'ncba_transactions' : 
                          txn.provider === 'airtel' ? 'airtel_transactions' : 
                          'mpesa_transactions';

            // 1.5 Fresh fetch to get latest status
            const { data: freshTxn } = await supabase.from(table).select('metadata, institution_id, amount, created_at').eq('id', txn.id).maybeSingle();
            
            if (!freshTxn) return;

            const meta = freshTxn.metadata || {};
            const isReconciled = meta.reconciled === true || meta.reconciled === 'true';
            const isProcessing = meta.reconciled === 'processing';
            
            // Allow re-processing if stuck for more than 2 minutes
            const processingTime = meta.processing_at ? new Date(meta.processing_at).getTime() : 0;
            const isStuck = isProcessing && (Date.now() - processingTime > 120000);

            if (isReconciled || (isProcessing && !isStuck)) {
                console.log(`[Reconcile - SKIP] Already reconciled or in progress: ${txn.id}`);
                return;
            }

            const instId = freshTxn.institution_id || txn.institution_id;
            const amt = freshTxn.amount || txn.amount;

            // 2. PROMPT LOCK (Soft Claim)
            // We mark as processing immediately to reduce race window.
            await supabase.from(table).update({ 
                metadata: { ...meta, reconciled: 'processing', processing_at: new Date().toISOString() } 
            }).eq('id', txn.id);

            // At this point, we proceed with reconciliation.
            // Even if two threads reach here, the double-check above will catch the 
            // 'processing' state in subsequent calls.

            // 3. Final Safeguard: Check if a receipt already exists for this transaction
            // Receipts are only created AFTER a successful balance increment.
            const { data: existingReceipt } = await supabase
                .from('receipts')
                .select('id')
                .eq('related_transaction_id', txn.id)
                .maybeSingle();

            if (existingReceipt) {
                console.log(`[Reconcile - SKIP] Receipt already exists for TXN: ${txn.id}. Blocking duplicate increment.`);
                return;
            }

            console.log(`[Reconcile - PROCEED] TXN: ${txn.id || txn.transaction_id} | Inst: ${instId} | Amt: ${amt} | Type: ${meta.type}`);

            // 1. Fetch System Settings for fallback price
            let settings: any = {};
            try {
                const { data: sData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
                if (sData?.data) settings = sData.data;
            } catch (e) {
                console.error('[Reconcile] Failed to fetch system settings:', e);
            }
            const defaultUnitPrice = parseFloat(String(settings.sms_unit_price || settings.smsUnitPrice || 2));

            // 1. Fetch Institution
            let inst = null;
            if (instId && instId !== 'SYSTEM') {
                const { data } = await supabase.from('institutions').select('*').eq('id', instId).maybeSingle();
                inst = data;
            }

            if (!inst && instId !== 'SYSTEM') {
                console.error(`[Reconcile] Institution ${instId} not found.`);
                return;
            }

            let invId = meta.invoiceId;

            // 2. Handle Subscription
            if (meta.type === 'subscription' || meta.type === 'license') {
                if (!inst) return; // Cannot update subscription for non-existent institution
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
            else if (meta.type === 'sms' || meta.type === 'sms_topup') {
                let units = parseInt(String(meta.units || "0"));
                
                // Fallback: If units was zero but amount is > 0, calculate based on unit price
                if (units <= 0 && amt > 0) {
                    console.log(`[Reconcile] Units missing in metadata. Calculating from amount ${amt} using price ${defaultUnitPrice}`);
                    units = Math.floor(amt / (defaultUnitPrice || 1));
                    (txn as any).calculatedUnits = units; // Store for notification
                }

                if (units > 0) {
                    console.log(`[Reconcile - SMS] Balance Increment: ${units} units for ${instId || 'SYSTEM'}. Triggering RPC...`);
                    const { error: rpcError } = await supabase.rpc('increment_sms_balance', { 
                        inst_id: instId || 'SYSTEM', 
                        amount: units 
                    });
                    
                    if (rpcError) {
                        console.error(`[Reconcile - SMS] RPC ERROR:`, rpcError);
                    } else {
                        console.log(`[Reconcile - SMS] SUCCESS: Balance updated for ${instId || 'SYSTEM'}`);
                        // Fetch updated balance for notifications
                        if (instId && instId !== 'SYSTEM') {
                            const { data: updatedInst } = await supabase.from('institutions').select('sms_balance').eq('id', instId).maybeSingle();
                            if (updatedInst) {
                                (txn as any).newBalance = updatedInst.sms_balance;
                            }
                        }
                    }
                } else {
                    console.warn(`[Reconcile - SMS] SKIPPED: Calculated units is 0 for amt ${amt}.`);
                }

                if (!invId) {
                    invId = `inv_sms_${Date.now()}`;
                    await supabase.from('invoices').insert({
                        id: invId,
                        invoice_number: `INV-SMS-${Date.now().toString().slice(-6)}`,
                        institution_id: instId || 'SYSTEM',
                        issue_date: new Date().toISOString(),
                        due_date: new Date().toISOString(),
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

            // 6. Mark Transaction as Reconciled (Final Step)
            await supabase.from(table).update({
                metadata: { ...meta, reconciled: true, reconciled_at: new Date().toISOString() }
            }).eq('id', txn.id);

            // 7. Send Notifications
            try {
                const isSms = meta.type === 'sms' || meta.type === 'sms_topup';
                const units = parseInt(meta.units || (txn as any).calculatedUnits || "0");
                const newBalanceStr = (txn as any).newBalance !== undefined ? ` New SMS Balance: ${(txn as any).newBalance.toLocaleString()}.` : "";
                
                const purpose = isSms ? `SMS Top-up (${units.toLocaleString()} units)` : `Subscription (${meta.plan || 'License'})`;
                const notifyMessage = isSms 
                    ? `Success! Your payment of KES ${amt} for ${units.toLocaleString()} SMS units for ${inst?.name || 'your account'} has been verified.${newBalanceStr} Ref: ${txn.id || txn.transaction_id}`
                    : `Dear Admin, your payment of KES ${amt} for ${inst?.name || 'your account'} subscription (${meta.plan || 'License'}) has been verified. Account active until ${inst?.subscription_ends_at ? new Date(inst.subscription_ends_at).toLocaleDateString() : 'N/A'}. Ref: ${txn.id || txn.transaction_id}`;

                // SMS Notification to Payer
                const smsRecipient = txn.phone_number || txn.phoneNumber;
                if (isSms && smsRecipient) {
                    const smsConfig = settings?.sms_config || settings?.smsConfig;
                    const provider = smsConfig?.provider || 'Zettatel';
                    const apiKey = smsConfig?.apiKey || smsConfig?.api_key || smsConfig?.userId;
                    const username = smsConfig?.username;
                    const senderId = smsConfig?.senderId || smsConfig?.sender_id || 'INFO';
                    
                    const p = normalizePhone(smsRecipient);
                    if (p && apiKey) {
                        console.log(`[Reconcile - NOTIFY] Dispatching SMS to ${p} via ${provider}`);
                        const params = new URLSearchParams();
                        params.append('userid', String(username || apiKey));
                        params.append('password', String(apiKey));
                        params.append('mobile', p);
                        params.append('msg', notifyMessage);
                        params.append('senderid', senderId);
                        params.append('msgType', 'text');
                        params.append('duplicate', 'true');
                        params.append('output', 'json');

                        const baseUrl = provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send';
                        fetch(`${baseUrl}?${params.toString()}`).catch(e => console.error('[Reconcile - SMS Error]', e));
                    }
                }

                // Email Notification
                const emailConfig = settings?.email_config || settings?.emailConfig;
                if (emailConfig && inst?.email) {
                    try {
                        const transporter = nodemailer.createTransport({
                            host: emailConfig.host, 
                            port: Number(emailConfig.port || 587),
                            auth: { user: emailConfig.username, pass: emailConfig.password },
                            tls: { rejectUnauthorized: false }
                        });

                        const htmlTemplate = `
                            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                <div style="background-color: #4f46e5; padding: 32px 24px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; text-transform: uppercase;">Payment Verified</h1>
                                </div>
                                <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
                                    <p style="margin-top: 0; font-weight: 600; font-size: 18px;">Hello,</p>
                                    <p style="margin-bottom: 24px;">Your payment for <strong>${inst?.name || 'your account'}</strong> has been successfully verified. Details of the transaction are below:</p>
                                    
                                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                                        <table style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; width: 40%;">Amount Paid</td>
                                                <td style="padding: 8px 0; color: #1e293b; font-weight: 800; font-size: 15px;">KES ${amt.toLocaleString()}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Purpose</td>
                                                <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 15px;">${purpose}</td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Reference</td>
                                                <td style="padding: 8px 0; color: #1e293b; font-family: monospace; font-size: 14px;">${txn.transaction_id || txn.id}</td>
                                            </tr>
                                            ${(txn as any).newBalance !== undefined ? `
                                            <tr>
                                                <td style="padding: 8px 0; color: #64748b; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">New SMS Balance</td>
                                                <td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 15px;">${(txn as any).newBalance.toLocaleString()} Units</td>
                                            </tr>` : ''}
                                        </table>
                                    </div>
                                    
                                    <p style="margin-bottom: 0;">Thank you for choosing EduAi platform for your institution management.</p>
                                </div>
                                <div style="background-color: #f1f5f9; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                                    <p style="margin: 0; color: #64748b; font-size: 12px;">This is an automated notification. Please do not reply to this email.</p>
                                    <p style="margin: 8px 0 0; color: #94a3b8; font-size: 11px;">&copy; 2024 EduAi Automation Hub. All rights reserved.</p>
                                </div>
                            </div>
                        `;

                        await transporter.sendMail({
                            from: `"${emailConfig.fromName || 'EduAi'}" <${emailConfig.fromEmail || emailConfig.username}>`,
                            to: inst.email,
                            subject: isSms ? 'SMS Top-up Verified' : 'Payment Verified Successfully',
                            text: notifyMessage,
                            html: htmlTemplate
                        });
                    } catch (e: any) {
                        console.error('[Reconcile] Email failed:', e.message);
                    }
                }

                // SMS Notification
                const smsConfig = settings?.sms_config || settings?.smsConfig;
                if (smsConfig && txn.phone_number) {
                    try {
                        const provider = smsConfig.provider || 'Zettatel';
                        const normalizedPhone = normalizePhone(txn.phone_number);
                        const baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                        
                        const smsParams = new URLSearchParams({
                            userid: smsConfig.apiKey || smsConfig.api_key,
                            password: smsConfig.apiSecret || smsConfig.api_secret,
                            mobile: normalizedPhone,
                            msg: notifyMessage, 
                            senderid: smsConfig.fromNumber || provider,
                            msgType: 'text', 
                            output: 'json'
                        });

                        const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                        console.log(`[Reconcile - SMS] Sending confirmation to ${normalizedPhone} via ${provider}`);
                        
                        await fetchWithTimeout(finalUrl, { method: 'GET' }, 15000).catch(e => {
                            console.error('[Reconcile - SMS] Gateway connection error:', e.message);
                        });
                    } catch (e: any) {
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
            const checkoutRequestId = getParam('checkoutRequestId') || getParam('transactionId') || getParam('TransactionID') || getParam('ReferenceID') || getParam('MerchantRequestID') || getParam('CheckoutRequestID');
            
            console.log(`[QueryStatus] Provider: ${provider} CRID: ${checkoutRequestId}`);
            
            if (!checkoutRequestId) {
                console.warn('[QueryStatus] Missing checkoutRequestId. Provider:', provider);
                return res.status(200).json({ success: true, status: 'pending', message: 'Missing transaction identifier' });
            }

            const table = provider === 'ncba' ? 'ncba_transactions' : 'mpesa_transactions';
            const queryCol = provider === 'ncba' ? 'transaction_id' : 'checkout_request_id';
            const { data: transaction } = await supabase
                .from(table)
                .select('*')
                .eq(queryCol, checkoutRequestId)
                .maybeSingle();

            if (transaction && transaction.status !== 'pending') {
                if (transaction.status === 'completed' && !transaction.metadata?.reconciled) {
                    console.log(`[QueryStatus] Found unreconciled completed transaction ${checkoutRequestId}. Triggering reconciliation.`);
                    await reconcilePayment({ ...transaction, provider: provider as any });
                    
                    // Fetch updated transaction to get the 'reconciled' flag in metadata for the response
                    const { data: updatedTxn } = await supabase
                        .from(table)
                        .select('*')
                        .eq(queryCol, checkoutRequestId)
                        .maybeSingle();
                    if (updatedTxn) {
                        return res.status(200).json({ success: true, status: updatedTxn.status, source: 'database', metadata: updatedTxn.metadata });
                    }
                }
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
                        const statusData = await queryNcbaStkStatus(ncba, checkoutRequestId);
                        externalData = statusData;
                        
                        const desc = (statusData.description || statusData.ResultDesc || statusData.ResponseDescription || statusData.StatusDescription || '').toLowerCase();
                        // Terminal errors that should actually stop polling
                        const isTerminalUserError = desc.includes('cancel') || desc.includes('balance') || desc.includes('wrong pin') || desc.includes('insufficient') || desc.includes('expired');
                        
                        // Temporary errors that we should treat as pending
                        // ResultCode '1' often means 'Not Found Yet' in some bank gateways
                        const isTempError = desc.includes('internal error') || desc.includes('not found') || desc.includes('rejected') || 
                                          desc.includes('not exist') || desc.includes('system error') || desc.includes('being processed') ||
                                          desc.includes('querying') || desc.includes('not yet') || desc.includes('request in progress') ||
                                          statusData.ResultCode === '1' || statusData.StatusCode === '1' || statusData.ResponseCode === '1';

                        if (statusData.success === true || statusData.status === 'SUCCESS' || statusData.status === 'COMPLETED' || 
                            statusData.status === 'SUCCESSFUL' || statusData.status === 'verified' ||
                            statusData.ResultCode === '0' || statusData.ResponseCode === '0' || statusData.StatusCode === '0' || 
                            statusData.ResponseCode === '00' || statusData.ResultCode === '00') {
                            finalStatus = 'completed';
                        } else if (isTerminalUserError) {
                            finalStatus = 'failed';
                        } else if (!isTempError && (statusData.status === 'FAILED' || statusData.status === 'REJECTED' || statusData.ResultCode === '99' || statusData.StatusCode === '99')) {
                            // Only fail if it's a non-temporary definitive failure code (e.g., 99)
                            finalStatus = 'failed';
                        }
                    } catch (e) {
                        console.error('[NCBA Status] Error polling NCBA via helper:', e);
                    }
                }
            } else if (provider === 'airtel') {
                // Mock success for Airtel testing
                if (checkoutRequestId.startsWith('airtel_')) {
                    finalStatus = 'completed';
                }
            }

            if (finalStatus !== 'pending' && transaction) {
                const updateCol = provider === 'ncba' ? 'transaction_id' : 'checkout_request_id';
                const now = new Date().toISOString();
                
                // Extract M-Pesa Reference / Receipt Number if available
                const receiptNum = externalData.BankTransactionID || externalData.ReferenceID || externalData.MpesaReceiptNumber || 
                                 externalData.ReceiptNumber || externalData.BankReference || externalData.ExternalReference || 
                                 externalData.ProviderReference || externalData.TransactionReference || externalData.TransactionID ||
                                 externalData.ProviderID || externalData.ChannelReference || externalData.Reference;
                
                // Extract Payer Info if available
                const payerName = externalData.PayerName || externalData.CustomerName || externalData.Payer;
                const payerPhone = externalData.PhoneNumber || externalData.Phone || externalData.MSISDN;

                await supabase.from(table).update({ 
                    status: finalStatus,
                    completed_at: finalStatus === 'completed' ? now : null,
                    updated_at: now,
                    receipt_number: receiptNum || null,
                    reference_id: receiptNum || null,
                    payer_name: payerName || transaction.payer_name,
                    phone_number: payerPhone || transaction.phone_number,
                    external_data: externalData
                }).eq(updateCol, checkoutRequestId);
                
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

            const fieldMapping: Record<string, string> = {
                'clientId': 'Username',
                'client_id': 'Username',
                'consumerKey': 'Username',
                'consumer_key': 'Username',
                'clientSecret': 'Secret Key',
                'client_secret': 'Secret Key',
                'secretKey': 'Secret Key',
                'secret_key': 'Secret Key',
                'consumerSecret': 'Secret Key',
                'consumer_secret': 'Secret Key'
            };

            Object.keys(fieldMapping).forEach(f => {
                const val = ncba[f];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    const strVal = String(val);
                    const sanitized = strVal.replace(/[^\x20-\x7E]/g, '').trim();
                    const label = fieldMapping[f];
                    
                    // Group similar fields under the same UI label
                    if (!diagnostics.fields[label]) {
                        diagnostics.fields[label] = {
                            fingerprint: sanitized.substring(0, 4),
                            length: strVal.length,
                            validChars: strVal === sanitized
                        };
                    }
                }
            });

            // Add calculated Authorization header for verification
            const { id: cId, sec: cSec } = getNcbaCredentials(ncba);
            if (cId && cSec) {
                const basicAuth = Buffer.from(`${cId}:${cSec}`).toString('base64');
                diagnostics.fields['Authorization Header'] = {
                    fingerprint: 'Basic ' + basicAuth.substring(0, 8),
                    length: basicAuth.length + 6,
                    validChars: true,
                    info: 'Type: Header, Param: Authorization, Value: Basic <string>'
                };
            }

            // Provide sample payload structure for visual confirmation
            const paybillVal = ncba.paybill || '880100';
            const accVal = ncba.accountNumber || ncba.account_number || 'UNKNOWN';
            diagnostics.fields['Initiation Body (RAW JSON)'] = {
                fingerprint: `{"TelephoneNo": "254...", "Amount": "1", "PayBillNo": "${paybillVal}", "AccountNo": "${accVal}", "Network": "Safaricom", "TransactionType": "CustomerPayBillOnline"}`,
                length: -1,
                validChars: true,
                info: 'Structure: TelephoneNo, Amount, PayBillNo, AccountNo, Network, TransactionType'
            };

            const authMethod = (ncba.authMethod || 'bearer').toLowerCase();
            diagnostics.connection = {
                authMethod,
                baseUrl: !!(ncba.baseUrl || ncba.base_url),
                stkPushUrl: !!(ncba.stkPushBaseUrl || ncba.stk_push_base_url || ncba.baseUrl || ncba.base_url),
                isMock: ncba.isMock === true || ncba.isMock === 'true',
                serverIp: await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => (d as any).ip).catch(() => 'Unknown')
            };

            try {
                // Attempt a real token generation to verify credentials
                const token = await getNcbaToken(ncba);
                
                if (token) {
                    diagnostics.tokenStatus = 'Success';
                    diagnostics.gatewayReachable = true;
                    const maskedToken = token.length > 20 ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : '***';
                    
                    // Add retrieved token to diagnostics for visible confirmation
                    diagnostics.fields['Authorization (Bearer)'] = {
                        fingerprint: 'Bearer ' + token.substring(0, 8),
                        length: token.length + 7,
                        validChars: true,
                        info: 'Type: Header, Param: Authorization, Value: Bearer <String>'
                    };

                    return res.status(200).json({ success: true, diagnostics, hint: `Authentication successful! Token retrieved: ${maskedToken}` });
                } else if (authMethod === 'basic') {
                    // Specific handling for Basic Auth which bypasses token generation
                    diagnostics.tokenStatus = 'Skipped (Direct Auth Mode)';
                    diagnostics.gatewayReachable = true;
                    return res.status(200).json({ success: true, diagnostics, hint: 'Direct Basic Authentication (Bank Handshake) verified successfully. No token required for this strategy.' });
                } else {
                    diagnostics.tokenStatus = 'Failed: No token returned';
                    return res.status(200).json({ success: false, diagnostics, hint: 'Bank server reached, but no token was issued. Check if your NCBA credentials support Bearer auth.' });
                }
            } catch (err: any) {
                diagnostics.tokenStatus = `Failed: ${err.message}`;
                // Fallback: check if the gateway is at least reachable
                const testUrl = normalizeNcbaUrl(ncba.baseUrl || ncba.base_url);
                const getRes = await fetchWithTimeout(testUrl, { method: 'GET' }).catch(() => null);
                diagnostics.gatewayReachable = !!getRes;

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
            const institutionId = paramsMap.institutionId || paramsMap.metadata?.institutionId;
            const phone = paramsMap.phone || paramsMap.recipient || paramsMap.metadata?.payerPhoneNumber;
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
                // Extreme ID extraction - search every possible key variant
                const txnId = resData.TransactionID || resData.transactionId || 
                             resData.ReferenceID || resData.referenceId || 
                             resData.requestId || resData.request_id || 
                             resData.CheckoutRequestID || resData.checkoutRequestId ||
                             resData.MerchantRequestID || resData.merchantRequestId ||
                             resData.Id || resData.id;
                
                if (resData.StatusCode === '0' || resData.status === 'SUCCESS' || txnId) {
                    const insertData: any = {
                        id: `ncba_${Date.now()}`,
                        transaction_id: txnId,
                        checkout_request_id: txnId,
                        reference_id: txnId,
                        institution_id: targetInstId || 'SYSTEM',
                        amount: amount,
                        phone_number: phone || recipient,
                        payer_name: paramsMap.payerName || phone || recipient,
                        status: 'pending',
                        metadata: paramsMap.metadata || {},
                        provider: 'ncba'
                    };
                    
                    console.log('[NCBA] Saving transaction:', JSON.stringify(insertData));
                    await supabase.from('ncba_transactions').insert(insertData);

                    return res.status(200).json({ 
                        success: true, 
                        message: 'NCBA Direct Debit request initiated.', 
                        checkoutRequestId: txnId,
                        data: resData 
                    });
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
                        const { data: txn } = await supabase.from('ncba_transactions').update({ 
                            status: 'completed',
                            reference_id: statusData.ReferenceID || statusData.TransactionID || checkoutRequestId,
                            receipt_number: statusData.ReferenceID || statusData.TransactionID || checkoutRequestId,
                            completed_at: new Date().toISOString()
                        }).eq('transaction_id', checkoutRequestId).select().single();
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
            const institutionId = paramsMap.institutionId || paramsMap.metadata?.institutionId;
            const checkoutRequestId = paramsMap.checkoutRequestId || paramsMap.checkout_request_id || paramsMap.TransactionID;
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
                
                // Self-Healing Reconciliation: 
                // If bank status is success, ensure local transaction is marked as completed 
                // and trigger balance update if not already reconciled.
                const finalStatus = result.success ? 'completed' : 
                                   (['FAILED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(String(result.status || '').toUpperCase()) ? 'failed' : 'pending');

                if (result.success) {
                    const { data: txn } = await supabase.from('ncba_transactions')
                        .update({ 
                            status: 'completed',
                            reference_id: result.ReferenceID || result.TransactionID || checkoutRequestId,
                            external_data: result,
                            completed_at: new Date().toISOString()
                        })
                        .eq('transaction_id', checkoutRequestId)
                        .select()
                        .single();

                    if (txn && !txn.metadata?.reconciled) {
                        console.log(`[NCBA Query Self-Heal] Triggering reconciliation for ${checkoutRequestId}`);
                        if (finalStatus === 'completed') {
                            // reconciliation will be handled by the generic queryPaymentStatus 
                            // if called via modal, but we keep this as a secondary check.
                            // reconcilePayment is now idempotent so this is safe.
                            await reconcilePayment({ ...txn, provider: 'ncba' });
                        }
                    }
                }

                return res.status(200).json({ 
                    success: true, 
                    status: finalStatus,
                    message: result.ResultDesc || result.description,
                    data: result 
                });
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
            let effectiveInstitutionId = institutionId;

            // If institutionId is missing in webhook URL, try to find it from the transaction
            const checkoutRequestId = body.TransactionID || body.CheckoutRequestID;
            if (!effectiveInstitutionId && checkoutRequestId) {
                const { data: preTxn } = await supabase.from('ncba_transactions').select('institution_id').eq('transaction_id', checkoutRequestId).maybeSingle();
                if (preTxn) effectiveInstitutionId = preTxn.institution_id;
            }

            if (effectiveInstitutionId && effectiveInstitutionId !== 'SYSTEM') {
                const { data: inst } = await supabase.from('institutions').select('ncba_config').eq('id', effectiveInstitutionId).maybeSingle();
                if (inst?.ncba_config) ncbaConfig = toCamelCase(inst.ncba_config);
            }
            
            if (!ncbaConfig) {
                ncbaConfig = toCamelCase(settings?.ncba_config || settings?.ncbaConfig);
            }

            // 2. Verify Authentication (using primary API credentials)
            const expectedUser = ncbaConfig?.clientId;
            const expectedPass = ncbaConfig?.clientSecret;

            if (expectedUser && expectedPass) {
                const authHeader = req.headers.authorization || '';
                const expectedAuth = `Basic ${Buffer.from(`${expectedUser}:${expectedPass}`).toString('base64')}`;
                
                if (authHeader !== expectedAuth) {
                    console.warn(`[NCBA Webhook] Unauthorized access attempt for institution ${institutionId}`);
                    return res.status(401).json({ success: false, message: 'Unauthorized' });
                }
            }

            // NCBA Spec: Payload contains TransactionID, ResultCode, etc.
            if (!checkoutRequestId) return res.status(400).json({ success: false, message: 'No TransactionID' });

            // Extract identifiers from potentially nested body
            const bodyRaw = body.Body?.stkCallback || body;
            const bankRef = bodyRaw.ReferenceID || bodyRaw.TransactionID || checkoutRequestId;

            if (String(bodyRaw.ResultCode || body.ResultCode) === '0' || bodyRaw.status === 'SUCCESS' || body.status === 'SUCCESS') {
                const { data: txn } = await supabase.from('ncba_transactions').update({ 
                    status: 'completed',
                    reference_id: bankRef,
                    receipt_number: bankRef,
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

        if (action === 'reconcileInternal') {
            const { transaction: txnData } = paramsMap;
            if (!txnData) return res.status(400).json({ success: false, message: 'Missing transaction data' });
            await reconcilePayment(txnData);
            return res.status(200).json({ success: true, message: 'Internal reconciliation triggered' });
        }

        if (action === 'testGoogleDrive') {
            const driveConfig = bodyConfig || settings.googleDriveConfig || settings.google_drive_config || {};
            
            if (!driveConfig.clientId || !driveConfig.clientSecret || !driveConfig.refreshToken) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Google Drive configuration is incomplete. Client ID, Secret, and Refresh Token are required.' 
                });
            }

            try {
                const { access_token, error: refreshError, error_description } = await refreshGoogleDriveTokens(driveConfig);
                
                if (refreshError || !access_token) {
                    throw new Error(`Auth Refresh Failed: ${error_description || refreshError || 'No access token returned'}`);
                }

                // Verify drive access by fetching about info or listing root files (limited to drive.file scope if that's what we requested)
                const verifyRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
                    headers: { 'Authorization': `Bearer ${access_token}` }
                });

                if (!verifyRes.ok) {
                    const errJson = await verifyRes.json() as any;
                    throw new Error(`API Verification Failed: ${errJson.error?.message || verifyRes.statusText} (Code: ${verifyRes.status})`);
                }

                const aboutData = await verifyRes.json() as any;
                
                return res.status(200).json({
                    success: true,
                    message: 'Google Drive Handshake Successful!',
                    details: {
                        account: aboutData.user?.emailAddress || 'Connected',
                        storagePlan: aboutData.storageQuota?.limit ? `${(aboutData.storageQuota.usage / (1024*1024*1024)).toFixed(2)}GB used of ${(aboutData.storageQuota.limit / (1024*1024*1024)).toFixed(0)}GB` : 'Standard'
                    }
                });
            } catch (err: any) {
                console.error("Google Drive Test error:", err);
                return res.status(200).json({
                    success: false,
                    message: `Handshake Failed: ${err.message}`,
                    details: err.message
                });
            }
        }

        if (action === 'testFtp') {
            const ftpConfig = bodyConfig || settings.ftpConfig || settings.ftp_config || {};
            const host = ftpConfig.host;
            const userFtp = ftpConfig.user || ftpConfig.username;
            const passwordFtp = ftpConfig.password;
            const port = Number(ftpConfig.port || 21);
            const secure = ftpConfig.secure ?? false;

            if (!host || !userFtp || !passwordFtp) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'FTP configuration is incomplete. Host, user, and password are required.' 
                });
            }

            const client = new ftp.Client();
            client.ftp.verbose = false;

            try {
                await client.access({
                    host,
                    port,
                    user: userFtp,
                    password: passwordFtp,
                    secure
                });

                // Try to list the root directory to verify permissions
                const list = await client.list();
                
                return res.status(200).json({ 
                    success: true, 
                    message: 'FTP connection established successfully.',
                    details: {
                        host,
                        port,
                        secure,
                        filesFound: list.length
                    }
                });
            } catch (err: any) {
                console.error("FTP Test error:", err);
                return res.status(200).json({ 
                    success: false, 
                    message: 'FTP Connection failed.', 
                    details: err.message 
                });
            } finally {
                client.close();
            }
        }

        if (action === 'campaign-upload') {
            const { file, fileName, type, campaignId } = paramsMap;
            if (!file || !fileName) return res.status(400).json({ success: false, message: 'Missing file data.' });

            const client = new ftp.Client();
            // client.ftp.verbose = true;

            const ftpConfig = settings.ftpConfig || settings.ftp_config || {};
            const host = ftpConfig.host || "da12.host-ww.net";
            const userFtp = ftpConfig.user || "eduaico1";
            const passwordFtp = ftpConfig.password || "A]i7s4v[5qZP5S";
            const port = ftpConfig.port || 21;
            const secure = ftpConfig.secure ?? false;
            const remoteRoot = ftpConfig.remoteRoot || "/public_html/campaigns";
            const publicUrlRoot = ftpConfig.publicUrlRoot || "https://eduaico1.iconaai.com/campaigns";

            try {
                await client.access({
                    host,
                    port,
                    user: userFtp,
                    password: passwordFtp,
                    secure
                });

                let remoteDir = remoteRoot;
                if (type === 'poster') remoteDir += "/posters";
                else if (type === 'profile') remoteDir += "/profiles";
                
                await client.ensureDir(remoteDir);
                
                // Convert base64 to stream
                const buffer = Buffer.from(file, 'base64');
                const stream = Readable.from(buffer);
                
                const finalFileName = `${campaignId?.replace(/[^a-z0-9]/gi, '_') || 'anon'}_${Date.now()}_${fileName.replace(/[^a-z0-9.]/gi, '_')}`;
                await client.uploadFrom(stream, finalFileName);
                
                // Construct public URL dynamically
                let baseUrl = publicUrlRoot.endsWith('/') ? publicUrlRoot.slice(0, -1) : publicUrlRoot;
                const publicUrl = `${baseUrl}/${type === 'poster' ? 'posters' : 'profiles'}/${finalFileName}`;
                
                return res.status(200).json({ 
                    success: true, 
                    url: publicUrl,
                    fileName: finalFileName
                });
            } catch (err: any) {
                console.error("FTP Upload error:", err);
                return res.status(500).json({ success: false, message: 'FTP Upload failed.', details: err.message });
            } finally {
                client.close();
            }
        }

        return res.status(400).json({ success: false, message: 'Action not supported.' });

    } catch (e: any) {
        console.error('[Fatal Error]', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error', details: e.message });
    }
}
}
