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

        return _pgPool;
    } catch (e: any) {
        console.warn('[Direct SQL Pool in Dahua Init Warning]:', e?.message || e);
        _directPgDisabledUntil = Date.now() + 30000;
        return null;
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

        if (action === 'status' || action === 'sync') {
            const supabase = getSupabase(req);
            const pool = await getPgPool();
            let recentCount = 0;
            let lastSeen: string | null = null;

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
                synced: action === 'sync'
            });
        }

        return res.status(200).json({ status: 'ok', service: 'Dahua Biometric Webhook Receiver' });
    }

    if (req.method === 'POST') {
        const supabase = getSupabase(req);
        const pool = await getPgPool();
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
                if (!cardNo && !userId && !data.Name && !ev.Code) continue;

                // Determine timestamp
                let punchTime = new Date();
                if (typeof createTimeStr === 'number') {
                    punchTime = new Date(createTimeStr * 1000);
                } else if (createTimeStr) {
                    const parsed = new Date(createTimeStr);
                    if (!isNaN(parsed.getTime())) punchTime = parsed;
                }

                // Resolve matching user from Supabase or Direct PostgreSQL (Talksasa)
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
                            const { data: enrollments } = await supabase
                                .from('biometric_enrollments')
                                .select('staff_id, institution_id')
                                .eq('device_pin', searchPin)
                                .eq('is_active', true)
                                .limit(1);

                            if (enrollments && enrollments.length > 0) {
                                matchedUserId = enrollments[0].staff_id;
                                matchedInstitutionId = enrollments[0].institution_id;
                            }
                        }
                    }

                    // Fallback institution_id if user is not yet matched/enrolled
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
                            staff_id: matchedUserId,
                            device_pin: effectivePin,
                            punch_time: punchTime.toISOString(),
                            punch_type: 0,
                            verification_method: 4, // Face / Biometric
                            raw_data: JSON.stringify(data),
                            is_processed: !!matchedUserId
                        }]);
                        if (insErr) {
                            console.error('[Dahua Webhook] Error inserting staff_attendance_log:', insErr);
                        } else if (!matchedUserId) {
                            processedCount++;
                        }

                        // Auto-register Dahua terminal in biometric_devices if serial number present
                        const devSn = (data.SN || data.SerialNo || data.DeviceID || data.DeviceId || body?.SN || body?.SerialNo || body?.DeviceId || req.query.SN || req.query.sn || '').toString().trim();
                        const devName = data.DeviceName || body?.DeviceName || 'Dahua Face Terminal';
                        const devModel = data.DeviceType || body?.DeviceType || 'Dahua Facial Recognition Terminal';
                        const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();

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
                        try {
                            const enrRes = await pool.query(
                                `SELECT staff_id, institution_id FROM public.biometric_enrollments 
                                 WHERE device_pin = $1 AND is_active = true LIMIT 1`,
                                [userId || cardNo]
                            );
                            if (enrRes.rows && enrRes.rows.length > 0) {
                                matchedUserId = enrRes.rows[0].staff_id;
                                matchedInstitutionId = enrRes.rows[0].institution_id;
                            }
                        } catch (eErr) {
                            console.warn('[Dahua Webhook PG] Enrollment match query warn:', eErr);
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
                                 (institution_id, staff_id, device_pin, punch_time, punch_type, verification_method, raw_data, is_processed) 
                                 VALUES ($1, $2, $3, $4, 0, 4, $5, $6)`,
                                [
                                    matchedInstitutionId,
                                    matchedUserId,
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
                        const devSn = (data.SN || data.SerialNo || data.DeviceID || data.DeviceId || body?.SN || body?.SerialNo || body?.DeviceId || req.query.SN || req.query.sn || '').toString().trim();
                        const devName = data.DeviceName || body?.DeviceName || 'Dahua Face Terminal';
                        const devModel = data.DeviceType || body?.DeviceType || 'Dahua Facial Recognition Terminal';
                        const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim();

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
