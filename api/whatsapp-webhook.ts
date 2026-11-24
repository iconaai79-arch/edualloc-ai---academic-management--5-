import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, SchemaType, type FunctionDeclaration } from '@google/generative-ai';

// ─── Database Factories (Direct PostgreSQL + Supabase Service Role) ─────────

const getSupabase = () => {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
};

let _pgPool: any = null;
let _forcePlaintextPg = false;
let _tablesEnsured = false;

const getPgPool = async () => {
    if (process.env.DISABLE_DIRECT_PG === 'true' || process.env.DISABLE_DIRECT_PG === '1') return null;
    if (_pgPool) return _pgPool;
    const dbUrl =
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.VITE_DATABASE_URL ||
        process.env.SUPABASE_DB_URL;
    if (!dbUrl) return null;

    try {
        const pgMod: any = await import('pg');
        const PoolClass = pgMod.Pool || pgMod.default?.Pool;
        if (!PoolClass) return null;

        let cleanConnString = dbUrl.trim();
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
            if (_forcePlaintextPg || /([?&])sslmode=disable/i.test(cleanConnString) || process.env.PGSSLMODE === 'disable') {
                disableSsl = true;
            }
            cleanConnString = cleanConnString
                .replace(/([?&])sslmode=[^&]*(&|$)/g, (_m, prefix, suffix) => (suffix === '&' ? prefix : ''))
                .replace(/\?$/, '');
        }

        _pgPool = new PoolClass({
            connectionString: cleanConnString,
            ssl: disableSsl ? false : { rejectUnauthorized: false },
            max: 4,
            connectionTimeoutMillis: 6000,
            statement_timeout: 8000,
            idleTimeoutMillis: 20000,
        });
        _pgPool.on('error', (err: any) => {
            if (/does not support SSL/i.test(err?.message || '')) _forcePlaintextPg = true;
            try { _pgPool?.end().catch(() => {}); } catch (_) {}
            _pgPool = null;
        });

        await ensureWhatsAppAgentTables(_pgPool).catch(() => {});
        return _pgPool;
    } catch {
        return null;
    }
};

const ensureWhatsAppAgentTables = async (pool: any) => {
    if (_tablesEnsured || !pool) return;
    await pool.query(`
        CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
            id TEXT PRIMARY KEY,
            institution_id TEXT,
            recipient TEXT,
            message_type TEXT DEFAULT 'text',
            content TEXT,
            status TEXT DEFAULT 'delivered',
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS public.whatsapp_agent_sessions (
            phone_key TEXT PRIMARY KEY,
            institution_id TEXT,
            history JSONB DEFAULT '[]'::jsonb,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
    `);
    _tablesEnsured = true;
};

// ─── Phone & Identity Helpers ───────────────────────────────────────────────

const normalizePhone9 = (raw?: string | null): string => {
    const digits = String(raw || '').replace(/\D/g, '');
    return digits.length >= 9 ? digits.slice(-9) : digits;
};

const STAFF_ADMIN_ROLES = new Set([
    'super_admin', 'admin', 'main_admin', 'principal', 'head_teacher', 'headteacher', 'hoi',
    'deputy', 'dos', 'accountant', 'bursar', 'finance_officer', 'hr', 'hr_officer', 'librarian'
]);

interface LinkedStudent {
    id: string;
    userId: string;
    name: string;
    admissionNumber: string;
    gradeLevel: string;
    stream: string;
    institutionId: string;
}

interface SenderContext {
    senderPhone: string;
    phone9: string;
    institutionId: string;
    institutionName: string;
    tier: 'staff_admin' | 'parent' | 'guest';
    userName: string;
    userRole: string;
    userId?: string;
    linkedStudents: LinkedStudent[];
}

interface WhatsAppGatewayConfig {
    institutionId: string;
    phoneNumberId: string;
    accessToken: string;
    agentEnabled: boolean;
}

async function resolveWhatsAppConfig(supabase: any, pool: any, phoneNumberId?: string, hintInstId?: string): Promise<WhatsAppGatewayConfig> {
    const envToken = process.env.META_WA_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '';
    const envPhoneId = process.env.META_WA_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    let cfg: any = null;

    if (pool) {
        if (phoneNumberId) {
            const r = await pool.query('SELECT * FROM public.whatsapp_configs WHERE meta_phone_number_id = $1 LIMIT 1', [phoneNumberId]).catch(() => ({ rows: [] }));
            cfg = r.rows?.[0] || null;
        }
        if (!cfg && hintInstId && hintInstId !== 'global') {
            const r = await pool.query('SELECT * FROM public.whatsapp_configs WHERE institution_id = $1 LIMIT 1', [hintInstId]).catch(() => ({ rows: [] }));
            cfg = r.rows?.[0] || null;
        }
    } else if (supabase) {
        if (phoneNumberId) {
            const { data } = await supabase.from('whatsapp_configs').select('*').eq('meta_phone_number_id', phoneNumberId).maybeSingle();
            cfg = data || null;
        }
        if (!cfg && hintInstId && hintInstId !== 'global') {
            const { data } = await supabase.from('whatsapp_configs').select('*').eq('institution_id', hintInstId).maybeSingle();
            cfg = data || null;
        }
    }

    return {
        institutionId: cfg?.institution_id || hintInstId || 'global',
        phoneNumberId: phoneNumberId || cfg?.meta_phone_number_id || envPhoneId,
        accessToken: cfg?.meta_access_token || envToken,
        agentEnabled: cfg?.ai_agent_enabled !== false,
    };
}

async function resolveSenderContext(
    supabase: any,
    pool: any,
    senderPhone: string,
    defaultInstId: string
): Promise<SenderContext> {
    const phone9 = normalizePhone9(senderPhone);
    let instId = defaultInstId && defaultInstId !== 'global' ? defaultInstId : '';
    let instName = 'EduAI School';
    let tier: 'staff_admin' | 'parent' | 'guest' = 'guest';
    let userName = 'User';
    let userRole = 'guest';
    let userId: string | undefined;
    const linkedStudents: LinkedStudent[] = [];
    const seenStudentIds = new Set<string>();

    const instCandidates = instId
        ? Array.from(new Set([instId, instId.replace(/^inst_/, ''), `inst_${instId.replace(/^inst_/, '')}`]))
        : [];

    const addStudent = (s: LinkedStudent) => {
        const key = (s.admissionNumber || s.userId || s.id || '').toLowerCase();
        if (!key || seenStudentIds.has(key)) return;
        seenStudentIds.add(key);
        linkedStudents.push(s);
    };

    if (phone9.length >= 9) {
        let matchedUsers: any[] = [];
        let matchedEnrollments: any[] = [];

        if (pool) {
            const uSql = instCandidates.length > 0
                ? `SELECT id, name, role, institution_id, phone_number, admission_number, metadata
                   FROM public.users
                   WHERE (institution_id = ANY($2::text[]))
                     AND (phone_number ILIKE $1 OR metadata->>'parentPhone' ILIKE $1 OR metadata->>'parent_phone' ILIKE $1 OR metadata->>'guardianPhone' ILIKE $1 OR metadata->>'secondaryPhone' ILIKE $1)
                   LIMIT 20`
                : `SELECT id, name, role, institution_id, phone_number, admission_number, metadata
                   FROM public.users
                   WHERE (phone_number ILIKE $1 OR metadata->>'parentPhone' ILIKE $1 OR metadata->>'parent_phone' ILIKE $1 OR metadata->>'guardianPhone' ILIKE $1 OR metadata->>'secondaryPhone' ILIKE $1)
                   LIMIT 20`;
            const uRes = await pool.query(uSql, instCandidates.length > 0 ? [`%${phone9}`, instCandidates] : [`%${phone9}`]).catch(() => ({ rows: [] }));
            matchedUsers = uRes.rows || [];

            const eSql = instCandidates.length > 0
                ? `SELECT id, user_id, institution_id, admission_number, status, metadata
                   FROM public.student_enrollments
                   WHERE (institution_id = ANY($2::text[]))
                     AND (metadata->>'parentPhone' ILIKE $1 OR metadata->>'parent_phone' ILIKE $1 OR metadata->>'guardianPhone' ILIKE $1 OR metadata->>'phone' ILIKE $1 OR metadata->>'secondaryPhone' ILIKE $1)
                   LIMIT 20`
                : `SELECT id, user_id, institution_id, admission_number, status, metadata
                   FROM public.student_enrollments
                   WHERE (metadata->>'parentPhone' ILIKE $1 OR metadata->>'parent_phone' ILIKE $1 OR metadata->>'guardianPhone' ILIKE $1 OR metadata->>'phone' ILIKE $1 OR metadata->>'secondaryPhone' ILIKE $1)
                   LIMIT 20`;
            const eRes = await pool.query(eSql, instCandidates.length > 0 ? [`%${phone9}`, instCandidates] : [`%${phone9}`]).catch(() => ({ rows: [] }));
            matchedEnrollments = eRes.rows || [];
        } else if (supabase) {
            let uq = supabase
                .from('users')
                .select('id, name, role, institution_id, phone_number, admission_number, metadata')
                .or(`phone_number.ilike.%${phone9},metadata->>parentPhone.ilike.%${phone9},metadata->>guardianPhone.ilike.%${phone9}`)
                .limit(20);
            if (instId) uq = uq.eq('institution_id', instId);
            const { data: uData } = await uq;
            matchedUsers = uData || [];

            let eq = supabase
                .from('student_enrollments')
                .select('id, user_id, institution_id, admission_number, status, metadata')
                .or(`metadata->>parentPhone.ilike.%${phone9},metadata->>guardianPhone.ilike.%${phone9},metadata->>phone.ilike.%${phone9}`)
                .limit(20);
            if (instId) eq = eq.eq('institution_id', instId);
            const { data: eData } = await eq;
            matchedEnrollments = eData || [];
        }

        // 1. Check if sender is a Staff / Admin user
        const staffMatch = matchedUsers.find(u => STAFF_ADMIN_ROLES.has(String(u.role || '').toLowerCase().trim()));
        if (staffMatch) {
            tier = 'staff_admin';
            userName = staffMatch.name || 'Staff Member';
            userRole = String(staffMatch.role || 'admin').toLowerCase();
            userId = staffMatch.id;
            if (!instId && staffMatch.institution_id) instId = staffMatch.institution_id;
        }

        // 2. Collect linked student enrollments (for parents)
        for (const e of matchedEnrollments) {
            const meta = typeof e.metadata === 'string' ? (() => { try { return JSON.parse(e.metadata); } catch { return {}; } })() : (e.metadata || {});
            const sName = meta.studentName || meta.fullName || meta.name || `Student ${e.admission_number || ''}`.trim();
            if (!instId && e.institution_id) instId = e.institution_id;
            addStudent({
                id: e.id,
                userId: e.user_id || e.id,
                name: sName,
                admissionNumber: e.admission_number || meta.admissionNumber || '',
                gradeLevel: meta.gradeLevel || meta.studentClass || '',
                stream: meta.stream || '',
                institutionId: e.institution_id || instId,
            });
            if (tier === 'guest') {
                tier = 'parent';
                userName = meta.parentName || meta.guardianName || 'Parent';
                userRole = 'parent';
            }
        }

        // Also include student users matched by phone_number / parentPhone
        for (const u of matchedUsers) {
            const r = String(u.role || '').toLowerCase();
            if (r === 'student' || r === 'learner' || r === 'pupil') {
                const meta = typeof u.metadata === 'string' ? (() => { try { return JSON.parse(u.metadata); } catch { return {}; } })() : (u.metadata || {});
                if (!instId && u.institution_id) instId = u.institution_id;
                addStudent({
                    id: u.id,
                    userId: u.id,
                    name: u.name || meta.studentName || 'Student',
                    admissionNumber: u.admission_number || meta.admissionNumber || '',
                    gradeLevel: meta.gradeLevel || meta.studentClass || '',
                    stream: meta.stream || '',
                    institutionId: u.institution_id || instId,
                });
                if (tier === 'guest') {
                    tier = 'parent';
                    userName = meta.parentName || 'Parent';
                    userRole = 'parent';
                }
            }
        }
    }

    // Resolve Institution Name
    if (instId) {
        if (pool) {
            const r = await pool.query('SELECT name FROM public.institutions WHERE id = $1 LIMIT 1', [instId]).catch(() => ({ rows: [] }));
            if (r.rows?.[0]?.name) instName = r.rows[0].name;
        } else if (supabase) {
            const { data } = await supabase.from('institutions').select('name').eq('id', instId).maybeSingle();
            if (data?.name) instName = data.name;
        }
    }

    return {
        senderPhone,
        phone9,
        institutionId: instId || 'global',
        institutionName: instName,
        tier,
        userName,
        userRole,
        userId,
        linkedStudents,
    };
}

// ─── Agent Tool Implementations (Tenant & Role Scoped) ──────────────────────

async function findStudentsForQuery(
    supabase: any,
    pool: any,
    ctx: SenderContext,
    query?: string
): Promise<LinkedStudent[]> {
    const q = String(query || '').trim().toLowerCase();

    // Parents are STRICTLY restricted to their own linked children
    if (ctx.tier === 'parent') {
        if (!q) return ctx.linkedStudents;
        const filtered = ctx.linkedStudents.filter(s =>
            s.name.toLowerCase().includes(q) || s.admissionNumber.toLowerCase().includes(q)
        );
        return filtered.length > 0 ? filtered : ctx.linkedStudents;
    }

    if (ctx.tier !== 'staff_admin' || !ctx.institutionId || ctx.institutionId === 'global') {
        return [];
    }

    const cleanInst = ctx.institutionId.replace(/^inst_/, '');
    const instCandidates = Array.from(new Set([ctx.institutionId, cleanInst, `inst_${cleanInst}`]));
    const results: LinkedStudent[] = [];

    if (pool) {
        const res = await pool.query(
            `SELECT e.id, e.user_id, e.admission_number, e.institution_id, e.metadata, u.name AS user_name
             FROM public.student_enrollments e
             LEFT JOIN public.users u ON u.id = e.user_id
             WHERE e.institution_id = ANY($1::text[])
               AND ($2 = '' OR LOWER(COALESCE(e.admission_number, '')) LIKE $3
                    OR LOWER(COALESCE(u.name, e.metadata->>'studentName', e.metadata->>'fullName', '')) LIKE $3)
             LIMIT 10`,
            [instCandidates, q, `%${q}%`]
        ).catch(() => ({ rows: [] }));

        for (const r of (res.rows || [])) {
            const meta = typeof r.metadata === 'string' ? (() => { try { return JSON.parse(r.metadata); } catch { return {}; } })() : (r.metadata || {});
            results.push({
                id: r.id,
                userId: r.user_id || r.id,
                name: r.user_name || meta.studentName || meta.fullName || `Student ${r.admission_number || ''}`.trim(),
                admissionNumber: r.admission_number || meta.admissionNumber || '',
                gradeLevel: meta.gradeLevel || meta.studentClass || '',
                stream: meta.stream || '',
                institutionId: r.institution_id || ctx.institutionId,
            });
        }
    } else if (supabase) {
        let sq = supabase
            .from('student_enrollments')
            .select('id, user_id, admission_number, institution_id, metadata')
            .eq('institution_id', ctx.institutionId)
            .limit(10);
        if (q) {
            sq = sq.or(`admission_number.ilike.%${q}%,metadata->>studentName.ilike.%${q}%,metadata->>fullName.ilike.%${q}%`);
        }
        const { data } = await sq;
        for (const r of (data || [])) {
            const meta = r.metadata || {};
            results.push({
                id: r.id,
                userId: r.user_id || r.id,
                name: meta.studentName || meta.fullName || `Student ${r.admission_number || ''}`.trim(),
                admissionNumber: r.admission_number || meta.admissionNumber || '',
                gradeLevel: meta.gradeLevel || meta.studentClass || '',
                stream: meta.stream || '',
                institutionId: r.institution_id || ctx.institutionId,
            });
        }
    }

    return results;
}

async function toolGetStudentFeeBalance(supabase: any, pool: any, ctx: SenderContext, args: { studentQuery?: string }) {
    const targets = await findStudentsForQuery(supabase, pool, ctx, args.studentQuery);
    if (targets.length === 0) {
        return { found: false, message: 'No matching student found for your account.' };
    }

    const summaries: any[] = [];
    for (const st of targets.slice(0, 5)) {
        const idCandidates = Array.from(new Set([st.userId, st.id, st.admissionNumber].filter(Boolean)));
        let invRows: any[] = [];
        let recRows: any[] = [];

        if (pool) {
            const [iRes, rRes] = await Promise.all([
                pool.query(
                    `SELECT id, invoice_number, total_amount, paid_amount, status, due_date, issue_date
                     FROM public.invoices
                     WHERE institution_id = $1
                       AND (student_id = ANY($2::text[]) OR ($3 <> '' AND LOWER(COALESCE(admission_number, '')) = LOWER($3)))
                     ORDER BY issue_date DESC NULLS LAST LIMIT 50`,
                    [st.institutionId, idCandidates, st.admissionNumber || '']
                ).catch(() => ({ rows: [] })),
                pool.query(
                    `SELECT id, receipt_number, amount_paid, payment_date, payment_method
                     FROM public.receipts
                     WHERE institution_id = $1
                       AND (student_id = ANY($2::text[]) OR ($3 <> '' AND LOWER(COALESCE(admission_number, '')) = LOWER($3)))
                     ORDER BY payment_date DESC NULLS LAST LIMIT 50`,
                    [st.institutionId, idCandidates, st.admissionNumber || '']
                ).catch(() => ({ rows: [] })),
            ]);
            invRows = iRes.rows || [];
            recRows = rRes.rows || [];
        } else if (supabase) {
            const [iRes, rRes] = await Promise.all([
                supabase.from('invoices').select('id, invoice_number, total_amount, paid_amount, status, due_date, issue_date').eq('institution_id', st.institutionId).in('student_id', idCandidates).limit(50),
                supabase.from('receipts').select('id, receipt_number, amount_paid, payment_date, payment_method').eq('institution_id', st.institutionId).in('student_id', idCandidates).limit(50),
            ]);
            invRows = iRes.data || [];
            recRows = rRes.data || [];
        }

        const totalBilled = invRows.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
        const totalPaidFromReceipts = recRows.reduce((s, r) => s + (Number(r.amount_paid) || 0), 0);
        const totalPaidFromInvoices = invRows.reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);
        const totalPaid = Math.max(totalPaidFromReceipts, totalPaidFromInvoices);
        const balance = Math.max(0, totalBilled - totalPaid);

        summaries.push({
            studentName: st.name,
            admissionNumber: st.admissionNumber || 'N/A',
            className: [st.gradeLevel, st.stream].filter(Boolean).join(' ') || 'N/A',
            totalBilled: Math.round(totalBilled),
            totalPaid: Math.round(totalPaid),
            balance: Math.round(balance),
            unpaidInvoices: invRows
                .filter(i => String(i.status || '').toLowerCase() !== 'paid')
                .slice(0, 3)
                .map(i => ({
                    invoiceNumber: i.invoice_number,
                    total: Number(i.total_amount) || 0,
                    paid: Number(i.paid_amount) || 0,
                    dueDate: i.due_date,
                })),
        });
    }

    return { found: true, students: summaries };
}

async function toolGetRecentReceipts(supabase: any, pool: any, ctx: SenderContext, args: { studentQuery?: string; limit?: number }) {
    const targets = await findStudentsForQuery(supabase, pool, ctx, args.studentQuery);
    if (targets.length === 0) {
        return { found: false, message: 'No matching student found.' };
    }
    const maxRows = Math.min(10, Math.max(1, Number(args.limit) || 5));
    const allReceipts: any[] = [];

    for (const st of targets.slice(0, 3)) {
        const idCandidates = Array.from(new Set([st.userId, st.id, st.admissionNumber].filter(Boolean)));
        let rows: any[] = [];
        if (pool) {
            const res = await pool.query(
                `SELECT receipt_number, amount_paid, payment_date, payment_method, paid_for
                 FROM public.receipts
                 WHERE institution_id = $1
                   AND (student_id = ANY($2::text[]) OR ($3 <> '' AND LOWER(COALESCE(admission_number, '')) = LOWER($3)))
                 ORDER BY payment_date DESC NULLS LAST LIMIT $4`,
                [st.institutionId, idCandidates, st.admissionNumber || '', maxRows]
            ).catch(() => ({ rows: [] }));
            rows = res.rows || [];
        } else if (supabase) {
            const { data } = await supabase
                .from('receipts')
                .select('receipt_number, amount_paid, payment_date, payment_method, paid_for')
                .eq('institution_id', st.institutionId)
                .in('student_id', idCandidates)
                .order('payment_date', { ascending: false })
                .limit(maxRows);
            rows = data || [];
        }

        for (const r of rows) {
            const rNo = r.receipt_number || '';
            allReceipts.push({
                studentName: st.name,
                admissionNumber: st.admissionNumber,
                receiptNumber: rNo,
                amount: Number(r.amount_paid) || 0,
                paymentDate: r.payment_date,
                method: r.payment_method || 'Payment',
                receiptUrl: rNo ? `https://portal.eduai.co.ke/?receipt=${encodeURIComponent(rNo)}` : '',
            });
        }
    }

    return { found: allReceipts.length > 0, receipts: allReceipts };
}

async function toolGetTodayAttendanceSummary(supabase: any, pool: any, ctx: SenderContext, args: { date?: string }) {
    if (ctx.tier !== 'staff_admin') {
        return { error: 'Attendance summary is only available to school staff and administrators.' };
    }
    const eatNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const targetDate = (args.date && /^\d{4}-\d{2}-\d{2}$/.test(args.date)) ? args.date : eatNow.toISOString().slice(0, 10);
    const cleanInst = ctx.institutionId.replace(/^inst_/, '');
    const instCandidates = Array.from(new Set([ctx.institutionId, cleanInst, `inst_${cleanInst}`]));

    let rows: any[] = [];
    if (pool) {
        const res = await pool.query(
            `SELECT d.staff_id, d.first_in, d.last_out, d.total_hours, d.late_minutes, d.overtime_hours, d.status, d.shift_name, u.name AS staff_name
             FROM public.staff_attendance_daily d
             LEFT JOIN public.users u ON u.id = d.staff_id
             WHERE (d.institution_id = ANY($1::text[]))
               AND d.attendance_date::text LIKE $2 || '%'
             ORDER BY d.late_minutes DESC NULLS LAST LIMIT 100`,
            [instCandidates, targetDate]
        ).catch(() => ({ rows: [] }));
        rows = res.rows || [];
    } else if (supabase) {
        const { data } = await supabase
            .from('staff_attendance_daily')
            .select('staff_id, first_in, last_out, total_hours, late_minutes, overtime_hours, status, shift_name')
            .eq('institution_id', ctx.institutionId)
            .eq('attendance_date', targetDate)
            .limit(100);
        rows = data || [];
    }

    const lateList = rows
        .filter(r => (Number(r.late_minutes) || 0) > 0)
        .slice(0, 10)
        .map(r => ({
            staffName: r.staff_name || r.staff_id,
            lateMinutes: Number(r.late_minutes) || 0,
            shift: r.shift_name || 'Regular',
        }));

    return {
        date: targetDate,
        totalPresent: rows.length,
        lateCount: rows.filter(r => (Number(r.late_minutes) || 0) > 0).length,
        overtimeStaffCount: rows.filter(r => (Number(r.overtime_hours) || 0) > 0).length,
        lateArrivals: lateList,
    };
}

async function toolGetFeeArrearsSummary(supabase: any, pool: any, ctx: SenderContext, args: { minBalance?: number; limit?: number }) {
    if (ctx.tier !== 'staff_admin') {
        return { error: 'Institution-wide arrears summary is restricted to school administrators and finance staff.' };
    }
    const minBal = Math.max(0, Number(args.minBalance) || 0);
    const maxItems = Math.min(15, Math.max(1, Number(args.limit) || 10));
    let rows: any[] = [];

    if (pool) {
        const res = await pool.query(
            `SELECT student_name, admission_number, class_name,
                    SUM(COALESCE(total_amount, 0)) AS billed,
                    SUM(COALESCE(paid_amount, 0)) AS paid,
                    SUM(GREATEST(0, COALESCE(total_amount, 0) - COALESCE(paid_amount, 0))) AS balance
             FROM public.invoices
             WHERE institution_id = $1 AND LOWER(COALESCE(status, '')) <> 'paid'
             GROUP BY student_name, admission_number, class_name
             HAVING SUM(GREATEST(0, COALESCE(total_amount, 0) - COALESCE(paid_amount, 0))) >= $2
             ORDER BY balance DESC
             LIMIT $3`,
            [ctx.institutionId, minBal, maxItems]
        ).catch(() => ({ rows: [] }));
        rows = res.rows || [];
    } else if (supabase) {
        const { data } = await supabase
            .from('invoices')
            .select('student_name, admission_number, class_name, total_amount, paid_amount, status')
            .eq('institution_id', ctx.institutionId)
            .neq('status', 'paid')
            .limit(300);
        const map = new Map<string, any>();
        for (const i of (data || [])) {
            const key = i.admission_number || i.student_name || 'unknown';
            const cur = map.get(key) || { student_name: i.student_name, admission_number: i.admission_number, class_name: i.class_name, balance: 0 };
            cur.balance += Math.max(0, (Number(i.total_amount) || 0) - (Number(i.paid_amount) || 0));
            map.set(key, cur);
        }
        rows = Array.from(map.values()).filter(x => x.balance >= minBal).sort((a, b) => b.balance - a.balance).slice(0, maxItems);
    }

    return {
        minBalanceFilter: minBal,
        countShown: rows.length,
        totalShownArrears: Math.round(rows.reduce((s, r) => s + (Number(r.balance) || 0), 0)),
        topDefaulters: rows.map(r => ({
            studentName: r.student_name || 'Student',
            admissionNumber: r.admission_number || 'N/A',
            className: r.class_name || '',
            balance: Math.round(Number(r.balance) || 0),
        })),
    };
}

async function toolGetOverdueLibraryLoans(supabase: any, pool: any, ctx: SenderContext, args: { studentQuery?: string }) {
    const todayIso = new Date().toISOString();
    let rows: any[] = [];

    if (ctx.tier === 'parent') {
        const targets = await findStudentsForQuery(supabase, pool, ctx, args.studentQuery);
        const ids = targets.flatMap(t => [t.userId, t.id]).filter(Boolean);
        if (ids.length === 0) return { count: 0, loans: [] };
        if (pool) {
            const res = await pool.query(
                `SELECT lt.id, lt.user_id, lt.due_date, lt.status, b.title AS book_title, b.accession_number
                 FROM public.library_transactions lt
                 LEFT JOIN public.books b ON b.id = lt.book_id
                 WHERE lt.user_id = ANY($1::text[]) AND LOWER(COALESCE(lt.status, '')) <> 'returned'
                 ORDER BY lt.due_date ASC LIMIT 15`,
                [ids]
            ).catch(() => ({ rows: [] }));
            rows = res.rows || [];
        }
    } else if (ctx.tier === 'staff_admin') {
        if (pool) {
            const res = await pool.query(
                `SELECT lt.id, lt.user_name, lt.student_name, lt.admission_number, lt.due_date, lt.status, b.title AS book_title, b.accession_number
                 FROM public.library_transactions lt
                 LEFT JOIN public.books b ON b.id = lt.book_id
                 WHERE lt.institution_id = $1 AND LOWER(COALESCE(lt.status, '')) <> 'returned'
                 ORDER BY lt.due_date ASC LIMIT 15`,
                [ctx.institutionId]
            ).catch(() => ({ rows: [] }));
            rows = res.rows || [];
        }
    }

    return {
        count: rows.length,
        loans: rows.map(r => ({
            borrower: r.student_name || r.user_name || r.admission_number || 'Student',
            bookTitle: r.book_title || 'Library Book',
            accessionNumber: r.accession_number || 'N/A',
            dueDate: r.due_date,
            overdue: r.due_date ? String(r.due_date) < todayIso : false,
        })),
    };
}

// ─── Gemini Tool-Calling Agent Orchestrator ─────────────────────────────────

const AGENT_TOOL_DECLARATIONS: FunctionDeclaration[] = [
    {
        name: 'get_student_fee_balance',
        description: 'Check school fee balance, total billed, total paid, and unpaid invoices for a student (or all children linked to a parent).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                studentQuery: { type: SchemaType.STRING, description: 'Optional student name or admission number (e.g. "603" or "Flavian").' }
            }
        }
    },
    {
        name: 'get_recent_receipts',
        description: 'Fetch recent fee payment receipts and direct receipt links for a student.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                studentQuery: { type: SchemaType.STRING, description: 'Optional student name or admission number.' },
                limit: { type: SchemaType.NUMBER, description: 'Maximum receipts to return (1-10).' }
            }
        }
    },
    {
        name: 'get_today_attendance_summary',
        description: 'Staff/Admin only: Get biometric staff attendance summary for today or a specific YYYY-MM-DD date, including late arrivals.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                date: { type: SchemaType.STRING, description: 'Optional date in YYYY-MM-DD format. Defaults to today.' }
            }
        }
    },
    {
        name: 'get_fee_arrears_summary',
        description: 'Staff/Admin only: Get top unpaid school fee arrears across the institution.',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                minBalance: { type: SchemaType.NUMBER, description: 'Minimum balance threshold in KES.' },
                limit: { type: SchemaType.NUMBER, description: 'Number of top defaulters to return (default 10).' }
            }
        }
    },
    {
        name: 'get_overdue_library_loans',
        description: 'Check unreturned or overdue library books for a parent\'s children or across the institution (staff/admin).',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                studentQuery: { type: SchemaType.STRING, description: 'Optional student name or admission number.' }
            }
        }
    }
];

async function executeAgentTool(supabase: any, pool: any, ctx: SenderContext, name: string, args: any) {
    switch (name) {
        case 'get_student_fee_balance':
            return toolGetStudentFeeBalance(supabase, pool, ctx, args || {});
        case 'get_recent_receipts':
            return toolGetRecentReceipts(supabase, pool, ctx, args || {});
        case 'get_today_attendance_summary':
            return toolGetTodayAttendanceSummary(supabase, pool, ctx, args || {});
        case 'get_fee_arrears_summary':
            return toolGetFeeArrearsSummary(supabase, pool, ctx, args || {});
        case 'get_overdue_library_loans':
            return toolGetOverdueLibraryLoans(supabase, pool, ctx, args || {});
        default:
            return { error: `Unknown tool: ${name}` };
    }
}

async function runDeterministicFallback(supabase: any, pool: any, ctx: SenderContext, message: string): Promise<string> {
    const lower = message.toLowerCase();

    if (ctx.tier === 'guest') {
        return `Hello! Welcome to *${ctx.institutionName}* WhatsApp Assistant.\n\nYour phone number is not yet linked to a student or staff profile. Please ask the school office to register your WhatsApp number so you can check fee balances, receipts, and school updates here.`;
    }

    if (/(receipt|paid|payment|statement)/i.test(lower)) {
        const res = await toolGetRecentReceipts(supabase, pool, ctx, { limit: 5 });
        if (!res.found) return `No recent fee receipts were found for your account at *${ctx.institutionName}*.`;
        const lines = res.receipts.map((r: any) =>
            `• *${r.receiptNumber}* — KES ${Number(r.amount).toLocaleString()} (${r.paymentDate ? String(r.paymentDate).slice(0, 10) : 'N/A'}, ${r.method})${r.receiptUrl ? `\n  ${r.receiptUrl}` : ''}`
        );
        return `*Recent Fee Receipts — ${ctx.institutionName}*\n\n${lines.join('\n')}`;
    }

    if (/(arrear|defaulter|owing|unpaid)/i.test(lower) && ctx.tier === 'staff_admin') {
        const res: any = await toolGetFeeArrearsSummary(supabase, pool, ctx, { limit: 8 });
        if (!res.topDefaulters?.length) return `No unpaid fee arrears found for *${ctx.institutionName}*.`;
        const lines = res.topDefaulters.map((d: any, i: number) =>
            `${i + 1}. *${d.studentName}* (${d.admissionNumber}) — KES ${d.balance.toLocaleString()}`
        );
        return `*Top Fee Arrears — ${ctx.institutionName}*\nTotal shown: *KES ${res.totalShownArrears.toLocaleString()}*\n\n${lines.join('\n')}`;
    }

    if (/(fee|balance|invoice|owe|bill)/i.test(lower)) {
        const admMatch = message.match(/\b(\d{2,6}(?:\/\d{2,4})?)\b/);
        const res: any = await toolGetStudentFeeBalance(supabase, pool, ctx, { studentQuery: admMatch ? admMatch[1] : undefined });
        if (!res.found) return `I couldn't find a matching student fee record at *${ctx.institutionName}*.`;
        const lines = res.students.map((s: any) =>
            `*${s.studentName}* (Adm: ${s.admissionNumber}${s.className && s.className !== 'N/A' ? ` • ${s.className}` : ''})\n` +
            `• Total Billed: KES ${s.totalBilled.toLocaleString()}\n` +
            `• Total Paid: KES ${s.totalPaid.toLocaleString()}\n` +
            `• *Balance Due: KES ${s.balance.toLocaleString()}*`
        );
        return `*Fee Balance Summary — ${ctx.institutionName}*\n\n${lines.join('\n\n')}`;
    }

    if (/(attendance|late|clock|biometric|shift)/i.test(lower) && ctx.tier === 'staff_admin') {
        const res: any = await toolGetTodayAttendanceSummary(supabase, pool, ctx, {});
        const lateLines = (res.lateArrivals || []).map((l: any) => `• ${l.staffName} (${l.lateMinutes}m late — ${l.shift})`).join('\n');
        return `*Staff Attendance (${res.date}) — ${ctx.institutionName}*\n• Present: *${res.totalPresent}*\n• Late Arrivals: *${res.lateCount}*${lateLines ? `\n\n${lateLines}` : ''}`;
    }

    if (/(library|book|borrow|overdue)/i.test(lower)) {
        const res: any = await toolGetOverdueLibraryLoans(supabase, pool, ctx, {});
        if (!res.count) return `No unreturned library books found.`;
        const lines = res.loans.map((l: any) => `• *${l.bookTitle}* (${l.borrower}) — Due ${l.dueDate ? String(l.dueDate).slice(0, 10) : 'N/A'}`);
        return `*Unreturned Library Books (${res.count})*\n\n${lines.join('\n')}`;
    }

    if (ctx.tier === 'staff_admin') {
        return `Hello *${ctx.userName}* (${ctx.institutionName})! I'm your EduAI WhatsApp Agent. Try asking:\n• _"Fee balance for adm 603"_\n• _"Top fee arrears"_\n• _"Today's staff attendance"_\n• _"Overdue library books"_`;
    }

    const childList = ctx.linkedStudents.map(s => `${s.name} (${s.admissionNumber})`).join(', ');
    return `Hello *${ctx.userName}*! Welcome to *${ctx.institutionName}* WhatsApp Assistant.\nLinked student(s): ${childList}\n\nTry asking:\n• _"Check fee balance"_\n• _"Send my latest receipts"_\n• _"Any overdue library books?"_`;
}

async function runWhatsAppAgent(
    supabase: any,
    pool: any,
    ctx: SenderContext,
    userMessage: string,
    history: Array<{ role: 'user' | 'model'; text: string }>
): Promise<{ reply: string; toolsUsed: string[]; usedAi: boolean }> {
    const geminiKey =
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        process.env.VITE_GEMINI_API_KEY ||
        process.env.API_KEY || '';

    if (!geminiKey || ctx.tier === 'guest') {
        const reply = await runDeterministicFallback(supabase, pool, ctx, userMessage);
        return { reply, toolsUsed: [], usedAi: false };
    }

    try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const systemInstruction = [
            `You are the official EduAI WhatsApp Assistant for ${ctx.institutionName}.`,
            `Sender: ${ctx.userName} (Role tier: ${ctx.tier}, Role: ${ctx.userRole}).`,
            ctx.tier === 'parent'
                ? `Linked children: ${ctx.linkedStudents.map(s => `${s.name} (Adm: ${s.admissionNumber}, Class: ${s.gradeLevel} ${s.stream})`).join('; ')}. NEVER reveal data for any other student.`
                : `This sender is authorized school staff/admin for ${ctx.institutionName}.`,
            `Always use the provided tools to fetch real live figures from the database — never invent balances, receipt numbers, or attendance numbers.`,
            `Format responses concisely for WhatsApp using *bold* and short bullet points. Use KES for currency.`,
        ].join('\n');

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_AGENT_MODEL || 'gemini-2.0-flash',
            systemInstruction,
            tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
        });

        const chat = model.startChat({
            history: history.slice(-6).map(h => ({
                role: h.role,
                parts: [{ text: h.text }],
            })),
        });

        const toolsUsed: string[] = [];
        let response = await chat.sendMessage(userMessage);

        for (let step = 0; step < 4; step++) {
            const calls = response.response.functionCalls();
            if (!calls || calls.length === 0) break;

            const fnResponses = [];
            for (const call of calls) {
                toolsUsed.push(call.name);
                const toolResult = await executeAgentTool(supabase, pool, ctx, call.name, call.args);
                fnResponses.push({
                    functionResponse: {
                        name: call.name,
                        response: { result: toolResult },
                    },
                });
            }
            response = await chat.sendMessage(fnResponses);
        }

        const text = response.response.text()?.trim();
        if (text) {
            return { reply: text, toolsUsed, usedAi: true };
        }
    } catch (aiErr: any) {
        console.warn('[WhatsApp Agent] Gemini error, falling back to deterministic tools:', aiErr?.message || aiErr);
    }

    const fallbackReply = await runDeterministicFallback(supabase, pool, ctx, userMessage);
    return { reply: fallbackReply, toolsUsed: ['fallback'], usedAi: false };
}

// ─── Session Persistence & Meta Outbound Sender ─────────────────────────────

async function loadSessionHistory(pool: any, phoneKey: string): Promise<Array<{ role: 'user' | 'model'; text: string }>> {
    if (!pool) return [];
    const res = await pool.query('SELECT history FROM public.whatsapp_agent_sessions WHERE phone_key = $1 LIMIT 1', [phoneKey]).catch(() => ({ rows: [] }));
    const hist = res.rows?.[0]?.history;
    return Array.isArray(hist) ? hist : [];
}

async function saveSessionHistory(pool: any, phoneKey: string, institutionId: string, history: Array<{ role: 'user' | 'model'; text: string }>) {
    if (!pool) return;
    await pool.query(
        `INSERT INTO public.whatsapp_agent_sessions (phone_key, institution_id, history, updated_at)
         VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
         ON CONFLICT (phone_key) DO UPDATE SET institution_id = EXCLUDED.institution_id, history = EXCLUDED.history, updated_at = CURRENT_TIMESTAMP`,
        [phoneKey, institutionId, JSON.stringify(history.slice(-8))]
    ).catch(() => {});
}

async function logWhatsAppMessage(supabase: any, pool: any, institutionId: string, recipient: string, content: string, status: string, errorMessage?: string) {
    const id = `wamsg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (pool) {
        await pool.query(
            `INSERT INTO public.whatsapp_logs (id, institution_id, recipient, message_type, content, status, error_message, created_at)
             VALUES ($1, $2, $3, 'text', $4, $5, $6, CURRENT_TIMESTAMP)`,
            [id, institutionId, recipient, content, status, errorMessage || null]
        ).catch(() => {});
    } else if (supabase) {
        await supabase.from('whatsapp_logs').insert({
            id,
            institution_id: institutionId,
            recipient,
            message_type: 'text',
            content,
            status,
            error_message: errorMessage || null,
            created_at: new Date().toISOString(),
        }).catch(() => {});
    }
}

async function sendMetaWhatsAppReply(phoneNumberId: string, accessToken: string, toPhone: string, bodyText: string): Promise<{ sent: boolean; error?: string }> {
    if (!phoneNumberId || !accessToken) {
        return { sent: false, error: 'Missing Meta WhatsApp phoneNumberId or accessToken' };
    }
    try {
        const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: toPhone,
                type: 'text',
                text: { body: bodyText.slice(0, 4000) },
            }),
        });
        if (!res.ok) {
            const errTxt = await res.text().catch(() => `HTTP ${res.status}`);
            return { sent: false, error: errTxt };
        }
        return { sent: true };
    } catch (e: any) {
        return { sent: false, error: e?.message || String(e) };
    }
}

// ─── Main Webhook Handler ───────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Hub-Signature, X-Hub-Signature-256');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // ─── 1. META WEBHOOK VERIFICATION (GET) ───
    if (req.method === 'GET') {
        const mode = (req.query['hub.mode'] || req.query['mode'] || '').toString();
        const token = (req.query['hub.verify_token'] || req.query['verify_token'] || '').toString();
        const challenge = (req.query['hub.challenge'] || req.query['challenge'] || '').toString();

        if (mode === 'subscribe' && token) {
            const expectedToken = process.env.META_WA_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
            let isAuthorized = true;
            if (expectedToken && token !== expectedToken) {
                const supabase = getSupabase();
                const pool = await getPgPool();
                if (pool) {
                    const r = await pool.query('SELECT api_key FROM public.whatsapp_configs WHERE api_key = $1 LIMIT 1', [token]).catch(() => ({ rows: [] }));
                    isAuthorized = Boolean(r.rows?.length);
                } else if (supabase) {
                    const { data } = await supabase.from('whatsapp_configs').select('api_key').eq('api_key', token).maybeSingle();
                    isAuthorized = Boolean(data);
                } else {
                    isAuthorized = false;
                }
            }

            if (isAuthorized) {
                res.setHeader('Content-Type', 'text/plain');
                return res.status(200).send(challenge);
            }
            return res.status(403).send('Verification token mismatch');
        }

        return res.status(200).json({ status: 'ok', service: 'EduAI WhatsApp Autonomous Agent Webhook' });
    }

    // ─── 2. POST: SIMULATOR OR META INBOUND EVENTS ───
    if (req.method === 'POST') {
        try {
            const body = req.body || {};
            const action = String(req.query.action || body.action || '').toLowerCase();
            const supabase = getSupabase();
            const pool = await getPgPool();

            // Local/Portal Agent Simulator: POST /api/whatsapp-webhook?action=simulate
            if (action === 'simulate') {
                const phone = String(body.phone || body.from || '').trim();
                const message = String(body.message || body.text || '').trim();
                const instId = String(body.institutionId || body.institution_id || '').trim();
                if (!phone || !message) {
                    return res.status(400).json({ success: false, error: 'phone and message are required' });
                }
                const ctx = await resolveSenderContext(supabase, pool, phone, instId || 'global');
                const phoneKey = `${ctx.institutionId}:${ctx.phone9 || phone}`;
                const history = await loadSessionHistory(pool, phoneKey);
                const result = await runWhatsAppAgent(supabase, pool, ctx, message, history);
                await saveSessionHistory(pool, phoneKey, ctx.institutionId, [
                    ...history,
                    { role: 'user', text: message },
                    { role: 'model', text: result.reply },
                ]);
                return res.status(200).json({
                    success: true,
                    sender: {
                        name: ctx.userName,
                        tier: ctx.tier,
                        role: ctx.userRole,
                        institutionId: ctx.institutionId,
                        institutionName: ctx.institutionName,
                        linkedStudents: ctx.linkedStudents,
                    },
                    reply: result.reply,
                    toolsUsed: result.toolsUsed,
                    usedAi: result.usedAi,
                });
            }

            // Live Meta WhatsApp Cloud API Events
            if (body.object === 'whatsapp_business_account' || Array.isArray(body.entry)) {
                for (const entry of (body.entry || [])) {
                    for (const change of (entry.changes || [])) {
                        const value = change.value;
                        if (!value) continue;

                        const incomingPhoneNumberId = value.metadata?.phone_number_id;

                        // ── Inbound Messages -> Autonomous Agent ──
                        if (Array.isArray(value.messages)) {
                            for (const msg of value.messages) {
                                const senderPhone = msg.from;
                                const msgType = msg.type || 'text';
                                const content = (msg.text?.body || msg.caption || '').trim();
                                if (!senderPhone || !content) continue;

                                const gwCfg = await resolveWhatsAppConfig(supabase, pool, incomingPhoneNumberId);
                                const ctx = await resolveSenderContext(supabase, pool, senderPhone, gwCfg.institutionId);
                                await logWhatsAppMessage(supabase, pool, ctx.institutionId, senderPhone, `[INCOMING] ${content}`, 'delivered');

                                if (gwCfg.agentEnabled && msgType === 'text') {
                                    const phoneKey = `${ctx.institutionId}:${ctx.phone9 || senderPhone}`;
                                    const history = await loadSessionHistory(pool, phoneKey);
                                    const result = await runWhatsAppAgent(supabase, pool, ctx, content, history);
                                    await saveSessionHistory(pool, phoneKey, ctx.institutionId, [
                                        ...history,
                                        { role: 'user', text: content },
                                        { role: 'model', text: result.reply },
                                    ]);

                                    const sendRes = await sendMetaWhatsAppReply(
                                        gwCfg.phoneNumberId,
                                        gwCfg.accessToken,
                                        senderPhone,
                                        result.reply
                                    );
                                    await logWhatsAppMessage(
                                        supabase,
                                        pool,
                                        ctx.institutionId,
                                        senderPhone,
                                        `[AGENT REPLY] ${result.reply}`,
                                        sendRes.sent ? 'sent' : 'failed',
                                        sendRes.error
                                    );
                                }
                            }
                        }

                        // ── Outbound Delivery Status Updates ──
                        if (Array.isArray(value.statuses)) {
                            for (const statusItem of value.statuses) {
                                const status = statusItem.status;
                                const recipientId = statusItem.recipient_id;
                                if ((status === 'delivered' || status === 'failed') && recipientId) {
                                    const errJson = statusItem.errors ? JSON.stringify(statusItem.errors) : null;
                                    if (pool) {
                                        await pool.query(
                                            `UPDATE public.whatsapp_logs
                                             SET status = $1, error_message = COALESCE($2, error_message)
                                             WHERE id = (SELECT id FROM public.whatsapp_logs WHERE recipient = $3 ORDER BY created_at DESC LIMIT 1)`,
                                            [status, errJson, recipientId]
                                        ).catch(() => {});
                                    } else if (supabase) {
                                        await supabase
                                            .from('whatsapp_logs')
                                            .update({ status, error_message: errJson || undefined })
                                            .eq('recipient', recipientId)
                                            .order('created_at', { ascending: false })
                                            .limit(1);
                                    }
                                }
                            }
                        }
                    }
                }

                return res.status(200).send('EVENT_RECEIVED');
            }

            return res.status(200).send('OK');
        } catch (err: any) {
            console.error('[Meta WhatsApp Webhook] Error processing event:', err);
            return res.status(200).send('EVENT_ERROR');
        }
    }

    return res.status(405).send('Method Not Allowed');
}
