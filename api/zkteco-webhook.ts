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
 *   Format per line: PIN\tTimestamp\tVerificationType\tStatus\tWorkcode\tReserved1\tReserved2
 * 
 * Device also polls:
 *   GET /api/zkteco-webhook?SN=<serial>&institutionId=<uuid>
 *   (for pending server commands — we respond with OK for now)
 */

const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

// Verification method codes from ZKTeco
const VERIFY_METHODS: Record<number, string> = {
    0: 'fingerprint',
    1: 'card',
    2: 'password',
    4: 'face',
    15: 'face',
};

// Punch status codes
const PUNCH_TYPES: Record<number, string> = {
    0: 'check-in',
    1: 'check-out',
    2: 'break-start',
    3: 'break-end',
    4: 'overtime-start',
    5: 'overtime-end',
};

// In-memory queue for ZKTeco ADMS device commands
const PENDING_COMMANDS = new Map<string, string[]>();
let cmdCounter = 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const serialNumber = (req.query.SN || req.query.sn || '') as string;
    const institutionId = (req.query.institutionId || req.query.institution_id || '') as string;
    const action = (req.query.action || '') as string;
    const pin = (req.query.pin || '') as string;
    const name = (req.query.name || '') as string;

    console.log(`[ZKTeco] ${req.method} action=${action} from SN=${serialNumber} inst=${institutionId}`);

    // ─── ACTION = ENROLL (From Web Portal) ───
    if (action === 'enroll') {
        const cmdId = ++cmdCounter;
        // Standard ADMS Enrollment Command format
        const admsCmd = `C:${cmdId}:DATA ENROLL_FP PIN=${pin || '1001'} FingerID=0`;
        const snKey = serialNumber || 'DEFAULT';
        
        const existing = PENDING_COMMANDS.get(snKey) || [];
        existing.push(admsCmd);
        PENDING_COMMANDS.set(snKey, existing);

        console.log(`[ZKTeco] Queued enrollment command for SN=${snKey}: ${admsCmd}`);
        return res.status(200).json({ 
            success: true, 
            command: admsCmd, 
            sn: snKey,
            pin: pin,
            queuedAt: new Date().toISOString() 
        });
    }

    // ─── GET: Device polling for commands (ADMS Protocol) ───
    if (req.method === 'GET') {
        const snKey = serialNumber || 'DEFAULT';
        const pending = PENDING_COMMANDS.get(snKey);
        
        if (pending && pending.length > 0) {
            const nextCmd = pending.shift();
            console.log(`[ZKTeco] Delivering ADMS command to device SN=${snKey}: ${nextCmd}`);
            return res.status(200).send(nextCmd);
        }

        return res.status(200).send('OK');
    }

    // ─── POST: Attendance log upload ───
    if (req.method === 'POST') {
        const supabase = getSupabase();
        if (!supabase) {
            console.error('[ZKTeco] Supabase client not configured');
            return res.status(500).send('ERR: Server configuration error');
        }

        // Read body — ADMS sends plain text, not JSON
        let body = '';
        if (typeof req.body === 'string') {
            body = req.body;
        } else if (req.body && typeof req.body === 'object') {
            // Vercel may parse it; try to reconstruct
            body = JSON.stringify(req.body);
        } else {
            body = '';
        }

        if (!body || body.trim().length === 0) {
            // Device handshake or heartbeat
            return res.status(200).send('OK');
        }

        // Check if this is a table descriptor (headers line starting with column names)
        if (body.includes('ATTLOG') || body.includes('table=') || body.includes('OPERLOG')) {
            // Device sending metadata/headers — acknowledge
            if (body.includes('OPERLOG')) {
                return res.status(200).send('OK');
            }
            // For ATTLOG metadata, acknowledge and wait for actual data
            return res.status(200).send('OK');
        }

        try {
            // Resolve device
            let deviceId: string | null = null;
            let resolvedInstitutionId = institutionId;

            if (serialNumber) {
                const { data: device } = await supabase
                    .from('biometric_devices')
                    .select('id, institution_id')
                    .eq('serial_number', serialNumber)
                    .eq('is_active', true)
                    .single();

                if (device) {
                    deviceId = device.id;
                    resolvedInstitutionId = resolvedInstitutionId || device.institution_id;

                    // Update last sync time
                    await supabase
                        .from('biometric_devices')
                        .update({ last_sync_at: new Date().toISOString() })
                        .eq('id', device.id);
                }
            }

            if (!resolvedInstitutionId) {
                console.warn('[ZKTeco] No institution ID resolved');
                return res.status(200).send('OK');
            }

            // Parse ATTLOG lines
            // Format: PIN\tTimestamp\tVerificationType\tStatus\tWorkcode\tReserved1\tReserved2
            const lines = body.split('\n').filter((line: string) => line.trim().length > 0);
            const records: any[] = [];
            const skipped: string[] = [];

            for (const line of lines) {
                const parts = line.trim().split('\t');
                if (parts.length < 2) {
                    skipped.push(line);
                    continue;
                }

                const pin = parts[0]?.trim();
                const timestamp = parts[1]?.trim();
                const verifyType = parseInt(parts[2]?.trim() || '0', 10);
                const status = parseInt(parts[3]?.trim() || '0', 10);

                if (!pin || !timestamp) {
                    skipped.push(line);
                    continue;
                }

                // Validate timestamp
                const punchTime = new Date(timestamp);
                if (isNaN(punchTime.getTime())) {
                    skipped.push(line);
                    continue;
                }

                // Resolve staff_id from enrollment
                let staffId: string | null = null;
                const { data: enrollment } = await supabase
                    .from('biometric_enrollments')
                    .select('staff_id')
                    .eq('institution_id', resolvedInstitutionId)
                    .eq('device_pin', pin)
                    .eq('is_active', true)
                    .single();

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

            // Batch insert
            if (records.length > 0) {
                const { error } = await supabase
                    .from('staff_attendance_logs')
                    .insert(records);

                if (error) {
                    console.error('[ZKTeco] Insert error:', error);
                    return res.status(200).send(`ERR: ${error.message}`);
                }

                console.log(`[ZKTeco] Inserted ${records.length} records, skipped ${skipped.length}`);
            }

            return res.status(200).send(`OK: ${records.length}`);

        } catch (error: any) {
            console.error('[ZKTeco] Processing error:', error);
            // Always respond 200 to device to prevent retransmission loops
            return res.status(200).send('OK');
        }
    }

    // Unsupported method
    return res.status(200).send('OK');
}
