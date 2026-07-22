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

const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
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

    const supabase = getSupabase();

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
                        requests_count: (existingDevice.requests_count || 0) + 1
                    })
                    .eq('id', existingDevice.id);
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
        if (!supabase) {
            console.error('[ZKTeco] Supabase client not configured');
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
                const { error } = await supabase
                    .from('staff_attendance_logs')
                    .insert(records);

                if (error) {
                    console.error('[ZKTeco] Insert error:', error);
                    return res.status(200).send(`ERR: ${error.message}`);
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
