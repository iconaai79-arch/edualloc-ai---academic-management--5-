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

const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
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
            const supabase = getSupabase();
            if (!supabase) return res.status(500).json({ error: 'DB not configured' });

            try {
                // 1. Get already registered devices for this institution
                const { data: registered } = await supabase
                    .from('biometric_devices')
                    .select('id, serial_number, device_name, device_model, protocol, is_active, last_sync_at, ip_address, port')
                    .eq('institution_id', institutionId);

                const registeredSns = new Set(
                    (registered || []).map(d => (d.serial_number || '').trim().toLowerCase())
                );

                // 2. Query recent attendance logs to discover active terminals that sent punches
                let logQuery = supabase
                    .from('staff_attendance_logs')
                    .select('id, institution_id, device_pin, punch_time, raw_data, created_at')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (institutionId) {
                    logQuery = logQuery.or(`institution_id.eq.${institutionId},institution_id.is.null`);
                }

                const { data: rawLogs } = await logQuery;
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
            const supabase = getSupabase();
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
        const supabase = getSupabase();
        if (!supabase) {
            console.error('[Dahua Webhook] Supabase client not configured');
            return res.status(500).json({ error: 'Server configuration error' });
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

                // Resolve matching user from Supabase database
                let matchedUserId: string | null = null;
                let matchedInstitutionId: string | null = null;

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
            }

            return res.status(200).json({ status: 'success', processed: processedCount });
        } catch (err: any) {
            console.error('[Dahua Webhook] Processing error:', err);
            return res.status(200).json({ status: 'ok', note: 'Error swallowed to prevent device retries' });
        }
    }

    return res.status(200).send('OK');
}
