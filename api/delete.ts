import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

let _pgPool: any = null;
let _directPgDisabledUntil = 0;

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
    try {
      const parsedUrl = new URL(cleanConnString);
      parsedUrl.searchParams.delete('sslmode');
      cleanConnString = parsedUrl.toString();
    } catch {
      cleanConnString = cleanConnString
        .replace(/([?&])sslmode=[^&]*(&|$)/g, (_match, prefix, suffix) => suffix === '&' ? prefix : '')
        .replace(/\?$/, '');
    }

    _pgPool = new Pool({
      connectionString: cleanConnString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 2000,
      statement_timeout: 4000,
      max: 2,
      idleTimeoutMillis: 3000
    });

    _pgPool.on('error', (err: any) => {
      console.warn('[Direct SQL Pool Error in /api/delete]:', err?.message || err);
      _directPgDisabledUntil = Date.now() + 60000;
    });

    return _pgPool;
  } catch (err) {
    console.error('[Direct SQL Pool Init Error in /api/delete]:', err);
    return null;
  }
};

/**
 * Dedicated DELETE endpoint — bypasses all the ambiguity in the generic /api/records handler.
 *
 * Usage (POST):
 *   POST /api/delete?module=ds_leads
 *   Body: { "ids": ["id1","id2"] }
 *
 * Auth: Optional — if a valid Authorization header is provided the user is looked up,
 * but deletion is also allowed for modules in the PUBLIC_MODULES list without auth.
 */

const PUBLIC_MODULES = [
  'users', 'institutions', 'counties', 'constituencies', 'wards', 'political_parties',
  'system_settings', 'pm_listings', 'retail_inventory_items', 'school_registry',
  'car_sales_listings', 'car_listings', 'campaign_profiles', 'alumnae_members',
  'alumni_posts', 'alumni_comments', 'alumni_messages', 'hospitality_items',
  'hospitality_menu_items', 'hospitality_vehicles', 'events', 'event_categories',
  'event_participants', 'event_splits', 'event_pledges', 'ds_students', 'ds_lessons',
  'ds_settings', 'ds_invoices', 'ds_payments', 'ds_instructors', 'ds_vehicles',
  'ds_skill_mastery', 'ds_votes', 'ds_license_categories', 'ds_leads',
  'store_categories', 'integration_logs', 'event_pins', 'institution_events',
  'student_enrollments', 'county_bursary_funds', 'bursary_applications',
  'ng_cdf_funds', 'ng_cdf_bursaries',
  'semesters', 'academic_years', 'academic_levels', 'subjects', 'courses',
  'departments', 'rooms', 'buildings', 'inventory', 'receipts', 'invoices',
  'tasks', 'assignments', 'allocation_requests', 'vote_heads', 'fee_structures',
  'financial_periods', 'school_remedial_sessions', 'school_remedial_rate_settings',
  'school_remedial_payouts', 'school_remedial_allocations', 'school_remedial_subjects', 'school_remedial_duty_roster',
  'coop_farmers', 'coop_collections', 'coop_riders', 'coop_agrovet_inventory',
  'coop_agrovet_sales', 'sacco_accounts', 'sacco_transactions', 'coop_monthly_payouts',
  'coop_expenses', 'coop_income', 'car_appraisals', 'car_test_drives', 'car_invoices',
  'car_payments', 'fee_promises', 'timetable_entries', 'exam_timetable_entries',
  'bursary_disbursements', 'stock_transactions', 'appointments',
  'assessments', 'assessment_marks', 'exam_units', 'exam_broadsheets',
  'law_documents', 'law_clients', 'law_matters', 'law_time_entries', 'law_invoices', 'law_trust_transactions', 'law_agreement_templates', 'law_agreements',
  'observation_notes', 'student_attendances', 'student_conduct_records', 'teacher_lesson_plans', 'lesson_allocations', 'class_subject_allocations', 'enrollment_requests',
  'branches'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const getStr = (p: any): string => (Array.isArray(p) ? p[0] : (p as string) || '');
  const moduleName = getStr(req.query.module);

  if (!moduleName) {
    return res.status(400).json({ success: false, error: 'module query param required' });
  }

  console.log(`[/api/delete] module=${moduleName} method=${req.method}`);
  console.log(`[/api/delete] raw body:`, JSON.stringify(req.body));

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ success: false, error: 'Supabase keys missing in environment' });
    }

    // Parse IDs robustly from multiple possible sources
    let rawIds: any = null;

    if (req.body) {
      if (Array.isArray(req.body.ids)) {
        rawIds = req.body.ids;
      } else if (typeof req.body.ids === 'string') {
        rawIds = req.body.ids.split(',').map((s: string) => s.trim()).filter(Boolean);
      } else if (typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          if (Array.isArray(parsed.ids)) rawIds = parsed.ids;
          else if (typeof parsed.ids === 'string') rawIds = parsed.ids.split(',').map((s: string) => s.trim()).filter(Boolean);
        } catch (_) { }
      }
    }

    // Fallback: query-string id/ids
    if (!rawIds || rawIds.length === 0) {
      const qId = getStr(req.query.id);
      const qIds = getStr(req.query.ids as string);
      const combined = qId || qIds;
      if (combined) {
        rawIds = combined.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const idsArray: string[] = (Array.isArray(rawIds) ? rawIds : []).map(String).filter(Boolean);

    console.log(`[/api/delete] idsArray:`, idsArray);

    if (idsArray.length === 0) {
      return res.status(400).json({ success: false, error: 'No ids provided. Send { ids: [...] } in body.' });
    }

    if (moduleName === 'users') {
      try {
        if (idsArray.length === 1) {
          await supabase.from('ds_students').delete().eq('user_id', idsArray[0]);
          await supabase.from('ds_instructors').delete().eq('user_id', idsArray[0]);
        } else {
          await supabase.from('ds_students').delete().in('user_id', idsArray);
          await supabase.from('ds_instructors').delete().in('user_id', idsArray);
        }
      } catch (err) {
        console.error('[/api/delete] Failed to delete linked DS records:', err);
      }
    }

    if (moduleName === 'exam_units') {
      const idsSet = new Set(idsArray);
      try {
        // 1. Delete standalone rows in institution_module_states if any exist
        await supabase.from('institution_module_states').delete().in('id', idsArray);
        const altIds = idsArray.flatMap(id => [`ims_exam_unit_${id}`, `exam_unit_${id}`]);
        await supabase.from('institution_module_states').delete().in('id', altIds);

        // 2. Update all exam_units state rows in institution_module_states
        const { data: imsRows } = await supabase
          .from('institution_module_states')
          .select('id, data, settings, institution_id')
          .or('module_id.eq.exam_units,id.like.%exam_units%');

        if (Array.isArray(imsRows) && imsRows.length > 0) {
          for (const row of imsRows) {
            let currentExams: any[] = [];
            if (Array.isArray(row.data)) currentExams = row.data;
            else if (row.data && Array.isArray(row.data.exams)) currentExams = row.data.exams;
            else if (row.settings && Array.isArray(row.settings.exams)) currentExams = row.settings.exams;
            else if (Array.isArray(row.settings)) currentExams = row.settings;

            const hasTarget = currentExams.some((e: any) => e && idsSet.has(e.id));
            if (hasTarget) {
              const remaining = currentExams.filter((e: any) => e && !idsSet.has(e.id));
              const prevDeleted: string[] = Array.isArray(row.data?.deletedExamIds) 
                ? row.data.deletedExamIds 
                : (Array.isArray(row.settings?.deletedExamIds) ? row.settings.deletedExamIds : []);
              const updatedDeleted = Array.from(new Set([...prevDeleted, ...idsArray]));

              await supabase.from('institution_module_states').update({
                data: remaining,
                settings: { exams: remaining, deletedExamIds: updatedDeleted },
                updated_at: new Date().toISOString()
              }).eq('id', row.id);
            }
          }
        }

        // 3. Purge corresponding broadsheets
        const { data: bsRows } = await supabase
          .from('institution_module_states')
          .select('id, data, settings')
          .or('module_id.eq.exam_broadsheets,id.like.%exam_broadsheets%');

        if (Array.isArray(bsRows) && bsRows.length > 0) {
          for (const row of bsRows) {
            const bsData = (typeof row.data === 'object' && row.data !== null && !Array.isArray(row.data))
              ? { ...row.data }
              : ((typeof row.settings === 'object' && row.settings !== null && !Array.isArray(row.settings)) ? { ...row.settings } : null);
            if (bsData) {
              let changed = false;
              idsArray.forEach(id => {
                if (bsData[id]) {
                  delete bsData[id];
                  changed = true;
                }
              });
              if (changed) {
                await supabase.from('institution_module_states').update({
                  data: bsData,
                  settings: bsData,
                  updated_at: new Date().toISOString()
                }).eq('id', row.id);
              }
            }
          }
        }

        // 4. Delete linked assessments and assessment_marks in Supabase if tables exist
        try { await supabase.from('assessments').delete().in('id', idsArray); } catch (_) {}
        try { await supabase.from('assessment_marks').delete().in('assessment_id', idsArray); } catch (_) {}
        try { await supabase.from('assessment_marks').delete().in('exam_id', idsArray); } catch (_) {}
      } catch (err) {
        console.error('[/api/delete] Failed to clean up exam_units in institution_module_states:', err);
      }
    }

    if (moduleName === 'exam_broadsheets') {
      try {
        const { data: bsRows } = await supabase
          .from('institution_module_states')
          .select('id, data, settings')
          .or('module_id.eq.exam_broadsheets,id.like.%exam_broadsheets%');

        if (Array.isArray(bsRows) && bsRows.length > 0) {
          for (const row of bsRows) {
            const bsData = (typeof row.data === 'object' && row.data !== null && !Array.isArray(row.data))
              ? { ...row.data }
              : null;
            if (bsData) {
              let changed = false;
              idsArray.forEach(id => {
                if (bsData[id]) {
                  delete bsData[id];
                  changed = true;
                }
              });
              if (changed) {
                await supabase.from('institution_module_states').update({
                  data: bsData,
                  settings: bsData,
                  updated_at: new Date().toISOString()
                }).eq('id', row.id);
              }
            }
          }
        }
      } catch (err) {
        console.error('[/api/delete] Failed to clean up exam_broadsheets in institution_module_states:', err);
      }
    }

    if (moduleName === 'school_remedial_duty_roster') {
      const idsSet = new Set(idsArray);
      try {
        const { data: imsRows } = await supabase
          .from('institution_module_states')
          .select('id, data, settings, state_data')
          .or('module_id.eq.school_remedial_duty_roster,id.like.%school_remedial_duty_roster%');

        if (Array.isArray(imsRows) && imsRows.length > 0) {
          for (const row of imsRows) {
            let currentDuty: any[] = [];
            if (Array.isArray(row.data)) currentDuty = row.data;
            else if (row.data && Array.isArray(row.data.roster)) currentDuty = row.data.roster;
            else if (row.settings && Array.isArray(row.settings.roster)) currentDuty = row.settings.roster;
            else if (Array.isArray(row.settings)) currentDuty = row.settings;

            const hasTarget = currentDuty.some((d: any) => d && idsSet.has(d.id));
            if (hasTarget) {
              const remaining = currentDuty.filter((d: any) => d && !idsSet.has(d.id));
              const prevDeleted: string[] = Array.isArray((row as any).deleted_duty_ids)
                ? (row as any).deleted_duty_ids
                : (Array.isArray((row.data as any)?.deletedDutyIds) ? (row.data as any).deletedDutyIds : []);
              const updatedDeleted = Array.from(new Set([...prevDeleted, ...idsArray]));

              await supabase.from('institution_module_states').update({
                data: remaining,
                settings: remaining,
                state_data: { roster: remaining, deletedDutyIds: updatedDeleted },
                updated_at: new Date().toISOString()
              }).eq('id', row.id);
            }
          }
        }
      } catch (err) {
        console.error('[/api/delete] Failed to clean up school_remedial_duty_roster in institution_module_states:', err);
      }
    }

    let pgDeleteSuccess = false;
    try {
      const pool = await getPgPool();
      if (pool) {
        await pool.query(`DELETE FROM public."${moduleName}" WHERE id = ANY($1)`, [idsArray]);
        pgDeleteSuccess = true;
        console.log(`[/api/delete] Direct PG pool deleted ${idsArray.length} record(s) from ${moduleName}`);
      }
    } catch (pgErr) {
      console.warn(`[/api/delete] Direct PG pool delete warning for ${moduleName}:`, pgErr);
    }

    try {
      let q = supabase.from(moduleName).delete();
      if (idsArray.length === 1) {
        q = q.eq('id', idsArray[0]);
      } else {
        q = q.in('id', idsArray);
      }

      const { error: delErr } = await q;

      if (delErr && !pgDeleteSuccess) {
        if (moduleName !== 'exam_units' && moduleName !== 'exam_broadsheets') {
          console.error(`[/api/delete] Supabase error for ${moduleName}:`, delErr);
          return res.status(200).json({ success: false, error: delErr.message, code: delErr.code });
        }
      }
    } catch (_) {}

    console.log(`[/api/delete] Deleted ${idsArray.length} record(s) from ${moduleName}`);
    return res.status(200).json({ success: true, count: idsArray.length, module: moduleName });

  } catch (err: any) {
    console.error('[/api/delete] Crash:', err);
    return res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
}
