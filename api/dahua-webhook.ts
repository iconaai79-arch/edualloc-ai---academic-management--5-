import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Dahua Access Control / Face Recognition HTTP Push Webhook
 * 
 * Receives real-time biometric authentication logs pushed from Dahua terminals 
 * via HTTP Alarm Server / Event Notification.
 * 
 * Dahua sends POST requests with event payload:
 * {
 *   "Events": [
 *     {
 *       "Action": "Pulse",
 *       "Code": "AccessControl",
 *       "Data": {
 *         "CardNo": "0712345678",
 *         "UserID": "usr_1234",
 *         "Name": "John Doe",
 *         "CreateTime": 1699999999,
 *         "Status": 1
 *       }
 *     }
 *   ]
 * }
 */

const getSupabase = (req?: VercelRequest) => {
    const url = process.env.SUPABASE_URL || 
                process.env.VITE_SUPABASE_URL ||
                (req?.headers?.['x-supabase-url'] as string);
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                (req?.headers?.['x-supabase-service-key'] as string) ||
                process.env.SUPABASE_ANON_KEY || 
                process.env.VITE_SUPABASE_ANON_KEY ||
                (req?.headers?.['x-supabase-key'] as string) ||
                (req?.headers?.['x-supabase-anon-key'] as string);

    if (!url || !key) {
        return null;
    }
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

// Direct PostgreSQL Connection Pool Singleton for Talksasa / Docker / non-Supabase deployments
let _pgPool: any = null;
let _directPgDisabledUntil = 0;
let _forcePlaintextPg = false;
let _fallbackDatabaseName: string | null = null;

const getPgPool = async () => {
    if (process.env.DISABLE_DIRECT_PG === 'true' || process.env.DISABLE_DIRECT_PG === '1') {
        return null;
    }
    if (Date.now() < _directPgDisabledUntil) {
        return null;
    }
    if (_pgPool) return _pgPool;
    const connectionString = 
        process.env.DATABASE_URL || 
        process.env.POSTGRES_URL || 
        process.env.VITE_DATABASE_URL ||
        process.env.SUPABASE_DB_URL ||
        (process.env.PGHOST && process.env.PGUSER ? `postgresql://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD || '')}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || process.env.PGUSER}` : null);
    if (!connectionString) return null;

    try {
        const pgModule: any = await import('pg');
        const Pool = pgModule.Pool || pgModule.default?.Pool || null;
        if (!Pool) return null;

        let cleanConnString = connectionString.trim();
        if (_fallbackDatabaseName) {
            try {
                const u = new URL(cleanConnString);
                u.pathname = `/${_fallbackDatabaseName}`;
                cleanConnString = u.toString();
            } catch (_) {
                cleanConnString = cleanConnString.replace(/\/[a-zA-Z0-9_-]+(\?|$)/, `/${_fallbackDatabaseName}$1`);
            }
        }
        let disableSsl = _forcePlaintextPg;
        try {
            const parsedUrl = new URL(cleanConnString);
            const h = (parsedUrl.hostname || '').toLowerCase();
            if (
                _forcePlaintextPg ||
                parsedUrl.searchParams.get('sslmode') === 'disable' ||
                parsedUrl.searchParams.get('ssl') === 'false' ||
                process.env.PGSSLMODE === 'disable' ||
                h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === 'host.docker.internal' || h === '::1' ||
                h.startsWith('user-') || h.startsWith('service-') || h === 'db' || h === 'postgres' ||
                h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.docker')
            ) {
                disableSsl = true;
            }
            parsedUrl.searchParams.delete('sslmode');
            cleanConnString = parsedUrl.toString();
        } catch {
            if (_forcePlaintextPg || /([?&])sslmode=disable/i.test(cleanConnString) || /([?&])ssl=false/i.test(cleanConnString) || process.env.PGSSLMODE === 'disable') {
                disableSsl = true;
            }
            cleanConnString = cleanConnString
                .replace(/([?&])sslmode=[^&]*(&|$)/g, (_match, prefix, suffix) => suffix === '&' ? prefix : '')
                .replace(/\?$/, '');
        }

        _pgPool = new Pool({
            connectionString: cleanConnString,
            ssl: disableSsl ? false : { rejectUnauthorized: false },
            connectionTimeoutMillis: 7000,
            statement_timeout: 8000,
            max: 5,
            idleTimeoutMillis: 30000,
        });

        _pgPool.on('error', (err: any) => {
            console.warn('[Direct SQL Pool Error in Dahua Webhook]:', err?.message || err);
            if (/does not support SSL/i.test(err?.message || '') || err?.code === '08006' || err?.code === '08001') {
                _forcePlaintextPg = true;
                _directPgDisabledUntil = 0;
            } else if (err?.code === '3D000' || /database ".*" does not exist/i.test(err?.message || '')) {
                _fallbackDatabaseName = 'postgres';
                _directPgDisabledUntil = 0;
            } else {
                _directPgDisabledUntil = Date.now() + 15000;
            }
            try { _pgPool?.end().catch(() => {}); } catch (_) {}
            _pgPool = null;
        });

        await ensureDahuaTables(_pgPool).catch(() => {});

        return _pgPool;
    } catch (e: any) {
        console.warn('[Direct SQL Pool in Dahua Init Warning]:', e?.message || e);
        _directPgDisabledUntil = Date.now() + 30000;
        return null;
    }
};

let _dahuaTablesEnsured = false;
const ensureDahuaTables = async (pool: any) => {
    if (_dahuaTablesEnsured || !pool) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.staff_attendance_logs (
                id TEXT PRIMARY KEY DEFAULT ('sal_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
                institution_id TEXT,
                staff_id TEXT,
                device_id TEXT,
                device_pin TEXT,
                punch_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                punch_type INTEGER DEFAULT 0,
                verification_method INTEGER DEFAULT 1,
                raw_data TEXT,
                is_processed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS public.biometric_devices (
                id TEXT PRIMARY KEY DEFAULT ('dev_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
                institution_id TEXT,
                serial_number TEXT,
                device_name TEXT,
                device_model TEXT,
                protocol TEXT DEFAULT 'dahua',
                ip_address TEXT,
                port INTEGER DEFAULT 80,
                is_active BOOLEAN DEFAULT TRUE,
                last_sync_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            DO $$
            BEGIN
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS staff_id TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "staffId" TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS device_id TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS device_pin TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "devicePin" TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS punch_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "punchTime" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS punch_type INTEGER DEFAULT 0;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "punchType" INTEGER DEFAULT 0;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS verification_method INTEGER DEFAULT 1;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "verificationMethod" INTEGER DEFAULT 1;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS raw_data TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "rawData" TEXT;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT FALSE;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "isProcessed" BOOLEAN DEFAULT FALSE;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS institution_id TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS serial_number TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS device_name TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "deviceName" TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS device_model TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "deviceModel" TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS protocol TEXT DEFAULT 'dahua';
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS ip_address TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 80;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMPTZ;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
                ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS institution_id TEXT;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS staff_id TEXT;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "staffId" TEXT;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS device_pin TEXT;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "devicePin" TEXT;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS fingerprint_index INTEGER DEFAULT 0;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "fingerprintIndex" INTEGER DEFAULT 0;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS card_number TEXT;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "cardNumber" TEXT;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
                ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;

                UPDATE public.biometric_enrollments SET staff_id = "staffId" WHERE (staff_id IS NULL OR staff_id = '') AND "staffId" IS NOT NULL AND "staffId" <> '';
                UPDATE public.biometric_enrollments SET "staffId" = staff_id WHERE ("staffId" IS NULL OR "staffId" = '') AND staff_id IS NOT NULL AND staff_id <> '';
                UPDATE public.biometric_enrollments SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '') AND "institutionId" IS NOT NULL AND "institutionId" <> '';
                UPDATE public.biometric_enrollments SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL AND institution_id <> '';
                UPDATE public.biometric_enrollments SET device_pin = "devicePin" WHERE (device_pin IS NULL OR device_pin = '') AND "devicePin" IS NOT NULL AND "devicePin" <> '';
                UPDATE public.biometric_enrollments SET "devicePin" = device_pin WHERE ("devicePin" IS NULL OR "devicePin" = '') AND device_pin IS NOT NULL AND device_pin <> '';
            END $$;
        `);
        _dahuaTablesEnsured = true;
    } catch (e: any) {
        console.warn('[Dahua Webhook] Table self-heal warning:', e?.message || e);
    }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        const action = (req.query.action || '').toString().toLowerCase();
        const institutionId = (req.query.institutionId || req.query.institution_id || '').toString();
        const sn = (req.query.SN || req.query.sn || '').toString();

        if (action === 'discover') {
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            if (!supabase && !pool) {
                console.error('[Dahua Webhook] Database not configured: Neither Supabase nor Talksasa DATABASE_URL available');
                return res.status(500).json({ error: 'DB not configured' });
            }

            try {
                let registered: any[] = [];
                let rawLogs: any[] = [];

                if (supabase) {
                    // 1. Get already registered devices for this institution (resilient to missing port column)
                    const { data: regData, error: regErr } = await supabase
                        .from('biometric_devices')
                        .select('*')
                        .eq('institution_id', institutionId);

                    if (!regErr && regData) {
                        registered = regData;
                    } else {
                        const { data: fallbackData } = await supabase
                            .from('biometric_devices')
                            .select('id, serial_number, device_name, device_model, protocol, is_active, last_sync_at, ip_address')
                            .eq('institution_id', institutionId);
                        registered = fallbackData || [];
                    }

                    // 2. Query recent attendance logs to discover active terminals that sent punches
                    let logQuery = supabase
                        .from('staff_attendance_logs')
                        .select('id, institution_id, device_pin, punch_time, raw_data, created_at')
                        .order('created_at', { ascending: false })
                        .limit(50);

                    if (institutionId) {
                        logQuery = logQuery.or(`institution_id.eq.${institutionId},institution_id.is.null`);
                    }

                    const { data: logs } = await logQuery;
                    rawLogs = logs || [];
                } else if (pool) {
                    try {
                        const regRes = institutionId
                            ? await pool.query('SELECT id, serial_number, device_name, device_model, protocol, is_active, last_sync_at, ip_address FROM public.biometric_devices WHERE institution_id = $1', [institutionId])
                            : await pool.query('SELECT id, serial_number, device_name, device_model, protocol, is_active, last_sync_at, ip_address FROM public.biometric_devices LIMIT 100');
                        registered = regRes.rows || [];
                    } catch (e) {
                        console.warn('[Dahua Webhook PG] Registered devices query warn:', e);
                    }

                    try {
                        const logRes = institutionId
                            ? await pool.query('SELECT id, institution_id, device_pin, punch_time, raw_data, created_at FROM public.staff_attendance_logs WHERE institution_id = $1 OR institution_id IS NULL ORDER BY created_at DESC LIMIT 50', [institutionId])
                            : await pool.query('SELECT id, institution_id, device_pin, punch_time, raw_data, created_at FROM public.staff_attendance_logs ORDER BY created_at DESC LIMIT 50');
                        rawLogs = logRes.rows || [];
                    } catch (e) {
                        console.warn('[Dahua Webhook PG] Raw logs query warn:', e);
                    }
                }

                const registeredSns = new Set(
                    (registered || []).map(d => (d.serial_number || '').trim().toLowerCase())
                );

                const discoveredMap = new Map<string, any>();

                for (const log of (rawLogs || [])) {
                    let rawJson: any = {};
                    try {
                        rawJson = typeof log.raw_data === 'string' ? JSON.parse(log.raw_data) : (log.raw_data || {});
                    } catch (_) {}

                    const sn = (
                        rawJson.SN ||
                        rawJson.SerialNo ||
                        rawJson.DeviceID ||
                        rawJson.DeviceId ||
                        rawJson.DevID ||
                        ''
                    ).toString().trim();

                    if (!sn || registeredSns.has(sn.toLowerCase())) continue;

                    if (!discoveredMap.has(sn)) {
                        discoveredMap.set(sn, {
                            serialNumber: sn,
                            deviceName: rawJson.DeviceName || `Dahua Terminal (${sn})`,
                            deviceModel: rawJson.DeviceType || rawJson.Model || 'Dahua Facial Recognition Terminal',
                            lastSeen: log.punch_time || log.created_at,
                            samplePin: log.device_pin,
                            protocol: 'dahua'
                        });
                    }
                }

                return res.status(200).json({
                    status: 'ok',
                    discovered: Array.from(discoveredMap.values()),
                    registered: (registered || []).map(r => ({
                        id: r.id,
                        serialNumber: r.serial_number,
                        deviceName: r.device_name,
                        deviceModel: r.device_model,
                        protocol: r.protocol,
                        isActive: r.is_active,
                        lastSyncAt: r.last_sync_at,
                        ipAddress: r.ip_address,
                        port: r.port
                    })),
                    recentLogsCount: (rawLogs || []).length
                });
            } catch (err: any) {
                console.warn('[Dahua Webhook] Discover error:', err);
                return res.status(200).json({ status: 'ok', discovered: [], registered: [] });
            }
        }

        if (action === 'reprocess' || action === 'sync_previous' || action === 'backfill') {
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            if (!supabase && !pool) {
                return res.status(500).json({ success: false, error: 'Database not configured' });
            }
            if (!institutionId) {
                return res.status(400).json({ success: false, error: 'institutionId is required' });
            }

            const startDate = (req.query.startDate || req.query.start_date || '').toString().trim();
            const endDate = (req.query.endDate || req.query.end_date || '').toString().trim();

            const result = await reprocessHistoricalDahuaLogs({
                supabase,
                pool,
                institutionId,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
            return res.status(200).json(result);
        }

        if (action === 'status' || action === 'sync') {
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            let recentCount = 0;
            let lastSeen: string | null = null;
            let reprocessSummary: any = null;

            if (action === 'sync' && institutionId) {
                try {
                    reprocessSummary = await reprocessHistoricalDahuaLogs({
                        supabase,
                        pool,
                        institutionId,
                    });
                } catch (repErr) {
                    console.warn('[Dahua Webhook] Sync reprocess warning:', repErr);
                }
            }

            if (supabase) {
                try {
                    let q = supabase
                        .from('staff_attendance_logs')
                        .select('id, punch_time, device_pin, created_at')
                        .order('created_at', { ascending: false })
                        .limit(20);

                    if (institutionId) {
                        q = q.eq('institution_id', institutionId);
                    }

                    const { data: logs } = await q;
                    if (logs && logs.length > 0) {
                        recentCount = logs.length;
                        lastSeen = logs[0].punch_time || logs[0].created_at;
                    }

                    if (action === 'sync' && institutionId) {
                        const today = new Date().toISOString().split('T')[0];
                        try {
                            await supabase.rpc('compute_staff_daily_attendance', {
                                p_institution_id: institutionId,
                                p_date: today
                            });
                        } catch (_) {}
                    }
                } catch (e) {
                    console.warn('[Dahua Webhook] Status query error:', e);
                }
            } else if (pool) {
                try {
                    const qRes = institutionId
                        ? await pool.query('SELECT id, punch_time, device_pin, created_at FROM public.staff_attendance_logs WHERE institution_id = $1 ORDER BY created_at DESC LIMIT 20', [institutionId])
                        : await pool.query('SELECT id, punch_time, device_pin, created_at FROM public.staff_attendance_logs ORDER BY created_at DESC LIMIT 20');
                    const logs = qRes.rows || [];
                    if (logs && logs.length > 0) {
                        recentCount = logs.length;
                        lastSeen = logs[0].punch_time || logs[0].created_at;
                    }

                    if (action === 'sync' && institutionId) {
                        const today = new Date().toISOString().split('T')[0];
                        try {
                            await pool.query('SELECT compute_staff_daily_attendance($1, $2)', [institutionId, today]);
                        } catch (_) {}
                    }
                } catch (e) {
                    console.warn('[Dahua Webhook PG] Status query error:', e);
                }
            }

            return res.status(200).json({
                status: 'ok',
                online: true,
                service: 'Dahua Biometric Webhook Receiver',
                deviceSN: sn || undefined,
                lastSeen,
                recentLogsCount: recentCount,
                synced: action === 'sync',
                ...(reprocessSummary ? {
                    newlyLinkedLogs: reprocessSummary.newlyLinkedLogs,
                    dailyRecordsSynced: reprocessSummary.dailyRecordsSynced,
                    totalLogsScanned: reprocessSummary.totalLogsScanned,
                    unmatchedPins: reprocessSummary.unmatchedPins
                } : {})
            });
        }

        return res.status(200).json({ status: 'ok', service: 'Dahua Biometric Webhook Receiver' });
    }

    if (req.method === 'POST') {
        const postAction = (req.query.action || (req.body && typeof req.body === 'object' ? (req.body as any).action : '') || '').toString().toLowerCase();
        if (postAction === 'reprocess' || postAction === 'sync_previous' || postAction === 'backfill') {
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            if (!supabase && !pool) {
                return res.status(500).json({ success: false, error: 'Database not configured' });
            }
            const bodyObj = (req.body && typeof req.body === 'object') ? (req.body as any) : {};
            const instId = (req.query.institutionId || req.query.institution_id || bodyObj.institutionId || bodyObj.institution_id || '').toString().trim();
            if (!instId) {
                return res.status(400).json({ success: false, error: 'institutionId is required' });
            }
            const startDate = (req.query.startDate || req.query.start_date || bodyObj.startDate || bodyObj.start_date || '').toString().trim();
            const endDate = (req.query.endDate || req.query.end_date || bodyObj.endDate || bodyObj.end_date || '').toString().trim();
            const result = await reprocessHistoricalDahuaLogs({
                supabase,
                pool,
                institutionId: instId,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
            return res.status(200).json(result);
        }

        const supabase = getSupabase(req);
        const pool = await getPgPool();
        if (pool) await ensureDahuaTables(pool).catch(() => {});
        if (!supabase && !pool) {
            console.error('[Dahua Webhook] Database not configured: Neither Supabase nor Talksasa DATABASE_URL available');
            return res.status(500).json({ error: 'Server configuration error: Database not configured' });
        }

        try {
            let body = req.body || {};
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (_) {
                    console.warn('[Dahua Webhook] Could not parse stringified body as JSON');
                }
            }

            const rawEvents = Array.isArray(body?.Events) 
                ? body.Events 
                : (Array.isArray(body) ? body : (Array.isArray(body?.records) ? body.records : [body]));

            let processedCount = 0;

            for (const ev of rawEvents) {
                if (!ev || typeof ev !== 'object') continue;

                // Support both nested ev.Data and flat ev payload
                const data = ev.Data || ev.data || ev;
                const cardNo = (data.CardNo || data.cardNo || data.CardNumber || data.cardNumber || data.card_no || ev.CardNo || ev.cardNo || '').toString().trim();
                const userId = (data.UserID || data.userId || data.UserCode || data.userCode || data.PersonID || data.personId || data.EmployeeNo || data.employeeNo || data.pin || data.PIN || data.user_id || ev.UserID || ev.userId || ev.UserCode || '').toString().trim();
                const createTimeStr = data.CreateTime || data.createTime || ev.CreateTime || ev.createTime || data.Time || ev.Time;
                
                const effectivePin = userId || cardNo || (data.Name ? String(data.Name) : 'Unknown_User');
                const devSn = (data.SN || data.SerialNo || data.DeviceID || data.DeviceId || body?.SN || body?.SerialNo || body?.DeviceId || req.query.device_id || req.query.deviceId || req.query.SN || req.query.sn || data.Name || 'Door1').toString().trim();
                const devName = data.DeviceName || body?.DeviceName || data.Name || 'Dahua Face Terminal';
                const devModel = data.DeviceType || body?.DeviceType || 'Dahua Facial Recognition Terminal';
                const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();

                if (!cardNo && !userId && !data.Name && !ev.Code) continue;

                // Determine timestamp
                let punchTime = new Date();
                if (typeof createTimeStr === 'number') {
                    punchTime = new Date(createTimeStr * 1000);
                } else if (createTimeStr) {
                    const parsed = new Date(createTimeStr);
                    if (!isNaN(parsed.getTime())) punchTime = parsed;
                }

                // Resolve matching user and institution from Supabase or Direct PostgreSQL (Talksasa)
                let matchedUserId: string | null = null;
                let matchedInstitutionId: string | null = null;

                if (supabase) {
                    // Build safe query conditions avoiding Postgres UUID crash
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
                    const orParts: string[] = [];
                    if (isUUID) orParts.push(`id.eq.${userId}`);
                    if (userId) orParts.push(`staff_id.eq.${userId}`);
                    if (cardNo) orParts.push(`phone_number.ilike.%${cardNo}%`);
                    if (userId && !isUUID) orParts.push(`phone_number.ilike.%${userId}%`);

                    if (orParts.length > 0) {
                        const { data: users, error: userErr } = await supabase
                            .from('users')
                            .select('id, institution_id, phone_number, staff_id')
                            .or(orParts.join(','));

                        if (!userErr && users && users.length > 0) {
                            matchedUserId = users[0].id;
                            matchedInstitutionId = users[0].institution_id;
                        }
                    }

                    // Fallback to biometric_enrollments (Device PIN mapping)
                    if (!matchedUserId) {
                        const searchPin = userId || cardNo;
                        if (searchPin) {
                            try {
                                const { data: enrollments, error: enrErr } = await supabase
                                    .from('biometric_enrollments')
                                    .select('staff_id, institution_id')
                                    .eq('device_pin', searchPin)
                                    .eq('is_active', true)
                                    .limit(1);

                                if (!enrErr && enrollments && enrollments.length > 0) {
                                    matchedUserId = enrollments[0].staff_id;
                                    matchedInstitutionId = enrollments[0].institution_id;
                                } else {
                                    // Fallback to camelCase columns
                                    const { data: enrollmentsCamel } = await supabase
                                        .from('biometric_enrollments')
                                        .select('"staffId", "institutionId"')
                                        .eq('devicePin', searchPin)
                                        .eq('isActive', true)
                                        .limit(1);
                                    if (enrollmentsCamel && enrollmentsCamel.length > 0) {
                                        matchedUserId = (enrollmentsCamel[0] as any).staffId;
                                        matchedInstitutionId = (enrollmentsCamel[0] as any).institutionId;
                                    }
                                }
                            } catch (_) {}
                        }
                    }

                    // Look up device in biometric_devices to inherit its configured institution
                    if (!matchedInstitutionId && devSn) {
                        try {
                            const { data: devMatch } = await supabase
                                .from('biometric_devices')
                                .select('institution_id, id')
                                .or(`serial_number.eq.${devSn},id.eq.${devSn},device_name.ilike.%${devSn}%`)
                                .limit(1)
                                .maybeSingle();
                            if (devMatch?.institution_id) {
                                matchedInstitutionId = devMatch.institution_id;
                            }
                        } catch (_) {}
                    }

                    // Fallback institution_id if user/device is not yet matched/enrolled
                    if (!matchedInstitutionId) {
                        const queryInst = (req.query.institution_id || req.query.institutionId || req.query.instId || '').toString().trim();
                        if (queryInst) {
                            matchedInstitutionId = queryInst;
                        } else {
                            const { data: anyInst } = await supabase.from('institutions').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
                            matchedInstitutionId = anyInst?.id || null;
                        }
                    }

                    // Store in staff_attendance_logs (even if user is unlinked/unknown)
                    if (matchedInstitutionId) {
                        const { error: insErr } = await supabase.from('staff_attendance_logs').insert([{
                            institution_id: matchedInstitutionId,
                            institutionId: matchedInstitutionId,
                            staff_id: matchedUserId,
                            staffId: matchedUserId,
                            device_id: devSn,
                            deviceId: devSn,
                            device_pin: effectivePin,
                            devicePin: effectivePin,
                            punch_time: punchTime.toISOString(),
                            punchTime: punchTime.toISOString(),
                            punch_type: 0,
                            punchType: 0,
                            verification_method: 4, // Face / Biometric
                            verificationMethod: 4,
                            raw_data: JSON.stringify(data),
                            rawData: JSON.stringify(data),
                            is_processed: !!matchedUserId,
                            isProcessed: !!matchedUserId
                        }]);
                        if (insErr) {
                            console.error('[Dahua Webhook] Error inserting staff_attendance_log:', insErr);
                        } else if (!matchedUserId) {
                            processedCount++;
                        }

                        // Auto-register Dahua terminal in biometric_devices if serial number present
                        if (matchedInstitutionId && devSn) {
                            try {
                                const { data: existingDev } = await supabase
                                    .from('biometric_devices')
                                    .select('id')
                                    .eq('institution_id', matchedInstitutionId)
                                    .eq('serial_number', devSn)
                                    .maybeSingle();

                                if (!existingDev) {
                                    await supabase.from('biometric_devices').insert([{
                                        institution_id: matchedInstitutionId,
                                        serial_number: devSn,
                                        device_name: `${devName} (${devSn})`,
                                        device_model: devModel,
                                        protocol: 'dahua',
                                        ip_address: clientIp || null,
                                        is_active: true,
                                        last_sync_at: punchTime.toISOString()
                                    }]);
                                } else {
                                    await supabase
                                        .from('biometric_devices')
                                        .update({ last_sync_at: punchTime.toISOString(), is_active: true })
                                        .eq('id', existingDev.id);
                                }
                            } catch (_) {}
                        }
                    }

                    // Also trigger teacher checkin RPC if staff member matched
                    if (matchedUserId && matchedInstitutionId) {
                        const hour = punchTime.getHours();
                        const checkinType = hour < 12 ? 'Morning' : 'Afternoon';
                        
                        const { error: rpcErr } = await supabase.rpc('process_teacher_checkin', {
                            p_teacher_id: matchedUserId,
                            p_institution_id: matchedInstitutionId,
                            p_checkin_type: checkinType,
                            p_location: 'Dahua Biometric Terminal',
                            p_notes: 'Biometric Login Verified'
                        });
                        if (rpcErr) {
                            console.error('[Dahua Webhook] RPC checkin error:', rpcErr);
                        } else {
                            processedCount++;
                        }
                    }
                } else if (pool) {
                    // Direct PostgreSQL (Talksasa) execution
                    if (userId || cardNo) {
                        try {
                            const uRes = await pool.query(
                                `SELECT id, institution_id, phone_number, staff_id FROM public.users 
                                 WHERE (id::text = $1 OR staff_id = $1 OR ($2 != '' AND phone_number ILIKE '%' || $2 || '%')) 
                                 LIMIT 1`,
                                [userId || '', cardNo || '']
                            );
                            if (uRes.rows && uRes.rows.length > 0) {
                                matchedUserId = uRes.rows[0].id;
                                matchedInstitutionId = uRes.rows[0].institution_id;
                            }
                        } catch (uErr) {
                            console.warn('[Dahua Webhook PG] User match query warn:', uErr);
                        }
                    }

                    if (!matchedUserId && (userId || cardNo)) {
                        const targetPin = userId || cardNo;
                        try {
                            const enrRes = await pool.query(
                                `SELECT staff_id, institution_id FROM public.biometric_enrollments 
                                 WHERE device_pin = $1 AND is_active = true LIMIT 1`,
                                [targetPin]
                            );
                            if (enrRes.rows && enrRes.rows.length > 0) {
                                matchedUserId = enrRes.rows[0].staff_id;
                                matchedInstitutionId = enrRes.rows[0].institution_id;
                            }
                        } catch (eErr) {
                            // Fallback to camelCase if snake_case columns don't exist
                            try {
                                const enrRes2 = await pool.query(
                                    `SELECT "staffId" as staff_id, "institutionId" as institution_id 
                                     FROM public.biometric_enrollments 
                                     WHERE ("devicePin" = $1 OR device_pin = $1) 
                                       AND ("isActive" = true OR is_active = true) 
                                     LIMIT 1`,
                                    [targetPin]
                                );
                                if (enrRes2.rows && enrRes2.rows.length > 0) {
                                    matchedUserId = enrRes2.rows[0].staff_id;
                                    matchedInstitutionId = enrRes2.rows[0].institution_id;
                                }
                            } catch (eErr2) {
                                console.warn('[Dahua Webhook PG] Enrollment match query warn:', eErr2);
                            }
                        }
                    }

                    // Look up device in biometric_devices to inherit its configured institution
                    if (!matchedInstitutionId && devSn) {
                        try {
                            const devRes = await pool.query(
                                `SELECT institution_id, id FROM public.biometric_devices 
                                 WHERE (serial_number = $1 OR id = $1 OR device_name ILIKE '%' || $1 || '%') 
                                 LIMIT 1`,
                                [devSn]
                            );
                            if (devRes.rows && devRes.rows.length > 0 && devRes.rows[0].institution_id) {
                                matchedInstitutionId = devRes.rows[0].institution_id;
                            }
                        } catch (devErr) {
                            console.warn('[Dahua Webhook PG] Biometric device match query warn:', devErr);
                        }
                    }

                    if (!matchedInstitutionId) {
                        const queryInst = (req.query.institution_id || req.query.institutionId || req.query.instId || '').toString().trim();
                        if (queryInst) {
                            matchedInstitutionId = queryInst;
                        } else {
                            try {
                                const instRes = await pool.query('SELECT id FROM public.institutions ORDER BY created_at DESC LIMIT 1');
                                matchedInstitutionId = instRes.rows?.[0]?.id || null;
                            } catch (_) {}
                        }
                    }

                    if (matchedInstitutionId) {
                        try {
                            await pool.query(
                                `INSERT INTO public.staff_attendance_logs 
                                 (institution_id, "institutionId", staff_id, "staffId", device_id, "deviceId", device_pin, "devicePin", punch_time, "punchTime", punch_type, "punchType", verification_method, "verificationMethod", raw_data, "rawData", is_processed, "isProcessed") 
                                 VALUES ($1, $1, $2, $2, $3, $3, $4, $4, $5, $5, 0, 0, 4, 4, $6, $6, $7, $7)`,
                                [
                                    matchedInstitutionId,
                                    matchedUserId,
                                    devSn,
                                    effectivePin,
                                    punchTime.toISOString(),
                                    JSON.stringify(data),
                                    !!matchedUserId
                                ]
                            );
                            if (!matchedUserId) processedCount++;
                        } catch (insErr) {
                            console.error('[Dahua Webhook PG] Error inserting staff_attendance_log:', insErr);
                        }

                        // Auto-register Dahua terminal in biometric_devices
                        if (devSn) {
                            try {
                                const devRes = await pool.query(
                                    'SELECT id FROM public.biometric_devices WHERE institution_id = $1 AND serial_number = $2 LIMIT 1',
                                    [matchedInstitutionId, devSn]
                                );
                                if (!devRes.rows || devRes.rows.length === 0) {
                                    await pool.query(
                                        `INSERT INTO public.biometric_devices 
                                         (institution_id, serial_number, device_name, device_model, protocol, ip_address, is_active, last_sync_at) 
                                         VALUES ($1, $2, $3, $4, 'dahua', $5, true, $6)`,
                                        [matchedInstitutionId, devSn, `${devName} (${devSn})`, devModel, clientIp || null, punchTime.toISOString()]
                                    );
                                } else {
                                    await pool.query(
                                        'UPDATE public.biometric_devices SET last_sync_at = $1, is_active = true WHERE id = $2',
                                        [punchTime.toISOString(), devRes.rows[0].id]
                                    );
                                }
                            } catch (devErr) {
                                console.warn('[Dahua Webhook PG] Device registration warn:', devErr);
                            }
                        }
                    }

                    if (matchedUserId && matchedInstitutionId) {
                        const hour = punchTime.getHours();
                        const checkinType = hour < 12 ? 'Morning' : 'Afternoon';
                        try {
                            await pool.query(
                                'SELECT process_teacher_checkin($1, $2, $3, $4, $5)',
                                [matchedUserId, matchedInstitutionId, checkinType, 'Dahua Biometric Terminal', 'Biometric Login Verified']
                            );
                            processedCount++;
                        } catch (rpcErr) {
                            console.warn('[Dahua Webhook PG] process_teacher_checkin note:', rpcErr);
                            processedCount++;
                        }
                    }
                }
            }

            return res.status(200).json({ status: 'success', processed: processedCount });
        } catch (err: any) {
            console.error('[Dahua Webhook] Processing error:', err);
            return res.status(200).json({ status: 'ok', note: 'Error swallowed to prevent device retries' });
        }
    }

    return res.status(200).send('OK');
}

/**
 * Reprocesses historical raw logs in staff_attendance_logs against current
 * biometric_enrollments & users, links previously unmatched punches, and
 * recomputes staff_attendance_daily across all matched dates.
 */
async function reprocessHistoricalDahuaLogs({
    supabase,
    pool,
    institutionId,
    startDate,
    endDate,
}: {
    supabase: any;
    pool: any;
    institutionId: string;
    startDate?: string;
    endDate?: string;
}) {
    const cleanInst = String(institutionId).replace(/^inst_/i, '');
    const instCandidates = Array.from(new Set([institutionId, cleanInst, `inst_${cleanInst}`].filter(Boolean)));

    const normalizeKey = (v: any): string => String(v ?? '').trim().toLowerCase();
    const stripLeadingZeros = (v: string): string => v.replace(/^0+/, '') || v;

    // 1. Ensure staff_attendance_daily exists on Direct PG
    if (pool) {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.staff_attendance_daily (
                id TEXT PRIMARY KEY DEFAULT ('sad_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
                institution_id TEXT,
                "institutionId" TEXT,
                staff_id TEXT,
                "staffId" TEXT,
                attendance_date TEXT,
                "attendanceDate" TEXT,
                first_in TIMESTAMPTZ,
                "firstIn" TIMESTAMPTZ,
                last_out TIMESTAMPTZ,
                "lastOut" TIMESTAMPTZ,
                total_hours NUMERIC DEFAULT 0,
                "totalHours" NUMERIC DEFAULT 0,
                overtime_hours NUMERIC DEFAULT 0,
                "overtimeHours" NUMERIC DEFAULT 0,
                late_minutes INTEGER DEFAULT 0,
                "lateMinutes" INTEGER DEFAULT 0,
                early_leave_minutes INTEGER DEFAULT 0,
                "earlyLeaveMinutes" INTEGER DEFAULT 0,
                punch_count INTEGER DEFAULT 1,
                "punchCount" INTEGER DEFAULT 1,
                status TEXT DEFAULT 'present',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "staffId" TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "attendanceDate" TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "firstIn" TIMESTAMPTZ;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "lastOut" TIMESTAMPTZ;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "totalHours" NUMERIC DEFAULT 0;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "overtimeHours" NUMERIC DEFAULT 0;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "lateMinutes" INTEGER DEFAULT 0;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "earlyLeaveMinutes" INTEGER DEFAULT 0;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "punchCount" INTEGER DEFAULT 1;
        `).catch(() => {});
    }

    // 2. Load enrollments, users, and devices for this institution
    let enrollments: any[] = [];
    let users: any[] = [];
    let devices: any[] = [];
    let rawLogs: any[] = [];

    if (supabase) {
        const instFilter = instCandidates.map(id => `institution_id.eq.${id}`).join(',');
        const [enrRes, usrRes, devRes, logRes] = await Promise.all([
            supabase.from('biometric_enrollments').select('*').or(instFilter),
            supabase.from('users').select('id, staff_id, phone_number, name').or(instFilter),
            supabase.from('biometric_devices').select('id, serial_number, device_name').or(instFilter),
            supabase.from('staff_attendance_logs').select('*').or(`${instFilter},institution_id.is.null`).order('punch_time', { ascending: true }).limit(5000),
        ]);
        enrollments = enrRes.data || [];
        users = usrRes.data || [];
        devices = devRes.data || [];
        rawLogs = logRes.data || [];
    } else if (pool) {
        const [enrRes, usrRes, devRes, logRes] = await Promise.all([
            pool.query('SELECT * FROM public.biometric_enrollments WHERE institution_id = ANY($1::text[]) OR "institutionId" = ANY($1::text[])', [instCandidates]).catch(() => ({ rows: [] })),
            pool.query('SELECT id, staff_id, phone_number, name FROM public.users WHERE institution_id = ANY($1::text[])', [instCandidates]).catch(() => ({ rows: [] })),
            pool.query('SELECT id, serial_number, device_name FROM public.biometric_devices WHERE institution_id = ANY($1::text[]) OR "institutionId" = ANY($1::text[])', [instCandidates]).catch(() => ({ rows: [] })),
            pool.query('SELECT * FROM public.staff_attendance_logs WHERE institution_id = ANY($1::text[]) OR "institutionId" = ANY($1::text[]) OR institution_id IS NULL ORDER BY COALESCE(punch_time, created_at) ASC LIMIT 5000', [instCandidates]).catch(() => ({ rows: [] })),
        ]);
        enrollments = enrRes.rows || [];
        users = usrRes.rows || [];
        devices = devRes.rows || [];
        rawLogs = logRes.rows || [];
    }

    const pinToStaff = new Map<string, string>();
    const registerPin = (rawKey: any, staffId: string) => {
        const k = normalizeKey(rawKey);
        if (!k || !staffId) return;
        if (!pinToStaff.has(k)) pinToStaff.set(k, staffId);
        const stripped = stripLeadingZeros(k);
        if (stripped && !pinToStaff.has(stripped)) pinToStaff.set(stripped, staffId);
    };

    for (const enr of enrollments) {
        const isActive = enr.is_active !== false && enr.isActive !== false;
        if (!isActive) continue;
        const sid = enr.staff_id || enr.staffId;
        if (!sid) continue;
        registerPin(enr.device_pin ?? enr.devicePin, sid);
        registerPin(enr.card_number ?? enr.cardNumber, sid);
    }

    const validUserIds = new Set<string>();
    for (const u of users) {
        if (!u.id) continue;
        validUserIds.add(String(u.id));
        registerPin(u.id, String(u.id));
        if (u.staff_id) registerPin(u.staff_id, String(u.id));
        if (u.phone_number) {
            const digits = String(u.phone_number).replace(/\D/g, '');
            if (digits.length >= 9) {
                registerPin(digits, String(u.id));
                registerPin(digits.slice(-9), String(u.id));
                registerPin('0' + digits.slice(-9), String(u.id));
            }
        }
    }

    const deviceSns = new Set<string>();
    for (const d of devices) {
        if (d.serial_number) deviceSns.add(normalizeKey(d.serial_number));
        if (d.id) deviceSns.add(normalizeKey(d.id));
    }

    // 3. Match logs & backfill staff_id on staff_attendance_logs
    let totalLogsScanned = 0;
    let newlyLinkedLogs = 0;
    let matchedLogsCount = 0;
    let unmatchedLogsCount = 0;
    const unmatchedPinsSet = new Set<string>();

    // Group matched punches by `${staffId}|${YYYY-MM-DD}`
    const dailyGroups = new Map<string, { staffId: string; dateStr: string; times: Date[] }>();

    const toKenyaDateStr = (d: Date): { dateStr: string; eatHour: number; eatMin: number } => {
        const eatMs = d.getTime() + 3 * 60 * 60 * 1000;
        const eat = new Date(eatMs);
        const yyyy = eat.getUTCFullYear();
        const mm = String(eat.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(eat.getUTCDate()).padStart(2, '0');
        return { dateStr: `${yyyy}-${mm}-${dd}`, eatHour: eat.getUTCHours(), eatMin: eat.getUTCMinutes() };
    };

    for (const log of rawLogs) {
        const logInst = log.institution_id || log.institutionId || '';
        const logDev = normalizeKey(log.device_id || log.deviceId || '');
        // Only include logs belonging to this institution or one of its registered devices
        if (logInst && !instCandidates.includes(logInst)) continue;
        if (!logInst && deviceSns.size > 0 && logDev && !deviceSns.has(logDev)) continue;

        const rawPunch = log.punch_time || log.punchTime || log.created_at || log.createdAt;
        const punchDate = rawPunch ? new Date(rawPunch) : null;
        if (!punchDate || isNaN(punchDate.getTime())) continue;

        const { dateStr } = toKenyaDateStr(punchDate);
        if (startDate && dateStr < startDate) continue;
        if (endDate && dateStr > endDate) continue;

        totalLogsScanned++;

        let rawObj: any = {};
        try {
            rawObj = typeof log.raw_data === 'string' ? JSON.parse(log.raw_data) : (log.raw_data || log.rawData || {});
        } catch (_) {}

        const candidatePins = [
            log.device_pin,
            log.devicePin,
            rawObj.UserID,
            rawObj.userId,
            rawObj.UserCode,
            rawObj.PersonID,
            rawObj.EmployeeNo,
            rawObj.CardNo,
            rawObj.cardNo,
            rawObj.PIN,
            rawObj.pin,
        ]
            .map(v => String(v ?? '').trim())
            .filter(v => v && v.toLowerCase() !== 'unknown_user');

        let resolvedStaffId: string | null = null;
        for (const p of candidatePins) {
            const match = pinToStaff.get(normalizeKey(p)) || pinToStaff.get(stripLeadingZeros(normalizeKey(p)));
            if (match) {
                resolvedStaffId = match;
                break;
            }
        }
        if (!resolvedStaffId) {
            const existingSid = log.staff_id || log.staffId;
            if (existingSid && validUserIds.has(String(existingSid))) {
                resolvedStaffId = String(existingSid);
            }
        }

        if (!resolvedStaffId) {
            unmatchedLogsCount++;
            if (candidatePins[0]) unmatchedPinsSet.add(candidatePins[0]);
            continue;
        }

        matchedLogsCount++;
        const currentSid = log.staff_id || log.staffId || '';
        const needsUpdate = currentSid !== resolvedStaffId || !logInst || (!log.is_processed && !log.isProcessed);

        if (needsUpdate && log.id) {
            newlyLinkedLogs++;
            if (supabase) {
                await supabase
                    .from('staff_attendance_logs')
                    .update({
                        staff_id: resolvedStaffId,
                        institution_id: institutionId,
                        is_processed: true,
                    })
                    .eq('id', log.id)
                    .then(() => {}, () => {});
            } else if (pool) {
                await pool
                    .query(
                        `UPDATE public.staff_attendance_logs
                         SET staff_id = $1, "staffId" = $1,
                             institution_id = COALESCE(NULLIF(institution_id, ''), $2),
                             "institutionId" = COALESCE(NULLIF("institutionId", ''), $2),
                             is_processed = true, "isProcessed" = true,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $3`,
                        [resolvedStaffId, institutionId, log.id]
                    )
                    .catch(() => {});
            }
        }

        const key = `${resolvedStaffId}|${dateStr}`;
        let group = dailyGroups.get(key);
        if (!group) {
            group = { staffId: resolvedStaffId, dateStr, times: [] };
            dailyGroups.set(key, group);
        }
        group.times.push(punchDate);
    }

    // 4. Upsert aggregated daily attendance records into staff_attendance_daily
    let dailyRecordsSynced = 0;
    const datesSyncedSet = new Set<string>();

    for (const group of dailyGroups.values()) {
        group.times.sort((a, b) => a.getTime() - b.getTime());
        const firstIn = group.times[0];
        const lastOut = group.times.length > 1 ? group.times[group.times.length - 1] : firstIn;
        const diffHours = Math.max(0, (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60));
        const totalHours = Math.round(diffHours * 100) / 100;
        const overtimeHours = totalHours > 8 ? Math.round((totalHours - 8) * 100) / 100 : 0;
        const { eatHour, eatMin } = toKenyaDateStr(firstIn);
        const minutesSinceMidnight = eatHour * 60 + eatMin;
        const lateMinutes = minutesSinceMidnight > 8 * 60 ? minutesSinceMidnight - 8 * 60 : 0;
        const punchCount = group.times.length;

        const firstIso = firstIn.toISOString();
        const lastIso = group.times.length > 1 ? lastOut.toISOString() : null;

        if (supabase) {
            const { data: existingDaily } = await supabase
                .from('staff_attendance_daily')
                .select('id')
                .eq('institution_id', institutionId)
                .eq('staff_id', group.staffId)
                .eq('attendance_date', group.dateStr)
                .maybeSingle();

            if (existingDaily?.id) {
                await supabase
                    .from('staff_attendance_daily')
                    .update({
                        first_in: firstIso,
                        last_out: lastIso,
                        total_hours: totalHours,
                        overtime_hours: overtimeHours,
                        late_minutes: lateMinutes,
                        punch_count: punchCount,
                        status: 'present',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingDaily.id);
            } else {
                await supabase.from('staff_attendance_daily').insert({
                    institution_id: institutionId,
                    staff_id: group.staffId,
                    attendance_date: group.dateStr,
                    first_in: firstIso,
                    last_out: lastIso,
                    total_hours: totalHours,
                    overtime_hours: overtimeHours,
                    late_minutes: lateMinutes,
                    early_leave_minutes: 0,
                    punch_count: punchCount,
                    status: 'present',
                });
            }
            dailyRecordsSynced++;
            datesSyncedSet.add(group.dateStr);
        } else if (pool) {
            const existingRes = await pool
                .query(
                    `SELECT id FROM public.staff_attendance_daily
                     WHERE (institution_id = $1 OR "institutionId" = $1)
                       AND (staff_id = $2 OR "staffId" = $2)
                       AND (attendance_date = $3 OR "attendanceDate" = $3)
                     LIMIT 1`,
                    [institutionId, group.staffId, group.dateStr]
                )
                .catch(() => ({ rows: [] }));

            if (existingRes.rows?.[0]?.id) {
                await pool
                    .query(
                        `UPDATE public.staff_attendance_daily
                         SET first_in = $1, "firstIn" = $1,
                             last_out = $2, "lastOut" = $2,
                             total_hours = $3, "totalHours" = $3,
                             overtime_hours = $4, "overtimeHours" = $4,
                             late_minutes = $5, "lateMinutes" = $5,
                             punch_count = $6, "punchCount" = $6,
                             status = 'present',
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $7`,
                        [firstIso, lastIso, totalHours, overtimeHours, lateMinutes, punchCount, existingRes.rows[0].id]
                    )
                    .catch(() => {});
            } else {
                const newId = `sad_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                await pool
                    .query(
                        `INSERT INTO public.staff_attendance_daily
                         (id, institution_id, "institutionId", staff_id, "staffId", attendance_date, "attendanceDate", first_in, "firstIn", last_out, "lastOut", total_hours, "totalHours", overtime_hours, "overtimeHours", late_minutes, "lateMinutes", early_leave_minutes, "earlyLeaveMinutes", punch_count, "punchCount", status)
                         VALUES ($1, $2, $2, $3, $3, $4, $4, $5, $5, $6, $6, $7, $7, $8, $8, $9, $9, 0, 0, $10, $10, 'present')`,
                        [newId, institutionId, group.staffId, group.dateStr, firstIso, lastIso, totalHours, overtimeHours, lateMinutes, punchCount]
                    )
                    .catch(() => {});
            }
            dailyRecordsSynced++;
            datesSyncedSet.add(group.dateStr);
        }
    }

    return {
        success: true,
        status: 'ok',
        totalLogsScanned,
        newlyLinkedLogs,
        matchedLogsCount,
        unmatchedLogsCount,
        dailyRecordsSynced,
        datesSynced: Array.from(datesSyncedSet).sort(),
        unmatchedPins: Array.from(unmatchedPinsSet).slice(0, 30),
    };
}
