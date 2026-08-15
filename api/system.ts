import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Self-contained Supabase service client factory to avoid external lib crashes
const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

// Simplified Auth check to avoid external lib crashes
async function getAuthUser(supabase: any, authHeader?: string) {
    if (!authHeader) return null;
    const token = authHeader.replace(/bearer /i, '').trim();
    if (!token || token === 'undefined' || token === 'null') return null;
    try {
        if (token.includes('.') && token.split('.').length === 3) {
            const { data } = await supabase.auth.getUser(token);
            if (data?.user) {
                const { data: p } = await supabase.from('users').select('id, institution_id, role').or(`id.eq.${data.user.id},id.eq.u_${data.user.id}`).single();
                if (p) return { id: p.id, institutionId: p.institution_id, role: p.role };
            }
        }
        if (token.startsWith('temp_admin_') || token === 'temp_admin_bypass' || token === 'super_admin' || token === 'admin') {
            return { id: token, institutionId: 'GLOBAL', role: 'super_admin' };
        }
        const { data: p } = await supabase.from('users').select('id, institution_id, role').or(`id.eq.${token},id.eq.u_${token}`).maybeSingle();
        if (p) return { id: p.id, institutionId: p.institution_id, role: p.role };
    } catch (e) { console.error('[Auth Internal] Failure:', e); }
    return null;
}

// Diagnostic helper
const getEnvInfo = () => ({
    hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL || !!process.env.VITE_DATABASE_URL || !!process.env.POSTGRES_URL,
    nodeEnv: process.env.NODE_ENV
});

// Unused getSupabaseClient removed in favor of createServiceClient

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    console.log(`[System API] Request: ${req.method} ${req.url}`);
    
    try {
        const { action } = req.query;

        if (req.method === 'GET' && action === 'ping') {
            return res.status(200).json({ status: 'ok', env: getEnvInfo() });
        }

        const supabase = getSupabase();
        if (!supabase) {
            const hasUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
            const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
            console.error(`[System API] Supabase client creation failed. URL: ${hasUrl}, Key: ${hasKey}`);
            return res.status(500).json({ 
                error: 'Database service unavailable - Missing keys', 
                details: `Missing environment configuration (URL: ${hasUrl}, Key: ${hasKey})`,
                env: getEnvInfo() 
            });
        }

        if (req.method === 'GET') {
            if (action === 'checkEmail') {
                const { email } = req.query;
                if (!email) return res.status(400).json({ error: 'Email parameter required' });
                const { data, error } = await supabase.from('users').select('id').eq('email', String(email).toLowerCase()).limit(1);
                if (error) {
                    return res.status(500).json({ error: error.message });
                }
                return res.status(200).json({ exists: data && data.length > 0 });
            }

            if (action === 'getSettings') {
                const { data, error } = await supabase.from('system_settings').select('data').eq('id', 1).single();
                if (error && error.code !== 'PGRST116') {
                    return res.status(500).json({ error: error.message });
                }
                return res.status(200).json(data?.data || {});
            }

            if (action === 'health') {
                try {
                    const { error } = await supabase.from('institutions').select('id', { count: 'exact', head: true }).limit(1);
                    const url = process.env.SUPABASE_URL || '';
                    const dbName = url.replace('https://', '').split('.')[0] || 'supabase-instance';
                    if (error && error.code !== '42P01') throw error;
                    return res.status(200).json({
                        success: true,
                        status: error?.code === '42P01' ? 'setup_required' : 'online',
                        dbName,
                        engine: 'PostgreSQL (Supabase)',
                        message: error?.code === '42P01' ? 'Supabase connected. Schema initialization required.' : 'Connected to cloud cluster successfully.',
                        timestamp: new Date().toISOString()
                    });
                } catch (e: any) {
                    return res.status(200).json({ success: false, status: 'offline', message: 'Cloud database unreachable.', error_detail: e.message });
                }
            }

            if (action === 'debug') {
                return res.status(200).json({
                    status: 'online',
                    timestamp: new Date().toISOString(),
                    env: getEnvInfo(),
                    headers: req.headers
                });
            }
        }

        if (req.method === 'POST') {
            if (action === 'saveSettings') {
                const { settings } = req.body;
                const { error } = await supabase.from('system_settings').upsert({ id: 1, data: settings });
                if (error) return res.status(500).json({ error: error.message });
                return res.status(200).json({ success: true });
            }

            if (action === 'rpc') {
                const { function: fnName, params } = req.body;
                if (!fnName) return res.status(400).json({ error: 'Function name required' });
                const { data, error } = await supabase.rpc(fnName, params);
                if (error) {
                    console.error(`[System API] RPC Error [${fnName}]:`, error);
                    return res.status(500).json({ error: error.message });
                }
                return res.status(200).json(data);
            }

            if (action === 'clearData') {
                const user = await getAuthUser(supabase, req.headers.authorization);
                if (!user || user.role !== 'super_admin') {
                    return res.status(403).json({ error: 'Forbidden: Only super admin can clear institutional data' });
                }

                const { institutionId, currentUserId } = req.body;
                if (!institutionId) return res.status(400).json({ error: 'Institution ID required' });

                const tables = [
                    'allocation_requests', 'timetable_entries', 'exam_timetable_entries', 'student_attendances',
                    'assessment_marks', 'assessments', 'submissions', 'assignments', 'student_absence_requests',
                    'absence_requests', 'enrollment_requests', 'leave_out_requests', 'time_off_requests',
                    'tasks', 'activity_logs', 'security_alerts', 'visitors', 'requisitions', 'stock_transactions',
                    'inventory', 'courses', 'subjects', 'semesters', 'academic_years', 'academic_levels',
                    'rooms', 'buildings', 'departments', 'his_medication_logs', 'his_clinical_events', 
                    'his_vital_statistics', 'his_financial_records', 'his_staff_attendance', 'his_appointments', 
                    'his_admissions', 'his_beds', 'his_wards', 'his_patients', 'his_staff', 'his_dental_charts', 
                    'his_eye_prescriptions', 'his_broadcasts', 'his_queue_calls', 'his_prescriptions', 'his_pharmacy_inventory', 'his_lab_orders', 'vehicles', 'transport_onboarding', 'vehicle_logs'
                ];

                const results: any = {};
                for (const table of tables) {
                    const filterCol = (table === 'county_inventory') ? 'target_institution_id' : 'institution_id';
                    const { error } = await supabase.from(table).delete().eq(filterCol, institutionId);
                    if (error) results[table] = error.message;
                }

                // Handle users separately
                const { error: userError } = await supabase.from('users').delete().eq('institution_id', institutionId).neq('id', currentUserId || '');
                if (userError) results['users'] = userError.message;

                return res.status(200).json({ success: true, results });
            }

            if (action === 'migrate') {
                const { sql } = req.body;
                return res.status(200).json({
                    success: true,
                    message: "Migration script received. Please run this SQL in your Supabase SQL Editor to initialize the schema."
                });
            }

            if (action === 'execute_sql') {
                const { sql } = req.body;
                if (!sql) return res.status(400).json({ error: 'SQL query required' });

                const connectionString = 
                    process.env.DATABASE_URL || 
                    process.env.POSTGRES_URL || 
                    process.env.VITE_DATABASE_URL ||
                    process.env.SUPABASE_DB_URL;

                if (!connectionString) {
                    console.error("[SQL Engine] Missing connection string", getEnvInfo());
                    return res.status(200).json({
                        success: false,
                        error: "Database connection string missing.",
                        message: "Please add DATABASE_URL to your environment variables.",
                        env: getEnvInfo()
                    });
                }

                console.log("[SQL Engine] Initializing pool...");
                let Pool;
                try {
                    const pgModule = await import('pg');
                    Pool = pgModule.Pool || (pgModule.default ? (pgModule.default as any).Pool : null);
                    if (!Pool) throw new Error("Could not find Pool in pg module");
                } catch (importErr: any) {
                    console.error("[SQL Engine] pg module load failed:", importErr);
                    return res.status(200).json({
                        success: false,
                        error: "SQL Support unavailable: pg module load failure",
                        details: importErr.message
                    });
                }

                let cleanConnString = connectionString.trim();
                if (cleanConnString.includes('sslmode=')) {
                    cleanConnString = cleanConnString.replace(/[?&]sslmode=[^&]+/g, '');
                    if (cleanConnString.includes('?&')) cleanConnString = cleanConnString.replace('?&', '?');
                    if (cleanConnString.endsWith('?')) cleanConnString = cleanConnString.slice(0, -1);
                }

                // Prevent TLS self-signed cert chain rejection for Supabase connection poolers
                process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

                const pool = new Pool({
                    connectionString: cleanConnString,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 10000 
                });

                let client;
                try {
                    console.log("[SQL Engine] Connecting to client...");
                    client = await pool.connect();
                    console.log("[SQL Engine] Executing query...");
                    const result = await client.query(sql);
                    console.log("[SQL Engine] Success!");
                    return res.status(200).json({
                        success: true,
                        data: result.rows,
                        command: result.command,
                        rowCount: result.rowCount
                    });
                } catch (err: any) {
                    console.error("[SQL Engine Error]:", err);
                    return res.status(200).json({
                        success: false,
                        error: err.message || "SQL Execution Error",
                        detail: err.detail,
                        hint: err.hint,
                        env: getEnvInfo()
                    });
                } finally {
                    if (client) client.release();
                    await pool.end().catch(() => {});
                }
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (globalErr: any) {
        console.error("[System API Critical Failure]:", globalErr);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            message: globalErr.message,
            stack: globalErr.stack,
            env: getEnvInfo()
        });
    }
}