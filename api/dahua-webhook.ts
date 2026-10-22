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
