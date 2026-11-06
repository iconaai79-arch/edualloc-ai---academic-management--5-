import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Self-contained Supabase service client factory to avoid external lib crashes
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

let pgPool: any = null;
const getPgPool = async () => {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) return null;
    if (!pgPool) {
        try {
            const pgMod: any = await import('pg');
            const Pool = pgMod.Pool || pgMod.default?.Pool;
            if (!Pool) return null;
            pgPool = new Pool({
                connectionString: dbUrl,
                max: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
                ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
            });
        } catch (err) {
            console.warn('[NCBA Callback PG] Failed to initialize pg pool:', err);
            return null;
        }
    }
    return pgPool;
};

/**
 * NCBA Callback Handler (2024 Standard)
 * 
 * Handles notifications for:
 * 1. Pull Payments (STK Push / Direct Debit)
 * 2. QR Code Payments
 * 3. Push Payments (Settlements / Disbursements / B2C)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-NCBA-Signature, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    console.log('--- NCBA Callback Received ---');
    const signature = req.headers['x-ncba-signature'] as string;
    const institutionId = req.query.institutionId as string;
    
    console.log('Query:', JSON.stringify(req.query));
    console.log('Signature:', signature);
    console.log('Body:', JSON.stringify(req.body));
    
    const body = req.body || {};
    const supabase = getSupabase();
    const pool = await getPgPool();

    if (!supabase && !pool) return res.status(503).json({ error: 'Database context missing' });

    try {
        // --- 0. Security Verification ---
        let webhookSecret = '';
        let callbackUsername = '';
        let callbackSecret = '';

        const loadGlobalNcbaSec = async () => {
            let sData: any = null;
            if (supabase) {
                const { data } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
                sData = data?.data;
            } else if (pool) {
                const pgSet = await pool.query(`SELECT data FROM public.system_settings WHERE id = 1 LIMIT 1`).catch(() => null);
                sData = pgSet?.rows?.[0]?.data;
                if (typeof sData === 'string') {
                    try { sData = JSON.parse(sData); } catch (_) {}
                }
            }
            if (sData) {
                const config = sData.ncbaConfig || sData.ncba_config;
                if (config) {
                    webhookSecret = config.webhookSecret || config.webhook_secret || '';
                    callbackUsername = config.callbackUsername || config.callback_username || '';
                    callbackSecret = config.callbackSecret || config.callback_secret || config.callbackPassword || '';
                }
            }
            if (!webhookSecret) webhookSecret = process.env.NCBA_WEBHOOK_SECRET || '';
        };

        if (!institutionId || institutionId === 'SYSTEM' || institutionId === 'GLOBAL') {
            await loadGlobalNcbaSec();
        } else if (institutionId) {
            let instCfg: any = null;
            if (supabase) {
                const { data: inst } = await supabase
                    .from('institutions')
                    .select('ncba_config')
                    .eq('id', institutionId)
                    .maybeSingle();
                instCfg = inst?.ncba_config;
            } else if (pool) {
                const pgInst = await pool.query(`SELECT ncba_config FROM public.institutions WHERE id = $1 LIMIT 1`, [institutionId]).catch(() => null);
                instCfg = pgInst?.rows?.[0]?.ncba_config;
                if (typeof instCfg === 'string') {
                    try { instCfg = JSON.parse(instCfg); } catch (_) {}
                }
            }
            
            if (instCfg) {
                webhookSecret = instCfg.webhook_secret || instCfg.webhookSecret || '';
                callbackUsername = instCfg.callback_username || instCfg.callbackUsername || '';
                callbackSecret = instCfg.callback_secret || instCfg.callbackSecret || instCfg.callbackPassword || '';
            }
            if (!callbackUsername && !webhookSecret) {
                await loadGlobalNcbaSec();
            }
        }

        // 0a. Basic Auth Verification (Callback Credentials / Perspective Keys)
        if (callbackUsername && callbackSecret) {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Basic ')) {
                console.warn(`[NCBA Security] Missing Basic Auth for Institution: ${institutionId}`);
                return res.status(401).json({ ResultCode: 1, ResultDesc: 'Authentication Required' });
            }

            const base64Credentials = authHeader.split(' ')[1];
            const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
            const [username, password] = credentials.split(':');

            if (username !== callbackUsername || password !== callbackSecret) {
                console.warn(`[NCBA Security] Invalid Credentials for Institution: ${institutionId}`);
                return res.status(401).json({ ResultCode: 1, ResultDesc: 'Invalid Credentials' });
            }
            console.log(`[NCBA Security] Basic Auth Verified for Institution: ${institutionId}`);
        }

        // 0b. Signature Verification (HMAC)
        if (webhookSecret && signature) {
            const computedHmac = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(body))
                .digest('hex');
            
            if (computedHmac !== signature.toLowerCase()) {
                console.warn(`[NCBA Security] Signature mismatch for Institution: ${institutionId}`);
            } else {
                console.log(`[NCBA Security] Signature Verified for Institution: ${institutionId}`);
            }
        }
        // Standard NCBA 2024 Payload mapping
        const bodyRaw = body.Body?.stkCallback || body;
        const transactionId = bodyRaw.TransactionID || bodyRaw.CheckoutRequestID || bodyRaw.ReferenceID || body.TransactionID || body.CheckoutRequestID || body.ReferenceID;
        const resultCode = String(bodyRaw.ResultCode ?? body.ResultCode ?? bodyRaw.ResponseCode ?? body.ResponseCode ?? body.status_code ?? '');
        const status = String(bodyRaw.status || body.status || bodyRaw.Status || '');

        if (!transactionId) {
            console.error('[NCBA] Missing TransactionID in payload');
            return res.status(400).json({ ResultCode: 1, ResultDesc: 'Missing TransactionID' });
        }

        // 1. Locate Transaction
        let txn: any = null;
        if (supabase) {
            const { data, error: fetchError } = await supabase
                .from('ncba_transactions')
                .select('*')
                .eq('transaction_id', transactionId)
                .maybeSingle();
            if (fetchError) console.warn('[NCBA Callback] Supabase fetch warning:', fetchError.message);
            txn = data;
        }
        if (!txn && pool) {
            const pgTxn = await pool.query(
                `SELECT * FROM public.ncba_transactions WHERE transaction_id = $1 OR checkout_request_id = $1 OR reference_no = $1 ORDER BY created_at DESC NULLS LAST LIMIT 1`,
                [transactionId]
            ).catch(() => null);
            txn = pgTxn?.rows?.[0] || null;
        }

        if (!txn) {
            console.warn(`[NCBA] Transaction ${transactionId} not found in registry.`);
            return res.status(200).json({ ResultCode: 0, ResultDesc: 'Acknowledge Unregistered Transaction' });
        }

        // 2. Determine Success
        const isSuccess = resultCode === '0' || resultCode === '00' || status.toUpperCase() === 'SUCCESS' || status.toUpperCase() === 'COMPLETED';
        const rawMeta = typeof txn.metadata === 'string' ? (() => { try { return JSON.parse(txn.metadata); } catch (_) { return {}; } })() : (txn.metadata || {});

        if (isSuccess) {
            console.log(`[NCBA] ✅ Payment Verified for Transaction ${transactionId}`);
            
            // 3. Update Transaction Record
            const bankRef = bodyRaw.BankTransactionID || bodyRaw.ReferenceID || bodyRaw.MpesaReceiptNumber || 
                             bodyRaw.ReceiptNumber || bodyRaw.BankReference || bodyRaw.ExternalReference || 
                             bodyRaw.ProviderReference || bodyRaw.TransactionReference || bodyRaw.TransactionID ||
                             bodyRaw.ProviderID || bodyRaw.ChannelReference || bodyRaw.Reference ||
                             body.ReferenceID || body.TransactionID || body.CheckoutRequestID;
            const updatedMeta = {
                ...rawMeta,
                callback_payload: body,
                verified_at: new Date().toISOString()
            };
            const nowIso = new Date().toISOString();

            if (supabase) {
                try {
                    await supabase.from('ncba_transactions').update({
                        status: 'completed',
                        reference_id: bankRef,
                        receipt_number: bankRef,
                        completed_at: nowIso,
                        metadata: updatedMeta
                    }).eq('id', txn.id);
                } catch (_) {}
            }
            if (pool) {
                try {
                    await pool.query(
                        `UPDATE public.ncba_transactions SET status = 'completed', reference_id = $1, receipt_number = $1, completed_at = $2, updated_at = $2, metadata = $3::jsonb WHERE id = $4`,
                        [bankRef, nowIso, JSON.stringify(updatedMeta), txn.id]
                    );
                } catch (_) {}
            }

            // 4. Trigger Reconciliation
            const proto = (req.headers['x-forwarded-proto'] as string) || (req.headers.host?.includes('localhost') ? 'http' : 'https');
            const bridgeUrl = `${proto}://${req.headers.host}/api/integrations?action=reconcileInternal`;
            try {
                await fetch(bridgeUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}` },
                    body: JSON.stringify({ transaction: { ...txn, metadata: updatedMeta, provider: 'ncba', status: 'completed' } })
                });
            } catch (bridgeErr) {
                console.error('[NCBA] Reconciliation bridge failed:', bridgeErr);
            }

        } else {
            console.log(`[NCBA] ❌ Payment Failed for Transaction ${transactionId}: ${body.ResultDesc || body.message}`);
            const failedMeta = { ...rawMeta, last_error: body.ResultDesc || body.status_desc || 'Unknown error' };
            if (supabase) {
                try {
                    await supabase.from('ncba_transactions').update({
                        status: 'failed',
                        metadata: failedMeta
                    }).eq('id', txn.id);
                } catch (_) {}
            }
            if (pool) {
                try {
                    await pool.query(
                        `UPDATE public.ncba_transactions SET status = 'failed', updated_at = NOW(), metadata = $1::jsonb WHERE id = $2`,
                        [JSON.stringify(failedMeta), txn.id]
                    );
                } catch (_) {}
            }
        }

        // Standard Success Response for NCBA
        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Callback processed successfully'
        });

    } catch (err: any) {
        console.error('[NCBA Fatal]', err);
        return res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal processing error' });
    }
}
