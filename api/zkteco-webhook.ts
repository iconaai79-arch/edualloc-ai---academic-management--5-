import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * ZKTeco ADMS Push Webhook
 * 
 * Receives attendance log data pushed from ZKTeco biometric devices
 * via the ADMS (Automatic Data Master Server) protocol.
 * 
 * Device sends:
 *   POST /api/zkteco-webhook?SN=<serial>&institutionId=<uuid>
 *   Body: tab-separated ATTLOG lines
 * 
 * Device also polls:
 *   GET /api/zkteco-webhook?SN=<serial>&institutionId=<uuid>
 *   (for pending server commands stored persistently in Supabase)
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
        if (!url) console.error('[ZKTeco Webhook] Missing Supabase URL (SUPABASE_URL or VITE_SUPABASE_URL)');
        if (!key) console.error('[ZKTeco Webhook] Missing Supabase Key (SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY)');
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
            console.warn('[Direct SQL Pool Error in ZKTeco Webhook]:', err?.message || err);
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
        console.warn('[Direct SQL Pool in ZKTeco Init Warning]:', e?.message || e);
        _directPgDisabledUntil = Date.now() + 30000;
        return null;
    }
};

// Global command counter seed
let cmdCounter = Date.now() % 100000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const serialNumber = (req.query.SN || req.query.sn || '').toString().trim();
    const institutionId = (req.query.institutionId || req.query.institution_id || '').toString().trim();
    const action = (req.query.action || '').toString().trim();
    const pin = (req.query.pin || '').toString().trim();
    const fingerIndex = (req.query.fingerIndex || req.query.finger_index || '0').toString().trim();
    const clientIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0].trim();

    const supabase = getSupabase(req);

    // ─── Track real hardware pings in database ───
    if (serialNumber && !action && supabase) {
        try {
            // Find existing device by serial number (case-insensitive)
            const { data: existingDevice } = await supabase
                .from('biometric_devices')
                .select('id, requests_count')
                .ilike('serial_number', serialNumber)
                .maybeSingle();

            if (existingDevice) {
                await supabase
                    .from('biometric_devices')
                    .update({
                        last_sync_at: new Date().toISOString(),
                        last_ip: clientIp,
                        requests_count: (existingDevice.requests_count || 0) + 1,
                        is_active: true
                    })
                    .eq('id', existingDevice.id);
            } else if (institutionId) {
                await supabase
                    .from('biometric_devices')
                    .insert([{
                        institution_id: institutionId,
                        serial_number: serialNumber,
                        device_name: `ZKTeco Terminal (${serialNumber})`,
                        protocol: 'adms',
                        ip_address: clientIp || null,
                        is_active: true,
                        last_sync_at: new Date().toISOString(),
                        requests_count: 1
                    }]);
            }
        } catch (e) {
            console.error('[ZKTeco] Ping update error:', e);
        }
    }

    console.log(`[ZKTeco] ${req.method} action=${action} from SN=${serialNumber} inst=${institutionId}`);

    // ─── ACTION = STATUS (Check real device hardware status from database) ───
    if (action === 'status') {
        const snKey = serialNumber || 'DEFAULT';
        let isOnline = false;
        let lastSeen: string | null = null;
        let ip: string | null = null;
        let requestsCount = 0;
        let pendingCommandsCount = 0;

        if (supabase && serialNumber) {
            try {
                const { data: device } = await supabase
                    .from('biometric_devices')
                    .select('*')
                    .ilike('serial_number', serialNumber)
                    .maybeSingle();

                if (device) {
                    lastSeen = device.last_sync_at || null;
                    ip = device.last_ip || device.ip_address || null;
                    requestsCount = device.requests_count || 0;
                    isOnline = !!(lastSeen && (Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000));
                }

                // Check pending commands
                const { count } = await supabase
                    .from('biometric_device_commands')
                    .select('*', { count: 'exact', head: true })
                    .or(`serial_number.ilike.${serialNumber},serial_number.eq.DEFAULT`)
                    .eq('status', 'pending');

                pendingCommandsCount = count || 0;
            } catch (e) {
                console.error('[ZKTeco] Status fetch error:', e);
            }
        }

        return res.status(200).json({
            sn: snKey,
            online: isOnline,
            lastSeen: lastSeen,
            ip: ip,
            requestsCount: requestsCount,
            pendingCommandsCount: pendingCommandsCount,
            message: isOnline 
                ? `✅ ZKTeco Device (SN: ${snKey}) is ACTIVE & ONLINE! Last hardware ping: ${new Date(lastSeen!).toLocaleTimeString()}`
                : `⚠️ PHYSICAL DEVICE HAS NOT CONNECTED TO THIS SERVER YET! ZKTeco SN '${snKey}' has not sent any ADMS heartbeats recently. Check server IP, Port 80/443, and 'Enable Domain Name' on the device screen.`
        });
    }

    // ─── ACTION = ENROLL (From Web Portal) ───
    if (action === 'enroll') {
        const targetPin = pin || '1001';
        const targetFinger = fingerIndex || '0';
        const snKey = serialNumber || 'DEFAULT';
        
        const cmdId1 = ++cmdCounter;
        const cmdId2 = ++cmdCounter;
        
        const cmd1 = `C:${cmdId1}:DATA ENROLL_FP PIN=${targetPin} FingerID=${targetFinger}`;
        const cmd2 = `C:${cmdId2}:ENROLL_FP PIN=${targetPin} FingerID=${targetFinger}`;

        if (supabase) {
            try {
                await supabase.from('biometric_device_commands').insert([
                    {
                        institution_id: institutionId || 'system',
                        serial_number: snKey,
                        command_id: cmdId1,
                        command_text: cmd1,
                        command_type: 'ENROLL',
                        status: 'pending'
                    },
                    {
                        institution_id: institutionId || 'system',
                        serial_number: snKey,
                        command_id: cmdId2,
                        command_text: cmd2,
                        command_type: 'ENROLL',
                        status: 'pending'
                    }
                ]);
            } catch (e) {
                console.error('[ZKTeco] Command insert error:', e);
            }
        }

        console.log(`[ZKTeco] Queued enrollment commands for SN=${snKey}: ${cmd1}`);
        return res.status(200).json({ 
            success: true, 
            commands: [cmd1, cmd2], 
            sn: snKey,
            pin: targetPin,
            fingerIndex: targetFinger,
            queuedAt: new Date().toISOString() 
        });
    }

    // ─── ACTION = SYNC_ATTENDANCE / PULL_LOGS (From Web Portal) ───
    if (action === 'sync_attendance' || action === 'pull_logs') {
        const snKey = serialNumber || 'DEFAULT';
        const cmdId1 = ++cmdCounter;
        const cmdId2 = ++cmdCounter;
        const cmd1 = `C:${cmdId1}:DATA QUERY ATTLOG`;
        const cmd2 = `C:${cmdId2}:DATA LOG ATTLOG`;

        if (supabase) {
            try {
                await supabase.from('biometric_device_commands').insert([
                    {
                        institution_id: institutionId || 'system',
                        serial_number: snKey,
                        command_id: cmdId1,
                        command_text: cmd1,
                        command_type: 'SYNC',
                        status: 'pending'
                    },
                    {
                        institution_id: institutionId || 'system',
                        serial_number: snKey,
                        command_id: cmdId2,
                        command_text: cmd2,
                        command_type: 'SYNC',
                        status: 'pending'
                    }
                ]);
            } catch (e) {
                console.error('[ZKTeco] Command insert error:', e);
            }
        }

        console.log(`[ZKTeco] Queued attendance sync commands for SN=${snKey}: ${cmd1}`);
        return res.status(200).json({
            success: true,
            commands: [cmd1, cmd2],
            sn: snKey,
            queuedAt: new Date().toISOString()
        });
    }

    // ─── ACTION = OPEN_SENSOR / OPEN_DOOR (Remote door/relay unlock) ───
    if (action === 'open_sensor' || action === 'open_door') {
        const snKey = serialNumber || 'DEFAULT';
        const unlockDurationMs = 5000; // hold relay open for 5 seconds

        // Queue all major ZKTeco ADMS command formats for maximum firmware compatibility across models
        const cmd1Id = ++cmdCounter;
        const cmd2Id = ++cmdCounter;
        const cmd3Id = ++cmdCounter;
        const cmd4Id = ++cmdCounter;

        const cmd1Text = `C:${cmd1Id}:UNLOCK ${unlockDurationMs}`;
        const cmd2Text = `C:${cmd2Id}:DATA CONTROL DOOR OPEN 1`;
        const cmd3Text = `C:${cmd3Id}:AC_UNBLOCK`;
        const cmd4Text = `C:${cmd4Id}:CONTROL DEVICE RELAY 1 5`;

        if (supabase) {
            try {
                await supabase.from('biometric_device_commands').insert([
                    {
                        institution_id: institutionId || 'system',
                        serial_number: snKey,
                        command_id: cmd1Id,
                        command_text: cmd1Text,
                        command_type: 'OPEN_DOOR',
                        status: 'pending'
                    },
                    {
                        institution_id: institutionId || 'system',
                        serial_number: snKey,
                        command_id: cmd2Id,
                        command_text: cmd2Text,
                        command_type: 'OPEN_DOOR',
                        status: 'pending'
                    },
                    {
                        institution_id: institutionId || 'system',
                        serial_number: snKey,
                        command_id: cmd3Id,
                        command_text: cmd3Text,
                        command_type: 'OPEN_DOOR',
                        status: 'pending'
                    },
                    {
                        institution_id: institutionId || 'system',
                        serial_number: snKey,
                        command_id: cmd4Id,
                        command_text: cmd4Text,
                        command_type: 'OPEN_DOOR',
                        status: 'pending'
                    }
                ]);
            } catch (e) {
                console.error('[ZKTeco] Open sensor command insert error:', e);
                return res.status(500).json({ success: false, error: 'Failed to queue open sensor command' });
            }
        }

        console.log(`[ZKTeco] Queued OPEN_DOOR commands for SN=${snKey}: ${cmd1Text}`);
        return res.status(200).json({
            success: true,
            commands: [cmd1Text, cmd2Text, cmd3Text, cmd4Text],
            command: cmd1Text,
            sn: snKey,
            durationMs: unlockDurationMs,
            note: 'Commands queued for all ZKTeco firmware variants (UNLOCK, DOOR OPEN, AC_UNBLOCK, RELAY). The physical device will execute on its next ADMS heartbeat (10–30s). To trigger instantly: Menu → Data Mgt → Sync on device.',
            queuedAt: new Date().toISOString()
        });
    }

    // ─── GET: Device polling for commands (ADMS Protocol) ───
    if (req.method === 'GET') {
        res.setHeader('Content-Type', 'text/plain');
        
        if (supabase) {
            try {
                // Fetch oldest pending command for this SN or DEFAULT
                let query = supabase
                    .from('biometric_device_commands')
                    .select('id, command_text')
                    .eq('status', 'pending')
                    .order('created_at', { ascending: true })
                    .limit(1);

                if (serialNumber) {
                    query = query.or(`serial_number.ilike.${serialNumber},serial_number.eq.DEFAULT`);
                } else {
                    query = query.eq('serial_number', 'DEFAULT');
                }

                const { data: cmdRows } = await query;

                if (cmdRows && cmdRows.length > 0) {
                    const cmdToDeliver = cmdRows[0];
                    
                    // Mark command as sent
                    await supabase
                        .from('biometric_device_commands')
                        .update({ status: 'sent', sent_at: new Date().toISOString() })
                        .eq('id', cmdToDeliver.id);

                    console.log(`[ZKTeco] Delivering ADMS command to device (SN=${serialNumber}): ${cmdToDeliver.command_text}`);
                    return res.status(200).send(cmdToDeliver.command_text);
                }
            } catch (e) {
                console.error('[ZKTeco] Command poll error:', e);
            }
        }

        return res.status(200).send('OK');
    }

    // ─── POST: Attendance log upload ───
    if (req.method === 'POST') {
        res.setHeader('Content-Type', 'text/plain');
        const pool = await getPgPool();
        if (!supabase && !pool) {
            console.error('[ZKTeco] Neither Supabase nor Talksasa PostgreSQL (DATABASE_URL) is configured');
            return res.status(500).send('ERR: Server configuration error');
        }

        let body = '';
        if (typeof req.body === 'string') {
            body = req.body;
        } else if (req.body && typeof req.body === 'object') {
            body = JSON.stringify(req.body);
        } else {
            body = '';
        }

        if (!body || body.trim().length === 0) {
            return res.status(200).send('OK');
        }

        if (body.includes('ATTLOG') || body.includes('table=') || body.includes('OPERLOG')) {
            return res.status(200).send('OK');
        }

        try {
            let deviceId: string | null = null;
            let resolvedInstitutionId = institutionId;

            if (serialNumber) {
                if (supabase) {
                    const { data: device } = await supabase
                        .from('biometric_devices')
                        .select('id, institution_id, requests_count')
                        .ilike('serial_number', serialNumber)
                        .maybeSingle();

                    if (device) {
                        deviceId = device.id;
                        resolvedInstitutionId = resolvedInstitutionId || device.institution_id;

                        await supabase
                            .from('biometric_devices')
                            .update({ 
                                last_sync_at: new Date().toISOString(),
                                last_ip: clientIp,
                                requests_count: (device.requests_count || 0) + 1
                            })
                            .eq('id', device.id);
                    }
                } else if (pool) {
                    try {
                        const devRes = await pool.query(
                            'SELECT id, institution_id, requests_count FROM public.biometric_devices WHERE serial_number ILIKE $1 LIMIT 1',
                            [serialNumber]
                        );
                        if (devRes.rows && devRes.rows.length > 0) {
                            deviceId = devRes.rows[0].id;
                            resolvedInstitutionId = resolvedInstitutionId || devRes.rows[0].institution_id;
                            await pool.query(
                                'UPDATE public.biometric_devices SET last_sync_at = $1, last_ip = $2, requests_count = COALESCE(requests_count, 0) + 1 WHERE id = $3',
                                [new Date().toISOString(), clientIp, deviceId]
                            );
                        }
                    } catch (_) {}
                }
            }

            if (!resolvedInstitutionId) {
                console.warn('[ZKTeco] No institution ID resolved');
                return res.status(200).send('OK');
            }

            const lines = body.split('\n').filter((line: string) => line.trim().length > 0);
            const records: any[] = [];

            for (const line of lines) {
                const parts = line.trim().split('\t');
                if (parts.length < 2) continue;

                const pin = parts[0]?.trim();
                const timestamp = parts[1]?.trim();
                const verifyType = parseInt(parts[2]?.trim() || '0', 10);
                const status = parseInt(parts[3]?.trim() || '0', 10);

                if (!pin || !timestamp) continue;

                const punchTime = new Date(timestamp);
                if (isNaN(punchTime.getTime())) continue;

                let staffId: string | null = null;
                if (supabase) {
                    const { data: enrollment } = await supabase
                        .from('biometric_enrollments')
                        .select('staff_id')
                        .eq('institution_id', resolvedInstitutionId)
                        .eq('device_pin', pin)
                        .eq('is_active', true)
                        .maybeSingle();

                    if (enrollment) {
                        staffId = enrollment.staff_id;
                    }
                } else if (pool) {
                    try {
                        const enrRes = await pool.query(
                            'SELECT staff_id FROM public.biometric_enrollments WHERE institution_id = $1 AND device_pin = $2 AND is_active = true LIMIT 1',
                            [resolvedInstitutionId, pin]
                        );
                        if (enrRes.rows && enrRes.rows.length > 0) {
                            staffId = enrRes.rows[0].staff_id;
                        }
                    } catch (_) {}
                }

                records.push({
                    institution_id: resolvedInstitutionId,
                    staff_id: staffId,
                    device_id: deviceId,
                    device_pin: pin,
                    punch_time: punchTime.toISOString(),
                    punch_type: status,
                    verification_method: verifyType,
                    raw_data: line.trim(),
                    is_processed: !!staffId,
                });
            }

            if (records.length > 0) {
                if (supabase) {
                    const { error } = await supabase
                        .from('staff_attendance_logs')
                        .insert(records);

                    if (error) {
                        console.error('[ZKTeco] Insert error:', error);
                        return res.status(200).send(`ERR: ${error.message}`);
                    }
                } else if (pool) {
                    for (const r of records) {
                        try {
                            await pool.query(
                                `INSERT INTO public.staff_attendance_logs 
                                 (institution_id, staff_id, device_pin, punch_time, punch_type, verification_method, raw_data, is_processed) 
                                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                                [r.institution_id, r.staff_id, r.device_pin, r.punch_time, r.punch_type, r.verification_method, r.raw_data, r.is_processed]
                            );
                        } catch (e) {
                            console.error('[ZKTeco PG] Insert error:', e);
                        }
                    }
                }

                console.log(`[ZKTeco] Inserted ${records.length} records`);
            }

            return res.status(200).send(`OK: ${records.length}`);

        } catch (error: any) {
            console.error('[ZKTeco] Processing error:', error);
            return res.status(200).send('OK');
        }
    }

    return res.status(200).send('OK');
}
