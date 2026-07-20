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
            const body = req.body || {};
            const events = Array.isArray(body.Events) ? body.Events : [body];
            const processedCount = 0;

            for (const ev of events) {
                const data = ev.Data || ev.data || {};
                const cardNo = (data.CardNo || data.cardNo || '').toString().trim();
                const userId = (data.UserID || data.userId || '').toString().trim();
                const createTimeStr = data.CreateTime || data.createTime;
                
                if (!cardNo && !userId) continue;

                // Determine timestamp
                let punchTime = new Date();
                if (typeof createTimeStr === 'number') {
                    punchTime = new Date(createTimeStr * 1000);
                } else if (createTimeStr) {
                    punchTime = new Date(createTimeStr);
                }

                // Resolve matching user from Supabase database
                let matchedUserId: string | null = null;
                let matchedInstitutionId: string | null = null;

                const { data: users } = await supabase
                    .from('users')
                    .select('id, institution_id, phone_number, staff_id')
                    .or(`id.eq.${userId},staff_id.eq.${userId},phone_number.ilike.%${cardNo}%`);

                if (users && users.length > 0) {
                    matchedUserId = users[0].id;
                    matchedInstitutionId = users[0].institution_id;
                }

                // Store in staff_attendance_logs
                await supabase.from('staff_attendance_logs').insert([{
                    institution_id: matchedInstitutionId,
                    staff_id: matchedUserId,
                    device_pin: userId || cardNo,
                    punch_time: punchTime.toISOString(),
                    punch_type: 0,
                    verification_method: 4, // Face / Biometric
                    raw_data: JSON.stringify(data),
                    is_processed: !!matchedUserId
                }]);

                // Also trigger teacher checkin RPC if staff member matched
                if (matchedUserId && matchedInstitutionId) {
                    const hour = punchTime.getHours();
                    const checkinType = hour < 12 ? 'Morning' : 'Afternoon';
                    
                    await supabase.rpc('process_teacher_checkin', {
                        p_teacher_id: matchedUserId,
                        p_institution_id: matchedInstitutionId,
                        p_checkin_type: checkinType,
                        p_location: 'Dahua Biometric Terminal',
                        p_notes: 'Biometric Login Verified'
                    }).catch(err => console.error('[Dahua Webhook] RPC checkin error:', err));
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
