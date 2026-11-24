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
        // --- 0c. CBK-07 Delivery Attempt Logging (redacting secrets per SEC-04) & Optional 500 Simulation ---
        const maskedHeaders: Record<string, string> = {};
        for (const [k, v] of Object.entries(req.headers || {})) {
            const lk = k.toLowerCase();
            if (lk === 'authorization' || lk.includes('key') || lk.includes('secret') || lk.includes('token')) {
                maskedHeaders[k] = '[REDACTED]';
            } else {
                maskedHeaders[k] = Array.isArray(v) ? v.join(', ') : String(v || '');
            }
        }
        const receivedAtIso = new Date().toISOString();
        if (pool) {
            pool.query(`
                CREATE TABLE IF NOT EXISTS public.ncba_callback_attempts (
                    id BIGSERIAL PRIMARY KEY,
                    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    institution_id TEXT,
                    ft_reference TEXT,
                    client_reference TEXT,
                    http_status_returned INTEGER,
                    headers JSONB,
                    payload JSONB
                )
            `).catch(() => {});
        }

        // Standard NCBA 2024 + Open Banking V2 v3.1 (Section 9.7) Payload mapping
        const bodyRaw = body.Body?.stkCallback || body.data || body;
        const ftReference = String(
            bodyRaw.txnReferenceNo || body.txnReferenceNo ||
            bodyRaw.ftReference || body.ftReference ||
            bodyRaw.FtReference || body.FtReference ||
            bodyRaw.CoreReference || body.CoreReference ||
            bodyRaw.bankRef || body.bankRef ||
            bodyRaw.resCoreReferenceNo || body.resCoreReferenceNo ||
            bodyRaw.BankTransactionID || bodyRaw.BankReference || ''
        ).trim();
        const clientReference = String(
            bodyRaw.cbxReferenceNumber || body.cbxReferenceNumber ||
            bodyRaw.channelRef || body.channelRef ||
            bodyRaw.channelReference || body.channelReference ||
            bodyRaw.clientReference || body.clientReference ||
            bodyRaw.hdrTranId || body.hdrTranId ||
            bodyRaw.TransactionID || body.TransactionID ||
            bodyRaw.CheckoutRequestID || body.CheckoutRequestID ||
            bodyRaw.ReferenceID || body.ReferenceID || ''
        ).trim();
        const transactionId = clientReference || ftReference;

        const recordAttempt = async (httpStatusReturned: number) => {
            if (!pool) return;
            await pool.query(
                `INSERT INTO public.ncba_callback_attempts (received_at, institution_id, ft_reference, client_reference, http_status_returned, headers, payload) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
                [receivedAtIso, institutionId || null, ftReference || null, clientReference || null, httpStatusReturned, JSON.stringify(maskedHeaders), JSON.stringify(body)]
            ).catch(() => {});
        };

        // CBK-07 Test Toggle: return HTTP 500 while recording every NCBA delivery attempt (timestamp + headers)
        if (process.env.NCBA_CALLBACK_SIMULATE_500 === 'true' || req.query.simulate500 === '1') {
            console.warn(`[NCBA Callback CBK-07] Simulating HTTP 500 at ${receivedAtIso} for ref=${transactionId}`);
            await recordAttempt(500);
            return res.status(500).json({ ResultCode: 1, ResultDesc: 'Simulated 500 for CBK-07 retry test', receivedAt: receivedAtIso });
        }

        const resultCode = String(bodyRaw.ResultCode ?? body.ResultCode ?? bodyRaw.ResponseCode ?? body.ResponseCode ?? body.status_code ?? '');
        const status = String(bodyRaw.transactionStatus || body.transactionStatus || bodyRaw.status || body.status || bodyRaw.Status || '');
        const hasV2SuccessBool = typeof bodyRaw.isSuccessful === 'boolean' || typeof body.isSuccessful === 'boolean';
        const v2IsSuccessful = typeof bodyRaw.isSuccessful === 'boolean' ? bodyRaw.isSuccessful : (typeof body.isSuccessful === 'boolean' ? body.isSuccessful : undefined);
        const thirdPartyId = String(bodyRaw.thirdPartyId || body.thirdPartyId || bodyRaw.MpesaReceiptNumber || bodyRaw.ProviderReference || '').trim();
        const thirdPartyStatus = String(bodyRaw.thirdPartyStatus || body.thirdPartyStatus || '').trim();
        const failureReason = String(bodyRaw.failureReason || body.failureReason || bodyRaw.reason || body.reason || body.ResultDesc || body.message || '').trim();

        if (!transactionId) {
            console.error('[NCBA] Missing client reference / FT reference in callback payload');
            await recordAttempt(400);
            return res.status(400).json({ ResultCode: 1, ResultDesc: 'Missing transaction reference' });
        }

        // 1. Locate Transaction — Authenticity Step 1 (Section 9.8 & CBK-04: must match a payment we sent)
        let txn: any = null;
        if (supabase) {
            const orParts: string[] = [];
            if (clientReference) orParts.push(`transaction_id.eq.${clientReference}`);
            if (ftReference) orParts.push(`reference_id.eq.${ftReference}`);
            const { data, error: fetchError } = await supabase
                .from('ncba_transactions')
                .select('*')
                .or(orParts.join(','))
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (fetchError) console.warn('[NCBA Callback] Supabase fetch warning:', fetchError.message);
            txn = data;
        }
        if (!txn && pool) {
            const pgTxn = await pool.query(
                `SELECT * FROM public.ncba_transactions WHERE transaction_id = $1 OR reference_id = $2 OR checkout_request_id = $1 OR reference_no = $1 ORDER BY created_at DESC NULLS LAST LIMIT 1`,
                [clientReference || transactionId, ftReference || transactionId]
            ).catch(() => null);
            txn = pgTxn?.rows?.[0] || null;
        }

        if (!txn) {
            // Section 9.8 & CBK-04: Discard any forged/unmatched callback without modifying ledger
            console.warn(`[NCBA Callback CBK-04] Discarding unmatched/forged callback (clientRef=${clientReference}, ftRef=${ftReference})`);
            await recordAttempt(200);
            return res.status(200).json({ ResultCode: 0, ResultDesc: 'Acknowledged (unmatched callback discarded per Section 9.8)' });
        }

        const rawMeta = typeof txn.metadata === 'string' ? (() => { try { return JSON.parse(txn.metadata); } catch (_) { return {}; } })() : (txn.metadata || {});
        const resolvedFt = ftReference || rawMeta.ftReference || txn.reference_id || '';
        const resolvedClientRef = clientReference || rawMeta.clientReference || txn.transaction_id || '';

        // 1b. Idempotency Check (Section 9.8: keyed on FT + clientRef, repeated callbacks change record only once)
        if ((txn.status === 'completed' || txn.status === 'failed') && rawMeta.callback_processed_key === `${resolvedFt}|${resolvedClientRef}`) {
            console.log(`[NCBA Callback] Idempotent duplicate callback ignored for ${resolvedFt}|${resolvedClientRef}`);
            await recordAttempt(200);
            return res.status(200).json({ ResultCode: 0, ResultDesc: 'Already processed (idempotent)' });
        }

        // 1c. Authenticity Step 2 (Section 9.8 & CBK-04): For Open Banking V2 payments, confirm on Transaction Checker before posting to ledger
        let checkerVerified = false;
        let checkerFinalSuccess: boolean | null = null;
        let checkerThirdPartyId = thirdPartyId;
        let checkerThirdPartyStatus = thirdPartyStatus;
        let checkerPayload: any = null;

        const isOpenBankingV2 = rawMeta.provider === 'ncba_open_banking' || hasV2SuccessBool || !!bodyRaw.cbxReferenceNumber || !!bodyRaw.txnReferenceNo;
        const debitAcctForCheck = rawMeta.debitAccount || rawMeta.DebitAccountNumber || rawMeta.SenderAccountNumber || process.env.NCBA_DEBIT_ACCOUNT || '';

        if (isOpenBankingV2 && resolvedFt && debitAcctForCheck && process.env.NCBA_MOCK_MODE !== 'true') {
            try {
                const proto = (req.headers['x-forwarded-proto'] as string) || (req.headers.host?.includes('localhost') ? 'http' : 'https');
                const checkerUrl = `${proto}://${req.headers.host}/api/openBanking?action=transactionChecker`;
                const chkRes = await fetch(checkerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        institutionId: txn.institution_id || institutionId || 'GLOBAL',
                        txnReferenceNo: resolvedFt,
                        debitAccountNumber: debitAcctForCheck,
                        clientReference: resolvedClientRef,
                    }),
                    signal: AbortSignal.timeout(10000),
                });
                if (chkRes.ok) {
                    const chkJson: any = await chkRes.json();
                    checkerPayload = chkJson;
                    // Verify client reference matches if returned by Checker (CBK-04)
                    if (chkJson.cbxReferenceNumber && resolvedClientRef && chkJson.cbxReferenceNumber !== resolvedClientRef) {
                        console.warn(`[NCBA Callback CBK-04] Discarding callback: Checker cbxReferenceNumber (${chkJson.cbxReferenceNumber}) != callback clientRef (${resolvedClientRef})`);
                        await recordAttempt(200);
                        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Callback discarded: Transaction Checker mismatch' });
                    }
                    if (chkJson.isFinal) {
                        checkerVerified = true;
                        checkerFinalSuccess = chkJson.statusClass === 'final_success';
                        if (chkJson.thirdPartyId) checkerThirdPartyId = chkJson.thirdPartyId;
                        if (chkJson.thirdPartyStatus) checkerThirdPartyStatus = chkJson.thirdPartyStatus;
                    } else if (chkJson.statusClass === 'not_yet_known') {
                        console.warn(`[NCBA Callback CBK-04] Transaction Checker returned 404 for FT=${resolvedFt}; withholding ledger update until confirmed.`);
                        await recordAttempt(200);
                        return res.status(200).json({ ResultCode: 0, ResultDesc: 'Acknowledged; awaiting Transaction Checker confirmation' });
                    }
                }
            } catch (chkErr: any) {
                console.warn('[NCBA Callback] Transaction Checker verification warning:', chkErr?.message || chkErr);
            }
        }

        // 2. Determine Final Success (Transaction Checker is authoritative when verified; otherwise callback status)
        const callbackIsSuccess = hasV2SuccessBool
            ? v2IsSuccessful === true
            : (resultCode === '0' || resultCode === '00' || resultCode === '000' || status.toUpperCase() === 'SUCCESS' || status.toUpperCase() === 'COMPLETED');
        const isSuccess = checkerVerified && checkerFinalSuccess !== null ? checkerFinalSuccess : callbackIsSuccess;

        if (isSuccess) {
            console.log(`[NCBA] ✅ Payment Verified for Transaction ${resolvedClientRef} (FT=${resolvedFt}, checkerVerified=${checkerVerified})`);
            
            // 3. Update Transaction Record
            const bankRef = resolvedFt || bodyRaw.BankTransactionID || bodyRaw.ReferenceID || checkerThirdPartyId ||
                             bodyRaw.ReceiptNumber || bodyRaw.BankReference || bodyRaw.ExternalReference || 
                             bodyRaw.TransactionReference || transactionId;
            const receiptRef = checkerThirdPartyId || bankRef;
            const nowIso = new Date().toISOString();
            const updatedMeta = {
                ...rawMeta,
                callback_payload: body,
                callback_processed_key: `${resolvedFt}|${resolvedClientRef}`,
                thirdPartyId: checkerThirdPartyId || rawMeta.thirdPartyId || '',
                thirdPartyStatus: checkerThirdPartyStatus || rawMeta.thirdPartyStatus || '',
                checker_verified: checkerVerified,
                checker_response: checkerPayload || rawMeta.checker_response,
                verified_at: nowIso
            };

            if (supabase) {
                try {
                    await supabase.from('ncba_transactions').update({
                        status: 'completed',
                        reference_id: bankRef,
                        receipt_number: receiptRef,
                        completed_at: nowIso,
                        metadata: updatedMeta
                    }).eq('id', txn.id);
                } catch (_) {}
            }
            if (pool) {
                try {
                    await pool.query(
                        `UPDATE public.ncba_transactions SET status = 'completed', reference_id = $1, receipt_number = $2, completed_at = $3, updated_at = $3, metadata = $4::jsonb WHERE id = $5`,
                        [bankRef, receiptRef, nowIso, JSON.stringify(updatedMeta), txn.id]
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
            console.log(`[NCBA] ❌ Payment Failed for Transaction ${resolvedClientRef} (FT=${resolvedFt}): ${failureReason || status || 'Failed'}`);
            const failedMeta = {
                ...rawMeta,
                callback_payload: body,
                callback_processed_key: `${resolvedFt}|${resolvedClientRef}`,
                last_error: failureReason || status || 'Payment failed',
                thirdPartyStatus: checkerThirdPartyStatus || rawMeta.thirdPartyStatus || '',
                checker_verified: checkerVerified,
                checker_response: checkerPayload || rawMeta.checker_response,
                failed_at: new Date().toISOString(),
            };
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

        await recordAttempt(200);
        // Standard Success Response for NCBA (Section 9.8: HTTP 200 acknowledgement)
        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Callback processed successfully'
        });

    } catch (err: any) {
        console.error('[NCBA Fatal]', err);
        return res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal processing error' });
    }
}
