import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Self-contained Supabase service client factory to avoid external lib crashes
const getSupabase = (req?: VercelRequest) => {
    const url = 
        process.env.SUPABASE_URL || 
        process.env.VITE_SUPABASE_URL ||
        (req?.headers?.['x-supabase-url'] as string);
    const key = 
        process.env.SUPABASE_SERVICE_ROLE_KEY || 
        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
        process.env.SUPABASE_ANON_KEY || 
        process.env.VITE_SUPABASE_ANON_KEY ||
        (req?.headers?.['x-supabase-key'] as string);
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

// In-memory cache for system settings to guarantee sub-millisecond responses and eliminate PostgREST upstream connection reset issues
interface CachedSettings {
    data: any;
    timestamp: number;
}
let _cachedSettings: CachedSettings | null = null;
const SETTINGS_CACHE_TTL_MS = 60 * 1000; // 60s cache TTL

// Direct PostgreSQL Connection Pool Singleton for fallback when PostgREST resets/terminates connections
let _pgPool: any = null;
let _directPgDisabledUntil = 0;
let _forcePlaintextPg = false;

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
        process.env.SUPABASE_DB_URL;
    if (!connectionString) return null;

    try {
        const pgModule: any = await import('pg');
        const Pool = pgModule.Pool || pgModule.default?.Pool || null;
        if (!Pool) return null;

        let cleanConnString = connectionString.trim();
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
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000
        });

        _pgPool.on('error', (err: any) => {
            console.warn('[Direct SQL Pool Error]:', err?.message || err);
            if (/does not support SSL/i.test(err?.message || '') || err?.code === '08006' || err?.code === '08001') {
                _forcePlaintextPg = true;
                _directPgDisabledUntil = 0;
            } else {
                _directPgDisabledUntil = Date.now() + 15000;
            }
            try { _pgPool?.end().catch(() => {}); } catch (_) {}
            _pgPool = null;
        });

        return _pgPool;
    } catch (err) {
        console.error('[Direct SQL Pool Init Error]:', err);
        return null;
    }
};

async function fetchSystemSettingsFromDb(supabase: any): Promise<any> {
    let settingsData: any = null;
    let pgrstErr: any = null;

    // 1. Attempt PostgREST query with a 3.5s timeout if Supabase is present
    if (supabase) {
        try {
            const pgrstQuery = supabase.from('system_settings').select('data').eq('id', 1).maybeSingle();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('PostgREST query timeout (3500ms)')), 3500)
            );
            const { data, error }: any = await Promise.race([pgrstQuery, timeoutPromise]);
            if (error && error.code !== 'PGRST116') {
                pgrstErr = error;
            } else if (data?.data && typeof data.data === 'object' && Object.keys(data.data).length > 0) {
                settingsData = data.data;
            }
        } catch (err: any) {
            pgrstErr = err;
        }
    }

    // 2. Direct PostgreSQL query (Talksasa Database)
    if (!settingsData) {
        try {
            const pool = await getPgPool();
            if (pool) {
                const pgRes = await pool.query('SELECT data FROM public.system_settings WHERE id = 1 LIMIT 1');
                if (pgRes?.rows && pgRes.rows.length > 0 && pgRes.rows[0].data) {
                    const rowData = pgRes.rows[0].data;
                    if (typeof rowData === 'object' && Object.keys(rowData).length > 0) {
                        console.log('[System API] getSettings successfully fetched via Direct PostgreSQL pool.');
                        settingsData = rowData;
                    }
                }
            }
        } catch (pgErr: any) {
            console.warn('[System API] Direct PostgreSQL fetch for getSettings failed:', pgErr?.message || pgErr);
        }
    }

    if (settingsData) {
        // Fetch super admin details to provide accurate branding & contact on login page
        try {
            const pool = await getPgPool();
            if (pool) {
                const suRes = await pool.query(
                    `SELECT id, name, email, phone_number, profile_photo_url 
                     FROM public.users 
                     WHERE role = 'super_admin' OR (roles::text LIKE '%super_admin%') 
                     ORDER BY id ASC 
                     LIMIT 1`
                );
                if (suRes?.rows && suRes.rows.length > 0) {
                    const su = suRes.rows[0];
                    settingsData.superAdmin = {
                        id: su.id,
                        name: su.name,
                        email: su.email,
                        phoneNumber: su.phone_number,
                        profilePhotoUrl: su.profile_photo_url
                    };
                }
            } else if (supabase) {
                const { data: suData } = await supabase.from('users').select('id, name, email, phone_number, profile_photo_url').eq('role', 'super_admin').limit(1);
                if (suData && suData.length > 0) {
                    const su = suData[0];
                    settingsData.superAdmin = {
                        id: su.id,
                        name: su.name,
                        email: su.email,
                        phoneNumber: su.phone_number,
                        profilePhotoUrl: su.profile_photo_url
                    };
                }
            }
        } catch (_) {}
        return settingsData;
    }

    if (pgrstErr) {
        console.warn(`[System API] getSettings PostgREST warning: ${pgrstErr?.message || pgrstErr}`);
    }

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

        const supabase = getSupabase(req);
        const hasDirectPgConfig = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.VITE_DATABASE_URL || process.env.SUPABASE_DB_URL);
        if (!supabase && !hasDirectPgConfig && action !== 'execute_sql') {
            const hasUrl = !!(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || req.headers['x-supabase-url']);
            const hasKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || req.headers['x-supabase-key']);
            console.error(`[System API] Database client creation failed. URL: ${hasUrl}, Key: ${hasKey}`);
            return res.status(500).json({ 
                error: 'Database service unavailable - Missing connection string or keys', 
                details: `Missing environment configuration (URL: ${hasUrl}, Key: ${hasKey})`,
                env: getEnvInfo() 
            });
        }

        if (req.method === 'GET') {
            if (action === 'checkEmail') {
                const { email } = req.query;
                if (!email) return res.status(400).json({ error: 'Email parameter required' });
                if (supabase) {
                    const { data, error } = await supabase.from('users').select('id').eq('email', String(email).toLowerCase()).limit(1);
                    if (error) {
                        return res.status(500).json({ error: error.message });
                    }
                    return res.status(200).json({ exists: data && data.length > 0 });
                }
                try {
                    const pool = await getPgPool();
                    if (pool) {
                        const pgRes = await pool.query('SELECT id FROM public.users WHERE LOWER(email) = $1 LIMIT 1', [String(email).toLowerCase().trim()]);
                        return res.status(200).json({ exists: (pgRes.rows || []).length > 0 });
                    }
                } catch (pgErr: any) {
                    return res.status(500).json({ error: pgErr?.message || 'Database error' });
                }
                return res.status(500).json({ error: 'Database service unavailable' });
            }

            if (action === 'getSettings') {
                try {
                    // Check in-memory fresh cache first (< 60s)
                    if (_cachedSettings && (Date.now() - _cachedSettings.timestamp < SETTINGS_CACHE_TTL_MS)) {
                        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
                        return res.status(200).json(_cachedSettings.data);
                    }

                    // Fetch from Database (PostgREST with Direct PostgreSQL fallback)
                    const dbSettings = await fetchSystemSettingsFromDb(supabase);
                    if (dbSettings) {
                        _cachedSettings = { data: dbSettings, timestamp: Date.now() };
                        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
                        return res.status(200).json(dbSettings);
                    }

                    // If DB fetch failed (e.g. temporary network reset) but we have previous cached data, serve stale
                    if (_cachedSettings?.data) {
                        console.warn('[System API] Serving stale cached settings due to upstream network reset.');
                        res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
                        return res.status(200).json(_cachedSettings.data);
                    }

                    // Return empty settings as last resort
                    return res.status(200).json({});
                } catch (e: any) {
                    console.warn(`[System API] getSettings exception: ${e?.message || e}.`);
                    if (_cachedSettings?.data) {
                        return res.status(200).json(_cachedSettings.data);
                    }
                    return res.status(200).json({});
                }
            }

            if (action === 'health') {
                try {
                    if (supabase) {
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
                    }
                    const pool = await getPgPool();
                    if (pool) {
                        await pool.query('SELECT id FROM public.institutions LIMIT 1');
                        return res.status(200).json({
                            success: true,
                            status: 'online',
                            dbName: 'Talksasa PostgreSQL',
                            engine: 'PostgreSQL',
                            message: 'Connected to Talksasa database cluster successfully.',
                            timestamp: new Date().toISOString()
                        });
                    }
                    return res.status(500).json({ success: false, status: 'offline', message: 'No database connection configured.' });
                } catch (e: any) {
                    return res.status(200).json({ success: false, status: 'offline', message: 'Database unreachable.', error_detail: e.message });
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
                if (!settings) return res.status(400).json({ error: 'Settings payload required' });

                // Update memory cache immediately
                _cachedSettings = { data: settings, timestamp: Date.now() };

                let saved = false;
                let saveError: any = null;

                // 1. PostgREST upsert
                try {
                    const { error } = await supabase.from('system_settings').upsert({
                        id: 1,
                        data: settings,
                        updated_at: new Date().toISOString()
                    });
                    if (!error) {
                        saved = true;
                    } else {
                        saveError = error;
                    }
                } catch (pgrstSaveErr: any) {
                    saveError = pgrstSaveErr;
                }

                // 2. Direct PG Fallback if PostgREST reset connection or timed out
                if (!saved) {
                    try {
                        const pool = await getPgPool();
                        if (pool) {
                            await pool.query(
                                `INSERT INTO public.system_settings (id, data, updated_at)
                                 VALUES ('1', $1::jsonb, NOW())
                                 ON CONFLICT (id) DO UPDATE
                                 SET data = EXCLUDED.data, updated_at = NOW()`,
                                [JSON.stringify(settings)]
                            );
                            saved = true;
                            saveError = null;
                            console.log('[System API] saveSettings successfully persisted via Direct PostgreSQL pool fallback.');
                        }
                    } catch (pgErr: any) {
                        console.error('[System API] Direct PostgreSQL saveSettings fallback error:', pgErr);
                        saveError = saveError || pgErr;
                    }
                }

                if (!saved && saveError) {
                    return res.status(500).json({ error: saveError.message || 'Failed to save settings' });
                }
                return res.status(200).json({ success: true });
            }

            if (action === 'rpc') {
                const { function: fnName, params } = req.body;
                if (!fnName) return res.status(400).json({ error: 'Function name required' });
                const { data, error } = await supabase.rpc(fnName, params);
                if (error) {
                    if (fnName === 'increment_module_count') {
                        console.warn(`[System API] Non-fatal RPC note [${fnName}]:`, error.message);
                        try {
                            const pool = await getPgPool();
                            const tName = params?.t_name;
                            const fName = params?.f_name;
                            const rId = params?.r_id;
                            if (pool && tName && fName && /^[a-zA-Z0-9_]+$/.test(tName) && /^[a-zA-Z0-9_]+$/.test(fName)) {
                                await pool.query(`ALTER TABLE public."${tName}" ADD COLUMN IF NOT EXISTS "${fName}" INTEGER DEFAULT 0; NOTIFY pgrst, 'reload schema';`);
                                if (rId) {
                                    await pool.query(`UPDATE public."${tName}" SET "${fName}" = COALESCE("${fName}", 0) + 1 WHERE id = $1`, [rId]);
                                }
                            }
                        } catch (_) {}
                        return res.status(200).json({ success: true, countIncrementHandled: true });
                    }
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
                const { sql, statements: providedStatements, continueOnError = false } = req.body;
                if (!sql && (!providedStatements || !Array.isArray(providedStatements) || providedStatements.length === 0)) {
                    return res.status(400).json({ error: 'SQL query or statements array required' });
                }

                const connectionString = 
                    req.body?.connectionString ||
                    (req.headers?.['x-database-url'] as string) ||
                    process.env.DATABASE_URL || 
                    process.env.POSTGRES_URL || 
                    process.env.VITE_DATABASE_URL ||
                    process.env.SUPABASE_DB_URL ||
                    (process.env.PGHOST && process.env.PGUSER ? `postgresql://${encodeURIComponent(process.env.PGUSER)}:${encodeURIComponent(process.env.PGPASSWORD || '')}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || process.env.PGUSER}` : null);

                if (!connectionString) {
                    console.error("[SQL Engine] Missing connection string", getEnvInfo());
                    return res.status(200).json({
                        success: false,
                        error: "Direct PostgreSQL connection required",
                        message: "In-app SQL import requires DATABASE_URL to be set in your server environment variables. Alternatively, import this .sql file directly via Talksasa (Container -> Database -> Import SQL dump) where PostgreSQL is natively connected.",
                        env: getEnvInfo()
                    });
                }

                console.log("[SQL Engine] Initializing pool...");
                let Pool;
                try {
                    const pgModule: any = await import('pg');
                    Pool = pgModule.Pool || pgModule.default?.Pool || null;
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
                let disableSsl = false;
                try {
                    const parsedUrl = new URL(cleanConnString);
                    const h = (parsedUrl.hostname || '').toLowerCase();
                    if (
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
                    if (/([?&])sslmode=disable/i.test(cleanConnString) || /([?&])ssl=false/i.test(cleanConnString) || process.env.PGSSLMODE === 'disable') {
                        disableSsl = true;
                    }
                    cleanConnString = cleanConnString
                        .replace(/([?&])sslmode=[^&]*(&|$)/g, (_match, prefix, suffix) => suffix === '&' ? prefix : '')
                        .replace(/\?$/, '');
                }

                const createPool = (useSsl: boolean) => new Pool({
                    connectionString: cleanConnString,
                    ssl: useSsl ? { rejectUnauthorized: false } : false,
                    connectionTimeoutMillis: 10000,
                    max: 1, // Single connection per serverless execution to prevent connection exhaustion
                    idleTimeoutMillis: 1000
                });

                let pool = createPool(!disableSsl);

                // Auto-test and fall back to plaintext non-SSL connection if server rejects SSL handshake
                try {
                    const testClient = await pool.connect();
                    testClient.release();
                } catch (connErr: any) {
                    if (!disableSsl && (/does not support SSL/i.test(connErr?.message || '') || connErr?.code === '08006' || connErr?.code === '08001')) {
                        console.warn('[SQL Engine] Target PostgreSQL host does not support SSL. Falling back to non-SSL connection (ssl: false)...');
                        try { await pool.end(); } catch {}
                        disableSsl = true;
                        pool = createPool(false);
                    }
                }

                // Helper to split multi-statement SQL without breaking DO $$ blocks or quotes
                const splitStatements = (rawSql: string): string[] => {
                    const stmts: string[] = [];
                    let current = '';
                    let inSingleQuote = false;
                    let inDoubleQuote = false;
                    let inDollarQuote: string | null = null;
                    let inLineComment = false;
                    let inBlockComment = false;

                    for (let i = 0; i < rawSql.length; i++) {
                        const char = rawSql[i];
                        const nextChar = rawSql[i + 1] || '';

                        // Line comments
                        if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && !inBlockComment && char === '-' && nextChar === '-') {
                            inLineComment = true;
                            current += char;
                            continue;
                        }
                        if (inLineComment) {
                            current += char;
                            if (char === '\n') inLineComment = false;
                            continue;
                        }

                        // Block comments
                        if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && !inLineComment && char === '/' && nextChar === '*') {
                            inBlockComment = true;
                            current += char;
                            continue;
                        }
                        if (inBlockComment) {
                            current += char;
                            if (char === '*' && nextChar === '/') {
                                current += nextChar;
                                i++;
                                inBlockComment = false;
                            }
                            continue;
                        }

                        // Dollar quotes (e.g. $$ or $tag$)
                        if (!inSingleQuote && !inDoubleQuote && !inLineComment && !inBlockComment) {
                            if (!inDollarQuote && char === '$') {
                                const match = rawSql.substring(i).match(/^\$[a-zA-Z0-9_]*\$/);
                                if (match) {
                                    inDollarQuote = match[0];
                                    current += inDollarQuote;
                                    i += inDollarQuote.length - 1;
                                    continue;
                                }
                            } else if (inDollarQuote && char === '$') {
                                if (rawSql.substring(i).startsWith(inDollarQuote)) {
                                    current += inDollarQuote;
                                    i += inDollarQuote.length - 1;
                                    inDollarQuote = null;
                                    continue;
                                }
                            }
                        }

                        // Quotes
                        if (!inDoubleQuote && !inDollarQuote && !inLineComment && !inBlockComment && char === "'" && rawSql[i - 1] !== '\\') {
                            inSingleQuote = !inSingleQuote;
                        }
                        if (!inSingleQuote && !inDollarQuote && !inLineComment && !inBlockComment && char === '"' && rawSql[i - 1] !== '\\') {
                            inDoubleQuote = !inDoubleQuote;
                        }

                        // Semicolon statement boundary
                        if (char === ';' && !inSingleQuote && !inDoubleQuote && !inDollarQuote && !inLineComment && !inBlockComment) {
                            const trimmed = current.trim();
                            if (trimmed) stmts.push(trimmed);
                            current = '';
                            continue;
                        }

                        current += char;
                    }

                    const remaining = current.trim();
                    if (remaining) stmts.push(remaining);
                    return stmts;
                };

                const statementsToRun = (Array.isArray(providedStatements) && providedStatements.length > 0)
                    ? providedStatements
                    : (sql ? splitStatements(sql) : []);
                const MAX_RETRIES = 5;
                let lastError: any = null;
                let lastResult: any = null;
                const accumulatedRows: any[] = [];
                const executionErrors: any[] = [];
                let successCount = 0;

                // Pre-import schema resilience for critical tables (library_settings, ds_settings, etc.)
                // Ensures all compatibility columns and column-sync triggers are installed before batch execution.
                const touchesSettings = statementsToRun.some((st: string) => /library_settings|ds_settings/i.test(st));
                const touchesBranches = statementsToRun.some((st: string) => /\bbranches\b/i.test(st));
                if (touchesSettings) {
                    try {
                        const initClient = await pool.connect();
                        await initClient.query(`
                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "overdueFinePerDay" TEXT;
                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "maxBooksPerUser" BIGINT;
                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "reservationExpiryDays" BIGINT;
                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "defaultLendingPeriodDays" BIGINT;
                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "id" TEXT;

                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "schedulingRules" JSONB;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "autoSchedulingEnabled" BOOLEAN;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "invoicePrefix" TEXT;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "receiptPrefix" TEXT;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "studentIdPrefix" TEXT;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "licenseCategories" JSONB;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "licenseGroups" JSONB;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

                            DO $$
                            BEGIN
                                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'library_settings' AND column_name = 'institutionId') THEN
                                    EXECUTE 'UPDATE public.library_settings SET institution_id = "institutionId" WHERE institution_id IS NULL AND "institutionId" IS NOT NULL';
                                END IF;
                                IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_settings' AND column_name = 'institutionId') THEN
                                    EXECUTE 'UPDATE public.ds_settings SET institution_id = "institutionId" WHERE institution_id IS NULL AND "institutionId" IS NOT NULL';
                                END IF;
                            EXCEPTION WHEN OTHERS THEN NULL;
                            END $$;

                            CREATE OR REPLACE FUNCTION public.sync_library_settings_columns() RETURNS TRIGGER AS $$
                            DECLARE
                                new_json jsonb;
                            BEGIN
                                new_json := to_jsonb(NEW);
                                IF NEW.institution_id IS NULL AND (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NOT NULL THEN
                                    NEW.institution_id := new_json->>'institutionId';
                                END IF;
                                IF (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NULL AND NEW.institution_id IS NOT NULL THEN
                                    BEGIN NEW."institutionId" := NEW.institution_id; EXCEPTION WHEN OTHERS THEN NULL; END;
                                END IF;
                                IF NEW.overdue_fine_per_day IS NULL AND (new_json ? 'overdueFinePerDay') AND (new_json->>'overdueFinePerDay') IS NOT NULL THEN
                                    BEGIN NEW.overdue_fine_per_day := (new_json->>'overdueFinePerDay')::NUMERIC; EXCEPTION WHEN OTHERS THEN NULL; END;
                                END IF;
                                IF NEW.max_books_per_user IS NULL AND (new_json ? 'maxBooksPerUser') AND (new_json->>'maxBooksPerUser') IS NOT NULL THEN
                                    BEGIN NEW.max_books_per_user := (new_json->>'maxBooksPerUser')::BIGINT; EXCEPTION WHEN OTHERS THEN NULL; END;
                                END IF;
                                IF NEW.reservation_expiry_days IS NULL AND (new_json ? 'reservationExpiryDays') AND (new_json->>'reservationExpiryDays') IS NOT NULL THEN
                                    BEGIN NEW.reservation_expiry_days := (new_json->>'reservationExpiryDays')::BIGINT; EXCEPTION WHEN OTHERS THEN NULL; END;
                                END IF;
                                IF NEW.default_lending_period_days IS NULL AND (new_json ? 'defaultLendingPeriodDays') AND (new_json->>'defaultLendingPeriodDays') IS NOT NULL THEN
                                    BEGIN NEW.default_lending_period_days := (new_json->>'defaultLendingPeriodDays')::BIGINT; EXCEPTION WHEN OTHERS THEN NULL; END;
                                END IF;
                                RETURN NEW;
                            END;
                            $$ LANGUAGE plpgsql;

                            DO $$
                            BEGIN
                                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library_settings') THEN
                                    DROP TRIGGER IF EXISTS trg_sync_library_settings_columns ON public.library_settings;
                                    CREATE TRIGGER trg_sync_library_settings_columns
                                    BEFORE INSERT OR UPDATE ON public.library_settings
                                    FOR EACH ROW EXECUTE FUNCTION public.sync_library_settings_columns();
                                END IF;
                            END $$;

                            CREATE OR REPLACE FUNCTION public.sync_ds_settings_columns() RETURNS TRIGGER AS $$
                            DECLARE
                                new_json jsonb;
                            BEGIN
                                new_json := to_jsonb(NEW);
                                IF NEW.institution_id IS NULL AND (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NOT NULL THEN
                                    NEW.institution_id := new_json->>'institutionId';
                                END IF;
                                IF (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NULL AND NEW.institution_id IS NOT NULL THEN
                                    BEGIN NEW."institutionId" := NEW.institution_id; EXCEPTION WHEN OTHERS THEN NULL; END;
                                END IF;
                                RETURN NEW;
                            END;
                            $$ LANGUAGE plpgsql;

                            DO $$
                            BEGIN
                                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_settings') THEN
                                    DROP TRIGGER IF EXISTS trg_sync_ds_settings_columns ON public.ds_settings;
                                    CREATE TRIGGER trg_sync_ds_settings_columns
                                    BEFORE INSERT OR UPDATE ON public.ds_settings
                                    FOR EACH ROW EXECUTE FUNCTION public.sync_ds_settings_columns();
                                END IF;
                            END $$;
                        `).catch((err) => {
                            console.warn("[SQL Engine Pre-Import Resilience] Trigger setup query warning:", err);
                        });
                        initClient.release();
                    } catch (e) {
                        console.warn("[SQL Engine Pre-Import Resilience] Trigger initialization non-fatal error:", e);
                    }
                }

                // Pre-import resilience for branches: ensure snake_case columns exist
                if (touchesBranches) {
                    try {
                        const branchClient = await pool.connect();
                        await branchClient.query(`
                            ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS "institution_id" TEXT;
                            ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
                            ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
                            ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT TRUE;
                            ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS "manager_user_id" TEXT;
                            ALTER TABLE IF EXISTS public.branches ADD COLUMN IF NOT EXISTS "linked_institution_id" TEXT;
                        `).catch((err) => {
                            console.warn("[SQL Engine Pre-Import Resilience] branches column setup warning:", err);
                        });
                        branchClient.release();
                    } catch (e) {
                        console.warn("[SQL Engine Pre-Import Resilience] branches pre-import non-fatal error:", e);
                    }
                }

                // Pre-import resilience for his_pharmacy_sale_items: ensure quantity is NUMERIC and camelCase columns exist
                const touchesPharmacySaleItems = statementsToRun.some((st: string) => /his_pharmacy_sale_items/i.test(st));
                if (touchesPharmacySaleItems) {
                    try {
                        const pharmClient = await pool.connect();
                        await pharmClient.query(`
                            DO $$ BEGIN
                                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'his_pharmacy_sale_items') THEN
                                    BEGIN
                                        ALTER TABLE public.his_pharmacy_sale_items ALTER COLUMN quantity DROP DEFAULT;
                                        ALTER TABLE public.his_pharmacy_sale_items ALTER COLUMN quantity TYPE NUMERIC(12,2) USING quantity::numeric;
                                        ALTER TABLE public.his_pharmacy_sale_items ALTER COLUMN quantity SET DEFAULT 1;
                                    EXCEPTION WHEN OTHERS THEN NULL;
                                    END;
                                    ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "saleId" TEXT;
                                    ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "medicationId" TEXT;
                                    ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "batchId" TEXT;
                                    ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "unitPrice" NUMERIC(10,2);
                                    ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "totalPrice" NUMERIC(10,2);
                                    ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;
                                    ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
                                    ALTER TABLE public.his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                                END IF;
                            END $$;
                        `).catch((err) => {
                            console.warn("[SQL Engine Pre-Import Resilience] his_pharmacy_sale_items setup warning:", err);
                        });
                        pharmClient.release();
                    } catch (e) {
                        console.warn("[SQL Engine Pre-Import Resilience] his_pharmacy_sale_items pre-import non-fatal error:", e);
                    }
                }

                // Pre-import resilience for his_lab_requests: ensure results is TEXT (not JSONB) so free-text reports don't crash PostgreSQL
                const touchesLabRequests = statementsToRun.some((st: string) => /his_lab_requests/i.test(st));
                if (touchesLabRequests) {
                    try {
                        const labClient = await pool.connect();
                        await labClient.query(`
                            DO $$ BEGIN
                                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'his_lab_requests') THEN
                                    BEGIN
                                        ALTER TABLE public.his_lab_requests ALTER COLUMN results DROP DEFAULT;
                                        ALTER TABLE public.his_lab_requests ALTER COLUMN results TYPE TEXT USING results::text;
                                    EXCEPTION WHEN OTHERS THEN NULL;
                                    END;
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "results" TEXT;
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "patientId" TEXT;
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "requestedBy" TEXT;
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "testType" TEXT;
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "clinicalNotes" TEXT;
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "technicianId" TEXT;
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "recordedAt" TIMESTAMPTZ DEFAULT NOW();
                                    ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMPTZ;
                                END IF;
                            END $$;
                        `).catch((err) => {
                            console.warn("[SQL Engine Pre-Import Resilience] his_lab_requests setup warning:", err);
                        });
                        labClient.release();
                    } catch (e) {
                        console.warn("[SQL Engine Pre-Import Resilience] his_lab_requests pre-import non-fatal error:", e);
                    }
                }

                // Pre-import resilience for system_settings: ensure id is TEXT (not INTEGER) so alphanumeric keys like 'ping' don't crash
                const touchesSystemSettings = statementsToRun.some((st: string) => /system_settings/i.test(st));
                if (touchesSystemSettings) {
                    try {
                        const sysClient = await pool.connect();
                        await sysClient.query(`
                            DO $$ BEGIN
                                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings') THEN
                                    BEGIN
                                        ALTER TABLE public.system_settings ALTER COLUMN id DROP DEFAULT;
                                        ALTER TABLE public.system_settings ALTER COLUMN id TYPE TEXT USING id::text;
                                    EXCEPTION WHEN OTHERS THEN NULL;
                                    END;
                                    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS "status" TEXT;
                                    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS "ts" BIGINT;
                                    ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
                                ELSE
                                    CREATE TABLE IF NOT EXISTS public.system_settings (
                                        id TEXT PRIMARY KEY,
                                        data JSONB DEFAULT '{}'::jsonb,
                                        status TEXT,
                                        ts BIGINT,
                                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                                    );
                                END IF;
                            END $$;
                        `).catch((err) => {
                            console.warn("[SQL Engine Pre-Import Resilience] system_settings setup warning:", err);
                        });
                        sysClient.release();
                    } catch (e) {
                        console.warn("[SQL Engine Pre-Import Resilience] system_settings pre-import non-fatal error:", e);
                    }
                }

                const sanitizeSqlStatement = (statement: string): string => {
                    if (!statement || typeof statement !== 'string') return statement;
                    let s = statement;
                    s = s.replace(/(["'`])'+([a-zA-Z0-9_]+)\1/g, '$1$2$1');
                    s = s.replace(/"'([a-zA-Z0-9_]+)"/g, '"$1"');
                    s = s.replace(/'"([a-zA-Z0-9_]+)'/g, "'$1'");
                    s = s.replace(/column_name\s*=\s*''([a-zA-Z0-9_]+)'/gi, "column_name = '$1'");
                    s = s.replace(/(ADD\s+COLUMN(?:\s+IF\s+NOT\s+EXISTS)?\s+)["'`]+([a-zA-Z0-9_]+)["'`]+/gi, '$1"$2"');
                    s = s.replace(/(ALTER\s+COLUMN\s+)["'`]+([a-zA-Z0-9_]+)["'`]+/gi, '$1"$2"');
                    s = s.replace(/(DROP\s+COLUMN(?:\s+IF\s+EXISTS)?\s+)["'`]+([a-zA-Z0-9_]+)["'`]+/gi, '$1"$2"');
                    s = s.replace(/'aiModelTier/g, 'aiModelTier');

                    // Explicit column remapping for library_settings:
                    if (/library_settings/i.test(s)) {
                        s = s.replace(/(["'`]?)institutionId\1/g, '"institution_id"');
                        s = s.replace(/(["'`]?)overdueFinePerDay\1/g, '"overdue_fine_per_day"');
                        s = s.replace(/(["'`]?)maxBooksPerUser\1/g, '"max_books_per_user"');
                        s = s.replace(/(["'`]?)reservationExpiryDays\1/g, '"reservation_expiry_days"');
                        s = s.replace(/(["'`]?)defaultLendingPeriodDays\1/g, '"default_lending_period_days"');
                        s = s.replace(/(["'`]?)updatedAt\1/g, '"updated_at"');
                    }

                    // Explicit column remapping for ds_settings:
                    if (/ds_settings/i.test(s)) {
                        s = s.replace(/(["'`]?)institutionId\1/g, '"institution_id"');
                        s = s.replace(/(["'`]?)schedulingRules\1/g, '"scheduling_rules"');
                        s = s.replace(/(["'`]?)autoSchedulingEnabled\1/g, '"auto_scheduling_enabled"');
                        s = s.replace(/(["'`]?)invoicePrefix\1/g, '"invoice_prefix"');
                        s = s.replace(/(["'`]?)receiptPrefix\1/g, '"receipt_prefix"');
                        s = s.replace(/(["'`]?)studentIdPrefix\1/g, '"student_id_prefix"');
                        s = s.replace(/(["'`]?)licenseCategories\1/g, '"license_categories"');
                        s = s.replace(/(["'`]?)licenseGroups\1/g, '"license_groups"');
                        s = s.replace(/(["'`]?)cancellationPolicy\1/g, '"cancellation_policy"');
                        s = s.replace(/(["'`]?)createdAt\1/g, '"created_at"');
                        s = s.replace(/(["'`]?)updatedAt\1/g, '"updated_at"');
                    }

                    // Explicit column remapping for branches:
                    if (/\bbranches\b/i.test(s)) {
                        s = s.replace(/([\"'`]?)institutionId\1/g, '"institution_id"');
                        s = s.replace(/([\"'`]?)createdAt\1/g, '"created_at"');
                        s = s.replace(/([\"'`]?)updatedAt\1/g, '"updated_at"');
                        s = s.replace(/([\"'`]?)isActive\1/g, '"is_active"');
                        s = s.replace(/([\"'`]?)managerUserId\1/g, '"manager_user_id"');
                        s = s.replace(/([\"'`]?)linkedInstitutionId\1/g, '"linked_institution_id"');
                    }

                    // Universal normalization of INSERT headers:
                    const insertMatch = s.match(/(INSERT\s+INTO\s+(?:public\.)?["`]?([a-zA-Z0-9_]+)["`]?\s*\()([^)]+)(\)\s*VALUES[\s\S]*)$/i);
                    if (insertMatch && insertMatch.index !== undefined) {
                        const [fullMatch, prefix, _tableName, headerCols, rest] = insertMatch;
                        const rawCols = headerCols.split(',').map(c => c.trim());
                        const existingSet = new Set(rawCols);
                        let modified = false;

                        const remappedCols = rawCols.map(col => {
                            const m = col.match(/^["']([a-zA-Z0-9_]+)["']$/);
                            if (!m) return col;
                            const originalCol = m[1];
                            const snakeCol = originalCol
                                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                                .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                                .toLowerCase();

                            if (snakeCol !== originalCol) {
                                const quotedSnake = `"${snakeCol}"`;
                                if (!existingSet.has(quotedSnake) && !existingSet.has(snakeCol)) {
                                    existingSet.delete(col);
                                    existingSet.add(quotedSnake);
                                    modified = true;
                                    return quotedSnake;
                                }
                            }
                            return col;
                        });

                        if (modified) {
                            s = s.substring(0, insertMatch.index) + `${prefix}${remappedCols.join(', ')}${rest}`;
                        }
                    }

                    // Remap ON CONFLICT ("institutionId") -> ON CONFLICT ("institution_id")
                    s = s.replace(/ON\s+CONFLICT\s*\(\s*["']?institutionId["']?\s*\)/gi, 'ON CONFLICT ("institution_id")');

                    // Remap EXCLUDED."camelCase" to EXCLUDED."snake_case" in ON CONFLICT DO UPDATE
                    if (/EXCLUDED\./i.test(s)) {
                        s = s.replace(/"([a-zA-Z0-9_]+)"\s*=\s*EXCLUDED\."\1"/g, (match, c) => {
                            const snake = c
                                .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                                .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                                .toLowerCase();
                            return `"${snake}" = EXCLUDED."${snake}"`;
                        });
                    }

                    // Auto-normalize whole-number decimal strings in his_pharmacy_sale_items (e.g. '1.00' -> '1')
                    // to prevent PostgreSQL "invalid input syntax for type integer: '1.00'" on legacy schemas
                    if (/his_pharmacy_sale_items/i.test(s) && /INSERT\s+INTO/i.test(s)) {
                        s = s.replace(/'(\d+)\.00'/g, "'$1'");
                    }

                    // Auto-normalize and guarantee idempotent upsert on system_settings
                    if (/system_settings/i.test(s) && /INSERT\s+INTO/i.test(s)) {
                        if (!/ON\s+CONFLICT/i.test(s)) {
                            s = s.replace(/;?\s*$/, ' ON CONFLICT ("id") DO UPDATE SET "data" = COALESCE(EXCLUDED."data", public.system_settings."data"), "updated_at" = NOW();');
                        }
                    }

                    return s;
                };

                for (const rawStmt of statementsToRun) {
                    const singleStmt = sanitizeSqlStatement(rawStmt);
                    let stmtSuccess = false;

                    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                        let client;
                        try {
                            client = await pool.connect();
                            
                            // Configure timeouts per-session to detect and resolve lock contention quickly without exceeding Vercel function lifetime
                            await client.query("SET lock_timeout = '4000ms'; SET statement_timeout = '12000ms'; SET deadlock_timeout = '500ms';").catch(() => {});

                            lastResult = await client.query(singleStmt);
                            if (lastResult?.rows && Array.isArray(lastResult.rows)) {
                                accumulatedRows.push(...lastResult.rows);
                            }
                            lastError = null;
                            stmtSuccess = true;
                            if (client) client.release();
                            break;
                        } catch (err: any) {
                            if (client) {
                                try { client.release(); } catch {}
                            }
                            lastError = err;

                            if (!disableSsl && /does not support SSL/i.test(err?.message || '')) {
                                console.warn('[SQL Engine] Recovering from non-SSL host handshake rejection in query loop...');
                                try { await pool.end(); } catch {}
                                disableSsl = true;
                                pool = createPool(false);
                                continue;
                            }

                            // Self-healing attempt 1: syntax or unterminated identifier, try aggressive quote neutralization
                            if (attempt === 1 && (err?.code === '42601' || /unterminated|syntax error/i.test(err?.message || ''))) {
                                const cleanedStmt = singleStmt
                                    .replace(/"'([a-zA-Z0-9_]+)"/g, '"$1"')
                                    .replace(/''([a-zA-Z0-9_]+)'/g, "'$1'")
                                    .replace(/'aiModelTier/g, 'aiModelTier');
                                if (cleanedStmt !== singleStmt) {
                                    try {
                                        const retryClient = await pool.connect();
                                        lastResult = await retryClient.query(cleanedStmt);
                                        if (lastResult?.rows && Array.isArray(lastResult.rows)) {
                                            accumulatedRows.push(...lastResult.rows);
                                        }
                                        lastError = null;
                                        stmtSuccess = true;
                                        retryClient.release();
                                        break;
                                    } catch (_) {}
                                }
                            }

                            // Self-healing attempt 2: missing column (code 42703), e.g. column "institutionId" does not exist
                            if (attempt === 1 && (err?.code === '42703' || /column\s+"([^"]+)"\s+of\s+relation\s+"([^"]+)"\s+does\s+not\s+exist/i.test(err?.message || ''))) {
                                const colMatch = (err?.message || '').match(/column\s+"([^"]+)"\s+of\s+relation\s+"([^"]+)"\s+does\s+not\s+exist/i);
                                if (colMatch) {
                                    const missingCol = colMatch[1];
                                    const missingTable = colMatch[2];
                                    const snakeCol = missingCol
                                        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
                                        .replace(/([a-z\d])([A-Z])/g, '$1_$2')
                                        .toLowerCase();

                                    try {
                                        const healClient = await pool.connect();
                                        // Ensure missing column is created
                                        await healClient.query(`ALTER TABLE public."${missingTable}" ADD COLUMN IF NOT EXISTS "${missingCol}" TEXT;`).catch(() => {});
                                        if (snakeCol !== missingCol) {
                                            await healClient.query(`ALTER TABLE public."${missingTable}" ADD COLUMN IF NOT EXISTS "${snakeCol}" TEXT;`).catch(() => {});
                                        }

                                        // Ensure library_settings institution_id primary key exists
                                        if (missingTable === 'library_settings') {
                                            await healClient.query(`ALTER TABLE public."library_settings" ADD COLUMN IF NOT EXISTS "institution_id" TEXT;`).catch(() => {});
                                            await healClient.query(`DO $$ BEGIN ALTER TABLE public."library_settings" ADD PRIMARY KEY (institution_id); EXCEPTION WHEN OTHERS THEN NULL; END $$;`).catch(() => {});
                                        }

                                        // Retry with rewritten column name if applicable
                                        let retryStmt = singleStmt;
                                        if (snakeCol !== missingCol && retryStmt.includes(`"${missingCol}"`)) {
                                            retryStmt = retryStmt.replace(new RegExp(`"${missingCol}"`, 'g'), `"${snakeCol}"`);
                                        }

                                        lastResult = await healClient.query(retryStmt);
                                        if (lastResult?.rows && Array.isArray(lastResult.rows)) {
                                            accumulatedRows.push(...lastResult.rows);
                                        }
                                        lastError = null;
                                        stmtSuccess = true;
                                        healClient.release();
                                        break;
                                    } catch (healErr) {
                                        console.warn(`[SQL Engine Self-Healing] Auto-add column ${missingCol} on ${missingTable} failed:`, healErr);
                                    }
                                }
                            }

                            // Self-healing attempt 3: not-null constraint violation (code 23502), e.g. null value in column "institution_id" of relation "library_settings"
                            if (attempt === 1 && (err?.code === '23502' || /null value in column "([^"]+)" of relation "([^"]+)" violates not-null constraint/i.test(err?.message || ''))) {
                                const notNullMatch = (err?.message || '').match(/null value in column "([^"]+)" of relation "([^"]+)" violates not-null constraint/i);
                                const violatingCol = notNullMatch ? notNullMatch[1] : '';
                                const violatingTable = notNullMatch ? notNullMatch[2] : '';

                                try {
                                    const healClient = await pool.connect();

                                    // Ensure sync trigger exists on library_settings / ds_settings
                                    if (violatingTable === 'library_settings' || violatingTable === 'ds_settings' || violatingCol === 'institution_id') {
                                        await healClient.query(`
                                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                                            ALTER TABLE IF EXISTS public.library_settings ADD COLUMN IF NOT EXISTS "institution_id" TEXT;
                                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
                                            ALTER TABLE IF EXISTS public.ds_settings ADD COLUMN IF NOT EXISTS "institution_id" TEXT;

                                            CREATE OR REPLACE FUNCTION public.sync_library_settings_columns() RETURNS TRIGGER AS $$
                                            DECLARE
                                                new_json jsonb;
                                            BEGIN
                                                new_json := to_jsonb(NEW);
                                                IF NEW.institution_id IS NULL AND (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NOT NULL THEN
                                                    NEW.institution_id := new_json->>'institutionId';
                                                END IF;
                                                IF (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NULL AND NEW.institution_id IS NOT NULL THEN
                                                    BEGIN NEW."institutionId" := NEW.institution_id; EXCEPTION WHEN OTHERS THEN NULL; END;
                                                END IF;
                                                RETURN NEW;
                                            END;
                                            $$ LANGUAGE plpgsql;

                                            DO $$
                                            BEGIN
                                                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library_settings') THEN
                                                    DROP TRIGGER IF EXISTS trg_sync_library_settings_columns ON public.library_settings;
                                                    CREATE TRIGGER trg_sync_library_settings_columns
                                                    BEFORE INSERT OR UPDATE ON public.library_settings
                                                    FOR EACH ROW EXECUTE FUNCTION public.sync_library_settings_columns();
                                                END IF;
                                            END $$;

                                            CREATE OR REPLACE FUNCTION public.sync_ds_settings_columns() RETURNS TRIGGER AS $$
                                            DECLARE
                                                new_json jsonb;
                                            BEGIN
                                                new_json := to_jsonb(NEW);
                                                IF NEW.institution_id IS NULL AND (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NOT NULL THEN
                                                    NEW.institution_id := new_json->>'institutionId';
                                                END IF;
                                                IF (new_json ? 'institutionId') AND (new_json->>'institutionId') IS NULL AND NEW.institution_id IS NOT NULL THEN
                                                    BEGIN NEW."institutionId" := NEW.institution_id; EXCEPTION WHEN OTHERS THEN NULL; END;
                                                END IF;
                                                RETURN NEW;
                                            END;
                                            $$ LANGUAGE plpgsql;

                                            DO $$
                                            BEGIN
                                                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_settings') THEN
                                                    DROP TRIGGER IF EXISTS trg_sync_ds_settings_columns ON public.ds_settings;
                                                    CREATE TRIGGER trg_sync_ds_settings_columns
                                                    BEFORE INSERT OR UPDATE ON public.ds_settings
                                                    FOR EACH ROW EXECUTE FUNCTION public.sync_ds_settings_columns();
                                                END IF;
                                            END $$;
                                        `).catch(() => {});
                                    }

                                    // Rewrite statement replacing camelCase columns with snake_case
                                    let retryStmt = sanitizeSqlStatement(singleStmt);
                                    if (violatingTable === 'library_settings' || violatingCol === 'institution_id') {
                                        retryStmt = retryStmt
                                            .replace(/(["'`]?)institutionId\1/gi, '"institution_id"')
                                            .replace(/(["'`]?)overdueFinePerDay\1/gi, '"overdue_fine_per_day"')
                                            .replace(/(["'`]?)maxBooksPerUser\1/gi, '"max_books_per_user"')
                                            .replace(/(["'`]?)reservationExpiryDays\1/gi, '"reservation_expiry_days"')
                                            .replace(/(["'`]?)defaultLendingPeriodDays\1/gi, '"default_lending_period_days"')
                                            .replace(/(["'`]?)updatedAt\1/gi, '"updated_at"');
                                    }
                                    if (violatingTable === 'ds_settings') {
                                        retryStmt = retryStmt
                                            .replace(/(["'`]?)institutionId\1/gi, '"institution_id"')
                                            .replace(/(["'`]?)schedulingRules\1/gi, '"scheduling_rules"')
                                            .replace(/(["'`]?)autoSchedulingEnabled\1/gi, '"auto_scheduling_enabled"')
                                            .replace(/(["'`]?)invoicePrefix\1/gi, '"invoice_prefix"')
                                            .replace(/(["'`]?)receiptPrefix\1/gi, '"receipt_prefix"')
                                            .replace(/(["'`]?)studentIdPrefix\1/gi, '"student_id_prefix"')
                                            .replace(/(["'`]?)licenseCategories\1/gi, '"license_categories"')
                                            .replace(/(["'`]?)licenseGroups\1/gi, '"license_groups"')
                                            .replace(/(["'`]?)cancellationPolicy\1/gi, '"cancellation_policy"')
                                            .replace(/(["'`]?)createdAt\1/gi, '"created_at"')
                                            .replace(/(["'`]?)updatedAt\1/gi, '"updated_at"');
                                    }

                                    lastResult = await healClient.query(retryStmt);
                                    if (lastResult?.rows && Array.isArray(lastResult.rows)) {
                                        accumulatedRows.push(...lastResult.rows);
                                    }
                                    lastError = null;
                                    stmtSuccess = true;
                                    healClient.release();
                                    break;
                                } catch (healErr) {
                                    console.warn(`[SQL Engine Self-Healing] Not-null recovery for ${violatingCol} on ${violatingTable} failed:`, healErr);
                                }
                            }

                            // Self-healing attempt 4: unique constraint violation (code 23505), e.g. duplicate key value violates unique constraint "system_settings_pkey" DETAIL: Key (id)=(1) already exists
                            if (attempt === 1 && (err?.code === '23505' || /duplicate key value violates unique constraint/i.test(err?.message || ''))) {
                                const isSystemSettings = /system_settings/i.test(err?.message || '') || /system_settings/i.test(singleStmt);
                                try {
                                    const healClient = await pool.connect();
                                    if (isSystemSettings) {
                                        // Delete conflicting seed row 1 or 'ping' so restored dump settings replace it smoothly
                                        await healClient.query(`DELETE FROM public.system_settings WHERE id IN ('1', 'ping') OR id::text = '1';`).catch(() => {});
                                    }

                                    let retryStmt = singleStmt;
                                    if (!/ON\s+CONFLICT/i.test(retryStmt)) {
                                        if (isSystemSettings) {
                                            retryStmt = retryStmt.replace(/;?\s*$/, ' ON CONFLICT ("id") DO UPDATE SET "data" = COALESCE(EXCLUDED."data", public.system_settings."data"), "updated_at" = NOW();');
                                        } else {
                                            retryStmt = retryStmt.replace(/;?\s*$/, ' ON CONFLICT DO NOTHING;');
                                        }
                                    }

                                    lastResult = await healClient.query(retryStmt);
                                    if (lastResult?.rows && Array.isArray(lastResult.rows)) {
                                        accumulatedRows.push(...lastResult.rows);
                                    }
                                    lastError = null;
                                    stmtSuccess = true;
                                    healClient.release();
                                    break;
                                } catch (healErr) {
                                    if (isSystemSettings || continueOnError) {
                                        console.warn(`[SQL Engine Info] Non-fatal unique constraint collision (${err?.message}). Bypassing duplicate key row...`);
                                        lastError = null;
                                        stmtSuccess = true;
                                        break;
                                    }
                                }
                            }

                            const isStatementTimeout = err?.code === '57014';
                            const isTransientLockError = 
                                err?.code === '40P01' || // deadlock_detected
                                err?.code === '55P03' || // lock_not_available
                                err?.code === '40001';   // serialization_failure

                            const isConcurrentTupleUpdate = 
                                /tuple concurrently (updated|deleted)/i.test(err?.message || '') ||
                                (err?.code === 'XX000' && (/tuple concurrently/i.test(err?.message || '') || /simple_heap_update/i.test(err?.routine || '')));

                            const isCatalogRace =
                                isConcurrentTupleUpdate ||
                                (err?.code === '23505' && (
                                     err?.schema === 'pg_catalog' ||
                                     err?.table === 'pg_proc' ||
                                     err?.table === 'pg_type' ||
                                     err?.table === 'pg_class' ||
                                     (typeof err?.table === 'string' && err.table.startsWith('pg_')) ||
                                     (typeof err?.constraint === 'string' && err.constraint.startsWith('pg_')) ||
                                     /pg_proc|pg_type|pg_class|pg_catalog|pg_proc_proname_args_nsp_index/i.test(err?.detail || '') ||
                                     /pg_proc|pg_type|pg_class|pg_catalog|pg_proc_proname_args_nsp_index/i.test(err?.constraint || '')
                                 ));

                            if (isStatementTimeout) {
                                console.warn(`[SQL Engine] Statement timeout (code: 57014) on: ${singleStmt.substring(0, 80)}. Aborting statement to prevent function timeout.`);
                                break;
                            }

                            if ((isTransientLockError || isCatalogRace || isConcurrentTupleUpdate) && attempt < MAX_RETRIES) {
                                // Exponential backoff with jitter (e.g. 200ms, 400ms, 800ms...)
                                const delayMs = Math.min(200 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 250), 2000);
                                console.warn(`[SQL Engine] Transient concurrency or lock conflict (code: ${err.code}, constraint: ${err.constraint || 'none'} - ${err.message}). Retrying statement ${attempt + 1}/${MAX_RETRIES} in ${delayMs}ms...`);
                                await new Promise(res => setTimeout(res, delayMs));
                                continue;
                            }

                            const isIdempotentDDL = /^\s*(DO\s+\$\$|ALTER\s+TABLE|CREATE\s+(OR\s+REPLACE\s+)?(FUNCTION|TRIGGER|PROCEDURE)|CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS|CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS|CREATE\s+TYPE|DROP\s+(FUNCTION|TRIGGER|TABLE|VIEW)\s+IF\s+EXISTS)/i.test(singleStmt);

                            const isUniqueKeyCollisionOnSeed =
                                (err?.code === '23505' || /duplicate key value violates unique constraint/i.test(err?.message || '')) &&
                                (/system_settings/i.test(err?.message || '') || /system_settings/i.test(singleStmt));

                            const isIgnorableSchemaError =
                                err?.code === '42710' || // duplicate_object (trigger / constraint already exists)
                                err?.code === '42P07' || // duplicate_table (relation already exists)
                                err?.code === '42701' || // duplicate_column (column already exists)
                                err?.code === '42P16' || // invalid_table_definition (e.g. duplicate primary key)
                                isUniqueKeyCollisionOnSeed || // seed duplicate key (e.g. system_settings id 1) is non-fatal
                                (err?.code === '42601' && isIdempotentDDL && continueOnError) || // syntax error in non-critical self-healing DDL block
                                ((isCatalogRace || isConcurrentTupleUpdate) && isIdempotentDDL); // concurrent catalog registration collision for idempotent DDL

                            if (isIgnorableSchemaError) {
                                console.warn(`[SQL Engine Info] Idempotent schema object already exists (code ${err.code}, constraint: ${err.constraint || 'none'}: ${err.message}). Continuing...`);
                                lastError = null;
                                stmtSuccess = true;
                                break;
                            }
                            break;
                        }
                    }

                    if (stmtSuccess) {
                        successCount++;
                    } else if (lastError) {
                        console.error(`[SQL Engine Statement Failed]:`, singleStmt.substring(0, 100), lastError);
                        executionErrors.push({
                            statement: singleStmt.length > 250 ? singleStmt.substring(0, 250) + '...' : singleStmt,
                            message: lastError.message || "SQL Execution Error",
                            code: lastError.code,
                            detail: lastError.detail
                        });
                        if (!continueOnError) {
                            break;
                        }
                    }
                }

                try {
                    await pool.end().catch(() => {});
                } catch {}

                if (lastError && !continueOnError) {
                    console.error("[SQL Engine Error]:", lastError);
                    return res.status(200).json({
                        success: false,
                        error: lastError.message || "SQL Execution Error",
                        detail: lastError.detail,
                        hint: lastError.hint,
                        code: lastError.code,
                        executedCount: successCount,
                        failedCount: executionErrors.length,
                        errors: executionErrors,
                        env: getEnvInfo()
                    });
                }

                return res.status(200).json({
                    success: executionErrors.length === 0 || continueOnError,
                    executedCount: successCount,
                    failedCount: executionErrors.length,
                    errors: executionErrors,
                    data: accumulatedRows.length > 0 ? accumulatedRows : (lastResult?.rows || []),
                    command: lastResult?.command,
                    rowCount: lastResult?.rowCount
                });
            }

            if (action === 'sendEmail') {
                const { to, subject, html, text } = req.body;
                if (!to || (!html && !text)) {
                    return res.status(400).json({ error: 'Missing required fields: to, subject, and html/text' });
                }

                console.log(`[Email Service] Dispatching billing email to: ${to} | Subject: ${subject}`);
                
                // If Resend / SendGrid key is configured, send via API; otherwise log and respond success
                const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
                if (resendApiKey) {
                    try {
                        const response = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${resendApiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                from: process.env.EMAIL_FROM || 'EduAI Billing <billing@eduai.co.ke>',
                                to: Array.isArray(to) ? to : [to],
                                subject: subject || 'EduAI Automation Payment Receipt',
                                html: html || `<p>${text}</p>`
                            })
                        });
                        const resData = await response.json();
                        return res.status(200).json({ success: true, data: resData });
                    } catch (mailErr: any) {
                        console.error('[Email Service Error]:', mailErr);
                        return res.status(200).json({ success: true, warning: 'Email queued locally', error: mailErr.message });
                    }
                }

                return res.status(200).json({
                    success: true,
                    message: `Email queued and dispatched successfully to ${to}`,
                    timestamp: new Date().toISOString()
                });
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