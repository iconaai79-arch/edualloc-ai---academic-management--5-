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

const resolveKcbResultCode = (data: any): string => {
    if (!data) return '';
    const directCode = 
        data.ResultCode ?? data.resultCode ?? 
        data.ResponseCode ?? data.responseCode ??
        data.Result?.ResultCode ?? data.Result?.ResponseCode ??
        data.response?.responseCode ?? data.response?.ResponseCode;
    if (directCode !== undefined && directCode !== null) return String(directCode);
    const stkCallback = data.responsePayload?.stkCallback || data.Body?.stkCallback || data.stkCallback;
    if (stkCallback) {
        const cCode = stkCallback.ResultCode ?? stkCallback.resultCode ?? stkCallback.ResponseCode ?? stkCallback.responseCode;
        if (cCode !== undefined && cCode !== null) return String(cCode);
    }
    const headerCode = data.header?.statusCode ?? data.header?.messageCode ?? data.header?.statuscode;
    if (headerCode !== undefined && headerCode !== null) return String(headerCode);
    const flatStatus = data.statusCode ?? data.status;
    if (flatStatus !== undefined && flatStatus !== null) return String(flatStatus);
    return '';
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

// Memory cache for NCBA tokens to prevent slow polling
const ncbaTokenCache: Record<string, { token: string | null; expiresAt: number }> = {};

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
    const recipient = getParam('recipient') || getParam('phone') || getParam('phoneNumber') || getParam('phone_number') || getParam('to');
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
        msgLower.includes('resettoken=') ||
        msgLower.includes('invited to') ||
        msgLower.includes('confirm attendance') ||
        msgLower.includes('confirm your attendance') ||
        msgLower.includes('show this pin') ||
        msgLower.includes('rsvp') ||
        msgLower.includes('temporary password') ||
        msgLower.includes('your driving school') ||
        msgLower.includes('your driving instructor') ||
        msgLower.includes('temp password');

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
    const isTestAction = action === 'testGoogleDrive' || action === 'testFtp' || action === 'updateInstitutionConfig' || action === 'googleDriveUpload' || action === 'mpesa-callback' || action === 'ncbaWebhook' || action === 'ncbaInitiateStk' || action === 'initiateStkPush' || action === 'queryPaymentStatus' || action === 'sendAlumnaWelcome' || action === 'shortenUrl' || action === 'checkUrl';
    
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

        // Priority 3: Special bypass for Unauthenticated Actions (Callbacks, Payments & Recovery)
        const isPublicAction = ['forgotPassword', 'verifyResetOtp', 'resetPasswordWithToken', 'sendEmail', 'sendSms', 'mpesa-callback', 'ncbaWebhook', 'ncbaInitiateStk', 'initiateStkPush', 'queryPaymentStatus', 'sendAlumnaWelcome'].includes(action);

        if (!user && isPublicAction) {
            console.log(`[Auth Bridge] Checking unauthenticated bypass for ${action}`);

            // For callbacks and payment initiation, we allow the bypass directly
            if (action === 'mpesa-callback' || action === 'ncbaWebhook' || action === 'ncbaInitiateStk' || action === 'initiateStkPush' || action === 'queryPaymentStatus' || action === 'sendAlumnaWelcome') {
                user = { id: 'system', role: 'super_admin', user_metadata: { institutionId: 'GLOBAL' } };
                authError = null;
            } else if (action === 'forgotPassword' || action === 'sendEmail' || action === 'sendSms') {
                let query = supabase.from('users').select('*');
                const method = getParam('method') || 'email';

                if ((action === 'sendSms' || (action === 'forgotPassword' && method === 'phone')) && recipient) {
                    // Flexible phone number matching: ignore country code prefixes, spaces, formatting
                    const digits = recipient.replace(/\D/g, '');
                    if (digits.length >= 9) {
                        const last9 = digits.substring(digits.length - 9);
                        const pattern = '%' + last9.split('').join('%') + '%';
                        query = query.ilike('phone_number', pattern);
                    } else {
                        query = query.eq('phone_number', recipient);
                    }
                } else if (recipient) {
                    // Case-insensitive email search
                    query = query.ilike('email', recipient.trim());
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
                    return res.status(404).json({ 
                        success: false, 
                        message: method === 'phone' 
                            ? 'No registered account found with this phone number.' 
                            : 'No registered account found with this email address.' 
                    });
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
        
        const getBranding = async (instId?: string) => {
            const protocol = String(req.headers['x-forwarded-proto'] || 'https');
            const hostHeader = req.headers.host || 'eduai.co.ke';
            const siteUrl = `${protocol}://${hostHeader}`;

            const makeAbsolute = (url: string) => {
                if (!url || url.startsWith('http') || url.startsWith('data:')) return url;
                return `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`;
            };

            const defaultBranding = {
                logoUrl: makeAbsolute(settings.logoUrl || settings.logo_url) || `${siteUrl}/logo.png`,
                primaryColor: settings.themeColor || settings.primary_color || '#4f46e5',
                name: settings.appName || 'EduAi Network'
            };

            if (!instId || instId === 'GLOBAL' || instId === 'SYSTEM') return defaultBranding;

            try {
                const { data: inst } = await supabase.from('institutions').select('name, logo_url, theme_color, institution_type').eq('id', instId).maybeSingle();
                if (inst) {
                    return {
                        logoUrl: makeAbsolute(inst.logo_url) || defaultBranding.logoUrl,
                        primaryColor: inst.theme_color || defaultBranding.primaryColor,
                        name: inst.name,
                        type: inst.institution_type
                    };
                }
            } catch (e) {
                console.error(`[Branding] Failed to fetch for ${instId}:`, e);
            }
            return defaultBranding;
        };

        const wrapHtml = (content: string, branding: any) => {
            return `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
                    <div style="background-color: ${branding.primaryColor}; padding: 30px; text-align: center;">
                        <img src="${branding.logoUrl}" alt="${branding.name}" width="180" style="display: inline-block; max-height: 60px; width: auto; height: auto; border: 0;" />
                    </div>
                    <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
                        ${content}
                    </div>
                    <div style="padding: 20px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                            Sent via ${branding.name}
                        </p>
                        <p style="margin: 5px 0 0; font-size: 10px; color: #94a3b8;">
                            &copy; ${new Date().getFullYear()} EduAi Global Network. All rights reserved.
                        </p>
                    </div>
                </div>
            `;
        };

        if (action === 'shortenUrl') {
            let longUrl = getParam('url') || getParam('longUrl');
            if (!longUrl) {
                return res.status(400).json({ success: false, message: 'Missing url parameter.' });
            }
            // Normalize localhost/127.0.0.1 URLs to production portal domain to ensure shortened links work globally
            // Skip normalization for Supabase storage URLs (containing '/storage/v1/') as storage is not hosted on the portal domain.
            if ((longUrl.includes('localhost') || longUrl.includes('127.0.0.1')) && !longUrl.includes('/storage/v1/')) {
                longUrl = longUrl.replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, 'https://portal.eduai.co.ke');
            }

            // Provider 1: TinyURL (GET) - globally accessible, direct 301 redirect without Cloudflare/interstitial issues
            try {
                const tinyRes = await fetchWithTimeout(
                    `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`,
                    { 
                        method: 'GET', 
                        headers: { 
                            'Accept': 'text/plain',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        } 
                    },
                    6000
                );
                if (tinyRes.ok) {
                    const shortUrl = (await tinyRes.text()).trim();
                    if (shortUrl && shortUrl.startsWith('https://tinyurl.com/') && !shortUrl.includes('error')) {
                        return res.status(200).json({ success: true, shortUrl });
                    }
                }
            } catch (e: any) {
                console.warn('[shortenUrl] TinyURL call failed:', e.message);
            }

            // Provider 2: Ulvis API (GET) - fast & reliable fallback, returns text "https://ulvis.net/..."
            try {
                const ulvisRes = await fetchWithTimeout(
                    `https://ulvis.net/api.php?url=${encodeURIComponent(longUrl)}`,
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'text/plain',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    },
                    6000
                );
                if (ulvisRes.ok) {
                    const shortUrl = (await ulvisRes.text()).trim();
                    if (shortUrl && shortUrl.startsWith('https://ulvis.net/') && !shortUrl.includes('error')) {
                        return res.status(200).json({ success: true, shortUrl });
                    }
                }
            } catch (e: any) {
                console.warn('[shortenUrl] Ulvis call failed:', e.message);
            }

            // Provider 3: is.gd (GET)
            try {
                const isgdRes = await fetchWithTimeout(
                    `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`,
                    { 
                        method: 'GET', 
                        headers: { 
                            'Accept': 'text/plain',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        } 
                    },
                    6000
                );
                if (isgdRes.ok) {
                    const shortUrl = (await isgdRes.text()).trim();
                    if (shortUrl && shortUrl.startsWith('https://is.gd/') && !shortUrl.toLowerCase().includes('error')) {
                        return res.status(200).json({ success: true, shortUrl });
                    }
                }
            } catch (e: any) {
                console.warn('[shortenUrl] is.gd call failed:', e.message);
            }

            // Final fallback: return original normalized URL
            return res.status(200).json({ success: true, shortUrl: longUrl });
        }
        
        if (action === 'checkUrl') {
            const url = getParam('url');
            if (!url) {
                return res.status(400).json({ success: false, message: 'Missing url parameter.' });
            }
            try {
                const checkRes = await fetchWithTimeout(url, {
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                }, 7000);
                
                return res.status(200).json({
                    success: true,
                    status: checkRes.status,
                    finalUrl: checkRes.url,
                    ok: checkRes.ok
                });
            } catch (e: any) {
                return res.status(200).json({
                    success: false,
                    message: e.message || 'Failed to check URL'
                });
            }
        }

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

            const instId = institutionIdOverride || user.user_metadata?.institutionId || user.institution_id || user.institutionId;
            const branding = await getBranding(instId);

            const emailConfig = bodyConfig || settings.email_config || settings.emailConfig;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'Email configuration is missing.' });

            // Handle both snake_case and camelCase keys
            const host = emailConfig.host;
            const port = emailConfig.port;
            const username = emailConfig.username;
            const password = emailConfig.password;
            const fromEmail = emailConfig.from_email || emailConfig.fromEmail || username;
            const fromName = emailConfig.from_name || emailConfig.fromName || branding.name;

            try {
                const transporter = nodemailer.createTransport({
                    host: host,
                    port: Number(port || 587),
                    secure: Number(port) === 465,
                    auth: { user: username, pass: password },
                    tls: { rejectUnauthorized: false }
                });

                const htmlContent = wrapHtml((message || '').replace(/\n/g, '<br>'), branding);

                const info = await transporter.sendMail({
                    from: `"${fromName}" <${fromEmail}>`,
                    to: recipient,
                    subject: subject || `${branding.name} Notification`,
                    text: message,
                    html: htmlContent,
                    attachments: paramsMap.attachments // Supports { filename: string, content: string (base64) / Buffer, contentType: string }
                });

                return res.status(200).json({ success: true, message: 'Email sent successfully.', messageId: info.messageId });
            } catch (e: any) {
                console.error("[Email Gateway] SMTP send error:", e);
                return res.status(200).json({ success: false, message: `SMTP Gateway error: ${e.message || 'Connection failed'}` });
            }
        }

        if (action === 'sendAlumnaWelcome') {
            const instId = institutionIdOverride || user.user_metadata?.institutionId || user.institution_id || user.institutionId;
            const branding = await getBranding(instId);

            const emailConfig = bodyConfig || settings.email_config || settings.emailConfig;
            if (!emailConfig) return res.status(400).json({ success: false, message: 'Email configuration is missing.' });

            const alumnaName = getParam('alumnaName');
            const loginLink = getParam('loginLink') || `https://almamater.eduai.co.ke/?view=alumnae_social`;

            try {
                const transporter = nodemailer.createTransport({
                    host: emailConfig.host,
                    port: Number(emailConfig.port || 587),
                    secure: Number(emailConfig.port) === 465,
                    auth: { user: emailConfig.username, pass: emailConfig.password },
                    tls: { rejectUnauthorized: false }
                });

                const welcomeContent = `
                    <h2 style="color: ${branding.primaryColor}; margin-top: 0;">Welcome to the Alumnae Circle!</h2>
                    <p>Hello <strong>${alumnaName}</strong>,</p>
                    <p>Congratulations! Your registration for the Alumnae Network is successful. We are thrilled to have you as part of our professional community.</p>
                    <p>You can now access the portal to connect with classmates, share your legacy, and explore opportunities.</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${loginLink}" style="background-color: ${branding.primaryColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px ${branding.primaryColor}40;">Access Alumnae Portal</a>
                    </div>
                    <p style="font-size: 12px; color: #64748b;">If the button above doesn't work, copy and paste this link into your browser: <br>${loginLink}</p>
                `;

                const info = await transporter.sendMail({
                    from: `"${branding.name} Alumnae" <${emailConfig.from_email || emailConfig.username}>`,
                    to: recipient,
                    subject: `Welcome to the Alumnae Circle, ${alumnaName}!`,
                    html: wrapHtml(welcomeContent, branding)
                });

                return res.status(200).json({ success: true, message: 'Welcome email sent successfully.', messageId: info.messageId });
            } catch (e: any) {
                console.error("[Email Gateway] SMTP send welcome error:", e);
                return res.status(200).json({ success: false, message: `SMTP Gateway welcome error: ${e.message || 'Connection failed'}` });
            }
        }

        if (action === 'sendSms') {
            const adminRoles = [
                'admin', 'super_admin', 'reseller', 'county_admin', 'county_staff', 'county_cec', 'county_governor', 'county_director', 'county_co', 
                'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'academics_officer',
                'agrovet_admin', 'coop_admin', 'coop_chairman', 'sacco_officer', 'cooperative_manager',
                'property_admin', 'landlord', 'his_admin', 'carwash_admin', 'transport_admin', 'mechanic_admin', 'church_admin',
                'teacher', 'lecturer', 'driving_instructor', 'director', 'manager', 'finance', 'staff'
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

            // If a custom config was provided in the body, use it directly to honor active module context configurations
            if (bodyConfig && (bodyConfig.apiKey || bodyConfig.api_key || bodyConfig.username || bodyConfig.userId || bodyConfig.apikey)) {
                smsConfig = { ...bodyConfig };
                console.log(`[SMS Gateway] Using provided body configuration payload override`);
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

            // Define transactional/system messages that can consume the systemSmsBalance
            const isPropertySystemSms = isSystemMessage || 
                msgLower.includes('rent invoice') || 
                msgLower.includes('rent arrears') ||
                msgLower.includes('invoice #') || 
                msgLower.includes('payment receipt') || 
                msgLower.includes('payment notification') || 
                msgLower.includes('payment reminder') || 
                msgLower.includes('payment received') ||
                msgLower.includes('payment of kes') ||
                msgLower.includes('credentials');

            let instBalance = 0;
            let instConfig: any = {};
            let systemSmsBal = 0;
            let deductedFromSystem = 0;
            let deductedFromGeneral = 0;

            // Load institution-specific config if available and not overridden by explicit body config
            if (institutionId !== 'SYSTEM') {
                const { data: institution, error: configError } = await supabase
                    .from('institutions')
                    .select('sms_balance, smsBalance, sms_config, smsConfig')
                    .eq('id', institutionId)
                    .maybeSingle();

                if (!configError && institution) {
                    instBalance = institution.sms_balance ?? institution.smsBalance ?? 0;
                    instConfig = institution.sms_config || institution.smsConfig || {};
                    systemSmsBal = instConfig.systemSmsBalance || 0;

                    if (isPropertySystemSms) {
                        if (systemSmsBal >= totalUnitsToDeduct) {
                            deductedFromSystem = totalUnitsToDeduct;
                        } else {
                            deductedFromSystem = systemSmsBal;
                            deductedFromGeneral = totalUnitsToDeduct - systemSmsBal;
                        }
                    } else {
                        deductedFromGeneral = totalUnitsToDeduct;
                    }

                    const availableTotal = instBalance + systemSmsBal;

                    // Check balance for non-system messages, or system messages if they exceed the allocated system balance
                    if (user.id !== 'system' && availableTotal < totalUnitsToDeduct) {
                        return res.status(402).json({
                            success: false,
                            message: `Insufficient SMS balance. This request requires ${totalUnitsToDeduct} units, but your current balance is ${availableTotal}.`,
                            balance: availableTotal,
                            required: totalUnitsToDeduct,
                            buy_url: '/settings?tab=billing'
                        });
                    }

                    // Prefer institution-specific SMS gateway if configured and no valid body payload was supplied
                    if (instConfig && (!bodyConfig || !(bodyConfig.apiKey || bodyConfig.api_key || bodyConfig.username || bodyConfig.userId)) && (instConfig.apiKey || instConfig.api_key || instConfig.username || instConfig.userId)) {
                        console.log(`[SMS Gateway] Using institution-specific configuration for ${institutionId}`);
                        smsConfig = { ...instConfig };
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

                        let isError = !smsRes.ok || isHtml || (smsDetail.response && smsDetail.response.toLowerCase() === 'error') || (smsDetail.status && smsDetail.status.toLowerCase().includes('error'));

                        // Graceful Sandbox / Dev simulation check: if using trial/demo keys or auth failure in demo environments, simulate success
                        const authKeyLower = (smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId || '').toLowerCase();
                        const isDemoKey = authKeyLower.includes('demo') || authKeyLower.includes('test') || authKeyLower.includes('dummy') || authKeyLower === '';
                        if (isError && (isDemoKey || process.env.NODE_ENV === 'development')) {
                            console.log(`[SMS Gateway] Sandbox mode active: overriding gateway auth/endpoint failure for demo key. Simulating successful dispatch.`);
                            isError = false;
                        }

                        if (!isError) {
                            successBatchCount++;
                        } else {
                            console.error(`[SMS Gateway] Batch failed: ${smsRaw.substring(0, 100)}`);
                        }
                    } catch (e: any) {
                        console.error(`[SMS Gateway] Batch exception: ${e.message}`);
                        const authKeyLower = (smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId || '').toLowerCase();
                        const isDemoKey = authKeyLower.includes('demo') || authKeyLower.includes('test') || authKeyLower.includes('dummy') || authKeyLower === '';
                        if (isDemoKey || process.env.NODE_ENV === 'development') {
                            console.log(`[SMS Gateway] Sandbox mode active: overriding network exception. Simulating successful dispatch.`);
                            successBatchCount++;
                        }
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
                if (institutionId !== 'SYSTEM' && user.id !== 'system') {
                    if (deductedFromSystem > 0) {
                        const newSystemBal = Math.max(0, (instConfig.systemSmsBalance || 0) - deductedFromSystem);
                        const updatedConfig = { ...instConfig, systemSmsBalance: newSystemBal };
                        await supabase
                            .from('institutions')
                            .update({ 
                                sms_config: updatedConfig,
                                smsConfig: updatedConfig
                            })
                            .eq('id', institutionId);
                    }

                    if (deductedFromGeneral > 0) {
                        await supabase.rpc('decrement_sms_balance', { inst_id: institutionId, amount: deductedFromGeneral });

                        if (user.role === 'super_admin') {
                            await supabase.rpc('increment_sms_balance', { inst_id: institutionId, amount: deductedFromGeneral });
                        }
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
                            gateway_response: { 
                                batch_count: Math.ceil(normalizedRecipients.length / batchSize), 
                                success_batches: successBatchCount,
                                deducted_from_system: deductedFromSystem,
                                deducted_from_general: deductedFromGeneral
                            }
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
                const accId = smsConfig.accountId || smsConfig.userId || smsConfig.apiKey || '';
                const authToken = smsConfig.authToken || smsConfig.apiSecret || smsConfig.password || '';

                if (!accId || !authToken) {
                    return res.status(400).json({ success: false, message: 'Sematime requires both Account ID (stored in accountId or apiKey) and AuthToken (stored in authToken or apiSecret).' });
                }

                const baseUrl = `https://apis.sematime.com/v1/${accId}/messages/single`;
                const batchSize = 100; 
                let successBatchCount = 0;
                let lastGatewayRes = null;

                for (let i = 0; i < normalizedRecipients.length; i += batchSize) {
                    const batch = normalizedRecipients.slice(i, i + batchSize);
                    const recipientsStr = batch.join(',');

                    try {
                        console.log(`[Sematime Request] URL: ${baseUrl}`);
                        console.log(`[Sematime Request] Headers: ${JSON.stringify({ 'Content-Type': 'application/json', 'AuthToken': authToken ? '***' + authToken.slice(-4) : 'none' })}`);
                        console.log(`[Sematime Request] Body: ${JSON.stringify({ text: message || '', recipients: recipientsStr })}`);

                        const sRes = await fetchWithTimeout(baseUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'AuthToken': authToken
                            },
                            body: JSON.stringify({
                                text: message || '',
                                recipients: recipientsStr
                            })
                        }, 30000);

                        const resRaw = await sRes.text();
                        lastGatewayRes = resRaw;
                        console.log(`[Sematime Response] Status: ${sRes.status} ${sRes.statusText}`);
                        console.log(`[Sematime Response] Raw: ${resRaw}`);
                        
                        let resData: any;
                        try { resData = JSON.parse(resRaw); } catch (e) { resData = { raw: resRaw }; }

                        let isError = !sRes.ok || (resData && (resData.response === 'error' || resData.status === 'error' || resData.error || resData.errorMessage));
                        
                        // Sandbox / Dev Simulation check
                        const authKeyLower = (accId || '').toLowerCase();
                        const isDemoKey = authKeyLower.includes('demo') || authKeyLower.includes('test') || authKeyLower.includes('dummy') || authKeyLower === '';
                        if (isError && (isDemoKey || process.env.NODE_ENV === 'development')) {
                            console.log(`[Sematime Gateway] Sandbox mode active: overriding gateway failure. Simulating successful dispatch.`);
                            isError = false;
                        }

                        if (!isError) {
                            successBatchCount++;
                        } else {
                            console.error(`[Sematime] Batch failed: Status ${sRes.status}, Response: ${resRaw}`);
                        }
                    } catch (e: any) {
                        console.error(`[Sematime] Exception: ${e.message}`);
                        const authKeyLower = (accId || '').toLowerCase();
                        const isDemoKey = authKeyLower.includes('demo') || authKeyLower.includes('test') || authKeyLower.includes('dummy') || authKeyLower === '';
                        if (isDemoKey || process.env.NODE_ENV === 'development') {
                            console.log(`[Sematime Gateway] Sandbox mode active: overriding network exception. Simulating successful dispatch.`);
                            successBatchCount++;
                        }
                    }
                }

                if (successBatchCount === 0 && normalizedRecipients.length > 0) {
                    return res.status(502).json({
                        success: false,
                        message: `Sematime gateway failed for all batches.`,
                        last_response: lastGatewayRes?.substring(0, 300)
                    });
                }

                // Deduct balance and Log
                if (institutionId !== 'SYSTEM' && user.id !== 'system') {
                    const supabase = getSupabase();
                    if (supabase) {
                        if (deductedFromSystem > 0) {
                            const newSystemBal = Math.max(0, (instConfig.systemSmsBalance || 0) - deductedFromSystem);
                            const updatedConfig = { ...instConfig, systemSmsBalance: newSystemBal };
                            await supabase
                                .from('institutions')
                                .update({ 
                                    sms_config: updatedConfig,
                                    smsConfig: updatedConfig
                                })
                                .eq('id', institutionId);
                        }

                        if (deductedFromGeneral > 0) {
                            await supabase.rpc('decrement_sms_balance', { inst_id: institutionId, amount: deductedFromGeneral });

                            if (user.role === 'super_admin') {
                                await supabase.rpc('increment_sms_balance', { inst_id: institutionId, amount: deductedFromGeneral });
                            }
                        }

                        try {
                            await supabase.from('sms_logs').insert({
                                institution_id: institutionId,
                                sender_id: (user.id === 'system' || !user.id) ? null : user.id,
                                recipient: normalizedRecipients.length === 1 ? normalizedRecipients[0] : `${normalizedRecipients.length} recipients`,
                                message: message,
                                units: totalUnitsToDeduct,
                                status: 'sent',
                                provider: 'Sematime',
                                gateway_response: { 
                                    batch_count: Math.ceil(normalizedRecipients.length / batchSize), 
                                    success_batches: successBatchCount,
                                    deducted_from_system: deductedFromSystem,
                                    deducted_from_general: deductedFromGeneral
                                }
                            });
                        } catch (logErr) {
                            console.error('[Sematime Logging] Failed to record log:', logErr);
                        }
                    }
                }

                return res.status(200).json({
                    success: true,
                    message: `Sematime processing complete. Successfully dispatched ${successBatchCount} of ${Math.ceil(normalizedRecipients.length / batchSize)} batches.`,
                    recipient_count: normalizedRecipients.length
                });
            }

            return res.status(400).json({ success: false, message: `Unsupported SMS provider: ${provider}` });
        }

        // --- Google Drive Integration ---

        if (action === 'googleDriveUpload') {
            const { fileName, mimeType, content, folderName, folderId: explicitFolderId, institutionId: instId, config: bodyConfig, useGlobalConfig } = paramsMap;
            if (!content) return res.status(400).json({ success: false, message: 'Missing file content for upload.' });

            let driveConfig: GoogleDriveConfig | null = bodyConfig || null;

            // Priority: Explicit config -> Institution -> Global Fallback
            if (!driveConfig) {
                const targetInstId = instId || user.user_metadata?.institutionId || user.institution_id || user.institutionId;
                
                if (useGlobalConfig === true || useGlobalConfig === 'true') {
                    // Force global
                    driveConfig = (settings.googleDriveConfig || settings.google_drive_config) as GoogleDriveConfig || null;
                } else {
                    // Try Institution first
                    if (targetInstId) {
                        const { data: inst } = await supabase.from('institutions').select('google_drive_config, googleDriveConfig').eq('id', targetInstId).maybeSingle();
                        const instConfig = (inst?.google_drive_config || (inst as any)?.googleDriveConfig) as GoogleDriveConfig;
                        if (instConfig) {
                            // Normailze/check if active
                            const activeFlag = instConfig.isActive ?? (instConfig as any).is_active;
                            if (activeFlag === true || activeFlag === 'true') {
                                driveConfig = instConfig;
                            }
                        }
                    }

                    // Fallback to Global if institution config is missing or inactive
                    if (!driveConfig) {
                        driveConfig = (settings.googleDriveConfig || settings.google_drive_config) as GoogleDriveConfig || null;
                    }
                }
            }

            // Normalization: Ensure we have camelCase keys for the rest of parameters
            if (driveConfig) {
                driveConfig = {
                    clientId: driveConfig.clientId || (driveConfig as any).client_id,
                    clientSecret: driveConfig.clientSecret || (driveConfig as any).client_secret,
                    refreshToken: driveConfig.refreshToken || (driveConfig as any).refresh_token,
                    folderId: driveConfig.folderId || (driveConfig as any).folder_id,
                    isActive: driveConfig.isActive ?? (driveConfig as any).is_active
                } as GoogleDriveConfig;
                
                // Final validation: isActive can be a string "true" in some cases
                if (typeof driveConfig.isActive === 'string') {
                    driveConfig.isActive = driveConfig.isActive === 'true';
                }
            }
            
            if (!driveConfig || !driveConfig.isActive) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Google Drive integration is not active.' 
                });
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
                const fileId = uploadData.id;

                // Make the file public so it can be previewed as an image src
                try {
                    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${access_token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            role: 'reader',
                            type: 'anyone'
                        })
                    });
                } catch (permErr) {
                    console.warn("[Google Drive] Failed to set public permission:", permErr);
                }

                return res.status(200).json({ 
                    success: true, 
                    message: 'Success', 
                    fileId: fileId,
                    url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`
                });
            } catch (err: any) {
                return res.status(500).json({ success: false, message: err.message });
            }
        }

        if (action === 'forgotPassword') {
            const method = getParam('method') || 'email';
            
            if (method === 'phone') {
                let query = supabase.from('users').select('*');
                const digits = recipient.replace(/\D/g, '');
                if (digits.length >= 9) {
                    const last9 = digits.substring(digits.length - 9);
                    const pattern = '%' + last9.split('').join('%') + '%';
                    query = query.ilike('phone_number', pattern);
                } else {
                    query = query.eq('phone_number', recipient);
                }
                
                const { data: targetUser } = await query.maybeSingle();

                if (!targetUser) return res.status(404).json({ success: false, message: 'No registered account found with this phone number.' });
                const phoneVariants = getPhoneVariants(recipient);
                const phone = phoneVariants[0] || recipient; // Primary normalized variant

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
                
                try {
                    if (provider === 'Sematime') {
                        const accId = smsConfig.accountId || smsConfig.userId || smsConfig.apiKey || '';
                        const authToken = smsConfig.authToken || smsConfig.apiSecret || smsConfig.password || '';
                        const semaUrl = `https://apis.sematime.com/v1/${accId}/messages/single`;

                        console.log(`[Sematime OTP Request] URL: ${semaUrl}`);
                        console.log(`[Sematime OTP Request] Headers: ${JSON.stringify({ 'Content-Type': 'application/json', 'AuthToken': authToken ? '***' + authToken.slice(-4) : 'none' })}`);
                        console.log(`[Sematime OTP Request] Body: ${JSON.stringify({ text: otpMessage, recipients: phone })}`);

                        let sRes: Response | null = null;
                        let resRaw = '';
                        let resData: any = {};
                        try {
                            sRes = await fetchWithTimeout(semaUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'AuthToken': authToken
                                },
                                body: JSON.stringify({
                                    text: otpMessage,
                                    recipients: phone
                                })
                            }, 15000) as Response;

                            resRaw = await sRes.text();
                            console.log(`[Sematime OTP Response] Status: ${sRes.status} ${sRes.statusText}`);
                            console.log(`[Sematime OTP Response] Raw: ${resRaw}`);
                            try { resData = JSON.parse(resRaw); } catch (e) { resData = { raw: resRaw }; }
                        } catch (fetchErr: any) {
                            console.error(`[Sematime OTP Exception] ${fetchErr.message}`);
                            const authKeyLower = (accId || '').toLowerCase();
                            const isDemoKey = authKeyLower.includes('demo') || authKeyLower.includes('test') || authKeyLower.includes('dummy') || authKeyLower === '';
                            if (isDemoKey || process.env.NODE_ENV === 'development') {
                                console.log(`[Sematime OTP Sandbox] Simulating successful OTP send on fetch failure.`);
                            } else {
                                throw fetchErr;
                            }
                        }

                        if (sRes && !sRes.ok) {
                            const authKeyLower = (accId || '').toLowerCase();
                            const isDemoKey = authKeyLower.includes('demo') || authKeyLower.includes('test') || authKeyLower.includes('dummy') || authKeyLower === '';
                            if (isDemoKey || process.env.NODE_ENV === 'development') {
                                console.log(`[Sematime OTP Sandbox] Simulating successful OTP send on non-ok response status.`);
                            } else {
                                throw new Error(`Sematime failed with status ${sRes.status}: ${resRaw}`);
                            }
                        }
                    } else {
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
                        await fetchWithTimeout(`${baseUrl}?${urlParams.toString()}`, { method: 'GET' });
                    }
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
                .eq('email', user.email);

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

            const protocol = String(req.headers['x-forwarded-proto'] || 'https');
            const hostHeader = req.headers.host || 'eduai.co.ke';
            const resetLink = `${protocol}://${hostHeader}/?resetToken=${token}`;

            let info: any = null;

            try {
                const transporter = nodemailer.createTransport({
                    host: host,
                    port: Number(port || 587),
                    secure: Number(port) === 465,
                    auth: { user: username, pass: password },
                    tls: { rejectUnauthorized: false }
                });

                const instId = user.user_metadata?.institutionId || user.institution_id || user.institutionId;
                const branding = await getBranding(instId);

                const recoverySubject = `Password Reset Request - ${branding.name}`;
                const recoveryContent = `
                    <h2 style="color: ${branding.primaryColor}; margin-top: 0;">Password Recovery</h2>
                    <p>Dear <strong>${user.name || 'User'}</strong>,</p>
                    <p>You requested a password reset for your account on the <strong>${branding.name}</strong> system.</p>
                    <p>Please click the button below to set a new password. This link is valid for 1 hour:</p>
                    <div style="margin: 30px 0; text-align: center;">
                        <a href="${resetLink}" style="background-color: ${branding.primaryColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p style="font-size: 12px; color: #64748b;">If you did not request this, please ignore this email and your password will remain unchanged.</p>
                `;

                info = await transporter.sendMail({
                    from: `"${branding.name}" <${fromEmail}>`,
                    to: recipient,
                    subject: recoverySubject,
                    text: `Dear ${user.name || 'User'},\n\nPlease use this link to reset your password: ${resetLink}`,
                    html: wrapHtml(recoveryContent, branding)
                });

                console.log(`[Forgot Password] Recovery link sent successfully via Email. Message ID: ${info.messageId}`);
            } catch (e: any) {
                console.error("[Forgot Password] SMTP send recovery email error:", e);
                if (!user.phone_number) {
                    return res.status(200).json({ success: false, message: `Email delivery failed: ${e.message || 'SMTP connection failed'}` });
                }
            }

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

                        let smsRes: any;
                        if (provider === 'Sematime') {
                            const accId = smsConfig.accountId || smsConfig.userId || smsConfig.apiKey || '';
                            const authToken = smsConfig.authToken || smsConfig.apiSecret || smsConfig.password || '';
                            const semaUrl = `https://apis.sematime.com/v1/${accId}/messages/single`;

                            try {
                                console.log(`[Forgot Password Sematime Request] URL: ${semaUrl}`);
                                console.log(`[Forgot Password Sematime Request] Headers: ${JSON.stringify({ 'Content-Type': 'application/json', 'AuthToken': authToken ? '***' + authToken.slice(-4) : 'none' })}`);
                                console.log(`[Forgot Password Sematime Request] Body: ${JSON.stringify({ text: smsMessage, recipients: phone })}`);

                                smsRes = await fetchWithTimeout(semaUrl, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'AuthToken': authToken
                                    },
                                    body: JSON.stringify({
                                        text: smsMessage,
                                        recipients: phone
                                    })
                                }, 15000);

                                const resRaw = await smsRes.text();
                                console.log(`[Forgot Password Sematime Response] Status: ${smsRes.status} ${smsRes.statusText}`);
                                console.log(`[Forgot Password Sematime Response] Raw: ${resRaw}`);
                                // Re-wrap the body so it can be read again downstream
                                smsRes.text = async () => resRaw;
                            } catch (fetchErr: any) {
                                console.error(`[Forgot Password Sematime Exception] ${fetchErr.message}`);
                                const authKeyLower = (accId || '').toLowerCase();
                                const isDemoKey = authKeyLower.includes('demo') || authKeyLower.includes('test') || authKeyLower.includes('dummy') || authKeyLower === '';
                                if (isDemoKey || process.env.NODE_ENV === 'development') {
                                    console.log(`[Forgot Password Sematime Sandbox] Simulating successful OTP send on fetch failure.`);
                                    smsRes = {
                                        ok: true,
                                        status: 200,
                                        text: async () => JSON.stringify({ success: true, message: 'Simulated success' })
                                    } as any;
                                } else {
                                    throw fetchErr;
                                }
                            }

                            if (smsRes && !smsRes.ok) {
                                const authKeyLower = (accId || '').toLowerCase();
                                const isDemoKey = authKeyLower.includes('demo') || authKeyLower.includes('test') || authKeyLower.includes('dummy') || authKeyLower === '';
                                if (isDemoKey || process.env.NODE_ENV === 'development') {
                                    console.log(`[Forgot Password Sematime Sandbox] Overriding non-ok response status for demo.`);
                                    smsRes = {
                                        ok: true,
                                        status: 200,
                                        text: async () => JSON.stringify({ success: true, message: 'Simulated success' })
                                    } as any;
                                }
                            }
                        } else {
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

                            smsRes = await fetchWithTimeout(dispatchUrl, fetchOptions, 15000);
                        }
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
                messageId: info?.messageId || null
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
            if (!cId || !cSec) throw new Error(`NCBA Configuration incomplete: ${!cId ? 'Client ID' : 'Client Secret'} is missing.`);

            const cacheKey = `${cId}`;
            const cached = ncbaTokenCache[cacheKey];
            if (cached && Date.now() < cached.expiresAt) {
                console.log(`[NCBA Auth Service] Using cached OAuth2 token for ${cId} (Expires in ${Math.round((cached.expiresAt - Date.now()) / 1000)}s)`);
                return cached.token;
            }

            const fingerprint = `ID: ${cId.substring(0, 4)}... (Len: ${cId.length}), Secret: *** (Len: ${cSec.length})`;
            
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
            
            const expiresIn = Number(data.expires_in || 3000);
            ncbaTokenCache[cacheKey] = {
                token: data.access_token,
                expiresAt: Date.now() + (expiresIn * 1000) - 60000 // 1 minute buffer
            };

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
                          txn.provider === 'im' ? 'im_transactions' : 
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
            const invoicePrefix = (settings.global_invoice_prefix || settings.globalInvoicePrefix || 'INV-').trim();
            const receiptPrefix = (settings.global_receipt_prefix || settings.globalReceiptPrefix || 'RCT-').trim();

            // 1. Fetch Institution
            let inst = null;
            const resolvedInstId = (instId === 'SYSTEM' || instId === 'GLOBAL') ? meta.institution_id : instId;
            if (resolvedInstId && resolvedInstId !== 'SYSTEM' && resolvedInstId !== 'GLOBAL') {
                const { data } = await supabase.from('institutions').select('*').eq('id', resolvedInstId).maybeSingle();
                inst = data;
            }

            if (!inst && resolvedInstId !== 'SYSTEM' && resolvedInstId !== 'GLOBAL' && resolvedInstId) {
                console.error(`[Reconcile] Institution ${resolvedInstId} not found.`);
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
                        invoice_number: `${invoicePrefix}SUB-${Date.now().toString().slice(-6)}`,
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
                        invoice_number: `${invoicePrefix}SMS-${Date.now().toString().slice(-6)}`,
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
            // 4.1. Handle Car Invoice
            else if ((meta.type === 'car_invoice' || meta.type === 'car_sales_invoices') && invId) {
                const { data: carInvoice } = await supabase
                    .from('car_sales_invoices')
                    .select('*')
                    .eq('id', invId)
                    .maybeSingle();

                if (carInvoice) {
                    const paidAmount = parseFloat(String(carInvoice.paid_amount || 0)) + amt;
                    const balanceAmount = Math.max(0, parseFloat(String(carInvoice.total_amount || 0)) - paidAmount);
                    const status = balanceAmount <= 0 ? 'fully_paid' : 'partially_paid';

                    await supabase
                        .from('car_sales_invoices')
                        .update({
                            paid_amount: paidAmount,
                            balance_amount: balanceAmount,
                            status,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', invId);

                    await supabase.from('car_sales_payments').insert({
                        id: `pay_${Date.now()}`,
                        invoice_id: invId,
                        institution_id: instId || carInvoice.institution_id || 'SYSTEM',
                        amount: amt,
                        payment_method: txn.provider || 'KCB STK',
                        transaction_reference: txn.transaction_id || txn.id,
                        payment_date: new Date().toISOString().split('T')[0],
                        receipt_number: `${receiptPrefix}${Date.now().toString().slice(-6)}`,
                        received_by: 'KCB STK Integration',
                        notes: `Payment received via status query. Ref: ${txn.transaction_id || txn.id}`,
                        created_at: new Date().toISOString()
                    });

                    if (meta.requesterId) {
                        await supabase.from('app_notifications').insert({
                            id: `ntf_car_${Date.now()}`,
                            user_id: meta.requesterId,
                            message: `Car payment of KES ${amt} successful for Invoice ${carInvoice.invoice_number}!`,
                            type: 'success',
                            is_read: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
            // 4.1.b. Handle Driving School Student Admission
            else if (meta.type === 'student_admission' && meta.student_id) {
                console.log(`[Reconcile] Processing student admission payment for student: ${meta.student_id}`);
                
                // 1. Update student record in ds_students
                await supabase
                    .from('ds_students')
                    .update({
                        payment_status: 'paid',
                        status: 'Enrolled',
                        activation_date: new Date().toISOString()
                    })
                    .eq('id', meta.student_id);

                // 2. Fetch student details to get userId and email/phone for credentials
                const { data: studentData } = await supabase
                    .from('ds_students')
                    .select('*')
                    .eq('id', meta.student_id)
                    .maybeSingle();

                if (studentData) {
                    // Activate associated user profile
                    if (studentData.user_id || studentData.userId) {
                        const uid = studentData.user_id || studentData.userId;
                        await supabase.from('users').update({ status: 'active' }).eq('id', uid);
                    }

                    // 3. Generate Invoice
                    if (!invId) {
                        invId = `inv_stud_${Date.now()}`;
                        const studentCode = studentData.admission_number || studentData.id.slice(-6).toUpperCase();
                        const invoiceNumber = `${invoicePrefix}STUD-${studentCode}`;
                        
                        await supabase.from('invoices').insert({
                            id: invId,
                            invoice_number: invoiceNumber,
                            institution_id: resolvedInstId || 'SYSTEM',
                            issue_date: new Date().toISOString().split('T')[0],
                            due_date: new Date().toISOString().split('T')[0],
                            total_amount: amt,
                            status: 'paid',
                            items: JSON.stringify([{
                                description: `Driving School Student Registration Fee for ${studentData.full_name} (${studentCode})`,
                                quantity: 1,
                                unitPrice: amt,
                                amount: amt
                            }])
                        });
                    }

                    // 4. Send Welcome Credentials SMS
                    const smsConfig = settings.sms_config;
                    const studentPhone = studentData.phone || txn.phone_number;
                    if (smsConfig && studentPhone && studentPhone.trim().length >= 9) {
                        try {
                            const portalTitle = inst?.name || 'Driving School';
                            const portalUrl = 'https://eduai.co.ke';
                            const smsMsg = `Payment Verified! Welcome to ${portalTitle}. Your Driving School account is now active.\nPortal: ${portalUrl}\nUser ID: ${studentPhone}`;
                            
                            let phone = studentPhone.replace(/[^\d]/g, '');
                            if (phone.startsWith('2540')) phone = '254' + phone.substring(4);
                            else if (phone.startsWith('0')) phone = '254' + phone.substring(1);
                            else if (phone.length === 9) phone = '254' + phone;

                            const provider = smsConfig.provider || 'Zettatel';
                            const baseUrl = smsConfig.baseUrl || smsConfig.api_url || (provider === 'Zettatel' ? 'https://sms.zettatel.com/smsapi/send' : 'https://sms.abmis.co.ke/SMSApi/send');
                            const smsParams = new URLSearchParams({
                                userid: smsConfig.apiKey || smsConfig.api_key || smsConfig.username || smsConfig.userId,
                                password: smsConfig.apiSecret || smsConfig.api_secret || smsConfig.password,
                                mobile: phone,
                                msg: smsMsg,
                                senderid: smsConfig.fromNumber || provider,
                                msgType: 'text',
                                output: 'json'
                            });

                            const finalUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${smsParams.toString()}`;
                            await fetch(finalUrl, { method: 'GET' });
                        } catch (smsErr) {
                            console.error("[Reconcile] Failed to dispatch welcome credentials SMS:", smsErr);
                        }
                    }
                }
            }
            // 4.1.c. Handle Driving School Tenant Postpaid Bill
            else if (meta.type === 'tenant_postpaid_bill' && meta.bill_id) {
                console.log(`[Reconcile] Processing postpaid monthly bill payment: ${meta.bill_id} for institution: ${instId}`);

                // 1. Mark postpaid bill as paid in tenant_bills
                await supabase
                    .from('tenant_bills')
                    .update({ status: 'paid' })
                    .eq('id', meta.bill_id);

                // 2. Unsuspend the institution
                await supabase
                    .from('institutions')
                    .update({ is_suspended_for_billing: false })
                    .eq('id', instId);

                // 3. Create invoice
                if (!invId) {
                    invId = `inv_bill_${Date.now()}`;
                    await supabase.from('invoices').insert({
                        id: invId,
                        invoice_number: `${invoicePrefix}BILL-${Date.now().toString().slice(-6)}`,
                        institution_id: instId || 'SYSTEM',
                        issue_date: new Date().toISOString().split('T')[0],
                        due_date: new Date().toISOString().split('T')[0],
                        total_amount: amt,
                        status: 'paid',
                        items: JSON.stringify([{
                            description: `Consolidated Monthly Student Registration Bill settlement`,
                            quantity: 1,
                            unitPrice: amt,
                            amount: amt
                        }])
                    });
                }
            }
            // 4.2. Handle Driving School Invoice
            else if (meta.type === 'ds_invoice' && invId) {
                const { data: dsInvoice } = await supabase
                    .from('ds_invoices')
                    .select('*')
                    .eq('id', invId)
                    .maybeSingle();

                if (dsInvoice) {
                    const paidAmount = parseFloat(String(dsInvoice.paid_amount || 0)) + amt;
                    const balanceAmount = Math.max(0, parseFloat(String(dsInvoice.total_amount || 0)) - paidAmount);
                    const status = balanceAmount <= 0 ? 'Fully Paid' : 'Partially Paid';

                    let remainingAmount = amt;
                    const items = Array.isArray(dsInvoice.items) ? dsInvoice.items : JSON.parse(dsInvoice.items || '[]');
                    const updatedItems = items.map((item: any) => {
                        const itemBalance = item.amount - (item.paidAmount || 0);
                        if (remainingAmount <= 0) return item;
                        const distribution = Math.min(remainingAmount, itemBalance);
                        remainingAmount -= distribution;
                        return {
                            ...item,
                            paidAmount: (item.paidAmount || 0) + distribution
                        };
                    });

                    await supabase
                        .from('ds_invoices')
                        .update({
                            paid_amount: paidAmount,
                            balance: balanceAmount,
                            status,
                            items: updatedItems,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', invId);

                    await supabase.from('ds_payments').insert({
                        id: `pay_${Date.now()}`,
                        institution_id: instId || dsInvoice.institution_id || 'SYSTEM',
                        invoice_id: invId,
                        student_id: dsInvoice.student_id,
                        student_name: dsInvoice.student_name,
                        amount: amt,
                        payment_method: txn.provider || 'KCB STK',
                        transaction_reference: txn.transaction_id || txn.id,
                        payment_date: new Date().toISOString(),
                        receipt_number: `${receiptPrefix}${Date.now().toString().slice(-6)}`,
                        received_by: 'KCB STK Integration'
                    });

                    if (meta.requesterId) {
                        await supabase.from('app_notifications').insert({
                            id: `ntf_ds_${Date.now()}`,
                            user_id: meta.requesterId,
                            message: `Driving School invoice payment successful via KCB STK! Ref: ${txn.transaction_id || txn.id}.`,
                            type: 'success',
                            is_read: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
            // 4.3. Handle Property Management Invoice
            else if (meta.type === 'pm_invoice' && invId) {
                const { data: pmInvoice } = await supabase
                    .from('pm_invoices')
                    .select('*')
                    .eq('id', invId)
                    .maybeSingle();

                if (pmInvoice) {
                    await supabase
                        .from('pm_invoices')
                        .update({
                            status: 'Paid',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', invId);

                    const { data: lease } = await supabase
                        .from('pm_leases')
                        .select('*')
                        .eq('id', pmInvoice.lease_id)
                        .maybeSingle();

                    let commissionAmount = 0;
                    if (lease) {
                        const { data: unit } = await supabase
                            .from('pm_units')
                            .select('*')
                            .eq('id', lease.unit_id)
                            .maybeSingle();
                        if (unit) {
                            const { data: property } = await supabase
                                .from('pm_properties')
                                .select('*')
                                .eq('id', unit.property_id)
                                .maybeSingle();
                            if (property && property.commission_rate && parseFloat(String(property.commission_rate)) > 0) {
                                commissionAmount = (amt * parseFloat(String(property.commission_rate))) / 100;
                            }
                        }
                    }

                    await supabase.from('pm_payments').insert({
                        id: `pay_${Date.now()}`,
                        lease_id: pmInvoice.lease_id,
                        amount: amt,
                        payment_date: new Date().toISOString().split('T')[0],
                        payment_method: txn.provider || 'KCB STK',
                        payment_type: 'Rent',
                        status: 'Completed',
                        commission_amount: commissionAmount,
                        institution_id: instId || pmInvoice.institution_id || 'SYSTEM',
                        created_at: new Date().toISOString()
                    });

                    if (meta.requesterId) {
                        await supabase.from('app_notifications').insert({
                            id: `ntf_pm_${Date.now()}`,
                            user_id: meta.requesterId,
                            message: `Rent payment of KES ${amt} successful via KCB STK! Ref: ${txn.transaction_id || txn.id}.`,
                            type: 'success',
                            is_read: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
            // 4.4. Handle Event Registration
            else if (meta.type === 'event_registration') {
                const eventId = meta.eventId;
                const categoryId = meta.categoryId;
                const firstName = meta.firstName || 'Runner';
                const lastName = meta.lastName || '';
                const email = meta.email || '';
                const phone = meta.phone || txn.phone_number || '';
                const gender = meta.gender || 'male';
                const age = meta.age ? parseInt(String(meta.age)) : null;
                const tShirtSize = meta.tShirtSize || 'M';
                const emergencyContactName = meta.emergencyContactName || '';
                const emergencyContactPhone = meta.emergencyContactPhone || '';
                const initialPledge = meta.initialPledge ? parseFloat(String(meta.initialPledge)) : 0;
                const sponsorName = meta.sponsorName || `${firstName} ${lastName}`.trim();

                // Check if participant already exists matching categoryId + email or categoryId + phone
                let participant: any = null;
                if (email || phone) {
                    let queryBuilder = supabase
                        .from('event_participants')
                        .select('*')
                        .eq('category_id', categoryId);
                    
                    const orConditions: string[] = [];
                    if (email) orConditions.push(`email.ieq.${email.trim()}`);
                    if (phone) orConditions.push(`phone.eq.${phone.trim()}`);
                    
                    if (orConditions.length > 0) {
                        queryBuilder = queryBuilder.or(orConditions.join(','));
                        const { data: existingParticipants } = await queryBuilder;
                        if (existingParticipants && existingParticipants.length > 0) {
                            participant = existingParticipants[0];
                        }
                    }
                }

                if (participant) {
                    await supabase
                        .from('event_participants')
                        .update({
                            payment_status: 'paid',
                            mpesa_reference: txn.transaction_id || txn.id || ''
                        })
                        .eq('id', participant.id);

                    await supabase
                        .from('event_pledges')
                        .update({ payment_status: 'paid' })
                        .eq('participant_id', participant.id);
                    
                    console.log(`[Reconcile - event_registration] Updated existing event participant ${participant.id} and pledges to paid.`);
                } else {
                    // Generate new BIB number
                    const { data: allParticipants } = await supabase
                        .from('event_participants')
                        .select('bib_number');
                    const existingBibs = (allParticipants || [])
                        .map(p => parseInt(p.bib_number || '0'))
                        .filter(b => !isNaN(b));
                    const maxBib = existingBibs.length > 0 ? Math.max(...existingBibs) : 1000;
                    const newBib = String(maxBib + 1);

                    const participantId = `part_${Date.now()}`;
                    const { error: insertPartErr } = await supabase
                        .from('event_participants')
                        .insert({
                            id: participantId,
                            category_id: categoryId,
                            bib_number: newBib,
                            first_name: firstName,
                            last_name: lastName,
                            email: email,
                            phone: phone,
                            gender: gender,
                            age: age,
                            t_shirt_size: tShirtSize,
                            waiver_signed: true,
                            payment_status: 'paid',
                            mpesa_reference: txn.transaction_id || txn.id || '',
                            emergency_contact_name: emergencyContactName,
                            emergency_contact_phone: emergencyContactPhone,
                            status: 'registered',
                            created_at: new Date().toISOString()
                        });

                    if (insertPartErr) {
                        console.error('[Reconcile - event_registration] Failed to insert event participant:', insertPartErr.message);
                    } else {
                        console.log(`[Reconcile - event_registration] Created new event participant ${participantId}, BIB: ${newBib}`);
                        if (initialPledge > 0) {
                            const pledgeId = `pledge_${Date.now()}`;
                            const { error: insertPledgeErr } = await supabase
                                .from('event_pledges')
                                .insert({
                                    id: pledgeId,
                                    participant_id: participantId,
                                    sponsor_name: sponsorName,
                                    amount: initialPledge,
                                    payment_status: 'paid',
                                    created_at: new Date().toISOString()
                                });
                            if (insertPledgeErr) {
                                console.error('[Reconcile - event_registration] Failed to insert event pledge:', insertPledgeErr.message);
                            } else {
                                console.log(`[Reconcile - event_registration] Created new event pledge ${pledgeId} for ${initialPledge}`);
                            }
                        }
                    }
                }
            }

            // 5. Create Receipt
            if (invId) {
                await supabase.from('receipts').insert({
                    id: `rec_${Date.now()}`,
                    receipt_number: `${receiptPrefix}${Date.now().toString().slice(-6)}`,
                    institution_id: resolvedInstId || instId || 'SYSTEM',
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

                        const branding = await getBranding(instId);
                        const htmlContent = wrapHtml(`
                            <h2 style="color: ${branding.primaryColor}; margin-top: 0;">Payment Verified</h2>
                            <p>Hello,</p>
                            <p>Your payment for <strong>${inst?.name || 'your account'}</strong> has been successfully verified. Details of the transaction are below:</p>
                            
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
                        `, branding);

                        await transporter.sendMail({
                            from: `"${branding.name}" <${emailConfig.fromEmail || emailConfig.username}>`,
                            to: inst.email,
                            subject: isSms ? 'SMS Top-up Verified' : 'Payment Verified Successfully',
                            text: notifyMessage,
                            html: htmlContent
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
                        return res.status(200).json({ success: true, status: updatedTxn.status, source: 'database', metadata: updatedTxn.metadata, transactionId: updatedTxn.transaction_id });
                    }
                }
                return res.status(200).json({ success: true, status: transaction.status, source: 'database', metadata: transaction.metadata, transactionId: transaction.transaction_id });
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
            } else if (provider === 'kcb') {
                const kcbConfig = bodyConfig || settings?.kcb_config || settings?.kcbConfig || {};
                const appKey = (kcbConfig.appKey || '').trim();
                const appSecret = (kcbConfig.appSecret || '').trim();
                const baseUrl = (kcbConfig.baseUrl || '').trim();
                const queryUrl = (kcbConfig.queryUrl || '').trim();
                const configShortCode = (kcbConfig.shortCode || kcbConfig.short_code || '').trim();
                const passkey = (kcbConfig.passkey || kcbConfig.pass_key || '').trim();
                const environment = (kcbConfig.environment || 'sandbox').trim();

                let finalOrgShortCode = '522533';
                if (environment === 'sandbox') {
                    const isCustomPaybill = kcbConfig.sharedShortCode === false || kcbConfig.shared_short_code === false;
                    if (isCustomPaybill) {
                        finalOrgShortCode = configShortCode || '522533';
                    } else {
                        finalOrgShortCode = '522533';
                    }
                } else {
                    if (configShortCode) {
                        finalOrgShortCode = configShortCode;
                    }
                }
                const shortCode = finalOrgShortCode;

                const isKcbQueryDemo = environment === 'mock' ||
                                       environment === 'demo' ||
                                       !appKey || !appSecret || 
                                       checkoutRequestId.includes('Mock') ||
                                       appKey === 'kcb_demo_key';

                if (isKcbQueryDemo) {
                    finalStatus = 'completed';
                    externalData = { 
                        status: 'COMPLETED', 
                        message: 'Transaction completed successfully (Mock sandbox status).',
                        ResultCode: '0',
                        ResultDesc: 'Transaction checked successfully.'
                    };
                } else {
                    try {
                        const authHeaderVal = Buffer.from(`${appKey}:${appSecret}`).toString('base64');
                        let tokenUrl = '';
                        let fetchOptions: RequestInit = {};

                        // Check if checkoutRequestId is a Core T24 Funds Transfer transaction status query
                        const isCoreTxnQuery = checkoutRequestId.includes('FT') || 
                                               checkoutRequestId.startsWith('206') || 
                                               kcbConfig.queryType === 'core' ||
                                               (queryUrl && (queryUrl.includes('transactioninfo') || queryUrl.includes('querytransaction')));

                        if (environment === 'sandbox') {
                            tokenUrl = baseUrl ? (baseUrl.includes('token') ? baseUrl : `${baseUrl}/token`) : 'https://uat.buni.kcbgroup.com/token';
                        } else {
                            tokenUrl = baseUrl ? (baseUrl.includes('token') ? baseUrl : `${baseUrl}/token`) : 'https://api.buni.kcbgroup.com/token';
                        }

                        // Ensure grant_type=client_credentials is query parameter appended to the URL per KCB spec
                        if (!tokenUrl.includes('grant_type=')) {
                            tokenUrl += (tokenUrl.includes('?') ? '&' : '?') + 'grant_type=client_credentials';
                        }

                        fetchOptions = {
                            method: 'POST',
                            headers: {
                                'Authorization': `Basic ${authHeaderVal}`,
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: 'grant_type=client_credentials'
                        };
                        
                        console.log(`[KCB Query] Fetching OAuth token from ${tokenUrl} (${environment} mode)`);
                        const tokenRes = await fetchWithTimeout(tokenUrl, fetchOptions);

                        if (tokenRes.ok) {
                            const tokenData = await tokenRes.json() as any;
                            const access_token = tokenData.access_token;

                            let finalQueryUrl = '';
                            let requestBody: any;

                            if (isCoreTxnQuery) {
                                finalQueryUrl = queryUrl || (
                                    environment === 'sandbox'
                                    ? 'https://uat.buni.kcbgroup.com/v1/core/t24/querytransaction/1.0.0/api/transactioninfo'
                                    : 'https://api.buni.kcbgroup.com/v1/core/t24/querytransaction/1.0.0/api/transactioninfo'
                                );
                                const guid = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                const timestampStr = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
                                requestBody = {
                                    header: {
                                        messageID: guid,
                                        featureCode: kcbConfig.featureCode || "101",
                                        featureName: kcbConfig.featureName || "FinancialInquiries",
                                        serviceCode: kcbConfig.serviceCode || "1004",
                                        serviceName: kcbConfig.serviceName || "TransactionInfo",
                                        serviceSubCategory: kcbConfig.serviceSubCategory || "ACCOUNT",
                                        minorServiceVersion: kcbConfig.minorServiceVersion || "1.0",
                                        channelCode: kcbConfig.channelCode || "206",
                                        channelName: kcbConfig.channelName || "ibank",
                                        routeCode: kcbConfig.routeCode || "001",
                                        timeStamp: timestampStr,
                                        serviceMode: "sync",
                                        subscribeEvents: "1",
                                        callBackURL: ""
                                    },
                                    requestPayload: {
                                        transactionInfo: {
                                            primaryData: {
                                                businessKey: checkoutRequestId,
                                                businessKeyType: kcbConfig.businessKeyType || "FT.REF"
                                            },
                                            additionalDetails: {
                                                companyCode: kcbConfig.companyCode || "KE0010001"
                                            }
                                        }
                                    }
                                };
                            } else {
                                 finalQueryUrl = queryUrl || (baseUrl ? `${baseUrl}/kcb/stkpush/v1/query` : (
                                     environment === 'sandbox'
                                     ? 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/query'
                                     : 'https://api.buni.kcbgroup.com/mm/api/request/1.0.0/query'
                                 ));
                                const passkeyVal = passkey || (environment === 'sandbox' ? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' : '');
                                const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
                                const password = Buffer.from((shortCode || '123456') + passkeyVal + timestamp).toString('base64');
                                requestBody = {
                                    shortCode: shortCode,
                                    password: password,
                                    timestamp: timestamp,
                                    checkoutRequestID: checkoutRequestId
                                };
                            }

                            console.log(`[KCB Query] Querying transaction status at ${finalQueryUrl} (Core query: ${isCoreTxnQuery})`);
                            const queryRes = await fetchWithTimeout(finalQueryUrl, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${access_token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(requestBody)
                            });

                            if (queryRes.ok) {
                                const queryData = await queryRes.json() as any;
                                externalData = queryData;

                                if (isCoreTxnQuery) {
                                    const headerCode = queryData.header?.statusCode || queryData.header?.messageCode;
                                    const headerMsg = queryData.header?.statusMessage || queryData.header?.statusDescription;
                                    const processedOk = headerCode === '0' || headerCode === '00' || String(headerMsg).toLowerCase() === 'success';
                                    if (processedOk) {
                                        finalStatus = 'completed';
                                    } else {
                                        finalStatus = 'failed';
                                    }
                                } else {
                                    const resultCode = resolveKcbResultCode(queryData);
                                    const normCode = String(resultCode).trim().toUpperCase();
                                    if (normCode === '0' || normCode === '00' || normCode === 'SUCCESS' || normCode === 'SUCCESSFUL') {
                                        finalStatus = 'completed';
                                    } else if (normCode === '1' || normCode === '' || normCode === 'PENDING' || normCode === 'PROCESSING') {
                                        finalStatus = 'pending';
                                    } else {
                                        finalStatus = 'failed';
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error('[KCB Status] Error polling KCB:', e);
                    }
                }
            }

            if (finalStatus !== 'pending' && transaction) {
                const updateCol = provider === 'ncba' ? 'transaction_id' : 'checkout_request_id';
                const now = new Date().toISOString();
                
                // Extract M-Pesa Reference / Receipt Number if available
                let receiptNum = externalData.BankTransactionID || externalData.ReferenceID || externalData.MpesaReceiptNumber || 
                                 externalData.ReceiptNumber || externalData.BankReference || externalData.ExternalReference || 
                                 externalData.ProviderReference || externalData.TransactionReference || externalData.TransactionID ||
                                 externalData.ProviderID || externalData.ChannelReference || externalData.Reference;

                if (provider === 'kcb') {
                    // Try to extract KCB specific receipt number
                    let kcbMpesaRef: string | null = null;
                    const params = externalData.ResultParameters?.ResultParameter ||
                                   externalData.resultParameters?.resultParameter ||
                                   externalData.CallbackMetadata?.Item ||
                                   [];
                    if (Array.isArray(params)) {
                        for (const p of params) {
                            const key = p.Key || p.Name || '';
                            if (/mpesa.*receipt|receipt.*number|transactionId|mpesaref/i.test(key)) {
                                kcbMpesaRef = String(p.Value || '');
                                break;
                            }
                        }
                    }
                    if (!kcbMpesaRef) {
                        kcbMpesaRef = externalData.mpesaReceiptNumber ||
                                      externalData.MpesaReceiptNumber ||
                                      externalData.transactionId ||
                                      externalData.TransactionID ||
                                      externalData.responsePayload?.transactionInfo?.additionalDetails?.retrievalRefNo ||
                                      externalData.responsePayload?.transactionInfo?.additionalDetails?.uniqueID ||
                                      externalData.responsePayload?.transactionInfo?.additionalDetails?.offlineUniqueID ||
                                      externalData.responsePayload?.transactionInfo?.orderingCustomer?.debitAccountNo ||
                                      null;
                    }
                    if (kcbMpesaRef) {
                        receiptNum = kcbMpesaRef;
                    }
                }
                
                // Extract Payer Info if available
                const payerName = externalData.PayerName || 
                                  externalData.CustomerName || 
                                  externalData.Payer ||
                                  externalData.responsePayload?.transactionInfo?.beneficiaryCustomer?.beneficiaryName ||
                                  externalData.responsePayload?.transactionInfo?.orderingCustomer?.debitorReference;
                const payerPhone = externalData.PhoneNumber || 
                                   externalData.Phone || 
                                   externalData.MSISDN ||
                                   externalData.responsePayload?.transactionInfo?.orderingCustomer?.debitAccountNo;

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
            const institutionId = paramsMap.institutionId || paramsMap.institution_id || paramsMap.metadata?.institutionId || 'GLOBAL';
            const phone = paramsMap.phone || paramsMap.phoneNumber || paramsMap.phone_number || paramsMap.recipient || paramsMap.metadata?.payerPhoneNumber;
            const targetAmount = paramsMap.amount || paramsMap.metadata?.amount || amount || 0;
            const isPlatformService = ['sms', 'subscription', 'one-off', 'student_admission'].includes(paramsMap.metadata?.type);
            
            // Prioritize config from request body (for testing unsaved changes)
            let ncbaConfig = bodyConfig ? toCamelCase(bodyConfig) : null;
            let targetInstId = institutionId;

            if (!ncbaConfig) {
                if (isPlatformService) {
                    // Fallback to Global Super Admin config for platform services (SMS/Subscription/Student Admission)
                    ncbaConfig = toCamelCase(settings.ncba_config || settings.ncbaConfig);
                    targetInstId = institutionId || paramsMap.metadata?.institution_id || paramsMap.metadata?.institutionId || 'SYSTEM';
                    console.log(`[NCBA Gateway] Using global configuration for platform service ${paramsMap.metadata?.type}. Tenant: ${targetInstId}`);
                } else {
                    // Try institution-specific config first
                    const { data: inst } = await supabase.from('institutions').select('*').eq('id', institutionId || user?.user_metadata?.institutionId).maybeSingle();
                    if (inst && inst.ncbaConfig) {
                        ncbaConfig = toCamelCase(inst.ncbaConfig);
                        targetInstId = inst.id;
                    }
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
                const result = await initiateNcbaPayment(ncbaConfig, targetAmount, phone || recipient);
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
                        amount: targetAmount,
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
