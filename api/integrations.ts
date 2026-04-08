import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

// Self-contained Supabase service client factory
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

    try {
        const paramsMap = req.method === 'GET' ? req.query : req.body;
        if (!paramsMap) return res.status(400).json({ success: false, message: 'Invalid request: No parameters provided.' });

        const getParam = (key: string): string => {
            const val = paramsMap[key];
            if (Array.isArray(val)) return val[0] || '';
            return (val as string) || '';
        };

        const action = getParam('action');
        const recipient = getParam('recipient');
        const message = getParam('message');
        const amount = parseFloat(getParam('amount') || '0');
        const unitsToDeduct = parseInt(getParam('units') || '1');
        const bodyConfig = paramsMap.config;

        if (!action) {
            return res.status(200).json({ status: 'Online', timestamp: new Date().toISOString() });
        }

        const supabase = getSupabase();
        if (!supabase) return res.status(503).json({ success: false, message: 'Database keys missing.' });

        // --- AUTH BRIDGE ---
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        let user: any = null;

        if (token) {
            const { data: { user: authUser } } = await supabase.auth.getUser(token);
            if (authUser) {
                user = { ...authUser, user_metadata: authUser.user_metadata || {} };
            } else {
                // Fallback to custom users table for non-JWT IDs
                const { data: dbUser } = await supabase.from('users').select('*').eq('id', token).maybeSingle();
                if (dbUser) user = { ...dbUser, user_metadata: { institutionId: dbUser.institution_id } };
            }
        }

        // Special bypasses for webhooks and recovery
        const bypassActions = ['forgotPassword', 'ncbaWebhook', 'mpesa-callback', 'queryPaymentStatus'];
        if (!user && !bypassActions.includes(action)) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { data: settingsData } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
        const settings = settingsData?.data || {};

        // --- HELPERS ---
        const toCamelCase = (obj: any): any => {
            if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj;
            if (Array.isArray(obj)) return obj.map(toCamelCase);
            const newObj: any = {};
            Object.keys(obj).forEach(key => {
                const camelKey = key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
                newObj[camelKey] = toCamelCase(obj[key]);
            });
            return newObj;
        };

        const fetchWithTimeout = async (url: string, options: any, timeout = 15000) => {
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

        const safeParseJson = async (res: any, prefix = 'Error') => {
            const text = await res.text();
            try { return JSON.parse(text); }
            catch (e) { throw new Error(`${prefix}: ${text.substring(0, 100)}`); }
        };

        const normalizePhone = (p: string) => {
            let d = p.replace(/[^\d]/g, '');
            if (d.startsWith('0')) d = '254' + d.substring(1);
            if (d.length === 9) d = '254' + d;
            return d;
        };

        // --- NCBA CORE ---
        const getNcbaToken = async (config: any) => {
            const c = toCamelCase(config);
            if (c.authMethod === 'basic') return null; // Signal to use basic auth directly

            const id = (c.clientId || '').trim();
            const sec = (c.clientSecret || '').trim();
            if (!id || !sec) throw new Error('Missing NCBA credentials');
            
            const baseUrl = (c.baseUrl || '').replace(/\/+$/, '');
            const authStr = Buffer.from(`${id}:${sec}`).toString('base64');
            
            console.log(`[NCBA Auth] Token request to: ${baseUrl}/payments/api/v1/auth/token`);
            const res = await fetchWithTimeout(`${baseUrl}/payments/api/v1/auth/token`, {
                method: 'POST',
                headers: { 'Authorization': `Basic ${authStr}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'grant_type=client_credentials'
            });
            
            const data = await safeParseJson(res, 'NCBA Auth Failed');
            const token = data.access_token || data.token || (data.data && (data.data.access_token || data.data.token));
            
            if (!token) {
                const keys = Object.keys(data).join(', ');
                console.warn(`[NCBA Auth] Token missing. Response keys: ${keys}`);
                // If the bank returns a success status but no token, they might be expecting Basic Auth
                if (data.status === 'SUCCESS' || data.message === 'Success') return null;
            }
            
            return token;
        };

        // --- ACTIONS ---
        if (action === 'testNcbaAuth') {
            const ncba = bodyConfig || settings.ncba_config || settings.ncbaConfig;
            try {
                const token = await getNcbaToken(ncba);
                if (token) {
                    return res.status(200).json({ success: true, message: 'Authentication Successful (Bearer)', token: token.substring(0, 8) + '...' });
                } else {
                    return res.status(200).json({ success: true, message: 'Authentication Successful (Direct Basic Auth)' });
                }
            } catch (e: any) {
                return res.status(200).json({ success: false, message: e.message });
            }
        }

        if (action === 'ncbaInitiateStk') {
            const ncba = toCamelCase(bodyConfig || settings.ncba_config || settings.ncbaConfig);
            try {
                const token = await getNcbaToken(ncba);
                const baseUrl = (ncba.stkPushBaseUrl || ncba.baseUrl || '').replace(/\/+$/, '');
                const url = `${baseUrl}/payments/api/v1/stk-push/process`;
                
                const id = (ncba.clientId || '').trim();
                const sec = (ncba.clientSecret || '').trim();
                const authHeader = token ? `Bearer ${token}` : `Basic ${Buffer.from(`${id}:${sec}`).toString('base64')}`;
                
                const stkRes = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        TelephoneNo: normalizePhone(recipient),
                        Amount: String(amount),
                        PayBillNo: ncba.paybill || '880100',
                        AccountNo: ncba.accountNumber || 'EDUAI',
                        Narrative: 'Payment to Educ AI',
                        TransactionType: 'CustomerPayBillOnline'
                    })
                });
                
                const data = await safeParseJson(stkRes, 'NCBA STK Push Failed');
                console.log('[NCBA STK Response Body]:', JSON.stringify(data));
                
                // Unified ID extraction
                const checkoutId = data.TransactionID || data.CheckoutRequestID || data.MerchantRequestID || data.requestId || data.id;
                
                if (checkoutId) {
                    await supabase.from('ncba_transactions').insert({
                        transaction_id: checkoutId,
                        amount,
                        phone_number: recipient,
                        status: 'pending',
                        institution_id: paramsMap.institutionId || 'SYSTEM',
                        provider: 'ncba'
                    });
                    return res.status(200).json({ success: true, checkoutRequestId: checkoutId, data });
                }
                
                const statusDesc = data.ResultDesc || data.ResponseDescription || data.StatusDescription || data.message || 'The bank gateway rejected the request.';
                return res.status(400).json({ 
                    success: false, 
                    message: `NCBA Gateway rejected the STK Push: ${statusDesc}`, 
                    details: data 
                });
            } catch (e: any) {
                return res.status(500).json({ success: false, message: e.message });
            }
        }

        if (action === 'queryPaymentStatus') {
            const { checkoutRequestId, provider } = paramsMap;
            if (provider === 'ncba') {
                const ncba = toCamelCase(settings.ncba_config || settings.ncbaConfig);
                const token = await getNcbaToken(ncba);
                const baseUrl = (ncba.baseUrl || '').replace(/\/+$/, '');
                const url = `${baseUrl}/payments/api/v1/stk-push/query`;
                
                const qRes = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ TransactionID: checkoutRequestId })
                });
                
                const data = await safeParseJson(qRes, 'Status Query Failed');
                if (data.ResultCode === '0' || data.status === 'SUCCESS') {
                    // Reconcile units
                    const { data: txn } = await supabase.from('ncba_transactions').select('*').eq('transaction_id', checkoutRequestId).maybeSingle();
                    if (txn && txn.status !== 'completed') {
                         await supabase.from('ncba_transactions').update({ status: 'completed' }).eq('transaction_id', checkoutRequestId);
                         const instId = txn.institution_id || 'SYSTEM';
                         const units = parseInt(txn.metadata?.units || "100");
                         await supabase.rpc('increment_sms_balance', { inst_id: instId, amount: units });
                    }
                    return res.status(200).json({ success: true, status: 'completed', data });
                }
                return res.status(200).json({ success: true, status: 'pending', data });
            }
        }

        return res.status(400).json({ success: false, message: 'Action not supported in Debug Mode' });

    } catch (e: any) {
        console.error('[Fatal Error]', e);
        return res.status(500).json({ success: false, message: 'Internal Server Error', details: e.message });
    }
}
