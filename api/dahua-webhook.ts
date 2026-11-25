import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
const _lastAutoSyncByKey = new Map<string, number>();

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

            CREATE TABLE IF NOT EXISTS public.hr_shifts (
                id TEXT PRIMARY KEY DEFAULT ('shift_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
                institution_id TEXT NOT NULL,
                name TEXT NOT NULL,
                start_time TEXT NOT NULL DEFAULT '08:00',
                end_time TEXT NOT NULL DEFAULT '17:00',
                is_overnight BOOLEAN DEFAULT FALSE,
                grace_minutes INTEGER DEFAULT 15,
                early_leave_grace_minutes INTEGER DEFAULT 10,
                standard_hours NUMERIC DEFAULT 8,
                assigned_roles TEXT DEFAULT '[]',
                overtime_multiplier NUMERIC DEFAULT 1.5,
                night_allowance NUMERIC DEFAULT 0,
                is_default BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_hr_shifts_inst ON public.hr_shifts(institution_id);

            CREATE TABLE IF NOT EXISTS public.hr_staff_shifts (
                id TEXT PRIMARY KEY DEFAULT ('sshift_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
                institution_id TEXT NOT NULL,
                staff_id TEXT NOT NULL,
                shift_id TEXT NOT NULL,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_hr_staff_shifts_inst ON public.hr_staff_shifts(institution_id);
            CREATE INDEX IF NOT EXISTS idx_hr_staff_shifts_staff ON public.hr_staff_shifts(staff_id);

            CREATE TABLE IF NOT EXISTS public.hr_attendance_notification_config (
                institution_id TEXT PRIMARY KEY,
                config JSONB DEFAULT '{}'::jsonb,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS public.hr_attendance_sms_log (
                dedup_key TEXT PRIMARY KEY,
                institution_id TEXT,
                alert_type TEXT,
                recipient TEXT,
                message TEXT,
                channel TEXT DEFAULT 'sms',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
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

        if (action === 'cron_daily_digest' || action === 'cron_missed_clockout') {
            if (!verifyCronSecret(req)) {
                return res.status(401).json({ success: false, error: 'Unauthorized cron trigger' });
            }
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            if (!supabase && !pool) {
                return res.status(500).json({ success: false, error: 'Database not configured' });
            }
            try {
                const instIds = await listCronEnabledInstitutions(
                    supabase,
                    pool,
                    action === 'cron_daily_digest' ? 'daily_digest' : 'missed_clockout'
                );
                const targetDate = String(req.query.date || '').trim() || undefined;
                const results: any[] = [];
                for (const instId of instIds) {
                    try {
                        const r = action === 'cron_daily_digest'
                            ? await runDailyDigestAndAbsenceAlerts(supabase, pool, instId, targetDate)
                            : await runMissedClockOutReminders(supabase, pool, instId, targetDate, true);
                        results.push({ institutionId: instId, ok: true, ...r });
                    } catch (instErr: any) {
                        results.push({ institutionId: instId, ok: false, error: instErr?.message || String(instErr) });
                    }
                }
                return res.status(200).json({
                    success: true,
                    action,
                    institutionsProcessed: instIds.length,
                    results,
                });
            } catch (err: any) {
                console.error(`[Dahua Cron] ${action} error:`, err);
                return res.status(500).json({ success: false, error: err?.message || `Failed to run ${action}` });
            }
        }

        if (action === 'get_notification_config') {
            if (!institutionId) {
                return res.status(400).json({ success: false, error: 'institutionId is required' });
            }
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            const authOk = await verifyHrAdminOrCronAuth(req, supabase, pool);
            if (!authOk) {
                return res.status(401).json({ success: false, error: 'Unauthorized: valid staff session required' });
            }
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            try {
                const config = await loadAttendanceNotificationConfig(supabase, pool, institutionId);
                return res.status(200).json({ success: true, config });
            } catch (err: any) {
                return res.status(500).json({ success: false, error: err?.message || 'Failed to load notification config' });
            }
        }

        if (action === 'get_shifts' || action === 'shifts') {
            if (!institutionId) {
                return res.status(400).json({ success: false, error: 'institutionId is required' });
            }
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            if (!supabase && !pool) {
                return res.status(500).json({ success: false, error: 'DB not configured' });
            }
            try {
                const result = await loadInstitutionShifts(supabase, pool, institutionId, true);
                return res.status(200).json({ success: true, ...result });
            } catch (err: any) {
                console.error('[Dahua Webhook] get_shifts error:', err);
                return res.status(500).json({ success: false, error: err?.message || 'Failed to load shifts' });
            }
        }

        if (action === 'daily_records' || action === 'get_daily_attendance') {
            if (!institutionId) {
                return res.status(400).json({ success: false, error: 'institutionId is required' });
            }
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            if (!supabase && !pool) {
                return res.status(500).json({ success: false, error: 'DB not configured' });
            }
            try {
                const startDate = (req.query.startDate || req.query.start_date || '').toString().trim();
                const endDate = (req.query.endDate || req.query.end_date || '').toString().trim();
                const skipSync = String(req.query.skipSync || '').toLowerCase() === 'true';

                // Automatically sync any unprocessed raw biometric punches for the requested range
                // so Today's Roll Call and attendance reports show live logs without clicking "Sync Previous Logs"
                if (!skipSync) {
                    const syncKey = `${institutionId}|${startDate}|${endDate}`;
                    const lastSync = _lastAutoSyncByKey.get(syncKey) || 0;
                    if (Date.now() - lastSync > 10000) {
                        _lastAutoSyncByKey.set(syncKey, Date.now());
                        await reprocessHistoricalDahuaLogs({
                            supabase,
                            pool,
                            institutionId,
                            startDate: startDate || undefined,
                            endDate: endDate || undefined,
                        }).catch((syncErr: any) => {
                            console.warn('[Dahua Webhook] Auto-sync before daily_records warning:', syncErr?.message || syncErr);
                        });
                    }
                }

                const result = await fetchDahuaDailyAttendance(supabase, pool, institutionId, { startDate, endDate });
                return res.status(200).json(result);
            } catch (err: any) {
                console.error('[Dahua Webhook] daily_records error:', err);
                return res.status(500).json({ success: false, error: err?.message || 'Failed to load daily attendance' });
            }
        }

        if (action === 'device_users' || action === 'unmatched_users') {
            if (!institutionId) {
                return res.status(400).json({ success: false, error: 'institutionId is required' });
            }
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            if (!supabase && !pool) {
                return res.status(500).json({ success: false, error: 'DB not configured' });
            }
            try {
                const result = await listDahuaDeviceUsers(supabase, pool, institutionId);
                return res.status(200).json(result);
            } catch (err: any) {
                console.error('[Dahua Webhook] device_users error:', err);
                return res.status(500).json({ success: false, error: err?.message || 'Failed to load device users' });
            }
        }

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
        if (
            postAction === 'save_notification_config' ||
            postAction === 'send_daily_digest' ||
            postAction === 'send_missed_clockout_reminders' ||
            postAction === 'send_pre_payroll_summaries' ||
            postAction === 'send_payslip_notifications'
        ) {
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            const authOk = await verifyHrAdminOrCronAuth(req, supabase, pool);
            if (!authOk) {
                return res.status(401).json({ success: false, error: 'Unauthorized: valid HR/admin session required' });
            }
            if (pool) await ensureDahuaTables(pool).catch(() => {});
            if (!supabase && !pool) {
                return res.status(500).json({ success: false, error: 'Database not configured' });
            }
            const bodyObj = (req.body && typeof req.body === 'object') ? (req.body as any) : {};
            const instId = (req.query.institutionId || req.query.institution_id || bodyObj.institutionId || bodyObj.institution_id || '').toString().trim();
            if (!instId) {
                return res.status(400).json({ success: false, error: 'institutionId is required' });
            }
            try {
                if (postAction === 'save_notification_config') {
                    const saved = await saveAttendanceNotificationConfig(supabase, pool, instId, bodyObj.config || bodyObj);
                    return res.status(200).json({ success: true, config: saved });
                }
                if (postAction === 'send_daily_digest') {
                    const targetDate = String(bodyObj.date || req.query.date || '').trim() || undefined;
                    const result = await runDailyDigestAndAbsenceAlerts(supabase, pool, instId, targetDate);
                    return res.status(200).json({ success: true, ...result });
                }
                if (postAction === 'send_missed_clockout_reminders') {
                    const targetDate = String(bodyObj.date || req.query.date || '').trim() || undefined;
                    const result = await runMissedClockOutReminders(supabase, pool, instId, targetDate);
                    return res.status(200).json({ success: true, ...result });
                }
                if (postAction === 'send_pre_payroll_summaries') {
                    const monthStr = String(bodyObj.month || '').trim();
                    const result = await runPrePayrollAttendanceSummaries(supabase, pool, instId, monthStr);
                    return res.status(200).json({ success: true, ...result });
                }
                if (postAction === 'send_payslip_notifications') {
                    const monthStr = String(bodyObj.month || '').trim();
                    const items = Array.isArray(bodyObj.items) ? bodyObj.items : [];
                    const result = await runPayslipReadyNotifications(supabase, pool, instId, monthStr, items);
                    return res.status(200).json({ success: true, ...result });
                }
            } catch (err: any) {
                console.error(`[Dahua Webhook] ${postAction} error:`, err);
                return res.status(500).json({ success: false, error: err?.message || `Failed to run ${postAction}` });
            }
        }

        if (postAction === 'save_shift' || postAction === 'delete_shift' || postAction === 'assign_staff_shift') {
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
            try {
                if (postAction === 'save_shift') {
                    const saved = await saveShiftTemplate(supabase, pool, instId, bodyObj.shift || bodyObj);
                    const state = await loadInstitutionShifts(supabase, pool, instId, false);
                    return res.status(200).json({ success: true, shift: saved, ...state });
                }
                if (postAction === 'delete_shift') {
                    const shiftId = String(bodyObj.shiftId || bodyObj.id || req.query.shiftId || '').trim();
                    if (!shiftId) return res.status(400).json({ success: false, error: 'shiftId is required' });
                    await deleteShiftTemplate(supabase, pool, instId, shiftId);
                    const state = await loadInstitutionShifts(supabase, pool, instId, false);
                    return res.status(200).json({ success: true, ...state });
                }
                if (postAction === 'assign_staff_shift') {
                    const staffId = String(bodyObj.staffId || bodyObj.staff_id || '').trim();
                    const shiftId = String(bodyObj.shiftId || bodyObj.shift_id || '').trim();
                    if (!staffId) return res.status(400).json({ success: false, error: 'staffId is required' });
                    await assignStaffShift(supabase, pool, instId, staffId, shiftId);
                    const state = await loadInstitutionShifts(supabase, pool, instId, false);
                    return res.status(200).json({ success: true, ...state });
                }
            } catch (err: any) {
                console.error(`[Dahua Webhook] ${postAction} error:`, err);
                return res.status(500).json({ success: false, error: err?.message || `Failed to ${postAction}` });
            }
        }

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

                // Real-time Attendance SMS / WhatsApp Alerts (Clock-In/Out confirmation & Shift-Aware Late Arrival)
                if (matchedUserId && matchedInstitutionId) {
                    await handleRealTimePunchNotification(supabase, pool, matchedInstitutionId, matchedUserId, punchTime).catch((e: any) => {
                        console.warn('[Dahua Webhook] Real-time punch notification warn:', e?.message || e);
                    });
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
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS institution_id TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS staff_id TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS attendance_date TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS first_in TIMESTAMPTZ;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS last_out TIMESTAMPTZ;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS overtime_hours NUMERIC DEFAULT 0;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS late_minutes INTEGER DEFAULT 0;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS early_leave_minutes INTEGER DEFAULT 0;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS punch_count INTEGER DEFAULT 1;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'present';
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS shift_id TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "shiftId" TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS shift_name TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "shiftName" TEXT;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS is_night_shift BOOLEAN DEFAULT FALSE;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "isNightShift" BOOLEAN DEFAULT FALSE;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
        `).catch((e: any) => console.warn('[Dahua Reprocess] ensure staff_attendance_daily failed:', e?.message || e));
    }

    // 2. Load shifts, enrollments, users, and devices for this institution
    const { shifts: instShifts, staffAssignments } = await loadInstitutionShifts(supabase, pool, institutionId, false).catch(() => ({
        shifts: getDefaultShiftTemplates(institutionId),
        staffAssignments: {} as Record<string, string>,
    }));
    let enrollments: any[] = [];
    let users: any[] = [];
    let devices: any[] = [];
    let rawLogs: any[] = [];

    if (supabase) {
        const instFilter = instCandidates.map(id => `institution_id.eq.${id}`).join(',');
        const [enrRes, usrRes, devRes, logRes] = await Promise.all([
            supabase.from('biometric_enrollments').select('*').or(instFilter),
            supabase.from('users').select('id, staff_id, phone_number, name, role, metadata').or(instFilter),
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
            pool.query('SELECT id, staff_id, phone_number, name, role, metadata FROM public.users WHERE institution_id = ANY($1::text[])', [instCandidates]).catch(async () =>
                pool.query('SELECT id, staff_id, phone_number, name, role FROM public.users WHERE institution_id = ANY($1::text[])', [instCandidates]).catch(() => ({ rows: [] }))
            ),
            pool.query('SELECT id, serial_number, device_name FROM public.biometric_devices WHERE institution_id = ANY($1::text[]) OR "institutionId" = ANY($1::text[])', [instCandidates]).catch(() => ({ rows: [] })),
            pool.query('SELECT * FROM public.staff_attendance_logs WHERE institution_id = ANY($1::text[]) OR "institutionId" = ANY($1::text[]) OR institution_id IS NULL ORDER BY COALESCE(punch_time, created_at) ASC LIMIT 5000', [instCandidates]).catch(() => ({ rows: [] })),
        ]);
        enrollments = enrRes.rows || [];
        users = usrRes.rows || [];
        devices = devRes.rows || [];
        rawLogs = logRes.rows || [];
    }

    const userRoleMap = new Map<string, string>();
    for (const u of users) {
        if (!u.id) continue;
        let meta: any = u.metadata || {};
        if (typeof meta === 'string') { try { meta = JSON.parse(meta); } catch { meta = {}; } }
        const combinedRole = [u.role, meta?.designation, meta?.jobTitle, meta?.department, meta?.shiftCategory].filter(Boolean).join(' ').toLowerCase();
        userRoleMap.set(String(u.id), combinedRole);
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

    // Name-based fallback map (token-set, order/case insensitive) for staff whose device PIN isn't enrolled
    const nameKey = (v: any): string =>
        String(v ?? '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
    const nameToStaff = new Map<string, string>();
    const ambiguousNames = new Set<string>();
    for (const u of users) {
        const k = nameKey(u.name);
        if (!k || !u.id) continue;
        if (nameToStaff.has(k) && nameToStaff.get(k) !== String(u.id)) ambiguousNames.add(k);
        else nameToStaff.set(k, String(u.id));
    }
    ambiguousNames.forEach(k => nameToStaff.delete(k));

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
    const linkWarnings: string[] = [];

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
            rawObj.UserID,
            rawObj.userId,
            log.device_pin,
            log.devicePin,
            rawObj.UserCode,
            rawObj.PersonID,
            rawObj.EmployeeNo,
            rawObj.CardNo,
            rawObj.cardNo,
            rawObj.PIN,
            rawObj.pin,
        ]
            .map(v => String(v ?? '').trim())
            .filter(v => v && v.toLowerCase() !== 'unknown_user' && v.toLowerCase() !== logDev);

        // Door relay / stranger events carry no person: skip them silently (not a staff punch)
        if (candidatePins.length === 0 && !(log.staff_id || log.staffId)) {
            continue;
        }

        let resolvedStaffId: string | null = null;
        for (const p of candidatePins) {
            const match = pinToStaff.get(normalizeKey(p)) || pinToStaff.get(stripLeadingZeros(normalizeKey(p)));
            if (match) {
                resolvedStaffId = match;
                break;
            }
        }
        // Fallback: match the person name stored on the device (CardName) to a staff name
        if (!resolvedStaffId) {
            const cardName = rawObj.CardName || rawObj.Name || '';
            const key = nameKey(cardName);
            if (key && nameToStaff.has(key)) resolvedStaffId = nameToStaff.get(key) as string;
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
                const { error: linkErr } = await supabase
                    .from('staff_attendance_logs')
                    .update({
                        staff_id: resolvedStaffId,
                        institution_id: institutionId,
                        is_processed: true,
                    })
                    .eq('id', log.id);
                if (linkErr) {
                    // Retry with camelCase columns in case the table only has those
                    const { error: linkErr2 } = await supabase
                        .from('staff_attendance_logs')
                        .update({ staffId: resolvedStaffId, institutionId: institutionId, isProcessed: true })
                        .eq('id', log.id);
                    if (linkErr2 && linkWarnings.length < 3) linkWarnings.push(`link log: ${linkErr.message}`);
                }
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

        const assignedShift = resolveShiftForStaff(resolvedStaffId, userRoleMap.get(resolvedStaffId) || '', instShifts, staffAssignments);
        const punchEat = toKenyaDateStr(punchDate);
        const punchMin = punchEat.eatHour * 60 + punchEat.eatMin;
        let effectiveDateStr = dateStr;
        // For overnight shifts (e.g. Security 18:00 -> 06:00), morning clock-outs between 00:00 and endTime+4h
        // belong to the previous evening's shift date instead of creating a broken second day.
        if (assignedShift.isOvernight) {
            const endMin = parseHHMM(assignedShift.endTime, 6 * 60);
            if (punchMin <= endMin + 240) {
                const prevDay = new Date(`${dateStr}T00:00:00Z`);
                prevDay.setUTCDate(prevDay.getUTCDate() - 1);
                effectiveDateStr = prevDay.toISOString().slice(0, 10);
            }
        }

        const key = `${resolvedStaffId}|${effectiveDateStr}`;
        let group = dailyGroups.get(key);
        if (!group) {
            group = { staffId: resolvedStaffId, dateStr: effectiveDateStr, times: [] };
            dailyGroups.set(key, group);
        }
        group.times.push(punchDate);
    }

    // 4. Upsert aggregated daily attendance records into staff_attendance_daily
    let dailyRecordsSynced = 0;
    const datesSyncedSet = new Set<string>();
    const syncErrors: string[] = [...linkWarnings];

    for (const group of dailyGroups.values()) {
        group.times.sort((a, b) => a.getTime() - b.getTime());
        const firstIn = group.times[0];
        const lastOut = group.times.length > 1 ? group.times[group.times.length - 1] : firstIn;
        const shift = resolveShiftForStaff(group.staffId, userRoleMap.get(group.staffId) || '', instShifts, staffAssignments);
        const diffHours = Math.max(0, (lastOut.getTime() - firstIn.getTime()) / (1000 * 60 * 60));
        const totalHours = Math.round(diffHours * 100) / 100;
        const stdHours = Number(shift.standardHours) > 0 ? Number(shift.standardHours) : 8;
        const overtimeHours = totalHours > stdHours ? Math.round((totalHours - stdHours) * 100) / 100 : 0;

        // Compute late_minutes & early_leave_minutes relative to the staff member's shift in EAT (UTC+3)
        const startMin = parseHHMM(shift.startTime, 8 * 60);
        const endMin = parseHHMM(shift.endTime, 17 * 60);
        const graceMin = Math.max(0, Number(shift.graceMinutes) || 0);
        const earlyGraceMin = Math.max(0, Number(shift.earlyLeaveGraceMinutes) || 0);

        const baseUtcMidnightMs = new Date(`${group.dateStr}T00:00:00Z`).getTime() - 3 * 60 * 60 * 1000;
        const expectedStartMs = baseUtcMidnightMs + startMin * 60 * 1000;
        const expectedEndMs = baseUtcMidnightMs + ((shift.isOvernight ? 24 * 60 : 0) + endMin) * 60 * 1000;

        const rawLate = Math.round((firstIn.getTime() - expectedStartMs) / 60000);
        const lateMinutes = rawLate > graceMin ? rawLate : 0;

        let earlyLeaveMinutes = 0;
        if (group.times.length > 1) {
            const rawEarly = Math.round((expectedEndMs - lastOut.getTime()) / 60000);
            earlyLeaveMinutes = rawEarly > earlyGraceMin ? rawEarly : 0;
        }

        const punchCount = group.times.length;
        const computedStatus = lateMinutes > 0 ? 'late' : 'present';

        const firstIso = firstIn.toISOString();
        const lastIso = group.times.length > 1 ? lastOut.toISOString() : null;

        if (supabase) {
            try {
                const { data: existingDaily } = await supabase
                    .from('staff_attendance_daily')
                    .select('id')
                    .eq('institution_id', institutionId)
                    .eq('staff_id', group.staffId)
                    .eq('attendance_date', group.dateStr)
                    .maybeSingle();

                let writeErr: any = null;
                if (existingDaily?.id) {
                    const { error } = await supabase
                        .from('staff_attendance_daily')
                        .update({
                            first_in: firstIso,
                            last_out: lastIso,
                            total_hours: totalHours,
                            overtime_hours: overtimeHours,
                            late_minutes: lateMinutes,
                            early_leave_minutes: earlyLeaveMinutes,
                            punch_count: punchCount,
                            status: computedStatus,
                            shift_id: shift.id,
                            shift_name: shift.name,
                            is_night_shift: shift.isOvernight,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', existingDaily.id);
                    writeErr = error;
                } else {
                    const { error } = await supabase.from('staff_attendance_daily').insert({
                        id: randomUUID(),
                        institution_id: institutionId,
                        staff_id: group.staffId,
                        attendance_date: group.dateStr,
                        first_in: firstIso,
                        last_out: lastIso,
                        total_hours: totalHours,
                        overtime_hours: overtimeHours,
                        late_minutes: lateMinutes,
                        early_leave_minutes: earlyLeaveMinutes,
                        punch_count: punchCount,
                        status: computedStatus,
                        shift_id: shift.id,
                        shift_name: shift.name,
                        is_night_shift: shift.isOvernight,
                    });
                    writeErr = error;
                }
                if (writeErr) {
                    console.warn('[Dahua Reprocess] Supabase daily upsert error:', writeErr.message || writeErr);
                    if (syncErrors.length < 5) syncErrors.push(String(writeErr.message || writeErr));
                } else {
                    dailyRecordsSynced++;
                    datesSyncedSet.add(group.dateStr);
                }
            } catch (sbErr: any) {
                if (syncErrors.length < 5) syncErrors.push(String(sbErr?.message || sbErr));
            }
        } else if (pool) {
            try {
                const existingRes = await pool.query(
                    `SELECT id FROM public.staff_attendance_daily
                     WHERE institution_id::text = $1
                       AND staff_id::text = $2
                       AND attendance_date::text LIKE $3 || '%'
                     LIMIT 1`,
                    [institutionId, group.staffId, group.dateStr]
                );

                if (existingRes.rows?.[0]?.id) {
                    await pool.query(
                        `UPDATE public.staff_attendance_daily
                         SET first_in = $1,
                             last_out = $2,
                             total_hours = $3,
                             overtime_hours = $4,
                             late_minutes = $5,
                             early_leave_minutes = $6,
                             punch_count = $7,
                             status = $8,
                             shift_id = $9,
                             "shiftId" = $9,
                             shift_name = $10,
                             "shiftName" = $10,
                             is_night_shift = $11,
                             "isNightShift" = $11,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $12`,
                        [firstIso, lastIso, totalHours, overtimeHours, lateMinutes, earlyLeaveMinutes, punchCount, computedStatus, shift.id, shift.name, shift.isOvernight, existingRes.rows[0].id]
                    );
                } else {
                    const newId = randomUUID();
                    await pool.query(
                        `INSERT INTO public.staff_attendance_daily
                         (id, institution_id, staff_id, attendance_date, first_in, last_out, total_hours, overtime_hours, late_minutes, early_leave_minutes, punch_count, status, shift_id, "shiftId", shift_name, "shiftName", is_night_shift, "isNightShift")
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $14, $14, $15, $15)`,
                        [newId, institutionId, group.staffId, group.dateStr, firstIso, lastIso, totalHours, overtimeHours, lateMinutes, earlyLeaveMinutes, punchCount, computedStatus, shift.id, shift.name, shift.isOvernight]
                    );
                }
                dailyRecordsSynced++;
                datesSyncedSet.add(group.dateStr);
            } catch (pgErr: any) {
                console.warn('[Dahua Reprocess] PG daily upsert error:', pgErr?.message || pgErr);
                if (syncErrors.length < 5) syncErrors.push(String(pgErr?.message || pgErr));
            }
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
        ...(syncErrors.length > 0 ? { syncErrors } : {}),
    };
}

/**
 * Scans raw staff_attendance_logs for an institution using the exact same
 * queries and matching rules as reprocessDahuaAttendanceLogs, and returns every
 * distinct person (PIN + CardName) seen on the terminal along with match status.
 */
async function listDahuaDeviceUsers(supabase: any, pool: any, institutionId: string) {
    const cleanInst = institutionId.replace(/^inst_/, '');
    const instCandidates = Array.from(new Set([institutionId, cleanInst, `inst_${cleanInst}`].filter(Boolean)));
    const normalizeKey = (v: any): string => String(v ?? '').trim().toLowerCase();
    const stripLeadingZeros = (v: string): string => v.replace(/^0+/, '') || v;

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
            supabase.from('staff_attendance_logs').select('*').or(`${instFilter},institution_id.is.null`).order('punch_time', { ascending: false }).limit(5000),
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
            pool.query('SELECT * FROM public.staff_attendance_logs WHERE institution_id = ANY($1::text[]) OR "institutionId" = ANY($1::text[]) OR institution_id IS NULL ORDER BY COALESCE(punch_time, created_at) DESC LIMIT 5000', [instCandidates]).catch(() => ({ rows: [] })),
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
    const nameKey = (v: any): string =>
        String(v ?? '').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
    const nameToStaff = new Map<string, string>();
    const ambiguousNames = new Set<string>();

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
        const nk = nameKey(u.name);
        if (nk) {
            if (nameToStaff.has(nk) && nameToStaff.get(nk) !== String(u.id)) ambiguousNames.add(nk);
            else nameToStaff.set(nk, String(u.id));
        }
    }
    ambiguousNames.forEach(k => nameToStaff.delete(k));

    const deviceSns = new Set<string>();
    for (const d of devices) {
        if (d.serial_number) deviceSns.add(normalizeKey(d.serial_number));
        if (d.id) deviceSns.add(normalizeKey(d.id));
    }

    const byPin = new Map<string, {
        pin: string;
        name: string;
        punches: number;
        lastSeen: string;
        deviceId: string;
        matchedStaffId: string | null;
        matchedBy: 'enrollment' | 'name' | 'log' | 'none';
    }>();

    let totalLogsScanned = 0;

    for (const log of rawLogs) {
        const logInst = log.institution_id || log.institutionId || '';
        const logDevRaw = String(log.device_id || log.deviceId || '').trim();
        const logDev = normalizeKey(logDevRaw);
        if (logInst && !instCandidates.includes(logInst)) continue;
        if (!logInst && deviceSns.size > 0 && logDev && !deviceSns.has(logDev)) continue;

        totalLogsScanned++;

        let rawObj: any = {};
        try {
            rawObj = typeof (log.raw_data ?? log.rawData) === 'string'
                ? JSON.parse(log.raw_data ?? log.rawData)
                : (log.raw_data ?? log.rawData ?? {});
        } catch (_) {}

        const candidatePins = [
            rawObj.UserID,
            rawObj.userId,
            log.device_pin,
            log.devicePin,
            rawObj.UserCode,
            rawObj.PersonID,
            rawObj.EmployeeNo,
            rawObj.CardNo,
            rawObj.cardNo,
            rawObj.PIN,
            rawObj.pin,
        ]
            .map(v => String(v ?? '').trim())
            .filter(v => v && v.toLowerCase() !== 'unknown_user' && v.toLowerCase() !== logDev);

        if (candidatePins.length === 0) continue;

        const pin = candidatePins[0];
        const cardName = String(rawObj.CardName || '').trim();
        const when = String(log.punch_time || log.punchTime || log.created_at || log.createdAt || '');

        let matchedStaffId: string | null = null;
        let matchedBy: 'enrollment' | 'name' | 'log' | 'none' = 'none';

        for (const p of candidatePins) {
            const m = pinToStaff.get(normalizeKey(p)) || pinToStaff.get(stripLeadingZeros(normalizeKey(p)));
            if (m) {
                matchedStaffId = m;
                matchedBy = 'enrollment';
                break;
            }
        }
        if (!matchedStaffId && cardName) {
            const nk = nameKey(cardName);
            if (nk && nameToStaff.has(nk)) {
                matchedStaffId = nameToStaff.get(nk) || null;
                matchedBy = 'name';
            }
        }
        if (!matchedStaffId) {
            const existingSid = log.staff_id || log.staffId;
            if (existingSid && validUserIds.has(String(existingSid))) {
                matchedStaffId = String(existingSid);
                matchedBy = 'log';
            }
        }

        const key = normalizeKey(pin);
        const existing = byPin.get(key);
        if (existing) {
            existing.punches++;
            if (when && (!existing.lastSeen || when > existing.lastSeen)) existing.lastSeen = when;
            if (!existing.name && cardName) existing.name = cardName;
            if (!existing.matchedStaffId && matchedStaffId) {
                existing.matchedStaffId = matchedStaffId;
                existing.matchedBy = matchedBy;
            }
        } else {
            byPin.set(key, {
                pin,
                name: cardName,
                punches: 1,
                lastSeen: when,
                deviceId: logDevRaw,
                matchedStaffId,
                matchedBy,
            });
        }
    }

    const deviceUsers = Array.from(byPin.values()).sort((a, b) => {
        // Unmatched first, then most recently seen
        if ((a.matchedStaffId ? 1 : 0) !== (b.matchedStaffId ? 1 : 0)) {
            return (a.matchedStaffId ? 1 : 0) - (b.matchedStaffId ? 1 : 0);
        }
        return b.lastSeen.localeCompare(a.lastSeen);
    });

    return {
        success: true,
        totalLogsScanned,
        deviceUsers,
    };
}

/**
 * Fetches aggregated daily attendance records from staff_attendance_daily
 * using the exact same DB connection and institution matching as reprocess,
 * filtered by optional startDate/endDate (YYYY-MM-DD) and enriched with
 * staff name & role from public.users (covering both teachers and other staff).
 */
async function fetchDahuaDailyAttendance(
    supabase: any,
    pool: any,
    institutionId: string,
    opts?: { startDate?: string; endDate?: string }
) {
    const cleanInst = institutionId.replace(/^inst_/, '');
    const instCandidates = Array.from(new Set([institutionId, cleanInst, `inst_${cleanInst}`].filter(Boolean)));
    const startDate = (opts?.startDate || '').trim();
    const endDate = (opts?.endDate || '').trim();

    let rows: any[] = [];
    let users: any[] = [];

    if (supabase) {
        const instFilter = instCandidates.map(id => `institution_id.eq.${id}`).join(',');
        const [dailyRes, usrRes] = await Promise.all([
            supabase.from('staff_attendance_daily').select('*').or(instFilter).order('attendance_date', { ascending: false }).limit(5000),
            supabase.from('users').select('id, name, role, staff_id').or(instFilter),
        ]);
        rows = dailyRes.data || [];
        users = usrRes.data || [];
    } else if (pool) {
        const [dailyRes, usrRes] = await Promise.all([
            pool.query(
                `SELECT * FROM public.staff_attendance_daily
                 WHERE institution_id = ANY($1::text[]) OR "institutionId" = ANY($1::text[])
                 ORDER BY COALESCE(attendance_date::text, "attendanceDate"::text) DESC
                 LIMIT 5000`,
                [instCandidates]
            ).catch(async () =>
                pool.query(
                    `SELECT * FROM public.staff_attendance_daily
                     WHERE institution_id = ANY($1::text[])
                     ORDER BY attendance_date DESC
                     LIMIT 5000`,
                    [instCandidates]
                ).catch(() => ({ rows: [] }))
            ),
            pool.query(
                `SELECT id, name, role, staff_id FROM public.users WHERE institution_id = ANY($1::text[])`,
                [instCandidates]
            ).catch(() => ({ rows: [] })),
        ]);
        rows = dailyRes.rows || [];
        users = usrRes.rows || [];
    }

    const userMap = new Map<string, { name: string; role: string }>();
    for (const u of users) {
        if (u.id) userMap.set(String(u.id), { name: u.name || '', role: u.role || '' });
    }

    const normDate = (v: any): string => {
        if (!v) return '';
        if (v instanceof Date) {
            const eat = new Date(v.getTime() + 3 * 60 * 60 * 1000);
            return eat.toISOString().slice(0, 10);
        }
        const s = String(v).trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            const eat = new Date(d.getTime() + 3 * 60 * 60 * 1000);
            return eat.toISOString().slice(0, 10);
        }
        return s.slice(0, 10);
    };

    const normalized = rows
        .map(r => {
            const staffId = String(r.staff_id || r.staffId || '');
            const attendanceDate = normDate(r.attendance_date || r.attendanceDate);
            const u = userMap.get(staffId);
            return {
                id: r.id,
                institutionId: r.institution_id || r.institutionId || institutionId,
                staffId,
                staffName: u?.name || r.staff_name || r.staffName || '',
                staffRole: u?.role || r.staff_role || r.staffRole || '',
                attendanceDate,
                firstIn: r.first_in || r.firstIn || null,
                lastOut: r.last_out || r.lastOut || null,
                totalHours: Number(r.total_hours ?? r.totalHours ?? 0) || 0,
                overtimeHours: Number(r.overtime_hours ?? r.overtimeHours ?? 0) || 0,
                lateMinutes: Number(r.late_minutes ?? r.lateMinutes ?? 0) || 0,
                earlyLeaveMinutes: Number(r.early_leave_minutes ?? r.earlyLeaveMinutes ?? 0) || 0,
                punchCount: Number(r.punch_count ?? r.punchCount ?? 1) || 1,
                status: r.status || 'present',
                shiftId: r.shift_id || r.shiftId || null,
                shiftName: r.shift_name || r.shiftName || null,
                isNightShift: Boolean(r.is_night_shift ?? r.isNightShift ?? false),
            };
        })
        .filter(r => {
            if (!r.attendanceDate) return false;
            if (startDate && r.attendanceDate < startDate) return false;
            if (endDate && r.attendanceDate > endDate) return false;
            return true;
        });

    return {
        success: true,
        count: normalized.length,
        records: normalized,
    };
}

export interface HrShiftConfig {
    id: string;
    institutionId: string;
    name: string;
    startTime: string;
    endTime: string;
    isOvernight: boolean;
    graceMinutes: number;
    earlyLeaveGraceMinutes: number;
    standardHours: number;
    assignedRoles: string[];
    overtimeMultiplier: number;
    nightAllowance: number;
    isDefault: boolean;
    isActive: boolean;
}

function parseHHMM(hhmm: string, fallbackMinutes: number): number {
    const m = String(hhmm || '').trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return fallbackMinutes;
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    return h * 60 + min;
}

function getDefaultShiftTemplates(institutionId: string): HrShiftConfig[] {
    return [
        {
            id: `shift_morning_${institutionId}`,
            institutionId,
            name: 'Morning / Regular Shift',
            startTime: '08:00',
            endTime: '17:00',
            isOvernight: false,
            graceMinutes: 15,
            earlyLeaveGraceMinutes: 10,
            standardHours: 8,
            assignedRoles: [],
            overtimeMultiplier: 1.5,
            nightAllowance: 0,
            isDefault: true,
            isActive: true,
        },
        {
            id: `shift_night_${institutionId}`,
            institutionId,
            name: 'Night Shift (Security)',
            startTime: '18:00',
            endTime: '06:00',
            isOvernight: true,
            graceMinutes: 15,
            earlyLeaveGraceMinutes: 10,
            standardHours: 12,
            assignedRoles: ['security', 'watchman', 'guard', 'night'],
            overtimeMultiplier: 1.5,
            nightAllowance: 300,
            isDefault: false,
            isActive: true,
        },
    ];
}

function normalizeShiftRow(r: any, institutionId: string): HrShiftConfig {
    let roles: string[] = [];
    if (Array.isArray(r.assigned_roles)) {
        roles = r.assigned_roles.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean);
    } else if (Array.isArray(r.assignedRoles)) {
        roles = r.assignedRoles.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean);
    } else if (typeof r.assigned_roles === 'string' && r.assigned_roles.trim()) {
        try {
            const parsed = JSON.parse(r.assigned_roles);
            if (Array.isArray(parsed)) roles = parsed.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean);
        } catch {
            roles = r.assigned_roles.split(',').map((x: string) => x.trim().toLowerCase()).filter(Boolean);
        }
    }
    const startTime = String(r.start_time || r.startTime || '08:00').trim();
    const endTime = String(r.end_time || r.endTime || '17:00').trim();
    const isOvernight = r.is_overnight !== undefined
        ? Boolean(r.is_overnight)
        : (r.isOvernight !== undefined ? Boolean(r.isOvernight) : parseHHMM(endTime, 1020) <= parseHHMM(startTime, 480));
    return {
        id: String(r.id),
        institutionId: String(r.institution_id || r.institutionId || institutionId),
        name: String(r.name || 'Shift'),
        startTime,
        endTime,
        isOvernight,
        graceMinutes: Number(r.grace_minutes ?? r.graceMinutes ?? 15) || 0,
        earlyLeaveGraceMinutes: Number(r.early_leave_grace_minutes ?? r.earlyLeaveGraceMinutes ?? 10) || 0,
        standardHours: Number(r.standard_hours ?? r.standardHours ?? (isOvernight ? 12 : 8)) || 8,
        assignedRoles: roles,
        overtimeMultiplier: Number(r.overtime_multiplier ?? r.overtimeMultiplier ?? 1.5) || 1.5,
        nightAllowance: Number(r.night_allowance ?? r.nightAllowance ?? 0) || 0,
        isDefault: Boolean(r.is_default ?? r.isDefault ?? false),
        isActive: r.is_active !== false && r.isActive !== false,
    };
}

function resolveShiftForStaff(
    staffId: string,
    combinedRoleLower: string,
    shifts: HrShiftConfig[],
    staffAssignments: Record<string, string>
): HrShiftConfig {
    const activeShifts = shifts.filter(s => s.isActive !== false);
    const list = activeShifts.length > 0 ? activeShifts : shifts;
    // 1. Explicit per-staff assignment (supports Day <-> Night rotation)
    const assignedId = staffAssignments[staffId];
    if (assignedId) {
        const direct = list.find(s => s.id === assignedId);
        if (direct) return direct;
    }
    // 2. Role / designation keyword match
    if (combinedRoleLower) {
        const roleMatch = list.find(s =>
            Array.isArray(s.assignedRoles) &&
            s.assignedRoles.some(kw => kw && combinedRoleLower.includes(kw.toLowerCase()))
        );
        if (roleMatch) return roleMatch;
    }
    // 3. Institution default shift
    return list.find(s => s.isDefault) || list[0] || getDefaultShiftTemplates('default')[0];
}

async function loadInstitutionShifts(
    supabase: any,
    pool: any,
    institutionId: string,
    seedIfEmpty: boolean
): Promise<{ shifts: HrShiftConfig[]; staffAssignments: Record<string, string> }> {
    const cleanInst = institutionId.replace(/^inst_/, '');
    const instCandidates = Array.from(new Set([institutionId, cleanInst, `inst_${cleanInst}`].filter(Boolean)));
    let shiftRows: any[] = [];
    let assignRows: any[] = [];

    if (supabase) {
        const instFilter = instCandidates.map(id => `institution_id.eq.${id}`).join(',');
        const [sRes, aRes] = await Promise.all([
            supabase.from('hr_shifts').select('*').or(instFilter).order('created_at', { ascending: true }),
            supabase.from('hr_staff_shifts').select('*').or(instFilter),
        ]);
        shiftRows = sRes.data || [];
        assignRows = aRes.data || [];
    } else if (pool) {
        const [sRes, aRes] = await Promise.all([
            pool.query('SELECT * FROM public.hr_shifts WHERE institution_id = ANY($1::text[]) ORDER BY is_default DESC, created_at ASC', [instCandidates]).catch(() => ({ rows: [] })),
            pool.query('SELECT * FROM public.hr_staff_shifts WHERE institution_id = ANY($1::text[])', [instCandidates]).catch(() => ({ rows: [] })),
        ]);
        shiftRows = sRes.rows || [];
        assignRows = aRes.rows || [];
    }

    if (shiftRows.length === 0) {
        const defaults = getDefaultShiftTemplates(institutionId);
        if (seedIfEmpty) {
            for (const def of defaults) {
                await saveShiftTemplate(supabase, pool, institutionId, def).catch(() => {});
            }
        }
        return { shifts: defaults, staffAssignments: {} };
    }

    const shifts = shiftRows.map(r => normalizeShiftRow(r, institutionId));
    const staffAssignments: Record<string, string> = {};
    for (const a of assignRows) {
        const sid = String(a.staff_id || a.staffId || '');
        const shId = String(a.shift_id || a.shiftId || '');
        if (sid && shId) staffAssignments[sid] = shId;
    }
    return { shifts, staffAssignments };
}

async function saveShiftTemplate(supabase: any, pool: any, institutionId: string, raw: any): Promise<HrShiftConfig> {
    const startTime = String(raw.startTime || raw.start_time || '08:00').trim();
    const endTime = String(raw.endTime || raw.end_time || '17:00').trim();
    const startMin = parseHHMM(startTime, 8 * 60);
    const endMin = parseHHMM(endTime, 17 * 60);
    const isOvernight = raw.isOvernight !== undefined
        ? Boolean(raw.isOvernight)
        : (raw.is_overnight !== undefined ? Boolean(raw.is_overnight) : endMin <= startMin);
    const assignedRoles: string[] = Array.isArray(raw.assignedRoles)
        ? raw.assignedRoles.map((x: any) => String(x).trim().toLowerCase()).filter(Boolean)
        : (typeof raw.assignedRoles === 'string'
            ? raw.assignedRoles.split(',').map((x: string) => x.trim().toLowerCase()).filter(Boolean)
            : []);

    const shift: HrShiftConfig = {
        id: String(raw.id || `shift_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`),
        institutionId,
        name: String(raw.name || 'Shift').trim(),
        startTime,
        endTime,
        isOvernight,
        graceMinutes: Math.max(0, Number(raw.graceMinutes ?? raw.grace_minutes ?? 15) || 0),
        earlyLeaveGraceMinutes: Math.max(0, Number(raw.earlyLeaveGraceMinutes ?? raw.early_leave_grace_minutes ?? 10) || 0),
        standardHours: Math.max(1, Number(raw.standardHours ?? raw.standard_hours ?? (isOvernight ? 12 : 8)) || 8),
        assignedRoles,
        overtimeMultiplier: Math.max(1, Number(raw.overtimeMultiplier ?? raw.overtime_multiplier ?? 1.5) || 1.5),
        nightAllowance: Math.max(0, Number(raw.nightAllowance ?? raw.night_allowance ?? 0) || 0),
        isDefault: Boolean(raw.isDefault ?? raw.is_default ?? false),
        isActive: raw.isActive !== false && raw.is_active !== false,
    };

    if (supabase) {
        if (shift.isDefault) {
            await supabase.from('hr_shifts').update({ is_default: false }).eq('institution_id', institutionId);
        }
        await supabase.from('hr_shifts').upsert({
            id: shift.id,
            institution_id: institutionId,
            name: shift.name,
            start_time: shift.startTime,
            end_time: shift.endTime,
            is_overnight: shift.isOvernight,
            grace_minutes: shift.graceMinutes,
            early_leave_grace_minutes: shift.earlyLeaveGraceMinutes,
            standard_hours: shift.standardHours,
            assigned_roles: JSON.stringify(shift.assignedRoles),
            overtime_multiplier: shift.overtimeMultiplier,
            night_allowance: shift.nightAllowance,
            is_default: shift.isDefault,
            is_active: shift.isActive,
            updated_at: new Date().toISOString(),
        });
    } else if (pool) {
        if (shift.isDefault) {
            await pool.query('UPDATE public.hr_shifts SET is_default = false WHERE institution_id = $1', [institutionId]).catch(() => {});
        }
        await pool.query(
            `INSERT INTO public.hr_shifts
             (id, institution_id, name, start_time, end_time, is_overnight, grace_minutes, early_leave_grace_minutes, standard_hours, assigned_roles, overtime_multiplier, night_allowance, is_default, is_active, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
             ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                start_time = EXCLUDED.start_time,
                end_time = EXCLUDED.end_time,
                is_overnight = EXCLUDED.is_overnight,
                grace_minutes = EXCLUDED.grace_minutes,
                early_leave_grace_minutes = EXCLUDED.early_leave_grace_minutes,
                standard_hours = EXCLUDED.standard_hours,
                assigned_roles = EXCLUDED.assigned_roles,
                overtime_multiplier = EXCLUDED.overtime_multiplier,
                night_allowance = EXCLUDED.night_allowance,
                is_default = EXCLUDED.is_default,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP`,
            [
                shift.id, institutionId, shift.name, shift.startTime, shift.endTime, shift.isOvernight,
                shift.graceMinutes, shift.earlyLeaveGraceMinutes, shift.standardHours,
                JSON.stringify(shift.assignedRoles), shift.overtimeMultiplier, shift.nightAllowance,
                shift.isDefault, shift.isActive,
            ]
        );
    }
    return shift;
}

async function deleteShiftTemplate(supabase: any, pool: any, institutionId: string, shiftId: string) {
    if (supabase) {
        await supabase.from('hr_staff_shifts').delete().eq('institution_id', institutionId).eq('shift_id', shiftId);
        await supabase.from('hr_shifts').delete().eq('institution_id', institutionId).eq('id', shiftId);
    } else if (pool) {
        await pool.query('DELETE FROM public.hr_staff_shifts WHERE institution_id = $1 AND shift_id = $2', [institutionId, shiftId]).catch(() => {});
        await pool.query('DELETE FROM public.hr_shifts WHERE institution_id = $1 AND id = $2', [institutionId, shiftId]);
    }
}

async function assignStaffShift(supabase: any, pool: any, institutionId: string, staffId: string, shiftId: string) {
    if (supabase) {
        await supabase.from('hr_staff_shifts').delete().eq('institution_id', institutionId).eq('staff_id', staffId);
        if (shiftId) {
            await supabase.from('hr_staff_shifts').insert({
                id: `sshift_${institutionId}_${staffId}`,
                institution_id: institutionId,
                staff_id: staffId,
                shift_id: shiftId,
                updated_at: new Date().toISOString(),
            });
        }
    } else if (pool) {
        await pool.query('DELETE FROM public.hr_staff_shifts WHERE institution_id = $1 AND staff_id = $2', [institutionId, staffId]).catch(() => {});
        if (shiftId) {
            await pool.query(
                `INSERT INTO public.hr_staff_shifts (id, institution_id, staff_id, shift_id, updated_at)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                 ON CONFLICT (id) DO UPDATE SET shift_id = EXCLUDED.shift_id, updated_at = CURRENT_TIMESTAMP`,
                [`sshift_${institutionId}_${staffId}`, institutionId, staffId, shiftId]
            );
        }
    }
}

// ─── HR & Payroll Attendance SMS / WhatsApp Notification Suite ───────────────

export interface HrAttendanceNotificationConfig {
    channel: 'sms' | 'whatsapp' | 'both';
    principalPhones: string;
    hrAlertPhones: string;
    notifyDailyDigest: boolean;
    notifyUnexplainedAbsence: boolean;
    notifyRepeatedLateness: boolean;
    repeatedLateThreshold: number;
    notifyLateArrival: boolean;
    ccHrOnLateArrival: boolean;
    notifyMissedClockOut: boolean;
    notifyClockInOut: boolean;
    notifyPrePayrollSummary: boolean;
    notifyPayslipReady: boolean;
}

const DEFAULT_NOTIFICATION_CONFIG: HrAttendanceNotificationConfig = {
    channel: 'sms',
    principalPhones: '',
    hrAlertPhones: '',
    notifyDailyDigest: true,
    notifyUnexplainedAbsence: true,
    notifyRepeatedLateness: true,
    repeatedLateThreshold: 3,
    notifyLateArrival: true,
    ccHrOnLateArrival: false,
    notifyMissedClockOut: true,
    notifyClockInOut: false,
    notifyPrePayrollSummary: true,
    notifyPayslipReady: true,
};

async function loadAttendanceNotificationConfig(supabase: any, pool: any, institutionId: string): Promise<HrAttendanceNotificationConfig> {
    let raw: any = null;
    if (pool) {
        const r = await pool.query('SELECT config FROM public.hr_attendance_notification_config WHERE institution_id = $1 LIMIT 1', [institutionId]).catch(() => ({ rows: [] }));
        raw = r.rows?.[0]?.config || null;
    } else if (supabase) {
        const { data } = await supabase.from('hr_attendance_notification_config').select('config').eq('institution_id', institutionId).maybeSingle();
        raw = data?.config || null;
    }
    if (typeof raw === 'string') {
        try { raw = JSON.parse(raw); } catch { raw = {}; }
    }
    return { ...DEFAULT_NOTIFICATION_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
}

async function saveAttendanceNotificationConfig(supabase: any, pool: any, institutionId: string, incoming: any): Promise<HrAttendanceNotificationConfig> {
    const merged: HrAttendanceNotificationConfig = {
        channel: (['sms', 'whatsapp', 'both'].includes(incoming?.channel) ? incoming.channel : 'sms'),
        principalPhones: String(incoming?.principalPhones ?? '').trim(),
        hrAlertPhones: String(incoming?.hrAlertPhones ?? '').trim(),
        notifyDailyDigest: incoming?.notifyDailyDigest !== false,
        notifyUnexplainedAbsence: incoming?.notifyUnexplainedAbsence !== false,
        notifyRepeatedLateness: incoming?.notifyRepeatedLateness !== false,
        repeatedLateThreshold: Math.max(2, Number(incoming?.repeatedLateThreshold) || 3),
        notifyLateArrival: incoming?.notifyLateArrival !== false,
        ccHrOnLateArrival: Boolean(incoming?.ccHrOnLateArrival),
        notifyMissedClockOut: incoming?.notifyMissedClockOut !== false,
        notifyClockInOut: Boolean(incoming?.notifyClockInOut),
        notifyPrePayrollSummary: incoming?.notifyPrePayrollSummary !== false,
        notifyPayslipReady: incoming?.notifyPayslipReady !== false,
    };

    if (pool) {
        await pool.query(
            `INSERT INTO public.hr_attendance_notification_config (institution_id, config, updated_at)
             VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
             ON CONFLICT (institution_id) DO UPDATE SET config = EXCLUDED.config, updated_at = CURRENT_TIMESTAMP`,
            [institutionId, JSON.stringify(merged)]
        );
    } else if (supabase) {
        await supabase.from('hr_attendance_notification_config').upsert({
            institution_id: institutionId,
            config: merged,
            updated_at: new Date().toISOString(),
        });
    }
    return merged;
}

function normalizeKePhone(raw?: string | null): string {
    const d = String(raw || '').replace(/\D/g, '');
    if (d.length === 10 && d.startsWith('0')) return '254' + d.slice(1);
    if (d.length === 9 && (d.startsWith('7') || d.startsWith('1'))) return '254' + d;
    if (d.length >= 12 && d.startsWith('254')) return d.slice(0, 12);
    return d;
}

function parsePhoneList(raw?: string): string[] {
    return Array.from(new Set(
        String(raw || '')
            .split(/[,;\n]+/)
            .map(p => normalizeKePhone(p))
            .filter(p => p.length >= 10)
    ));
}

async function claimDedupKey(supabase: any, pool: any, dedupKey: string, institutionId: string, alertType: string, recipient: string, message: string, channel: string): Promise<boolean> {
    if (pool) {
        const res = await pool.query(
            `INSERT INTO public.hr_attendance_sms_log (dedup_key, institution_id, alert_type, recipient, message, channel)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (dedup_key) DO NOTHING
             RETURNING dedup_key`,
            [dedupKey, institutionId, alertType, recipient, message, channel]
        ).catch(() => ({ rows: [{ dedup_key: dedupKey }] }));
        return Boolean(res.rows?.length);
    }
    if (supabase) {
        const { data: existing } = await supabase.from('hr_attendance_sms_log').select('dedup_key').eq('dedup_key', dedupKey).maybeSingle();
        if (existing?.dedup_key) return false;
        await supabase.from('hr_attendance_sms_log').insert({ dedup_key: dedupKey, institution_id: institutionId, alert_type: alertType, recipient, message, channel }).catch(() => {});
        return true;
    }
    return true;
}

function verifyCronSecret(req: VercelRequest): boolean {
    const authHeader = String(req.headers.authorization || '').trim();
    const cronSecret = String(process.env.CRON_SECRET || '').trim();
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
    // Allow local/non-production manual testing when CRON_SECRET is not set
    if (process.env.NODE_ENV !== 'production' && !cronSecret) return true;
    return false;
}

async function verifyHrAdminOrCronAuth(req: VercelRequest, supabase: any, pool: any): Promise<boolean> {
    if (verifyCronSecret(req)) return true;

    const authHeader = String(req.headers.authorization || '').trim();
    if (!authHeader) return false;
    const token = authHeader.replace(/^bearer\s+/i, '').trim();
    if (!token || token === 'undefined' || token === 'null') return false;

    // 1. Internal super-admin / local admin session tokens (matches api/ai.ts & apiService.getAuthToken)
    if (token === 'temp_admin_bypass' || token.startsWith('temp_admin_') || token === 'super_admin' || token === 'admin') {
        return true;
    }

    // 2. Supabase JWT verification
    if (supabase && token.includes('.') && token.split('.').length === 3) {
        try {
            const { data, error } = await supabase.auth.getUser(token);
            if (!error && data?.user) return true;
        } catch (_) {}
    }

    // 3. Direct EduAI tenant staff/admin user ID verification
    try {
        if (pool) {
            const r = await pool.query(
                `SELECT id, role FROM public.users WHERE id = $1 OR id = $2 LIMIT 1`,
                [token, `u_${token}`]
            );
            const u = r.rows?.[0];
            if (u) {
                const role = String(u.role || '').toLowerCase();
                if (!['student', 'learner', 'pupil', 'parent'].includes(role)) return true;
            }
        } else if (supabase) {
            const { data: u } = await supabase
                .from('users')
                .select('id, role')
                .or(`id.eq.${token},id.eq.u_${token}`)
                .maybeSingle();
            if (u) {
                const role = String(u.role || '').toLowerCase();
                if (!['student', 'learner', 'pupil', 'parent'].includes(role)) return true;
            }
        }
    } catch (e: any) {
        console.warn('[Dahua Auth] User lookup warning:', e?.message || e);
    }

    return false;
}

async function listCronEnabledInstitutions(
    supabase: any,
    pool: any,
    mode: 'daily_digest' | 'missed_clockout'
): Promise<string[]> {
    const ids = new Set<string>();
    try {
        if (pool) {
            const sql = mode === 'daily_digest'
                ? `SELECT institution_id FROM public.hr_attendance_notification_config WHERE notify_daily_digest = TRUE OR notify_unexplained_absence = TRUE`
                : `SELECT institution_id FROM public.hr_attendance_notification_config WHERE notify_missed_clockout = TRUE`;
            const r = await pool.query(sql).catch(() => ({ rows: [] }));
            for (const row of (r.rows || [])) {
                if (row.institution_id) ids.add(String(row.institution_id));
            }
        } else if (supabase) {
            const q = supabase.from('hr_attendance_notification_config').select('institution_id');
            const { data } = mode === 'daily_digest'
                ? await q.or('notify_daily_digest.eq.true,notify_unexplained_absence.eq.true')
                : await q.eq('notify_missed_clockout', true);
            for (const row of (data || [])) {
                if (row.institution_id) ids.add(String(row.institution_id));
            }
        }
    } catch (e: any) {
        console.warn('[Dahua Cron] Failed to list enabled institutions:', e?.message || e);
    }
    return Array.from(ids);
}

async function dispatchSematimeSms(
    supabase: any,
    pool: any,
    institutionId: string,
    phones: string[],
    message: string
): Promise<number> {
    if (phones.length === 0) return 0;
    let smsCfg: any = null;
    if (pool) {
        const [iRes, sRes] = await Promise.all([
            pool.query('SELECT sms_config FROM public.institutions WHERE id = $1 LIMIT 1', [institutionId]).catch(() => ({ rows: [] })),
            pool.query("SELECT data FROM public.system_settings WHERE id::text IN ('1','global') ORDER BY updated_at DESC NULLS LAST LIMIT 1").catch(() => ({ rows: [] })),
        ]);
        const instSms = iRes.rows?.[0]?.sms_config;
        const sysSms = sRes.rows?.[0]?.data?.sms_config || sRes.rows?.[0]?.data?.smsConfig;
        smsCfg = (instSms && (instSms.authToken || instSms.apiSecret || instSms.apiKey)) ? instSms : sysSms;
    } else if (supabase) {
        const { data: inst } = await supabase.from('institutions').select('sms_config').eq('id', institutionId).maybeSingle();
        smsCfg = inst?.sms_config || null;
        if (!smsCfg?.authToken && !smsCfg?.apiKey) {
            const { data: sys } = await supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
            smsCfg = sys?.data?.sms_config || sys?.data?.smsConfig || smsCfg;
        }
    }

    const accId = String(smsCfg?.accountId || smsCfg?.account_id || smsCfg?.apiKey || process.env.SEMATIME_ACCOUNT_ID || '').trim();
    const authToken = String(smsCfg?.authToken || smsCfg?.auth_token || smsCfg?.apiSecret || process.env.SEMATIME_AUTH_TOKEN || process.env.SEMATIME_API_KEY || '').trim();
    if (!accId || !authToken) return 0;

    try {
        const res = await fetch(`https://apis.sematime.com/v1/${accId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'AuthToken': authToken },
            body: JSON.stringify({ message, recipients: phones.join(',') }),
        });
        if (res.ok) return phones.length;
        console.warn('[HR Attendance SMS] Sematime non-OK response:', res.status);
    } catch (e: any) {
        console.warn('[HR Attendance SMS] Sematime error:', e?.message || e);
    }
    return 0;
}

async function dispatchHrNotification(
    supabase: any,
    pool: any,
    institutionId: string,
    phones: string[],
    message: string,
    channel: 'sms' | 'whatsapp' | 'both'
): Promise<{ sentSms: number; sentWhatsapp: number; fallbackSms: number }> {
    const cleanPhones = Array.from(new Set(phones.map(p => normalizeKePhone(p)).filter(p => p.length >= 10)));
    if (cleanPhones.length === 0) return { sentSms: 0, sentWhatsapp: 0, fallbackSms: 0 };

    let sentSms = 0;
    let sentWhatsapp = 0;
    let fallbackSms = 0;
    const waFailedPhones: string[] = [];

    // 1. WhatsApp Dispatch via Meta Cloud API (with per-recipient failure tracking for SMS fallback)
    if (channel === 'whatsapp' || channel === 'both') {
        let waCfg: any = null;
        if (pool) {
            const r = await pool.query("SELECT * FROM public.whatsapp_configs WHERE institution_id IN ($1, 'global', 'SYSTEM') ORDER BY CASE WHEN institution_id = $1 THEN 0 ELSE 1 END LIMIT 1", [institutionId]).catch(() => ({ rows: [] }));
            waCfg = r.rows?.[0] || null;
        } else if (supabase) {
            const { data } = await supabase.from('whatsapp_configs').select('*').eq('institution_id', institutionId).maybeSingle();
            waCfg = data || null;
        }
        const metaToken = waCfg?.meta_access_token || process.env.META_WA_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
        const metaPhoneId = waCfg?.meta_phone_number_id || process.env.META_WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '';

        if (metaToken && metaPhoneId) {
            for (const phone of cleanPhones) {
                try {
                    const r = await fetch(`https://graph.facebook.com/v19.0/${metaPhoneId}/messages`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${metaToken}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } }),
                    });
                    if (r.ok) {
                        sentWhatsapp++;
                    } else {
                        const errBody = await r.json().catch(() => ({} as any));
                        const errCode = errBody?.error?.code;
                        console.warn(`[HR Attendance WA] Meta delivery failed for ${phone} (HTTP ${r.status}, code=${errCode || 'unknown'}) — queuing SMS fallback.`);
                        waFailedPhones.push(phone);
                    }
                } catch (e: any) {
                    console.warn(`[HR Attendance WA] Meta network error for ${phone}:`, e?.message || e);
                    waFailedPhones.push(phone);
                }
            }
        } else {
            // WhatsApp credentials not configured — mark all phones for SMS fallback if channel === 'whatsapp'
            waFailedPhones.push(...cleanPhones);
        }
    }

    // 2. SMS Dispatch via Institution / Global Sematime Gateway
    if (channel === 'sms' || channel === 'both') {
        sentSms = await dispatchSematimeSms(supabase, pool, institutionId, cleanPhones, message);
    } else if (channel === 'whatsapp' && waFailedPhones.length > 0) {
        // Automatic WhatsApp -> SMS fallback (handles Meta 24h window error 131047 or unconfigured WA)
        fallbackSms = await dispatchSematimeSms(supabase, pool, institutionId, waFailedPhones, message);
        sentSms += fallbackSms;
    }

    return { sentSms, sentWhatsapp, fallbackSms };
}

async function handleRealTimePunchNotification(
    supabase: any,
    pool: any,
    institutionId: string,
    staffId: string,
    punchTime: Date
) {
    const cfg = await loadAttendanceNotificationConfig(supabase, pool, institutionId);
    if (!cfg.notifyLateArrival && !cfg.notifyClockInOut) return;

    let staffUser: any = null;
    let instName = 'EduAI';
    if (pool) {
        const [uRes, iRes] = await Promise.all([
            pool.query('SELECT id, name, role, phone_number, metadata FROM public.users WHERE id = $1 LIMIT 1', [staffId]).catch(() => ({ rows: [] })),
            pool.query('SELECT name FROM public.institutions WHERE id = $1 LIMIT 1', [institutionId]).catch(() => ({ rows: [] })),
        ]);
        staffUser = uRes.rows?.[0] || null;
        if (iRes.rows?.[0]?.name) instName = iRes.rows[0].name;
    } else if (supabase) {
        const [uRes, iRes] = await Promise.all([
            supabase.from('users').select('id, name, role, phone_number, metadata').eq('id', staffId).maybeSingle(),
            supabase.from('institutions').select('name').eq('id', institutionId).maybeSingle(),
        ]);
        staffUser = uRes.data || null;
        if (iRes.data?.name) instName = iRes.data.name;
    }

    if (!staffUser) return;
    const staffPhone = normalizeKePhone(staffUser.phone_number);
    const eatMs = punchTime.getTime() + 3 * 60 * 60 * 1000;
    const eat = new Date(eatMs);
    const dateStr = eat.toISOString().slice(0, 10);
    const timeStr = `${String(eat.getUTCHours()).padStart(2, '0')}:${String(eat.getUTCMinutes()).padStart(2, '0')}`;

    const { shifts, staffAssignments } = await loadInstitutionShifts(supabase, pool, institutionId, false);
    const meta = typeof staffUser.metadata === 'string' ? (() => { try { return JSON.parse(staffUser.metadata); } catch { return {}; } })() : (staffUser.metadata || {});
    const combinedRole = [staffUser.role, meta?.designation, meta?.jobTitle].filter(Boolean).join(' ').toLowerCase();
    const shift = resolveShiftForStaff(staffId, combinedRole, shifts, staffAssignments);

    // 1. Optional Instant Clock-In / Clock-Out Confirmation
    if (cfg.notifyClockInOut && staffPhone) {
        const bucket = `${dateStr}_${eat.getUTCHours() < 12 ? 'am' : 'pm'}`;
        const ok = await claimDedupKey(supabase, pool, `punch|${institutionId}|${staffId}|${bucket}`, institutionId, 'clock_confirm', staffPhone, `Punch at ${timeStr}`, cfg.channel);
        if (ok) {
            await dispatchHrNotification(supabase, pool, institutionId, [staffPhone], `${instName}: Hi ${staffUser.name}, your biometric punch (${shift.name}) was recorded at ${timeStr} on ${dateStr}.`, cfg.channel);
        }
    }

    // 2. Shift-Aware Real-Time Late Arrival Notice (1 per staff per day)
    if (cfg.notifyLateArrival) {
        const startMin = parseHHMM(shift.startTime, 8 * 60);
        const punchMin = eat.getUTCHours() * 60 + eat.getUTCMinutes();
        const graceMin = Number(shift.graceMinutes) || 0;
        const lateMins = punchMin - startMin;
        // Only flag if within 4 hours after shift start (so evening clock-outs aren't flagged as late morning punches)
        if (lateMins > graceMin && lateMins <= 240) {
            const ok = await claimDedupKey(supabase, pool, `late|${institutionId}|${staffId}|${dateStr}`, institutionId, 'late_arrival', staffPhone || staffId, `${lateMins}m late`, cfg.channel);
            if (ok) {
                const msg = `${instName}: Hi ${staffUser.name}, you clocked in at ${timeStr} for ${shift.name} (${lateMins} mins late; shift starts ${shift.startTime}).`;
                const recipients: string[] = [];
                if (staffPhone) recipients.push(staffPhone);
                if (cfg.ccHrOnLateArrival) {
                    recipients.push(...parsePhoneList(cfg.hrAlertPhones));
                }
                if (recipients.length > 0) {
                    await dispatchHrNotification(supabase, pool, institutionId, recipients, msg, cfg.channel);
                }
            }
        }
    }
}

async function runDailyDigestAndAbsenceAlerts(supabase: any, pool: any, institutionId: string, dateOpt?: string) {
    const cfg = await loadAttendanceNotificationConfig(supabase, pool, institutionId);
    const eatNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const targetDate = (dateOpt && /^\d{4}-\d{2}-\d{2}$/.test(dateOpt)) ? dateOpt : eatNow.toISOString().slice(0, 10);

    const dailyRes = await fetchDahuaDailyAttendance(supabase, pool, institutionId, { startDate: targetDate, endDate: targetDate });
    const todayRecs = dailyRes.records || [];
    const presentIds = new Set(todayRecs.map(r => String(r.staffId)));

    // Fetch all staff & approved leaves + institution name
    let allStaff: any[] = [];
    let approvedLeaveStaffIds = new Set<string>();
    let instName = 'EduAI';

    const cleanInst = institutionId.replace(/^inst_/, '');
    const instCandidates = Array.from(new Set([institutionId, cleanInst, `inst_${cleanInst}`]));
    if (pool) {
        const [uRes, iRes, lRes] = await Promise.all([
            pool.query(`SELECT id, name, role, phone_number FROM public.users WHERE institution_id = ANY($1::text[]) AND LOWER(COALESCE(role,'')) NOT IN ('student','learner','pupil','parent','super_admin') AND LOWER(COALESCE(status,'active')) <> 'deleted'`, [instCandidates]).catch(() => ({ rows: [] })),
            pool.query('SELECT name FROM public.institutions WHERE id = $1 LIMIT 1', [institutionId]).catch(() => ({ rows: [] })),
            pool.query(`SELECT user_id, staff_id FROM public.time_off_requests WHERE institution_id = ANY($1::text[]) AND LOWER(COALESCE(status,'')) = 'approved' AND start_date::text <= $2 AND end_date::text >= $2`, [instCandidates, targetDate]).catch(() => ({ rows: [] })),
        ]);
        allStaff = uRes.rows || [];
        if (iRes.rows?.[0]?.name) instName = iRes.rows[0].name;
        for (const lv of (lRes.rows || [])) {
            if (lv.user_id) approvedLeaveStaffIds.add(String(lv.user_id));
            if (lv.staff_id) approvedLeaveStaffIds.add(String(lv.staff_id));
        }
    }

    const lateRecs = todayRecs.filter(r => r.lateMinutes > 0);
    const nightRecs = todayRecs.filter(r => r.isNightShift);
    const absentNoLeave = allStaff.filter(s => !presentIds.has(String(s.id)) && !approvedLeaveStaffIds.has(String(s.id)));

    // Weekly repeated lateness check (past 7 days)
    const weekStart = new Date(`${targetDate}T00:00:00Z`);
    weekStart.setUTCDate(weekStart.getUTCDate() - 6);
    const weekRes = await fetchDahuaDailyAttendance(supabase, pool, institutionId, { startDate: weekStart.toISOString().slice(0, 10), endDate: targetDate });
    const lateCounts = new Map<string, { name: string; count: number }>();
    for (const r of (weekRes.records || [])) {
        if (r.lateMinutes > 0) {
            const cur = lateCounts.get(r.staffId) || { name: r.staffName || r.staffId, count: 0 };
            cur.count++;
            lateCounts.set(r.staffId, cur);
        }
    }
    const repeatLateStaff = Array.from(lateCounts.values()).filter(x => x.count >= cfg.repeatedLateThreshold);

    const adminPhones = Array.from(new Set([...parsePhoneList(cfg.principalPhones), ...parsePhoneList(cfg.hrAlertPhones)]));
    let totalSent = 0;

    if (cfg.notifyDailyDigest && adminPhones.length > 0) {
        const absentNames = absentNoLeave.slice(0, 5).map(s => s.name).join(', ');
        const repeatNote = cfg.notifyRepeatedLateness && repeatLateStaff.length > 0
            ? ` Repeat late (${cfg.repeatedLateThreshold}+/wk): ${repeatLateStaff.slice(0, 3).map(r => `${r.name}(${r.count})`).join(', ')}.`
            : '';
        const digestMsg = `${instName} Attendance (${targetDate}): ${todayRecs.length}/${allStaff.length || todayRecs.length} present, ${lateRecs.length} late, ${absentNoLeave.length} absent (no leave), ${nightRecs.length} night shift.${absentNames ? ` Absent: ${absentNames}.` : ''}${repeatNote}`;
        const r = await dispatchHrNotification(supabase, pool, institutionId, adminPhones, digestMsg, cfg.channel);
        totalSent += r.sentSms + r.sentWhatsapp;
    }

    if (cfg.notifyUnexplainedAbsence && absentNoLeave.length > 0) {
        for (const st of absentNoLeave.slice(0, 30)) {
            const ph = normalizeKePhone(st.phone_number);
            if (!ph) continue;
            const ok = await claimDedupKey(supabase, pool, `absent|${institutionId}|${st.id}|${targetDate}`, institutionId, 'unexplained_absence', ph, 'Absent notice', cfg.channel);
            if (ok) {
                const r = await dispatchHrNotification(supabase, pool, institutionId, [ph], `${instName}: Hi ${st.name}, no biometric clock-in has been recorded for you today (${targetDate}). Please clock in or notify HR if on leave.`, cfg.channel);
                totalSent += r.sentSms + r.sentWhatsapp;
            }
        }
    }

    return {
        date: targetDate,
        presentCount: todayRecs.length,
        lateCount: lateRecs.length,
        absentNoLeaveCount: absentNoLeave.length,
        repeatLateCount: repeatLateStaff.length,
        notificationsSent: totalSent,
        adminRecipientsCount: adminPhones.length,
    };
}

async function runMissedClockOutReminders(supabase: any, pool: any, institutionId: string, dateOpt?: string, respectToggle = false) {
    const cfg = await loadAttendanceNotificationConfig(supabase, pool, institutionId);
    if (respectToggle && !cfg.notifyMissedClockOut) {
        return { date: dateOpt || '', singlePunchCount: 0, remindersSent: 0, skipped: true };
    }
    const eatNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const targetDate = (dateOpt && /^\d{4}-\d{2}-\d{2}$/.test(dateOpt)) ? dateOpt : eatNow.toISOString().slice(0, 10);
    const dailyRes = await fetchDahuaDailyAttendance(supabase, pool, institutionId, { startDate: targetDate, endDate: targetDate });
    const singlePunchRecs = (dailyRes.records || []).filter(r => r.punchCount === 1);

    let instName = 'EduAI';
    const userPhoneMap = new Map<string, string>();
    if (pool) {
        const [uRes, iRes] = await Promise.all([
            pool.query('SELECT id, phone_number FROM public.users WHERE institution_id = $1', [institutionId]).catch(() => ({ rows: [] })),
            pool.query('SELECT name FROM public.institutions WHERE id = $1 LIMIT 1', [institutionId]).catch(() => ({ rows: [] })),
        ]);
        for (const u of (uRes.rows || [])) if (u.id && u.phone_number) userPhoneMap.set(String(u.id), u.phone_number);
        if (iRes.rows?.[0]?.name) instName = iRes.rows[0].name;
    }

    let sentCount = 0;
    for (const rec of singlePunchRecs) {
        const ph = normalizeKePhone(userPhoneMap.get(rec.staffId));
        if (!ph) continue;
        const ok = await claimDedupKey(supabase, pool, `clockout|${institutionId}|${rec.staffId}|${targetDate}`, institutionId, 'missed_clockout', ph, 'Missed clock-out', cfg.channel);
        if (ok) {
            const r = await dispatchHrNotification(supabase, pool, institutionId, [ph], `${instName}: Hi ${rec.staffName || 'Staff'}, reminder to clock out on the biometric terminal for ${targetDate} so your full hours are captured for payroll.`, cfg.channel);
            sentCount += r.sentSms + r.sentWhatsapp;
        }
    }

    return { date: targetDate, singlePunchCount: singlePunchRecs.length, remindersSent: sentCount };
}

async function runPrePayrollAttendanceSummaries(supabase: any, pool: any, institutionId: string, monthLabel: string) {
    const cfg = await loadAttendanceNotificationConfig(supabase, pool, institutionId);
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [mName, yStr] = (monthLabel || '').split(' ');
    const mIdx = monthNames.indexOf(mName);
    const now = new Date();
    const yr = parseInt(yStr, 10) || now.getFullYear();
    const m = mIdx >= 0 ? mIdx : now.getMonth();
    const mm = String(m + 1).padStart(2, '0');
    const lastDay = new Date(yr, m + 1, 0).getDate();
    const startDate = `${yr}-${mm}-01`;
    const endDate = `${yr}-${mm}-${String(lastDay).padStart(2, '0')}`;
    const displayMonth = `${monthNames[m]} ${yr}`;

    const dailyRes = await fetchDahuaDailyAttendance(supabase, pool, institutionId, { startDate, endDate });
    const byStaff = new Map<string, { name: string; days: number; nightShifts: number; overtime: number; late: number }>();
    for (const r of (dailyRes.records || [])) {
        const cur = byStaff.get(r.staffId) || { name: r.staffName || 'Staff', days: 0, nightShifts: 0, overtime: 0, late: 0 };
        cur.days++;
        if (r.isNightShift) cur.nightShifts++;
        cur.overtime += Number(r.overtimeHours) || 0;
        if (r.lateMinutes > 0) cur.late++;
        byStaff.set(r.staffId, cur);
    }

    let instName = 'EduAI';
    const userPhoneMap = new Map<string, string>();
    if (pool) {
        const [uRes, iRes] = await Promise.all([
            pool.query('SELECT id, phone_number FROM public.users WHERE institution_id = $1', [institutionId]).catch(() => ({ rows: [] })),
            pool.query('SELECT name FROM public.institutions WHERE id = $1 LIMIT 1', [institutionId]).catch(() => ({ rows: [] })),
        ]);
        for (const u of (uRes.rows || [])) if (u.id && u.phone_number) userPhoneMap.set(String(u.id), u.phone_number);
        if (iRes.rows?.[0]?.name) instName = iRes.rows[0].name;
    }

    let sentCount = 0;
    for (const [staffId, s] of byStaff.entries()) {
        const ph = normalizeKePhone(userPhoneMap.get(staffId));
        if (!ph) continue;
        const ot = Math.round(s.overtime * 10) / 10;
        const msg = `${instName} Pre-Payroll Attendance (${displayMonth}): Hi ${s.name}, recorded ${s.days} days, ${s.nightShifts} night shifts, +${ot}h OT, ${s.late} late arrivals. Contact HR within 24h for any correction.`;
        const r = await dispatchHrNotification(supabase, pool, institutionId, [ph], msg, cfg.channel);
        sentCount += r.sentSms + r.sentWhatsapp;
    }

    return { month: displayMonth, staffCount: byStaff.size, notificationsSent: sentCount };
}

async function runPayslipReadyNotifications(
    supabase: any,
    pool: any,
    institutionId: string,
    monthLabel: string,
    items: Array<{ staffId: string; staffName: string; phone?: string; netSalary: number; overtimePay?: number; nightAllowance?: number }>
) {
    const cfg = await loadAttendanceNotificationConfig(supabase, pool, institutionId);
    if (!cfg.notifyPayslipReady) return { skipped: true, notificationsSent: 0 };

    let instName = 'EduAI';
    const userPhoneMap = new Map<string, string>();
    if (pool) {
        const [uRes, iRes] = await Promise.all([
            pool.query('SELECT id, phone_number FROM public.users WHERE institution_id = $1', [institutionId]).catch(() => ({ rows: [] })),
            pool.query('SELECT name FROM public.institutions WHERE id = $1 LIMIT 1', [institutionId]).catch(() => ({ rows: [] })),
        ]);
        for (const u of (uRes.rows || [])) if (u.id && u.phone_number) userPhoneMap.set(String(u.id), u.phone_number);
        if (iRes.rows?.[0]?.name) instName = iRes.rows[0].name;
    }

    let sentCount = 0;
    for (const item of items) {
        const ph = normalizeKePhone(item.phone || userPhoneMap.get(item.staffId));
        if (!ph) continue;
        const extras: string[] = [];
        if ((Number(item.nightAllowance) || 0) > 0) extras.push(`Night Allowance: KES ${Math.round(Number(item.nightAllowance)).toLocaleString()}`);
        if ((Number(item.overtimePay) || 0) > 0) extras.push(`Overtime: KES ${Math.round(Number(item.overtimePay)).toLocaleString()}`);
        const extraStr = extras.length > 0 ? ` (${extras.join(', ')})` : '';
        const msg = `${instName} Payroll (${monthLabel}): Hi ${item.staffName}, your payslip is ready. Net Pay: KES ${Math.round(Number(item.netSalary) || 0).toLocaleString()}${extraStr}.`;
        const r = await dispatchHrNotification(supabase, pool, institutionId, [ph], msg, cfg.channel);
        sentCount += r.sentSms + r.sentWhatsapp;
    }
    return { month: monthLabel, notificationsSent: sentCount };
}
