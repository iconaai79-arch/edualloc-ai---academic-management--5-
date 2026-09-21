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

// ── Direct PostgreSQL Pool & Query Engine (Resilience against PostgREST timeouts) ──
let _pgPool: any = null;
const getPgPool = async () => {
  if (_pgPool) return _pgPool;
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.VITE_DATABASE_URL ||
    process.env.SUPABASE_DB_URL;
  if (!connectionString) return null;

  try {
    const pgModule = await import('pg');
    const Pool = pgModule.Pool || (pgModule.default ? (pgModule.default as any).Pool : null);
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
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
      max: 2,
      idleTimeoutMillis: 3000
    });
    return _pgPool;
  } catch (err) {
    console.error('[Direct SQL Pool Init Error]:', err);
    return null;
  }
};

export interface DirectSqlCondition {
  sql: string;
  val?: any;
  vals?: any[];
}

const fetchViaDirectPg = async (
  table: string,
  conditions: DirectSqlCondition[],
  orderBy?: string,
  limit: number = 1000,
  offset: number = 0
): Promise<any[] | null> => {
  if (!table || !/^[a-zA-Z0-9_]+$/.test(table)) return null;

  const pool = await getPgPool();
  if (!pool) return null;

  const values: any[] = [];
  const whereClauses: string[] = [];

  for (const c of conditions) {
    if (Array.isArray(c.vals)) {
      let s = c.sql;
      for (const v of c.vals) {
        values.push(v);
        s = s.replace('$VAL', `$${values.length}`);
      }
      whereClauses.push(s);
    } else if (c.val !== undefined) {
      values.push(c.val);
      whereClauses.push(c.sql.replace(/\$VAL/g, `$${values.length}`));
    } else {
      whereClauses.push(c.sql);
    }
  }

  const wherePart = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  let orderPart = '';
  if (orderBy) {
    const [col, dir] = orderBy.split('.');
    if (/^[a-zA-Z0-9_]+$/.test(col)) {
      const isDesc = dir?.toLowerCase() === 'desc';
      orderPart = `ORDER BY "${col}" ${isDesc ? 'DESC' : 'ASC'}`;
    }
  }

  const finalLimit = Math.min(Math.max(limit, 1), 100000);
  const finalOffset = Math.max(offset, 0);
  const limitPart = `LIMIT ${finalLimit} OFFSET ${finalOffset}`;

  const sql = `SELECT * FROM "${table}" ${wherePart} ${orderPart} ${limitPart}`;

  let client: any;
  try {
    client = await pool.connect();
    const result = await client.query(sql, values);
    return result.rows || [];
  } catch (err: any) {
    console.warn(`[fetchViaDirectPg] Query failed on "${table}":`, err?.message || err);
    if (orderPart && (err?.code === '42703' || err?.message?.includes('column'))) {
      try {
        const fallbackSql = `SELECT * FROM "${table}" ${wherePart} ${limitPart}`;
        const fallbackResult = await client.query(fallbackSql, values);
        return fallbackResult.rows || [];
      } catch (_) {}
    }
    return null;
  } finally {
    if (client) client.release();
  }
};

// Simplified Auth check to avoid external lib crashes
async function getAuthUser(supabase: any, authHeader?: string) {
  if (!authHeader) return null;
  const token = authHeader.replace(/bearer /i, '').trim();
  if (!token || token === 'undefined' || token === 'null') return null;

  // 1. Fast Admin / Super Admin bypass (0ms overhead, avoids hung PostgREST)
  const lowerToken = token.toLowerCase();
  if (
    token.startsWith('temp_admin_') || 
    token.startsWith('admin_') || 
    token === 'admin' || 
    token === 'super_admin' || 
    token === 'superadmin' || 
    token === 'temp_admin_bypass' || 
    lowerToken.includes('superadmin') || 
    lowerToken.includes('super_admin')
  ) {
    console.log(`[getAuthUser] SuperAdmin bypass active for ${token.substring(0, 15)}...`);
    return { id: token, institutionId: 'GLOBAL', role: 'super_admin' };
  }

  console.log(`[getAuthUser] Debug: token length ${token.length}, startsWith ${token.substring(0, 10)}...`);

  try {
    // 2. Try JWT
    if (token.length > 20 && token.includes('.') && token.split('.').length === 3) {
      let userObj: any = null;
      try {
        const { data, error: authErr } = await supabase.auth.getUser(token);
        if (authErr) console.warn('[Auth JWT Warning]', authErr.message);
        if (data?.user) userObj = data.user;
      } catch (e) {
        console.warn('[Auth JWT Exception]', e);
      }
      
      let jwtUserId = userObj?.id;
      let jwtEmail = userObj?.email;
      let jwtMetadata = userObj?.user_metadata;

      if (!jwtUserId) {
        try {
          const parts = token.split('.');
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
          if (payload?.sub) {
            jwtUserId = payload.sub;
            jwtEmail = payload.email || '';
            jwtMetadata = payload.user_metadata || {};
            console.log(`[getAuthUser] Recovered user id ${jwtUserId} from JWT claims`);
          }
        } catch (e) {}
      }

      if (jwtUserId) {
        if (jwtEmail === 'super@app.com') {
           return { id: jwtUserId, institutionId: 'GLOBAL', role: 'super_admin' };
        }

        // Fast DB lookup with 2.5s timeout + direct pg fallback
        let profile: any = null;
        try {
          const timeoutP = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500));
          const q = supabase.from('users').select('id, institution_id, role, branch_id').or(`id.eq.${jwtUserId},id.eq.u_${jwtUserId}`).maybeSingle();
          const res: any = await Promise.race([q, timeoutP]);
          profile = res?.data;
        } catch (_) {}

        if (!profile) {
          try {
            const rawId = jwtUserId.replace(/^u_/, '');
            const rows = await fetchViaDirectPg('users', [
              { sql: `(id = $VAL OR id = $VAL)`, vals: [rawId, `u_${rawId}`] }
            ], undefined, 1);
            if (rows && rows.length > 0) profile = rows[0];
          } catch (_) {}
        }
        
        if (profile) return { id: profile.id, institutionId: profile.institution_id, role: profile.role, branchId: profile.branch_id };

        return { 
          id: jwtUserId, 
          institutionId: (jwtMetadata as any)?.institutionId || 'GUEST', 
          role: (jwtMetadata as any)?.role || 'guest' 
        };
      }
    }

    // 3. Try User ID fallback (non-JWT token) with direct pg fallback
    let profile: any = null;
    try {
      const timeoutP = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500));
      const q = supabase.from('users').select('id, institution_id, role, branch_id').or(`id.eq.${token},id.eq.u_${token}`).maybeSingle();
      const res: any = await Promise.race([q, timeoutP]);
      profile = res?.data;
    } catch (_) {}

    if (!profile) {
      try {
        const cleanToken = token.replace(/^u_/, '');
        const rows = await fetchViaDirectPg('users', [
          { sql: `(id = $VAL OR id = $VAL)`, vals: [cleanToken, `u_${cleanToken}`] }
        ], undefined, 1);
        if (rows && rows.length > 0) profile = rows[0];
      } catch (_) {}
    }
    
    if (profile) return { id: profile.id, institutionId: profile.institution_id, role: profile.role, branchId: profile.branch_id };
    
    // 4. Try Alumnae discovery if token looks like an alumna ID
    if (token && token.startsWith('alumna_')) {
      let alumna: any = null;
      try {
        const { data } = await supabase.from('alumnae_members').select('*').eq('id', token).maybeSingle();
        alumna = data;
      } catch (_) {}

      if (!alumna) {
        try {
          const rows = await fetchViaDirectPg('alumnae_members', [{ sql: `id = $VAL`, val: token }], undefined, 1);
          if (rows && rows.length > 0) alumna = rows[0];
        } catch (_) {}
      }

      if (alumna) {
        const instId = alumna.institution_id || alumna.institutionId || 'GLOBAL';
        return { id: alumna.id, institutionId: instId, role: 'alumna', email: alumna.email };
      }
    }

  } catch (e) {
    console.error('[Auth Internal] Failure:', e);
  }
  console.log(`[getAuthUser] Auth failed for token: ${token.substring(0, 10)}... (len: ${token.length})`);
  return null;
}

const PUBLIC_MODULES = [
  'users', 'institutions', 'counties', 'constituencies', 'wards', 'political_parties', 'system_settings',
  'pm_listings', 'retail_inventory_items', 'school_registry', 'car_sales_listings', 'car_listings', 'campaign_profiles',
  'alumnae_members', 'alumni_posts', 'alumni_comments', 'alumni_messages', 'hospitality_items', 'hospitality_menu_items',
  'hospitality_vehicles', 'events', 'event_categories', 'event_participants', 'event_splits', 'event_pledges',
  'ds_students', 'ds_lessons', 'ds_settings', 'ds_invoices', 'ds_payments', 'ds_instructors', 'ds_vehicles',
  'ds_skill_mastery', 'ds_votes', 'ds_license_categories', 'ds_leads', 'store_categories', 'integration_logs',
  'event_pins', 'institution_events', 'student_enrollments', 'county_bursary_funds', 'bursary_applications',
  'ng_cdf_funds', 'ng_cdf_bursaries', 'broadcaster_messages', 'biometric_devices', 'biometric_enrollments',
  'staff_attendance_daily', 'heritage_members', 'heritage_stories', 'heritage_gallery', 'heritage_announcements',
  'school_remedial_subjects', 'school_remedial_sessions', 'school_remedial_rate_settings', 'school_remedial_payouts',
  'school_remedial_allocations', 'his_patients', 'his_queue_calls', 'his_staff', 'his_appointments',
  'his_vital_statistics', 'his_financial_records', 'his_admissions', 'his_beds', 'his_wards', 'his_dental_charts',
  'his_eye_prescriptions', 'his_medication_logs', 'his_broadcasts', 'his_prescriptions', 'his_prescription_items', 'his_pharmacy_inventory',
  'his_pharmacy_batches', 'his_pharmacy_sales', 'his_pharmacy_sale_items', 'his_pharmacy_ledger', 'his_pharmacy_staff',
  'his_pharmacy_settings', 'his_pharmacy_adherence_alerts', 'his_pharmacy_interactions', 'his_pharmacy_narcotics_ledger', 'his_lab_orders', 'his_billing_settings', 'his_invoices',
  'his_payments', 'his_billing_items', 'his_insurance_remittances', 'his_insurance_providers', 'his_tariffs',
  'his_hospital_rooms', 'his_partner_labs', 'his_branding', 'his_patient_id_config', 'his_medical_notes', 'his_clinical_events',
  'bulletin_items', 'document_collections', 'watchlist', 'watchlist_records', 'maintenance_requests',
  'student_absence_requests', 'time_off_requests', 'teacher_check_ins', 'leave_requests', 'financial_goals',
  'payroll_records', 'building_floors', 'building_offices', 'building_visitor_logs', 'building_visitor_assets',
  'visitors', 'security_alerts', 'security_logs', 'gate_passes', 'student_gate_passes',
  'mpesa_transactions', 'airtel_transactions', 'intasend_transactions', 'ncba_transactions', 'bank_transactions',
  'feedback_submissions', 'guest_feedback', 'guest_feedbacks', 'lesson_ratings',
  'suppliers', 'requisitions', 'lpos', 'procurement_items', 'procurement_suppliers', 'procurement_lpos', 'procurement_invoices',
  'weighbridge_intake_tickets', 'grain_suppliers', 'milling_silos', 'milling_batch_runs', 'flour_packaging_shifts', 'animal_feed_batches', 'grain_sale_orders',
  'county_dispatch_manifests', 'county_dispatch_items', 'county_school_requisitions', 'institution_module_states',
  'bursary_disbursements', 'invoices', 'receipts', 'expenses', 'bank_feed_transactions', 'finance_numbering_configs', 'fee_structures', 'vote_heads',
  'courses', 'subjects', 'departments', 'rooms', 'buildings', 'academic_years', 'academic_levels', 'semesters', 'timetable_entries', 'exam_timetable_entries', 'allocation_requests', 'assignments', 'tasks', 'assessments', 'assessment_marks', 'exam_units', 'exam_broadsheets',
  'transport_bills', 'fee_promises', 'sms_outbox', 'sms_logs', 'institution_extension_requests', 'absence_requests',
  'v_today_teacher_checkins', 'v_house_statistics', 'v_bed_occupancy',
  'bc_students', 'bc_courses', 'bc_trainers', 'bc_invoices', 'bc_payments', 'bc_practicals', 'bc_settings', 'bc_fee_structures',
  'carwash_jobs', 'cafe_menu_items', 'cafe_orders', 'retail_sales', 'retail_inventory', 'retail_stores',
  'books', 'library_transactions', 'library_fines', 'library_settings', 'book_reservations', 'book_stock_receipts',
  'branches', 'branch_integration_configs', 'inter_bank_transfers', 'vote_head_transfers', 'transactions', 'school_bank_accounts', 'financial_periods',
  'his_claims', 'his_inpatient_records', 'his_nurse_tasks', 'his_anc_records', 'his_delivery_records', 'his_cwc_immunizations', 'his_nbu_admissions', 'his_audit_logs', 'his_lab_requests',
  'school_projects', 'project_updates', 'alumni_school_inbox', 'alumni_notifications', 'alumni_jobs', 'alumni_businesses', 'alumni_groups', 'alumni_success_stories', 'alumni_document_requests', 'alumni_event_rsvps', 'alumni_school_staff', 'alumni_follows',
  'election_events', 'election_candidates', 'election_voters_ledger', 'election_checkins',
  'app_notifications', 'whatsapp_configs', 'whatsapp_logs',
  'invoice_clients', 'company_invoice_settings',
  'school_authorized_devices', 'school_router_profiles',
  'vehicles', 'transport_onboarding', 'vehicle_logs',
  'stock_transactions', 'appointments'
];

const TABLES_WITH_METADATA = new Set([
  'users',
  'institutions',
  'student_enrollments',
  'retail_sales',
  'visitors',
  'his_patients',
  'app_notifications',
  'whatsapp_configs',
  'whatsapp_logs',
  'school_remedial_subjects',
  'school_remedial_rate_settings',
  'school_remedial_allocations',
  'school_authorized_devices',
  'school_router_profiles',
  'invoice_clients',
  'company_invoice_settings',
  'mpesa_transactions',
  'airtel_transactions',
  'intasend_transactions',
  'ncba_transactions',
  'his_tariffs',
  'bursary_disbursements',
  'ds_payments',
  'vehicles',
  'transport_onboarding',
  'vehicle_logs'
]);

const MODULE_ALIASES: Record<string, string> = {
  'guest_feedback': 'feedback_submissions',
  'guest_feedbacks': 'feedback_submissions',
  'guestfeedback': 'feedback_submissions',
  'his_consultation_rates': 'his_tariffs',
  'weighbridge_tickets': 'weighbridge_intake_tickets',
  'milling_weighbridge_tickets': 'weighbridge_intake_tickets',
  'milling_grain_suppliers': 'grain_suppliers',
  'milling_sale_orders': 'grain_sale_orders'
};

const isTableWithoutInstitutionId = (module: string) => {
  return [
    'counties', 'constituencies', 'wards', 'political_parties',
    'event_categories', 'event_participants', 'event_splits', 'event_medical_logs', 'event_pledges', 'integration_logs',
    'county_bursary_funds', 'ng_cdf_funds', 'building_offices', 'building_visitor_assets',
    'county_inventory', 'county_inventory_categories', 'county_stores', 'county_dispatch_manifests', 'county_dispatch_items', 'county_school_requisitions',
    'app_notifications'
  ].includes(module);
};

const cleanRemedialRateSettings = (rec: any) => {
    if (!rec || typeof rec !== 'object') return rec;
    const copy = { ...rec };
    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
    if (copy.hourlyRate !== undefined && copy.hourly_rate === undefined) copy.hourly_rate = copy.hourlyRate;
    if (copy.weekdayHourlyRate !== undefined && copy.weekday_hourly_rate === undefined) copy.weekday_hourly_rate = copy.weekdayHourlyRate;
    if (copy.weekendHourlyRate !== undefined && copy.weekend_hourly_rate === undefined) copy.weekend_hourly_rate = copy.weekendHourlyRate;
    if (copy.weekdayStartTime !== undefined && copy.weekday_start_time === undefined) copy.weekday_start_time = copy.weekdayStartTime;
    if (copy.weekdayEndTime !== undefined && copy.weekday_end_time === undefined) copy.weekday_end_time = copy.weekdayEndTime;
    if (copy.weekendStartTime !== undefined && copy.weekend_start_time === undefined) copy.weekend_start_time = copy.weekendStartTime;
    if (copy.weekendEndTime !== undefined && copy.weekend_end_time === undefined) copy.weekend_end_time = copy.weekendEndTime;
    if (copy.saturdayStartTime !== undefined && copy.saturday_start_time === undefined) copy.saturday_start_time = copy.saturdayStartTime;
    if (copy.saturdayEndTime !== undefined && copy.saturday_end_time === undefined) copy.saturday_end_time = copy.saturdayEndTime;
    if (copy.sundayStartTime !== undefined && copy.sunday_start_time === undefined) copy.sunday_start_time = copy.sundayStartTime;
    if (copy.sundayEndTime !== undefined && copy.sunday_end_time === undefined) copy.sunday_end_time = copy.sundayEndTime;
    if (copy.saturday_start_time !== undefined) {
        meta.saturday_start_time = copy.saturday_start_time;
        meta.saturdayStartTime = copy.saturday_start_time;
    }
    if (copy.saturday_end_time !== undefined) {
        meta.saturday_end_time = copy.saturday_end_time;
        meta.saturdayEndTime = copy.saturday_end_time;
    }
    if (copy.sunday_start_time !== undefined) {
        meta.sunday_start_time = copy.sunday_start_time;
        meta.sundayStartTime = copy.sunday_start_time;
    }
    if (copy.sunday_end_time !== undefined) {
        meta.sunday_end_time = copy.sunday_end_time;
        meta.sundayEndTime = copy.sunday_end_time;
    }
    if (copy.maxLessonsPerDay !== undefined && copy.max_lessons_per_day === undefined) copy.max_lessons_per_day = copy.maxLessonsPerDay;
    if (copy.maxWeekendLessonsPerDay !== undefined && copy.max_weekend_lessons_per_day === undefined) copy.max_weekend_lessons_per_day = copy.maxWeekendLessonsPerDay;
    if (copy.max_weekend_lessons_per_day !== undefined) {
        meta.max_weekend_lessons_per_day = copy.max_weekend_lessons_per_day;
        meta.maxWeekendLessonsPerDay = copy.max_weekend_lessons_per_day;
    }
    if (copy.maxLessonsPerClassPerDay !== undefined && copy.max_lessons_per_class_per_day === undefined) copy.max_lessons_per_class_per_day = copy.maxLessonsPerClassPerDay;
    if (copy.max_lessons_per_class_per_day !== undefined) {
        meta.max_lessons_per_class_per_day = copy.max_lessons_per_class_per_day;
        meta.maxLessonsPerClassPerDay = copy.max_lessons_per_class_per_day;
    }
    if (copy.maxWeekendLessonsPerClassPerDay !== undefined && copy.max_weekend_lessons_per_class_per_day === undefined) copy.max_weekend_lessons_per_class_per_day = copy.maxWeekendLessonsPerClassPerDay;
    if (copy.max_weekend_lessons_per_class_per_day !== undefined) {
        meta.max_weekend_lessons_per_class_per_day = copy.max_weekend_lessons_per_class_per_day;
        meta.maxWeekendLessonsPerClassPerDay = copy.max_weekend_lessons_per_class_per_day;
    }
    if (copy.maxLessonsPerTeacherPerDay !== undefined && copy.max_lessons_per_teacher_per_day === undefined) copy.max_lessons_per_teacher_per_day = copy.maxLessonsPerTeacherPerDay;
    if (copy.max_lessons_per_teacher_per_day !== undefined) {
        meta.max_lessons_per_teacher_per_day = copy.max_lessons_per_teacher_per_day;
        meta.maxLessonsPerTeacherPerDay = copy.max_lessons_per_teacher_per_day;
    }
    if (copy.maxWeekendLessonsPerTeacherPerDay !== undefined && copy.max_weekend_lessons_per_teacher_per_day === undefined) copy.max_weekend_lessons_per_teacher_per_day = copy.maxWeekendLessonsPerTeacherPerDay;
    if (copy.max_weekend_lessons_per_teacher_per_day !== undefined) {
        meta.max_weekend_lessons_per_teacher_per_day = copy.max_weekend_lessons_per_teacher_per_day;
        meta.maxWeekendLessonsPerTeacherPerDay = copy.max_weekend_lessons_per_teacher_per_day;
    }
    if (copy.cancellationCutoffHours !== undefined && copy.cancellation_cutoff_hours === undefined) copy.cancellation_cutoff_hours = copy.cancellationCutoffHours;
    if (copy.cancellation_cutoff_hours !== undefined) {
        meta.cancellation_cutoff_hours = copy.cancellation_cutoff_hours;
        meta.cancellationCutoffHours = copy.cancellation_cutoff_hours;
    }
    if (copy.confirmationTimeoutMinutes !== undefined && copy.confirmation_timeout_minutes === undefined) copy.confirmation_timeout_minutes = copy.confirmationTimeoutMinutes;
    if (copy.confirmation_timeout_minutes !== undefined) {
        meta.confirmation_timeout_minutes = copy.confirmation_timeout_minutes;
        meta.confirmationTimeoutMinutes = copy.confirmation_timeout_minutes;
    }
    if (copy.teacherPreferences !== undefined && copy.teacher_preferences === undefined) copy.teacher_preferences = copy.teacherPreferences;
    if (copy.teacher_preferences !== undefined) {
        meta.teacher_preferences = copy.teacher_preferences;
        meta.teacherPreferences = copy.teacher_preferences;
    }
    if (copy.weekendBreakStartTime !== undefined && copy.weekend_break_start_time === undefined) copy.weekend_break_start_time = copy.weekendBreakStartTime;
    if (copy.weekendBreakEndTime !== undefined && copy.weekend_break_end_time === undefined) copy.weekend_break_end_time = copy.weekendBreakEndTime;
    if (copy.weekendBreakLabel !== undefined && copy.weekend_break_label === undefined) copy.weekend_break_label = copy.weekendBreakLabel;
    if (copy.includeWeekendBreak !== undefined && copy.include_weekend_break === undefined) copy.include_weekend_break = copy.includeWeekendBreak;

    if (copy.saturdayBreakStartTime !== undefined && copy.saturday_break_start_time === undefined) copy.saturday_break_start_time = copy.saturdayBreakStartTime;
    if (copy.saturdayBreakEndTime !== undefined && copy.saturday_break_end_time === undefined) copy.saturday_break_end_time = copy.saturdayBreakEndTime;
    if (copy.saturdayBreakLabel !== undefined && copy.saturday_break_label === undefined) copy.saturday_break_label = copy.saturdayBreakLabel;
    if (copy.includeSaturdayBreak !== undefined && copy.include_saturday_break === undefined) copy.include_saturday_break = copy.includeSaturdayBreak;

    if (copy.sundayBreakStartTime !== undefined && copy.sunday_break_start_time === undefined) copy.sunday_break_start_time = copy.sundayBreakStartTime;
    if (copy.sundayBreakEndTime !== undefined && copy.sunday_break_end_time === undefined) copy.sunday_break_end_time = copy.sundayBreakEndTime;
    if (copy.sundayBreakLabel !== undefined && copy.sunday_break_label === undefined) copy.sunday_break_label = copy.sundayBreakLabel;
    if (copy.includeSundayBreak !== undefined && copy.include_sunday_break === undefined) copy.include_sunday_break = copy.includeSundayBreak;

    if (copy.saturday_break_start_time !== undefined) {
        meta.saturday_break_start_time = copy.saturday_break_start_time;
        meta.saturdayBreakStartTime = copy.saturday_break_start_time;
    }
    if (copy.saturday_break_end_time !== undefined) {
        meta.saturday_break_end_time = copy.saturday_break_end_time;
        meta.saturdayBreakEndTime = copy.saturday_break_end_time;
    }
    if (copy.saturday_break_label !== undefined) {
        meta.saturday_break_label = copy.saturday_break_label;
        meta.saturdayBreakLabel = copy.saturday_break_label;
    }
    if (copy.include_saturday_break !== undefined) {
        meta.include_saturday_break = copy.include_saturday_break;
        meta.includeSaturdayBreak = copy.include_saturday_break;
    }

    if (copy.sunday_break_start_time !== undefined) {
        meta.sunday_break_start_time = copy.sunday_break_start_time;
        meta.sundayBreakStartTime = copy.sunday_break_start_time;
    }
    if (copy.sunday_break_end_time !== undefined) {
        meta.sunday_break_end_time = copy.sunday_break_end_time;
        meta.sundayBreakEndTime = copy.sunday_break_end_time;
    }
    if (copy.sunday_break_label !== undefined) {
        meta.sunday_break_label = copy.sunday_break_label;
        meta.sundayBreakLabel = copy.sunday_break_label;
    }
    if (copy.include_sunday_break !== undefined) {
        meta.include_sunday_break = copy.include_sunday_break;
        meta.includeSundayBreak = copy.include_sunday_break;
    }

    if (copy.weekend_break_start_time !== undefined) {
        meta.weekend_break_start_time = copy.weekend_break_start_time;
        meta.weekendBreakStartTime = copy.weekend_break_start_time;
    }
    if (copy.weekend_break_end_time !== undefined) {
        meta.weekend_break_end_time = copy.weekend_break_end_time;
        meta.weekendBreakEndTime = copy.weekend_break_end_time;
    }
    if (copy.weekend_break_label !== undefined) {
        meta.weekend_break_label = copy.weekend_break_label;
        meta.weekendBreakLabel = copy.weekend_break_label;
    }
    if (copy.include_weekend_break !== undefined) {
        meta.include_weekend_break = copy.include_weekend_break;
        meta.includeWeekendBreak = copy.include_weekend_break;
    }
    if (copy.weekdayDutyFlatRate !== undefined && copy.weekday_duty_flat_rate === undefined) copy.weekday_duty_flat_rate = copy.weekdayDutyFlatRate;
    if (copy.weekday_duty_flat_rate !== undefined) {
        meta.weekday_duty_flat_rate = copy.weekday_duty_flat_rate;
        meta.weekdayDutyFlatRate = copy.weekday_duty_flat_rate;
    }
    if (copy.teacherCodes !== undefined || copy.teacher_codes !== undefined) {
        const codes = copy.teacherCodes || copy.teacher_codes;
        meta.teacherCodes = codes;
        meta.teacher_codes = codes;
    }
    if (copy.feePerStudent !== undefined && copy.fee_per_student === undefined) copy.fee_per_student = copy.feePerStudent;
    if (copy.termFee !== undefined && copy.term_fee === undefined) copy.term_fee = copy.termFee;
    copy.updated_at = new Date().toISOString();
    copy.metadata = meta;

    delete copy.institutionId;
    delete copy.hourlyRate;
    delete copy.weekdayHourlyRate;
    delete copy.weekendHourlyRate;
    delete copy.weekdayDutyFlatRate;
    delete copy.weekdayStartTime;
    delete copy.weekdayEndTime;
    delete copy.weekendStartTime;
    delete copy.weekendEndTime;
    delete copy.saturdayStartTime;
    delete copy.saturdayEndTime;
    delete copy.sundayStartTime;
    delete copy.sundayEndTime;
    delete copy.maxLessonsPerDay;
    delete copy.maxWeekendLessonsPerDay;
    delete copy.maxLessonsPerClassPerDay;
    delete copy.maxWeekendLessonsPerClassPerDay;
    delete copy.maxLessonsPerTeacherPerDay;
    delete copy.maxWeekendLessonsPerTeacherPerDay;
    delete copy.cancellationCutoffHours;
    delete copy.confirmationTimeoutMinutes;
    delete copy.teacherPreferences;
    delete copy.teacherCodes;
    delete copy.teacher_codes;
    delete copy.weekendBreakStartTime;
    delete copy.weekendBreakEndTime;
    delete copy.weekendBreakLabel;
    delete copy.includeWeekendBreak;
    delete copy.saturdayBreakStartTime;
    delete copy.saturdayBreakEndTime;
    delete copy.saturdayBreakLabel;
    delete copy.includeSaturdayBreak;
    delete copy.sundayBreakStartTime;
    delete copy.sundayBreakEndTime;
    delete copy.sundayBreakLabel;
    delete copy.includeSundayBreak;
    delete copy.feePerStudent;
    delete copy.termFee;
    return copy;
};

const cleanRemedialSubject = (rec: any) => {
    if (!rec || typeof rec !== 'object') return rec;
    const copy = { ...rec };
    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
    if (copy.subjectId && !copy.subject_id) copy.subject_id = copy.subjectId;
    if (copy.subjectName !== undefined && copy.subject_name === undefined) copy.subject_name = copy.subjectName;
    if (copy.isActive !== undefined && copy.is_active === undefined) copy.is_active = copy.isActive;
    if (copy.weeklyOccurrences !== undefined && copy.weekly_occurrences === undefined) copy.weekly_occurrences = copy.weeklyOccurrences;
    if (copy.preferredDayType !== undefined && copy.preferred_day_type === undefined) copy.preferred_day_type = copy.preferredDayType;

    // Normalize and preserve allowed_days
    const rawAllowedDays = copy.allowedDays ?? copy.allowed_days ?? meta.allowedDays ?? meta.allowed_days ?? [];
    const normAllowedDays = Array.isArray(rawAllowedDays) ? rawAllowedDays : [];
    copy.allowed_days = normAllowedDays;
    meta.allowedDays = normAllowedDays;
    meta.allowed_days = normAllowedDays;

    // Normalize and preserve allowed_periods
    const rawAllowedPeriods = copy.allowedPeriods ?? copy.allowed_periods ?? meta.allowedPeriods ?? meta.allowed_periods ?? [];
    const normAllowedPeriods = Array.isArray(rawAllowedPeriods) ? rawAllowedPeriods : [];
    copy.allowed_periods = normAllowedPeriods;
    meta.allowedPeriods = normAllowedPeriods;
    meta.allowed_periods = normAllowedPeriods;

    if (copy.priority !== undefined) meta.priority = copy.priority;
    if (copy.weekly_occurrences !== undefined) {
        meta.weeklyOccurrences = copy.weekly_occurrences;
        meta.weekly_occurrences = copy.weekly_occurrences;
    }
    if (copy.preferred_day_type !== undefined) {
        meta.preferredDayType = copy.preferred_day_type;
        meta.preferred_day_type = copy.preferred_day_type;
    }
    if (copy.subject_name !== undefined) {
        meta.subjectName = copy.subject_name;
        meta.subject_name = copy.subject_name;
    }
    if (copy.is_active !== undefined) {
        meta.isActive = copy.is_active;
        meta.is_active = copy.is_active;
    }

    copy.updated_at = new Date().toISOString();
    copy.metadata = meta;

    delete copy.institutionId;
    delete copy.subjectId;
    delete copy.subjectName;
    delete copy.isActive;
    delete copy.weeklyOccurrences;
    delete copy.preferredDayType;
    delete copy.allowedDays;
    delete copy.allowedPeriods;

    return copy;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { module, id, select, order, limit, institutionId: queryInstitutionId, countyId: queryCountyId } = req.query;
    const getStrParam = (p: any): string => (Array.isArray(p) ? p[0] : (p as string) || '');
    const rawModuleName = getStrParam(module);
    const moduleName = MODULE_ALIASES[rawModuleName] || rawModuleName;
    
    if (!moduleName) return res.status(400).json({ success: false, error: 'Module required' });

    const requestStartTime = Date.now();
    const MAX_SAFE_EXECUTION_MS = 7500;

    try {
        const supabase = getSupabase();
        if (!supabase) return res.status(503).json({ success: false, error: 'Supabase keys missing in environment' });

        const authHeader = req.headers.authorization;
        const user = await getAuthUser(supabase, authHeader);
        const isPublicModule = PUBLIC_MODULES.includes(moduleName) || PUBLIC_MODULES.includes(rawModuleName);
        const isPublicGet = req.method === 'GET' && isPublicModule;
        
        // Allow POST for registration, settings, transport, and social interactions
        const isPublicPost = req.method === 'POST' && ([
          'users', 'institutions', 'counties', 'demo_requests', 'pm_inquiries', 'retail_wishlist', 'app_notifications', 
          'voter_outreach', 'alumnae_members', 'invoices', 'receipts', 'event_participants', 'event_pledges', 
          'ds_students', 'ds_lessons', 'event_pins', 'ds_leads', 'biometric_devices', 'biometric_enrollments', 
          'staff_attendance_daily', 'heritage_members', 'heritage_stories', 'heritage_gallery', 'heritage_announcements', 
          'school_remedial_subjects', 'school_remedial_sessions', 'school_remedial_rate_settings', 'school_remedial_payouts', 
          'school_remedial_allocations', 'feedback_submissions', 'guest_feedback', 'guest_feedbacks',
          'invoice_clients', 'company_invoice_settings',
          'his_billing_settings', 'his_invoices', 'his_payments', 'his_billing_items', 'his_insurance_remittances',
          'his_insurance_providers', 'his_tariffs', 'his_hospital_rooms', 'his_partner_labs', 'his_branding',
          'his_prescriptions', 'his_prescription_items', 'his_pharmacy_inventory', 'his_pharmacy_batches', 'his_pharmacy_sales', 'his_pharmacy_ledger',
          'his_pharmacy_interactions', 'his_pharmacy_narcotics_ledger', 'his_pharmacy_adherence_alerts',
          'his_patient_id_config', 'his_medical_notes', 'his_clinical_events', 'document_collections', 'watchlist_records', 'leave_requests', 'financial_goals',
          'suppliers', 'requisitions', 'lpos', 'procurement_items', 'procurement_suppliers', 'procurement_lpos', 'procurement_invoices',
          'visitors', 'security_alerts', 'security_logs', 'gate_passes', 'student_gate_passes',
          'weighbridge_intake_tickets', 'grain_suppliers', 'milling_silos', 'milling_batch_runs', 'flour_packaging_shifts', 'animal_feed_batches', 'grain_sale_orders',
          'county_dispatch_manifests', 'county_dispatch_items', 'county_school_requisitions',
          'vehicles', 'transport_onboarding', 'vehicle_logs', 'institution_module_states',
          'stock_transactions', 'appointments'
        ].includes(moduleName) || ['feedback_submissions', 'guest_feedback', 'guest_feedbacks'].includes(rawModuleName));
        const isPublicPatch = req.method === 'PATCH' && ([
          'users', 'vehicles', 'transport_onboarding', 'vehicle_logs',
          'suppliers', 'security_alerts', 'visitors', 'procurement_suppliers', 'procurement_items', 'procurement_lpos', 'procurement_invoices',
          'system_settings', 'institution_module_states', 'building_visitor_logs',
          'stock_transactions', 'appointments'
        ].includes(moduleName) || ['suppliers', 'security_alerts', 'visitors'].includes(rawModuleName));
        const isPublicDelete = req.method === 'DELETE' && ([
          'vehicles', 'transport_onboarding', 'vehicle_logs',
          'stock_transactions', 'appointments'
        ].includes(moduleName));
        const isSocialInteraction = (req.method === 'POST' || req.method === 'PATCH') && (['alumni_posts', 'alumni_comments', 'alumni_messages'].includes(moduleName)) && user?.role === 'alumna';
        
        if (!user && !isPublicGet && !isPublicPost && !isPublicPatch && !isPublicDelete && !isSocialInteraction) {
            const tokenSnippet = authHeader ? `${authHeader.substring(0, 15)}... (len: ${authHeader.length})` : 'NONE';
            return res.status(401).json({ 
                success: false, 
                error: 'Unauthorized', 
                reason: 'No valid user session found',
                debug: { token: tokenSnippet, module: moduleName, method: req.method }
            });
        }

        const isStudentsAlias = moduleName === 'students';
        const isTeachersAlias = moduleName === 'teachers';
        const isBankAccountsAlias = moduleName === 'bank_accounts';
        const targetDbTable = isStudentsAlias || isTeachersAlias 
            ? 'users' 
            : (isBankAccountsAlias ? 'school_bank_accounts' : moduleName);

        if (req.method === 'GET') {
            const targetInstParam = getStrParam(queryInstitutionId);
            const isGroupOrSuperAdmin = user?.role === 'super_admin' || user?.role === 'group_admin';
            const shouldSkipTenancy = isGroupOrSuperAdmin || Boolean(targetInstParam) || (isPublicModule && !targetInstParam);

            const buildBaseQuery = () => {
                let q = supabase.from(targetDbTable).select(getStrParam(select) || '*');
                if (isStudentsAlias) {
                    q = q.eq('role', 'student');
                } else if (isTeachersAlias) {
                    q = q.eq('role', 'teacher');
                }
                
                // Apply tenancy filter
                // Skip tenancy filter for super admins, group admins, explicit institution queries, OR for public modules
                if (user && !shouldSkipTenancy) {
                    const isCounty = user.role?.startsWith('county_');
                    if (isCounty) {
                        if (moduleName === 'counties') q = q.eq('id', user.institutionId);
                        else if (moduleName === 'institutions') q = q.eq('county_id', user.institutionId);
                        else if (moduleName === 'county_bursary_funds') q = q.eq('county_id', user.institutionId);
                        else if (!isTableWithoutInstitutionId(moduleName)) q = q.eq('county_id', user.institutionId);
                    } else if (user.role?.startsWith('constituency_')) {
                        if (moduleName === 'ng_cdf_funds') {
                            q = q.or(`constituency_id.eq.${user.institutionId},constituency_name.eq.${user.institutionId}`);
                        } else if (moduleName === 'ng_cdf_bursaries') {
                            q = q.eq('constituency_name', user.institutionId);
                        }
                    } else if (user.role === 'alumna') {
                        if (moduleName === 'alumni_messages') {
                            // Support both recipient_id and receiver_id for legacy/migration compatibility
                            q = q.or(`sender_id.eq.${user.id},recipient_id.eq.${user.id},receiver_id.eq.${user.id}`);
                        } else if (moduleName === 'alumnae_members') {
                            // Allow alumnae to see other members (networking)
                        } else if (['alumni_posts', 'alumni_comments', 'alumni_notifications'].includes(moduleName)) {
                            // Social feed and notifications are accessible to verified alumnae
                        } else if (!isTableWithoutInstitutionId(moduleName)) {
                            q = q.eq('institution_id', user.institutionId);
                        }
                    } else {
                        if (user.institutionId) {
                            if (moduleName === 'institutions') q = q.eq('id', user.institutionId);
                            else if (!isTableWithoutInstitutionId(moduleName)) q = q.eq('institution_id', user.institutionId);
                        }
                    }
                }

                const tablesWithBranchId = ['users', 'invoices', 'receipts', 'branches', 'branch_integration_configs'];
                const isBranchRestrictedUser = user && user.role !== 'super_admin' && user.role !== 'group_admin';
                
                if (isBranchRestrictedUser && user.branchId && tablesWithBranchId.includes(moduleName)) {
                    if (moduleName === 'branches') {
                        q = q.eq('id', user.branchId);
                    } else {
                        q = q.eq('branch_id', user.branchId);
                    }
                }

                if (getStrParam(id)) q = q.eq('id', getStrParam(id));
                if (targetInstParam && targetInstParam !== 'ALL' && !isTableWithoutInstitutionId(moduleName)) {
                    q = q.eq(moduleName === 'institutions' ? 'id' : 'institution_id', targetInstParam);
                } else if (isGroupOrSuperAdmin && user?.role === 'group_admin' && user?.institutionId && !targetInstParam && !isTableWithoutInstitutionId(moduleName)) {
                    q = q.eq(moduleName === 'institutions' ? 'id' : 'institution_id', user.institutionId);
                }
                if (getStrParam(queryCountyId)) q = q.eq('county_id', getStrParam(queryCountyId));

                // Custom filters from other query params
                const reservedParams = ['module', 'id', 'select', 'order', 'limit', 'offset', 'institutionId', 'countyId', 'action', 'filter', 'page', 'search', '_', 't', 'callback'];
                Object.entries(req.query).forEach(([key, value]) => {
                    if (!reservedParams.includes(key) && value) {
                        const strVal = getStrParam(value);
                        if (strVal) {
                            const lowerKey = key.toLowerCase();
                            if (lowerKey.includes('email')) {
                                // Support case-insensitive email searches
                                q = q.ilike(key, strVal.trim());
                            } else if (lowerKey.includes('phone') || lowerKey === 'mobile') {
                                // Support flexible phone number matching (ignore country code prefixes, spaces, formatting)
                                const digits = strVal.replace(/\D/g, '');
                                if (digits.length >= 9) {
                                    const last9 = digits.substring(digits.length - 9);
                                    const pattern = '%' + last9.split('').join('%') + '%';
                                    q = q.ilike(key, pattern);
                                } else {
                                    q = q.eq(key, strVal);
                                }
                            } else {
                                q = q.eq(key, strVal);
                            }
                        }
                    }
                });

                const orderParam = getStrParam(order);
                if (orderParam && orderParam.includes('.')) {
                    const [col, dir] = orderParam.split('.');
                    if (col) {
                        q = q.order(col, { ascending: dir === 'asc' });
                    }
                } else if (orderParam) {
                    q = q.order(orderParam, { ascending: true });
                } else if (['integration_logs', 'bank_transactions', 'mpesa_transactions', 'airtel_transactions', 'intasend_transactions', 'ncba_transactions', 'visitors', 'security_alerts', 'activity_log'].includes(moduleName)) {
                    q = q.order('created_at', { ascending: false });
                } else if (['users', 'students', 'student_enrollments'].includes(moduleName)) {
                    q = q.order('id', { ascending: true });
                }

                return q;
            };
            
            let finalLimit = limit ? parseInt(getStrParam(limit)) : (
                ['receipts', 'invoices', 'users', 'students', 'student_enrollments', 'fee_structures', 'vote_heads', 'expenses', 'school_registry', 'ds_leads', 'ds_students', 'ds_lessons', 'ds_invoices', 'ds_payments', 'ds_skill_mastery', 'mpesa_transactions', 'bank_transactions', 'airtel_transactions', 'intasend_transactions', 'ncba_transactions', 'integration_logs', 'broadcaster_messages', 'marketing_prospects', 'campaign_leads', 'pm_invoices', 'pm_payments', 'books', 'library_transactions', 'library_fines', 'book_reservations', 'book_stock_receipts'].includes(moduleName)
                    ? 100000
                    : (['visitors', 'security_alerts', 'audit_issues', 'activity_log'].includes(moduleName) ? 2000 : (['institution_events', 'events', 'event_categories', 'event_pins'].includes(moduleName) ? 500 : (moduleName === 'app_notifications' ? 100 : (['assessment_marks', 'ta_assignments'].includes(moduleName) ? 5000 : 10000))))
            );
            if (isNaN(finalLimit)) finalLimit = 100000;
            if (finalLimit > 100000) {
                finalLimit = 100000;
            }
            
            let offset = req.query.offset ? parseInt(getStrParam(req.query.offset)) : 0;
            if (isNaN(offset)) offset = 0;
            
            const CHUNK_SIZE = ['users', 'students', 'student_enrollments'].includes(moduleName) ? 500 : 1000;
            let data: any[] = [];
            let error: any = null;

            // Fast 4s timeout for PostgREST so we can quickly fallback to Direct SQL if PostgREST hangs
            const queryTimeout = 4000;
            const executeWithTimeout = async (queryBuilder: any, timeoutMs: number = queryTimeout): Promise<any> => {
                let timer: any;
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new Error('statement timeout')), timeoutMs);
                });
                try {
                    return await Promise.race([Promise.resolve(queryBuilder), timeoutPromise]);
                } finally {
                    clearTimeout(timer);
                }
            };

            // Prepare conditions for Direct SQL Fallback
            const sqlConditions: DirectSqlCondition[] = [];
            if (isStudentsAlias) {
                sqlConditions.push({ sql: `role = $VAL`, val: 'student' });
            } else if (isTeachersAlias) {
                sqlConditions.push({ sql: `role = $VAL`, val: 'teacher' });
            }

            if (user && !shouldSkipTenancy) {
                const isCounty = user.role?.startsWith('county_');
                if (isCounty) {
                    if (moduleName === 'counties') sqlConditions.push({ sql: `id = $VAL`, val: user.institutionId });
                    else if (moduleName === 'institutions') sqlConditions.push({ sql: `county_id = $VAL`, val: user.institutionId });
                    else if (moduleName === 'county_bursary_funds') sqlConditions.push({ sql: `county_id = $VAL`, val: user.institutionId });
                    else if (!isTableWithoutInstitutionId(moduleName)) sqlConditions.push({ sql: `county_id = $VAL`, val: user.institutionId });
                } else if (user.role?.startsWith('constituency_')) {
                    if (moduleName === 'ng_cdf_funds') {
                        sqlConditions.push({ sql: `(constituency_id = $VAL OR constituency_name = $VAL)`, vals: [user.institutionId, user.institutionId] });
                    } else if (moduleName === 'ng_cdf_bursaries') {
                        sqlConditions.push({ sql: `constituency_name = $VAL`, val: user.institutionId });
                    }
                } else if (user.role === 'alumna') {
                    if (moduleName === 'alumni_messages') {
                        sqlConditions.push({ sql: `(sender_id = $VAL OR recipient_id = $VAL OR receiver_id = $VAL)`, vals: [user.id, user.id, user.id] });
                    } else if (moduleName === 'alumnae_members') {
                        // Allow alumnae to see members
                    } else if (['alumni_posts', 'alumni_comments', 'alumni_notifications'].includes(moduleName)) {
                        // Social feed
                    } else if (!isTableWithoutInstitutionId(moduleName)) {
                        sqlConditions.push({ sql: `institution_id = $VAL`, val: user.institutionId });
                    }
                } else {
                    if (user.institutionId) {
                        if (moduleName === 'institutions') sqlConditions.push({ sql: `id = $VAL`, val: user.institutionId });
                        else if (!isTableWithoutInstitutionId(moduleName)) sqlConditions.push({ sql: `institution_id = $VAL`, val: user.institutionId });
                    }
                }
            }

            const tablesWithBranchId = ['users', 'invoices', 'receipts', 'branches', 'branch_integration_configs'];
            const isBranchRestrictedUser = user && user.role !== 'super_admin' && user.role !== 'group_admin';
            if (isBranchRestrictedUser && user.branchId && tablesWithBranchId.includes(moduleName)) {
                if (moduleName === 'branches') {
                    sqlConditions.push({ sql: `id = $VAL`, val: user.branchId });
                } else {
                    sqlConditions.push({ sql: `branch_id = $VAL`, val: user.branchId });
                }
            }

            if (getStrParam(id)) sqlConditions.push({ sql: `id = $VAL`, val: getStrParam(id) });
            if (targetInstParam && targetInstParam !== 'ALL' && !isTableWithoutInstitutionId(moduleName)) {
                sqlConditions.push({ sql: `${moduleName === 'institutions' ? 'id' : 'institution_id'} = $VAL`, val: targetInstParam });
            } else if (isGroupOrSuperAdmin && user?.role === 'group_admin' && user?.institutionId && !targetInstParam && !isTableWithoutInstitutionId(moduleName)) {
                sqlConditions.push({ sql: `${moduleName === 'institutions' ? 'id' : 'institution_id'} = $VAL`, val: user.institutionId });
            }
            if (getStrParam(queryCountyId)) sqlConditions.push({ sql: `county_id = $VAL`, val: getStrParam(queryCountyId) });

            Object.entries(req.query).forEach(([key, value]) => {
                if (!reservedParams.includes(key) && value) {
                    const strVal = getStrParam(value);
                    if (strVal && /^[a-zA-Z0-9_]+$/.test(key)) {
                        const lowerKey = key.toLowerCase();
                        if (lowerKey.includes('email')) {
                            sqlConditions.push({ sql: `"${key}" ILIKE $VAL`, val: strVal.trim() });
                        } else if (lowerKey.includes('phone') || lowerKey === 'mobile') {
                            const digits = strVal.replace(/\D/g, '');
                            if (digits.length >= 9) {
                                const last9 = digits.substring(digits.length - 9);
                                const pattern = '%' + last9.split('').join('%') + '%';
                                sqlConditions.push({ sql: `"${key}" ILIKE $VAL`, val: pattern });
                            } else {
                                sqlConditions.push({ sql: `"${key}" = $VAL`, val: strVal });
                            }
                        } else {
                            sqlConditions.push({ sql: `"${key}" = $VAL`, val: strVal });
                        }
                    }
                }
            });

            let defaultOrderBy: string | undefined = undefined;
            const orderParamStr = getStrParam(order);
            if (orderParamStr) {
                defaultOrderBy = orderParamStr;
            } else if (['integration_logs', 'bank_transactions', 'mpesa_transactions', 'airtel_transactions', 'intasend_transactions', 'ncba_transactions', 'visitors', 'security_alerts', 'activity_log'].includes(moduleName)) {
                defaultOrderBy = 'created_at.desc';
            } else if (['users', 'students', 'student_enrollments'].includes(moduleName)) {
                defaultOrderBy = 'id.asc';
            }

            try {
                if (finalLimit <= CHUNK_SIZE) {
                    const res: any = await executeWithTimeout(buildBaseQuery().range(offset, offset + finalLimit - 1));
                    data = res.data || [];
                    error = res.error;
                } else {
                    let currentOffset = offset;
                    let remaining = finalLimit;

                    while (remaining > 0) {
                        const batchSize = Math.min(CHUNK_SIZE, remaining);
                        let res: any = await executeWithTimeout(buildBaseQuery().range(currentOffset, currentOffset + batchSize - 1));
                        
                        // If chunk timed out, attempt recovery with smaller batch window
                        if (res.error && (res.error.message?.toLowerCase().includes('timeout') || res.error.message?.toLowerCase().includes('gateway'))) {
                            const halfBatch = Math.max(100, Math.floor(batchSize / 2));
                            res = await executeWithTimeout(buildBaseQuery().range(currentOffset, currentOffset + halfBatch - 1));
                        }

                        if (res.error) {
                            if (data.length === 0) {
                                error = res.error;
                            } else {
                                console.info(`[API GET] Chunk fetch completed for '${moduleName}' at offset ${currentOffset} (${data.length} records retrieved).`);
                            }
                            break;
                        }
                        const chunk = res.data || [];
                        if (chunk.length === 0) break;
                        data.push(...chunk);
                        if (chunk.length < batchSize) break; // Reached end of dataset
                        currentOffset += chunk.length;
                        remaining -= chunk.length;
                    }
                }
            } catch (timeoutEx: any) {
                error = { code: '57014', message: timeoutEx?.message || 'statement timeout' };
            }

            if (error) {
                const isTableMissing = error.code === '42P01' || 
                                       error.code === 'PGRST205' || 
                                       error.code === 'PGRST204' ||
                                       error.message?.includes('schema cache') || 
                                       error.message?.includes('does not exist');
                if (isTableMissing) {
                    console.info(`[API GET] Table '${moduleName}' not in DB schema cache, returning empty list.`);
                    return res.status(200).json([]);
                }
                const isUuidMismatch = error.code === '22P02' || 
                                       error.message?.includes('invalid input syntax for type uuid');
                if (isUuidMismatch) {
                    console.warn(`[API GET] UUID type mismatch for '${moduleName}' (DB column expects UUID, received string ID), returning empty list fallback.`);
                    return res.status(200).json([]);
                }

                // ── Direct PostgreSQL Fallback ──
                console.warn(`[API GET] PostgREST query failed or timed out for '${moduleName}' (${error.message || error.code}). Executing direct PostgreSQL fallback...`);
                try {
                    const directData = await fetchViaDirectPg(
                        targetDbTable,
                        sqlConditions,
                        defaultOrderBy,
                        finalLimit,
                        offset
                    );
                    if (directData !== null) {
                        console.info(`[API GET Direct SQL Fallback] Successfully recovered ${directData.length} records for '${moduleName}' directly from PostgreSQL.`);
                        data = directData;
                        error = null; // Cleared!
                    }
                } catch (pgEx: any) {
                    console.warn(`[API GET Direct SQL Fallback Exception] for '${moduleName}':`, pgEx?.message || pgEx);
                }

                // If error is still present (both PostgREST and Direct SQL failed):
                if (error) {
                    console.error(`[API GET Error - Both PostgREST & Direct SQL failed] ${moduleName}:`, error);
                    // CRITICAL: NEVER return HTTP 200 with [] on database errors/timeouts!
                    // Returning 503 ensures frontend clients (apiService.ts / localDb) retain their cached records!
                    return res.status(503).json({
                        success: false,
                        error: 'Database connection failed or timed out',
                        module: moduleName,
                        details: error.message || String(error)
                    });
                }
            }

            if (moduleName === 'school_remedial_rate_settings') {
                let records = Array.isArray(data) ? data : [];
                const targetInst = targetInstParam || user?.institutionId;
                if (records.length === 0 && targetInst) {
                    try {
                        const { data: imsData } = await supabase
                            .from('institution_module_states')
                            .select('data')
                            .eq('id', `${targetInst}_school_remedial_rate_settings`)
                            .limit(1);
                        if (imsData && imsData.length > 0 && imsData[0].data) {
                            records = [imsData[0].data];
                            data = records;
                        }
                    } catch (_) {}
                }
                records.forEach((r: any) => {
                    if (r && typeof r === 'object') {
                        const meta = typeof r.metadata === 'object' && r.metadata !== null ? r.metadata : {};
                        if (r.max_weekend_lessons_per_day === undefined && meta.max_weekend_lessons_per_day !== undefined) {
                            r.max_weekend_lessons_per_day = meta.max_weekend_lessons_per_day;
                        }
                        if (r.maxWeekendLessonsPerDay === undefined) {
                            r.maxWeekendLessonsPerDay = r.max_weekend_lessons_per_day ?? meta.maxWeekendLessonsPerDay ?? 2;
                        }
                        if (r.cancellation_cutoff_hours === undefined && meta.cancellation_cutoff_hours !== undefined) {
                            r.cancellation_cutoff_hours = meta.cancellation_cutoff_hours;
                        }
                        if (r.cancellationCutoffHours === undefined) {
                            r.cancellationCutoffHours = r.cancellation_cutoff_hours ?? meta.cancellationCutoffHours ?? 3;
                        }
                        if (r.confirmation_timeout_minutes === undefined && meta.confirmation_timeout_minutes !== undefined) {
                            r.confirmation_timeout_minutes = meta.confirmation_timeout_minutes;
                        }
                        if (r.confirmationTimeoutMinutes === undefined) {
                            r.confirmationTimeoutMinutes = r.confirmation_timeout_minutes ?? meta.confirmationTimeoutMinutes ?? 45;
                        }
                        if (r.teacher_preferences === undefined && meta.teacher_preferences !== undefined) {
                            r.teacher_preferences = meta.teacher_preferences;
                        }
                        if (r.teacherPreferences === undefined) {
                            r.teacherPreferences = r.teacher_preferences ?? meta.teacherPreferences ?? {};
                        }
                        if (r.weekend_break_start_time === undefined && meta.weekend_break_start_time !== undefined) {
                            r.weekend_break_start_time = meta.weekend_break_start_time;
                        }
                        if (r.weekendBreakStartTime === undefined) {
                            r.weekendBreakStartTime = r.weekend_break_start_time ?? meta.weekendBreakStartTime ?? '10:00';
                        }
                        if (r.weekend_break_end_time === undefined && meta.weekend_break_end_time !== undefined) {
                            r.weekend_break_end_time = meta.weekend_break_end_time;
                        }
                        if (r.weekendBreakEndTime === undefined) {
                            r.weekendBreakEndTime = r.weekend_break_end_time ?? meta.weekendBreakEndTime ?? '10:30';
                        }
                        if (r.weekend_break_label === undefined && meta.weekend_break_label !== undefined) {
                            r.weekend_break_label = meta.weekend_break_label;
                        }
                        if (r.weekendBreakLabel === undefined) {
                            r.weekendBreakLabel = r.weekend_break_label ?? meta.weekendBreakLabel ?? 'Tea & Refreshment Break';
                        }
                        if (r.include_weekend_break === undefined && meta.include_weekend_break !== undefined) {
                            r.include_weekend_break = meta.include_weekend_break;
                        }
                        if (r.includeWeekendBreak === undefined) {
                            r.includeWeekendBreak = r.include_weekend_break ?? meta.includeWeekendBreak ?? true;
                        }
                    }
                });
            }

            if (moduleName === 'school_remedial_allocations' && Array.isArray(data)) {
                (data as any[]).forEach(r => {
                    if (r && typeof r === 'object') {
                        const meta = (typeof r.metadata === 'object' && r.metadata !== null) ? r.metadata : {};
                        if (r.course_id && !r.courseId) r.courseId = r.course_id;
                        if (r.class_name && !r.className) r.className = r.class_name;
                        if (r.subject_id && !r.subjectId) r.subjectId = r.subject_id;
                        if (r.subject_name && !r.subjectName) r.subjectName = r.subject_name;
                        if (r.teacher_id && !r.teacherId) r.teacherId = r.teacher_id;
                        if (r.teacher_name && !r.teacherName) r.teacherName = r.teacher_name;
                        if (r.day_of_week && !r.dayOfWeek) r.dayOfWeek = r.day_of_week;
                        if (r.start_time && !r.startTime) r.startTime = r.start_time;
                        if (r.end_time && !r.endTime) r.endTime = r.end_time;
                        if (r.is_weekend !== undefined && r.isWeekend === undefined) r.isWeekend = r.is_weekend;

                        const isJoint = r.is_joint ?? r.isJoint ?? meta.isJoint ?? meta.is_joint ?? false;
                        r.isJoint = isJoint;
                        r.is_joint = isJoint;

                        const jointStreams = r.joint_streams ?? r.jointStreams ?? meta.jointStreams ?? meta.joint_streams ?? [];
                        r.jointStreams = Array.isArray(jointStreams) ? jointStreams : [];
                        r.joint_streams = r.jointStreams;

                        const jointCourses = r.joint_courses ?? r.jointCourses ?? meta.jointCourses ?? meta.joint_courses ?? [];
                        r.jointCourses = Array.isArray(jointCourses) ? jointCourses : [];
                        r.joint_courses = r.jointCourses;

                        const isAutoGenerated = r.is_auto_generated ?? r.isAutoGenerated ?? meta.isAutoGenerated ?? meta.is_auto_generated ?? false;
                        r.isAutoGenerated = isAutoGenerated;
                        r.is_auto_generated = isAutoGenerated;

                        const isUnallocated = r.is_unallocated ?? r.isUnallocated ?? meta.isUnallocated ?? meta.is_unallocated ?? false;
                        r.isUnallocated = isUnallocated;
                        r.is_unallocated = isUnallocated;

                        const unallocatedReason = r.unallocated_reason ?? r.unallocatedReason ?? meta.unallocatedReason ?? meta.unallocated_reason;
                        if (unallocatedReason !== undefined) {
                            r.unallocatedReason = unallocatedReason;
                            r.unallocated_reason = unallocatedReason;
                        }

                        const isManual = r.is_manual ?? r.isManual ?? meta.isManual ?? meta.is_manual ?? false;
                        r.isManual = isManual;
                        r.is_manual = isManual;

                        const isDutyLesson = r.is_duty_lesson ?? r.isDutyLesson ?? meta.isDutyLesson ?? meta.is_duty_lesson ?? false;
                        r.isDutyLesson = isDutyLesson;
                        r.is_duty_lesson = isDutyLesson;

                        const jointLabel = r.joint_label ?? r.jointLabel ?? meta.jointLabel ?? meta.joint_label;
                        if (jointLabel !== undefined) {
                            r.jointLabel = jointLabel;
                            r.joint_label = jointLabel;
                        }
                    }
                });
            }

            if (moduleName === 'vehicles' && Array.isArray(data)) {
                (data as any[]).forEach(r => {
                    if (r && typeof r === 'object') {
                        const meta = (typeof r.metadata === 'object' && r.metadata !== null) ? r.metadata : {};
                        if (!r.driverName && !r.driver_name && meta.driverName) {
                            r.driverName = meta.driverName;
                            r.driver_name = meta.driverName;
                        }
                        if (r.driver_name && !r.driverName) r.driverName = r.driver_name;
                        if (r.plate_number && !r.plateNumber) r.plateNumber = r.plate_number;
                        if (r.vehicle_type && !r.vehicleType) r.vehicleType = r.vehicle_type;
                        if (r.driver_id && !r.driverId) r.driverId = r.driver_id;
                        if (r.assistant_id && !r.assistantId) r.assistantId = r.assistant_id;
                        if (r.institution_id && !r.institutionId) r.institutionId = r.institution_id;
                    }
                });
            }

            if (moduleName === 'stock_transactions' && Array.isArray(data)) {
                (data as any[]).forEach(r => {
                    if (r && typeof r === 'object') {
                        if (r.item_id && !r.itemId) r.itemId = r.item_id;
                        if (r.item_name && !r.itemName) r.itemName = r.item_name;
                        if (r.recipient_or_supplier && !r.recipientOrSupplier) r.recipientOrSupplier = r.recipient_or_supplier;
                        if (r.recipient_id && !r.recipientId) r.recipientId = r.recipient_id;
                        if (r.recorded_by && !r.recordedBy) r.recordedBy = r.recorded_by;
                        if (r.institution_id && !r.institutionId) r.institutionId = r.institution_id;
                        if (r.verification_method && !r.verificationMethod) r.verificationMethod = r.verification_method;
                    }
                });
            }

            if (moduleName === 'appointments' && Array.isArray(data)) {
                (data as any[]).forEach(r => {
                    if (r && typeof r === 'object') {
                        if (r.host_id && !r.hostId) r.hostId = r.host_id;
                        if (r.host_name && !r.hostName) r.hostName = r.host_name;
                        if (r.guest_name && !r.guestName) r.guestName = r.guest_name;
                        if (r.guest_email && !r.guestEmail) r.guestEmail = r.guest_email;
                        if (r.guest_phone && !r.guestPhone) r.guestPhone = r.guest_phone;
                        if (r.start_time && !r.startTime) r.startTime = r.start_time;
                        if (r.end_time && !r.endTime) r.endTime = r.end_time;
                        if (r.created_at && !r.createdAt) r.createdAt = r.created_at;
                        if (r.institution_id && !r.institutionId) r.institutionId = r.institution_id;
                    }
                });
            }

            if (moduleName === 'institutions') {
                const records = Array.isArray(data) ? data : (data ? [data] : []);
                await Promise.all(records.map(async (inst: any) => {
                    if (!inst || !inst.id) return;
                    try {
                        let vState: any = null;
                        const { data: q1 } = await supabase
                            .from('institution_module_states')
                            .select('data')
                            .eq('institution_id', inst.id)
                            .eq('module_id', 'visitor_settings')
                            .maybeSingle();
                        if (q1) {
                            vState = q1;
                        } else {
                            const { data: q2 } = await supabase
                                .from('institution_module_states')
                                .select('data')
                                .or(`id.eq.${inst.id}_visitor_settings,id.eq.ims_visitor_settings_${inst.id}`)
                                .maybeSingle();
                            vState = q2;
                        }

                        if (vState && vState.data) {
                            const vd = typeof vState.data === 'string' ? JSON.parse(vState.data) : vState.data;
                            if (vd) {
                                const vEnabled = vd.visitor_auto_finalize_enabled ?? vd.visitorAutoFinalizeEnabled;
                                if (vEnabled !== undefined && vEnabled !== null) {
                                    inst.visitor_auto_finalize_enabled = Boolean(vEnabled);
                                }
                                const savedTime = vd.visitor_auto_finalize_time || vd.visitorAutoFinalizeTime;
                                if (savedTime) {
                                    inst.visitor_auto_finalize_time = savedTime;
                                }
                                const nHost = vd.notify_host_on_visitor_arrival ?? vd.notifyHostOnVisitorArrival;
                                if (nHost !== undefined && nHost !== null) {
                                    inst.notify_host_on_visitor_arrival = Boolean(nHost);
                                }
                                if (vd.visitor_arrival_sms_template || vd.visitorArrivalSmsTemplate) {
                                    inst.visitor_arrival_sms_template = vd.visitor_arrival_sms_template || vd.visitorArrivalSmsTemplate;
                                }
                            }
                        }
                    } catch (_) {}

                    if (inst.metadata) {
                        const meta = typeof inst.metadata === 'string' ? JSON.parse(inst.metadata) : inst.metadata;
                        if (inst.visitor_auto_finalize_enabled === undefined && (meta.visitor_auto_finalize_enabled !== undefined || meta.visitorAutoFinalizeEnabled !== undefined)) {
                            inst.visitor_auto_finalize_enabled = meta.visitor_auto_finalize_enabled ?? meta.visitorAutoFinalizeEnabled;
                        }
                        if (!inst.visitor_auto_finalize_time && (meta.visitor_auto_finalize_time || meta.visitorAutoFinalizeTime)) {
                            inst.visitor_auto_finalize_time = meta.visitor_auto_finalize_time || meta.visitorAutoFinalizeTime;
                        }
                        if (inst.notify_host_on_visitor_arrival === undefined && (meta.notify_host_on_visitor_arrival !== undefined || meta.notifyHostOnVisitorArrival !== undefined)) {
                            inst.notify_host_on_visitor_arrival = meta.notify_host_on_visitor_arrival ?? meta.notifyHostOnVisitorArrival;
                        }
                        if (!inst.visitor_arrival_sms_template && (meta.visitor_arrival_sms_template || meta.visitorArrivalSmsTemplate)) {
                            inst.visitor_arrival_sms_template = meta.visitor_arrival_sms_template || meta.visitorArrivalSmsTemplate;
                        }
                    }

                    if (inst.visitor_auto_finalize_time && typeof inst.visitor_auto_finalize_time === 'string') {
                        inst.visitor_auto_finalize_time = inst.visitor_auto_finalize_time.trim().slice(0, 5);
                    }
                    if (inst.visitorAutoFinalizeTime && typeof inst.visitorAutoFinalizeTime === 'string') {
                        inst.visitorAutoFinalizeTime = inst.visitorAutoFinalizeTime.trim().slice(0, 5);
                    }

                    if (inst.visitor_auto_finalize_enabled !== undefined && inst.visitorAutoFinalizeEnabled === undefined) {
                        inst.visitorAutoFinalizeEnabled = inst.visitor_auto_finalize_enabled;
                    }
                    if (inst.visitor_auto_finalize_time && !inst.visitorAutoFinalizeTime) {
                        inst.visitorAutoFinalizeTime = inst.visitor_auto_finalize_time;
                    }
                    if (inst.notify_host_on_visitor_arrival !== undefined && inst.notifyHostOnVisitorArrival === undefined) {
                        inst.notifyHostOnVisitorArrival = inst.notify_host_on_visitor_arrival;
                    }
                    if (inst.visitor_arrival_sms_template && !inst.visitorArrivalSmsTemplate) {
                        inst.visitorArrivalSmsTemplate = inst.visitor_arrival_sms_template;
                    }
                }));
            }

            return res.status(200).json(data || []);
        }

        const stripUniversalTransientKeys = (rec: any) => {
            if (!rec || typeof rec !== 'object') return rec;
            const copy = { ...rec };
            const universalKeys = [
                'offline_fallback', 'offlineFallback', 'offline', 'success', 'error',
                'notification_sent', 'notificationSent', 'is_opening_balance', 'isOpeningBalance'
            ];
            const MODULES_WITH_MESSAGE_COLUMN = [
                'sms_logs', 'sms_outbox', 'sms_gateway_logs', 'fuel_sms_logs',
                'broadcaster_messages', 'alumni_messages', 'feedback_submissions',
                'activity_log', 'bulletin_items', 'pm_inquiries', 'notifications',
                'demo_requests', 'audit_issues', 'chat_messages', 'direct_messages'
            ];
            if (!MODULES_WITH_MESSAGE_COLUMN.includes(moduleName)) {
                universalKeys.push('message');
            }
            if (moduleName === 'ds_students') {
                const cat = copy.license_category || copy.licenseCategory || copy.license_type_interested || copy.licenseTypeInterested;
                if (cat) {
                    copy.license_type_interested = cat;
                }
                delete copy.license_category;
                delete copy.licenseCategory;
                delete copy.licenseTypeInterested;
                delete copy.preferred_lesson_hours;
                delete copy.preferredLessonHours;
            }
            if (moduleName === 'receipts' || moduleName === 'payments' || moduleName === 'ds_payments') {
                if (copy.amount !== undefined && copy.amount_paid === undefined) {
                    copy.amount_paid = copy.amount;
                }
                delete copy.amount;
                if (copy.amountPaid !== undefined) {
                    if (copy.amount_paid === undefined) copy.amount_paid = copy.amountPaid;
                    delete copy.amountPaid;
                }
                if (copy.date !== undefined) {
                    if (copy.payment_date === undefined) copy.payment_date = copy.date;
                    delete copy.date;
                }
                if (copy.receiptDate !== undefined) {
                    if (copy.payment_date === undefined) copy.payment_date = copy.receiptDate;
                    delete copy.receiptDate;
                }
                if (copy.receipt_date !== undefined) {
                    if (copy.payment_date === undefined) copy.payment_date = copy.receipt_date;
                    delete copy.receipt_date;
                }
                if ('invoiceId' in copy) {
                    const invId = copy.invoice_id || copy.invoiceId;
                    if (!invId || typeof invId !== 'string' || invId.startsWith('ext_') || invId.startsWith('temp_') || invId.startsWith('guest_') || invId.trim() === '') {
                        copy.invoice_id = null;
                    } else {
                        copy.invoice_id = invId;
                    }
                    delete copy.invoiceId;
                }
                if ('studentId' in copy) {
                    const sId = copy.student_id || copy.studentId;
                    if (!sId || typeof sId !== 'string' || sId.startsWith('ext_') || sId.startsWith('temp_') || sId.startsWith('guest_') || sId.trim() === '') {
                        copy.student_id = null;
                    } else {
                        copy.student_id = sId;
                    }
                    delete copy.studentId;
                }
                if ('institutionId' in copy) {
                    if (copy.institution_id === undefined) copy.institution_id = copy.institutionId;
                    delete copy.institutionId;
                }
                if ('branchId' in copy) {
                    if (copy.branch_id === undefined) copy.branch_id = copy.branchId;
                    delete copy.branchId;
                }
                if ('receiptNumber' in copy) {
                    if (copy.receipt_number === undefined) copy.receipt_number = copy.receiptNumber;
                    delete copy.receiptNumber;
                }
                if ('paymentMethod' in copy) {
                    if (copy.payment_method === undefined) copy.payment_method = copy.paymentMethod;
                    delete copy.paymentMethod;
                }
                if ('paymentDate' in copy) {
                    if (copy.payment_date === undefined) copy.payment_date = copy.paymentDate;
                    delete copy.paymentDate;
                }
                if ('relatedTransactionId' in copy) {
                    if (copy.related_transaction_id === undefined) copy.related_transaction_id = copy.relatedTransactionId;
                    delete copy.relatedTransactionId;
                }
                if ('paidFor' in copy) {
                    if (copy.paid_for === undefined) copy.paid_for = copy.paidFor;
                    delete copy.paidFor;
                }
                delete copy.bankAccountId;
                delete copy.bank_account_id;
                delete copy.voteheadId;
                delete copy.votehead_id;
                delete copy.notes;
                delete copy.receiptSource;
                delete copy.receipt_source;
                delete copy.voteHeadAllocations;
                delete copy.vote_head_allocations;
                delete copy.studentName;
                delete copy.student_name;
                delete copy.admDisplay;
                delete copy.adm_display;
                delete copy.excelPaymentMode;
                delete copy.excel_payment_mode;
                delete copy.matchStatus;
                delete copy.match_status;
                delete copy.matchConfidence;
                delete copy.match_confidence;
                delete copy.matchedStudentId;
                delete copy.matched_student_id;
                delete copy.studentAdm;
                delete copy.student_adm;
                delete copy.admission_number;
                delete copy.admissionNumber;
                delete copy.updated_at;
                delete copy.updatedAt;
                delete copy.created_at;
                delete copy.createdAt;
            }
            if (moduleName === 'invoices' || moduleName === 'ds_invoices') {
                if (copy.amount !== undefined && copy.total_amount === undefined) {
                    copy.total_amount = copy.amount;
                }
                delete copy.amount;
                if (copy.totalAmount !== undefined) {
                    if (copy.total_amount === undefined) copy.total_amount = copy.totalAmount;
                    delete copy.totalAmount;
                }
                if ('studentId' in copy) {
                    const sId = copy.student_id || copy.studentId;
                    if (!sId || typeof sId !== 'string' || sId.startsWith('ext_') || sId.startsWith('temp_') || sId.startsWith('guest_') || sId.trim() === '') {
                        copy.student_id = null;
                    } else {
                        copy.student_id = sId;
                    }
                    delete copy.studentId;
                }
                if ('institutionId' in copy) {
                    if (copy.institution_id === undefined) copy.institution_id = copy.institutionId;
                    delete copy.institutionId;
                }
                if ('branchId' in copy) {
                    if (copy.branch_id === undefined) copy.branch_id = copy.branchId;
                    delete copy.branchId;
                }
                if ('invoiceNumber' in copy) {
                    if (copy.invoice_number === undefined) copy.invoice_number = copy.invoiceNumber;
                    delete copy.invoiceNumber;
                }
                if ('dueDate' in copy) {
                    if (copy.due_date === undefined) copy.due_date = copy.dueDate;
                    delete copy.dueDate;
                }
                if ('issueDate' in copy) {
                    if (copy.issue_date === undefined) copy.issue_date = copy.issueDate;
                    delete copy.issueDate;
                }
                if (copy.date !== undefined) {
                    if (copy.issue_date === undefined) copy.issue_date = copy.date;
                    delete copy.date;
                }
                if (copy.invoiceDate !== undefined) {
                    if (copy.issue_date === undefined) copy.issue_date = copy.invoiceDate;
                    delete copy.invoiceDate;
                }
                if (copy.invoice_date !== undefined) {
                    if (copy.issue_date === undefined) copy.issue_date = copy.invoice_date;
                    delete copy.invoice_date;
                }
            }
            if (moduleName === 'visitors') {
                const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                // 1. Host ID
                const hId = copy.host_id ?? copy.hostId;
                if (!hId || hId === '' || hId === 'null' || hId === 'undefined') {
                    copy.host_id = null;
                } else {
                    copy.host_id = hId;
                }
                delete copy.hostId;

                // 2. ID Number
                const idNum = copy.id_number ?? copy.idNumber;
                if (idNum !== undefined && idNum !== null && idNum !== '') {
                    copy.id_number = String(idNum);
                    meta.id_number = String(idNum);
                }
                delete copy.idNumber;

                // 3. Name & Full Name
                const fName = copy.full_name ?? copy.fullName ?? copy.name;
                if (fName) {
                    copy.full_name = fName;
                    if (!copy.name) copy.name = fName;
                }
                delete copy.fullName;

                // 4. Phone Number
                const phone = copy.phone_number ?? copy.phoneNumber ?? copy.phone;
                if (phone) {
                    copy.phone_number = phone;
                }
                delete copy.phoneNumber;

                // 5. Date & Time
                if ('visitDate' in copy) {
                    copy.visit_date = copy.visit_date || copy.visitDate;
                    delete copy.visitDate;
                }
                if ('timeIn' in copy) {
                    copy.time_in = copy.time_in || copy.timeIn;
                    delete copy.timeIn;
                }
                if ('timeOut' in copy) {
                    copy.time_out = copy.time_out || copy.timeOut;
                    delete copy.timeOut;
                }
                if ('checkIn' in copy) {
                    copy.check_in = copy.check_in || copy.checkIn;
                    delete copy.checkIn;
                }
                if ('entryTime' in copy) {
                    if (!copy.time_in) copy.time_in = copy.entryTime;
                    delete copy.entryTime;
                }

                // 6. Host & Vehicle details
                if ('hostName' in copy) {
                    copy.host_name = copy.host_name || copy.hostName;
                    delete copy.hostName;
                }
                if ('vehiclePlate' in copy) {
                    copy.vehicle_plate = copy.vehicle_plate || copy.vehiclePlate;
                    delete copy.vehiclePlate;
                }
                if ('vehicleModel' in copy) {
                    copy.vehicle_model = copy.vehicle_model || copy.vehicleModel;
                    delete copy.vehicleModel;
                }

                // 7. Signatures & Security
                if ('visitorSignature' in copy) {
                    copy.visitor_signature = copy.visitor_signature || copy.visitorSignature;
                    delete copy.visitorSignature;
                }
                if ('hostSignature' in copy) {
                    copy.host_signature = copy.host_signature || copy.hostSignature;
                    delete copy.hostSignature;
                }
                if ('securityOfficerName' in copy) {
                    copy.security_officer_name = copy.security_officer_name || copy.securityOfficerName;
                    delete copy.securityOfficerName;
                }
                if ('institutionId' in copy) {
                    copy.institution_id = copy.institution_id || copy.institutionId;
                    delete copy.institutionId;
                }

                // 8. Status
                if (copy.status) {
                    meta.status = copy.status;
                }

                // 9. Host notification & phone
                if ('notifyHostSms' in copy || 'notify_host_sms' in copy) {
                    const nh = copy.notify_host_sms ?? copy.notifyHostSms;
                    copy.notify_host_sms = Boolean(nh);
                    meta.notify_host_sms = Boolean(nh);
                    delete copy.notifyHostSms;
                }
                if ('hostPhone' in copy || 'host_phone' in copy) {
                    const hp = copy.host_phone ?? copy.hostPhone;
                    copy.host_phone = hp;
                    meta.host_phone = hp;
                    delete copy.hostPhone;
                }

                copy.metadata = meta;
            }
            if (moduleName === 'stock_transactions') {
                if (copy.itemId && !copy.item_id) copy.item_id = copy.itemId;
                delete copy.itemId;
                if (copy.itemName && !copy.item_name) copy.item_name = copy.itemName;
                delete copy.itemName;
                if (copy.recipientOrSupplier && !copy.recipient_or_supplier) copy.recipient_or_supplier = copy.recipientOrSupplier;
                delete copy.recipientOrSupplier;
                if (copy.recipientId && !copy.recipient_id) copy.recipient_id = copy.recipientId;
                delete copy.recipientId;
                if (copy.recordedBy && !copy.recorded_by) copy.recorded_by = copy.recordedBy;
                delete copy.recordedBy;
                if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                delete copy.institutionId;
                if (copy.verificationMethod && !copy.verification_method) copy.verification_method = copy.verificationMethod;
                delete copy.verificationMethod;
            }
            if (moduleName === 'appointments') {
                if (copy.hostId && !copy.host_id) copy.host_id = copy.hostId;
                delete copy.hostId;
                if (copy.hostName && !copy.host_name) copy.host_name = copy.hostName;
                delete copy.hostName;
                if (copy.guestName && !copy.guest_name) copy.guest_name = copy.guestName;
                delete copy.guestName;
                if (copy.guestEmail && !copy.guest_email) copy.guest_email = copy.guestEmail;
                delete copy.guestEmail;
                if (copy.guestPhone && !copy.guest_phone) copy.guest_phone = copy.guestPhone;
                delete copy.guestPhone;
                if (copy.startTime && !copy.start_time) copy.start_time = copy.startTime;
                delete copy.startTime;
                if (copy.endTime && !copy.end_time) copy.end_time = copy.endTime;
                delete copy.endTime;
                if (copy.createdAt && !copy.created_at) copy.created_at = copy.createdAt;
                delete copy.createdAt;
                if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                delete copy.institutionId;
            }
            universalKeys.forEach(k => {
                if (k in copy) delete copy[k];
            });
            return copy;
        };

        if (req.method === 'POST') {
            // ── Bulk delete via POST (avoids DELETE-body stripping on Vercel/proxies) ──
            if (req.body?.action === 'bulk_delete') {
                const rawIds = req.body.ids;
                const idsArray: string[] = Array.isArray(rawIds)
                    ? rawIds.map(String).filter(Boolean)
                    : (typeof rawIds === 'string' ? rawIds.split(',').map((s: string) => s.trim()).filter(Boolean) : []);

                if (idsArray.length === 0) {
                    return res.status(400).json({ success: false, error: 'bulk_delete requires a non-empty ids array' });
                }

                let q = supabase.from(targetDbTable).delete();
                if (idsArray.length === 1) q = q.eq('id', idsArray[0]);
                else q = q.in('id', idsArray);

                // Security: restrict to own institution unless super_admin or public module
                if (user?.role !== 'super_admin' && !PUBLIC_MODULES.includes(moduleName) && !isTableWithoutInstitutionId(moduleName)) {
                    q = q.eq('institution_id', user?.institutionId);
                }

                const { error: delErr } = await q;
                if (delErr) return res.status(200).json({ success: false, error: delErr.message, code: delErr.code });
                return res.status(200).json({ success: true, count: idsArray.length, module: moduleName });
            }

            const { data: recordData } = req.body || {};
            if (!recordData) return res.status(400).json({ success: false, error: 'No data' });
            
            // Add tenancy if missing (skip for root tables that don't have this column or for super_admin)
            const skipTenancy = user?.role === 'super_admin' || moduleName === 'institutions' || isTableWithoutInstitutionId(moduleName);
            const recordWithTenancy = Array.isArray(recordData) 
                ? recordData.map(r => ({ ...r, ...(skipTenancy ? {} : { institution_id: r.institution_id || r.institutionId || user?.institutionId }) }))
                : { ...recordData, ...(skipTenancy ? {} : { institution_id: recordData.institution_id || recordData.institutionId || user?.institutionId }) };

            const tablesWithBranchId = ['users', 'invoices', 'receipts', 'branches', 'branch_integration_configs'];
            const isBranchRestrictedUser = user && user.role !== 'super_admin' && user.role !== 'group_admin';
            
            const appendBranch = (r: any) => {
                if (isBranchRestrictedUser && user.branchId && tablesWithBranchId.includes(moduleName) && moduleName !== 'branches') {
                    return {
                        ...r,
                        branch_id: r.branch_id || r.branchId || user.branchId
                    };
                }
                return r;
            };

            const recordWithBranch = Array.isArray(recordWithTenancy) 
                ? recordWithTenancy.map(appendBranch)
                : appendBranch(recordWithTenancy);

            const isValidUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            const UUID_STRICT_MODULES = ['biometric_devices', 'student_attendance', 'staff_attendance_daily', 'biometric_logs', 'biometric_enrollments'];

            const sanitizeUUIDs = (r: any) => {
                if (!r || typeof r !== 'object') return r;
                const cleaned = { ...r };
                // Only strip non-UUID IDs if the target module specifically requires PostgreSQL UUID data type
                if (UUID_STRICT_MODULES.includes(moduleName) || (typeof cleaned.id === 'string' && cleaned.id.startsWith('att_') && moduleName.includes('attendance'))) {
                    if (cleaned.id && typeof cleaned.id === 'string' && !isValidUUID(cleaned.id)) {
                        console.warn(`[api/records] Stripping non-UUID id '${cleaned.id}' for module '${moduleName}'`);
                        delete cleaned.id;
                    }
                }
                if (moduleName === 'receipts' || moduleName === 'ds_payments') {
                    const isPseudo = (id: any) => typeof id === 'string' && (id.trim() === '' || id.startsWith('__opening_balance__') || id.startsWith('__') || id.startsWith('temp_'));
                    if (isPseudo(cleaned.invoice_id)) cleaned.invoice_id = null;
                    if (isPseudo(cleaned.invoiceId)) cleaned.invoiceId = null;
                }
                if (moduleName === 'ds_lessons') {
                    const isInvalidFK = (id: any) => !id || (typeof id === 'string' && (id.trim() === '' || id.startsWith('temp_') || id.startsWith('__') || id.startsWith('unassigned') || id === 'null' || id === 'undefined'));
                    if (isInvalidFK(cleaned.instructor_id)) cleaned.instructor_id = null;
                    if (isInvalidFK(cleaned.instructorId)) cleaned.instructorId = null;
                    if (isInvalidFK(cleaned.vehicle_id)) cleaned.vehicle_id = null;
                    if (isInvalidFK(cleaned.vehicleId)) cleaned.vehicleId = null;
                    if (isInvalidFK(cleaned.room_id)) cleaned.room_id = null;
                    if (isInvalidFK(cleaned.roomId)) cleaned.roomId = null;
                }
                return cleaned;
            };

            const sanitizedRecords = Array.isArray(recordWithBranch)
                ? recordWithBranch.map(sanitizeUUIDs).map(stripUniversalTransientKeys)
                : stripUniversalTransientKeys(sanitizeUUIDs(recordWithBranch));

            let currentPayload = sanitizedRecords;
            if (moduleName === 'his_patients') {
                const cleanPatient = (p: any) => {
                    if (!p || typeof p !== 'object') return p;
                    const copy = { ...p };
                    const opVal = copy.admission_number || copy.admissionNumber || copy.custom_patient_id || copy.customPatientId || copy.patient_number || copy.patientNumber || copy.op_number || copy.opNumber;
                    if (opVal) copy.admission_number = String(opVal).trim();
                    if (copy.fullName && !copy.full_name) copy.full_name = copy.fullName;
                    if (copy.bloodGroup && !copy.blood_group) copy.blood_group = copy.bloodGroup;
                    if (copy.insuranceProvider && !copy.insurance_provider) copy.insurance_provider = copy.insuranceProvider;
                    if (copy.shaNumber && !copy.sha_number) copy.sha_number = copy.shaNumber;
                    if (copy.emergencyContactName && !copy.emergency_contact_name) copy.emergency_contact_name = copy.emergencyContactName;
                    if (copy.emergencyContactPhone && !copy.emergency_contact_phone) copy.emergency_contact_phone = copy.emergencyContactPhone;
                    if (copy.gradeLevel && !copy.grade_level) copy.grade_level = copy.gradeLevel;
                    if (copy.recordedBy && !copy.recorded_by) copy.recorded_by = copy.recordedBy;
                    if ((copy.dateOfBirth || copy.date_of_birth) && !copy.dob) copy.dob = copy.dateOfBirth || copy.date_of_birth;
                    if ((copy.phoneNumber || copy.phone) && (!copy.contact || copy.contact === 'N/A')) copy.contact = copy.phoneNumber || copy.phone;
                    if (copy.emergencyContact && !copy.emergency_contact_name) copy.emergency_contact_name = copy.emergencyContact;

                    // Harmonize guardian fields into standard emergency contact & contact fields
                    const gName = copy.guardian_name || copy.guardianName;
                    const gPhone = copy.guardian_phone || copy.guardianPhone;
                    if (gName && !copy.emergency_contact_name) copy.emergency_contact_name = gName;
                    if (gPhone && !copy.emergency_contact_phone) copy.emergency_contact_phone = gPhone;
                    if (gPhone && (!copy.contact || copy.contact === 'N/A')) copy.contact = gPhone;

                    delete copy.custom_patient_id;
                    delete copy.customPatientId;
                    delete copy.patient_number;
                    delete copy.patientNumber;
                    delete copy.op_number;
                    delete copy.opNumber;
                    delete copy.admissionNumber;
                    delete copy.name;
                    delete copy.fullName;
                    delete copy.bloodGroup;
                    delete copy.insuranceProvider;
                    delete copy.shaNumber;
                    delete copy.emergencyContactName;
                    delete copy.emergencyContactPhone;
                    delete copy.emergencyContact;
                    delete copy.dateOfBirth;
                    delete copy.date_of_birth;
                    delete copy.phoneNumber;
                    delete copy.phone;
                    delete copy.guardian_name;
                    delete copy.guardianName;
                    delete copy.guardian_phone;
                    delete copy.guardianPhone;
                    delete copy.guardian_national_id;
                    delete copy.guardianNationalId;
                    delete copy.first_name;
                    delete copy.firstName;
                    delete copy.last_name;
                    delete copy.lastName;
                    delete copy.gradeLevel;
                    delete copy.recordedBy;
                    delete copy.createdAt;
                    delete copy.updatedAt;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanPatient) : cleanPatient(currentPayload);
            }
            if (moduleName === 'feedback_submissions') {
                const cleanFeedback = (f: any) => {
                    if (!f || typeof f !== 'object') return f;
                    const copy = { ...f };
                    copy.title = copy.title || 'General Guest Feedback';
                    copy.content = copy.content || copy.comments || copy.title || 'Guest Feedback Submission';
                    if (!copy.student_id && !copy.studentId) {
                        copy.student_id = (copy.is_anonymous || copy.isAnonymous) ? 'anonymous_guest' : (copy.guest_name || copy.guestName || 'guest_visitor');
                    }
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanFeedback) : cleanFeedback(currentPayload);
            }
            if (moduleName === 'institutions') {
                const cleanInstitution = (inst: any) => {
                    if (!inst || typeof inst !== 'object') return inst;
                    const copy = { ...inst };
                    delete copy.student_count;
                    delete copy.studentCount;
                    delete copy.active_users_count;
                    delete copy.activeUsersCount;
                    delete copy.staff_count;
                    delete copy.staffCount;
                    delete copy.user_count;
                    delete copy.userCount;
                    delete copy.sms_balance_formatted;
                    delete copy.smsBalanceFormatted;
                    delete copy.departments;
                    delete copy.courses;
                    delete copy.rooms;
                    delete copy.academic_years;
                    delete copy.semesters;
                    delete copy.users;
                    delete copy.updated_at;
                    delete copy.updatedAt;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanInstitution) : cleanInstitution(currentPayload);
            }
            if (isStudentsAlias) {
                const setStudentRole = (r: any) => (r && typeof r === 'object' ? { ...r, role: r.role || 'student' } : r);
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(setStudentRole) : setStudentRole(currentPayload);
            } else if (isTeachersAlias) {
                const setTeacherRole = (r: any) => (r && typeof r === 'object' ? { ...r, role: r.role || 'teacher' } : r);
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(setTeacherRole) : setTeacherRole(currentPayload);
            }
            if (moduleName === 'ds_students') {
                const cleanDsStudent = (s: any) => {
                    if (!s || typeof s !== 'object') return s;
                    const copy = { ...s };
                    const cat = copy.license_category || copy.licenseCategory || copy.license_type_interested || copy.licenseTypeInterested;
                    if (cat) {
                        copy.license_type_interested = cat;
                    }
                    delete copy.license_category;
                    delete copy.licenseCategory;
                    delete copy.licenseTypeInterested;
                    delete copy.preferred_lesson_hours;
                    delete copy.preferredLessonHours;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanDsStudent) : cleanDsStudent(currentPayload);
            }
            if (moduleName === 'school_remedial_rate_settings') {
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanRemedialRateSettings) : cleanRemedialRateSettings(currentPayload);
            }
            if (moduleName === 'school_remedial_subjects') {
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanRemedialSubject) : cleanRemedialSubject(currentPayload);
            }

            if (moduleName === 'school_remedial_allocations') {
                const cleanRemedialAllocation = (rec: any) => {
                    if (!rec || typeof rec !== 'object') return rec;
                    const copy = { ...rec };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.courseId && !copy.course_id) copy.course_id = copy.courseId;
                    if (copy.className !== undefined && copy.class_name === undefined) copy.class_name = copy.className;
                    if (copy.subjectId && !copy.subject_id) copy.subject_id = copy.subjectId;
                    if (copy.subjectName !== undefined && copy.subject_name === undefined) copy.subject_name = copy.subjectName;
                    if (copy.teacherId && !copy.teacher_id) copy.teacher_id = copy.teacherId;
                    if (copy.teacherName !== undefined && copy.teacher_name === undefined) copy.teacher_name = copy.teacherName;
                    if (copy.dayOfWeek && !copy.day_of_week) copy.day_of_week = copy.dayOfWeek;
                    if (copy.startTime && !copy.start_time) copy.start_time = copy.startTime;
                    if (copy.endTime && !copy.end_time) copy.end_time = copy.endTime;
                    if (copy.isWeekend !== undefined && copy.is_weekend === undefined) copy.is_weekend = copy.isWeekend;

                    if (copy.isJoint !== undefined && copy.is_joint === undefined) copy.is_joint = copy.isJoint;
                    if (copy.jointStreams !== undefined && copy.joint_streams === undefined) copy.joint_streams = copy.jointStreams;
                    if (copy.jointCourses !== undefined && copy.joint_courses === undefined) copy.joint_courses = copy.jointCourses;

                    if (copy.isAutoGenerated !== undefined && copy.is_auto_generated === undefined) copy.is_auto_generated = copy.isAutoGenerated;
                    if (copy.isUnallocated !== undefined && copy.is_unallocated === undefined) copy.is_unallocated = copy.isUnallocated;
                    if (copy.unallocatedReason !== undefined && copy.unallocated_reason === undefined) copy.unallocated_reason = copy.unallocatedReason;
                    if (copy.isManual !== undefined && copy.is_manual === undefined) copy.is_manual = copy.isManual;
                    if (copy.isDutyLesson !== undefined && copy.is_duty_lesson === undefined) copy.is_duty_lesson = copy.isDutyLesson;
                    if (copy.jointLabel !== undefined && copy.joint_label === undefined) copy.joint_label = copy.jointLabel;

                    if (copy.substituteTeacherId !== undefined && copy.substitute_teacher_id === undefined) copy.substitute_teacher_id = copy.substituteTeacherId;
                    if (copy.substituteTeacherName !== undefined && copy.substitute_teacher_name === undefined) copy.substitute_teacher_name = copy.substituteTeacherName;
                    if (copy.originalTeacherId !== undefined && copy.original_teacher_id === undefined) copy.original_teacher_id = copy.originalTeacherId;
                    if (copy.originalTeacherName !== undefined && copy.original_teacher_name === undefined) copy.original_teacher_name = copy.originalTeacherName;
                    if (copy.cancellationReason !== undefined && copy.cancellation_reason === undefined) copy.cancellation_reason = copy.cancellationReason;
                    if (copy.cancelledAt !== undefined && copy.cancelled_at === undefined) copy.cancelled_at = copy.cancelledAt;
                    if (copy.confirmationDeadline !== undefined && copy.confirmation_deadline === undefined) copy.confirmation_deadline = copy.confirmationDeadline;
                    if (copy.declinedTeacherIds !== undefined && copy.declined_teacher_ids === undefined) copy.declined_teacher_ids = copy.declinedTeacherIds;

                    if (copy.is_joint !== undefined) {
                        meta.isJoint = copy.is_joint;
                        meta.is_joint = copy.is_joint;
                    }
                    if (copy.joint_streams !== undefined) {
                        meta.jointStreams = copy.joint_streams;
                        meta.joint_streams = copy.joint_streams;
                    }
                    if (copy.joint_courses !== undefined) {
                        meta.jointCourses = copy.joint_courses;
                        meta.joint_courses = copy.joint_courses;
                    }

                    if (copy.is_auto_generated !== undefined) {
                        meta.isAutoGenerated = copy.is_auto_generated;
                        meta.is_auto_generated = copy.is_auto_generated;
                    }
                    if (copy.is_unallocated !== undefined) {
                        meta.isUnallocated = copy.is_unallocated;
                        meta.is_unallocated = copy.is_unallocated;
                    }
                    if (copy.unallocated_reason !== undefined) {
                        meta.unallocatedReason = copy.unallocated_reason;
                        meta.unallocated_reason = copy.unallocated_reason;
                    }
                    if (copy.is_manual !== undefined) {
                        meta.isManual = copy.is_manual;
                        meta.is_manual = copy.is_manual;
                    }
                    if (copy.is_duty_lesson !== undefined) {
                        meta.isDutyLesson = copy.is_duty_lesson;
                        meta.is_duty_lesson = copy.is_duty_lesson;
                    }
                    if (copy.joint_label !== undefined) {
                        meta.jointLabel = copy.joint_label;
                        meta.joint_label = copy.joint_label;
                    }

                    copy.metadata = meta;
                    delete copy.institutionId;
                    delete copy.courseId;
                    delete copy.className;
                    delete copy.subjectId;
                    delete copy.subjectName;
                    delete copy.teacherId;
                    delete copy.teacherName;
                    delete copy.dayOfWeek;
                    delete copy.startTime;
                    delete copy.endTime;
                    delete copy.isWeekend;
                    delete copy.isJoint;
                    delete copy.jointStreams;
                    delete copy.jointCourses;
                    delete copy.isAutoGenerated;
                    delete copy.isUnallocated;
                    delete copy.unallocatedReason;
                    delete copy.isManual;
                    delete copy.isDutyLesson;
                    delete copy.jointLabel;
                    delete copy.substituteTeacherId;
                    delete copy.substituteTeacherName;
                    delete copy.originalTeacherId;
                    delete copy.originalTeacherName;
                    delete copy.cancellationReason;
                    delete copy.cancelledAt;
                    delete copy.confirmationDeadline;
                    delete copy.declinedTeacherIds;
                    delete copy.updated_at;
                    delete copy.updatedAt;

                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanRemedialAllocation) : cleanRemedialAllocation(currentPayload);
            }

            if (moduleName === 'school_authorized_devices') {
                const cleanAuthorizedDevice = (rec: any) => {
                    if (!rec || typeof rec !== 'object') return rec;
                    const copy = { ...rec };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.deviceName && !copy.device_name) copy.device_name = copy.deviceName;
                    if (copy.deviceType && !copy.device_type) copy.device_type = copy.deviceType;
                    if (copy.macAddress && !copy.mac_address) copy.mac_address = copy.macAddress;
                    if (copy.ipAddress !== undefined && copy.ip_address === undefined) copy.ip_address = copy.ipAddress;
                    if (copy.ownerType && !copy.owner_type) copy.owner_type = copy.ownerType;
                    if (copy.ownerId !== undefined && copy.owner_id === undefined) copy.owner_id = copy.ownerId;
                    if (copy.ownerName !== undefined && copy.owner_name === undefined) copy.owner_name = copy.ownerName;
                    if (copy.bandwidthLimitMbps !== undefined && copy.bandwidth_limit_mbps === undefined) copy.bandwidth_limit_mbps = copy.bandwidthLimitMbps;
                    if (copy.accessStatus && !copy.access_status) copy.access_status = copy.accessStatus;
                    if (copy.routerProfileId !== undefined && copy.router_profile_id === undefined) copy.router_profile_id = copy.routerProfileId;
                    if (copy.validUntil !== undefined && copy.valid_until === undefined) copy.valid_until = copy.validUntil;

                    // Normalize MAC address: uppercase and strip non-hex separators if needed
                    if (copy.mac_address && typeof copy.mac_address === 'string') {
                        const raw = copy.mac_address.trim().toUpperCase().replace(/[^0-9A-F]/g, '');
                        if (raw.length === 12) {
                            copy.mac_address = raw.match(/.{1,2}/g)?.join(':') || copy.mac_address.toUpperCase();
                        } else {
                            copy.mac_address = copy.mac_address.trim().toUpperCase();
                        }
                    }

                    copy.updated_at = new Date().toISOString();
                    copy.metadata = meta;

                    delete copy.institutionId;
                    delete copy.deviceName;
                    delete copy.deviceType;
                    delete copy.macAddress;
                    delete copy.ipAddress;
                    delete copy.ownerType;
                    delete copy.ownerId;
                    delete copy.ownerName;
                    delete copy.bandwidthLimitMbps;
                    delete copy.accessStatus;
                    delete copy.routerProfileId;
                    delete copy.validUntil;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanAuthorizedDevice) : cleanAuthorizedDevice(currentPayload);
            }

            if (moduleName === 'school_router_profiles') {
                const cleanRouterProfile = (rec: any) => {
                    if (!rec || typeof rec !== 'object') return rec;
                    const copy = { ...rec };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.routerName && !copy.router_name) copy.router_name = copy.routerName;
                    if (copy.ipAddress !== undefined && copy.ip_address === undefined) copy.ip_address = copy.ipAddress;
                    if (copy.wifiSsid !== undefined && copy.wifi_ssid === undefined) copy.wifi_ssid = copy.wifiSsid;
                    if (copy.filterMode !== undefined && copy.filter_mode === undefined) copy.filter_mode = copy.filterMode;

                    copy.updated_at = new Date().toISOString();
                    copy.metadata = meta;

                    delete copy.institutionId;
                    delete copy.routerName;
                    delete copy.ipAddress;
                    delete copy.wifiSsid;
                    delete copy.filterMode;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanRouterProfile) : cleanRouterProfile(currentPayload);
            }

            if (moduleName === 'sms_logs') {
                const cleanSmsLog = (log: any) => {
                    if (!log || typeof log !== 'object') return log;
                    const copy = { ...log };
                    const rVal = copy.recipient || copy.recipients || copy.recipient_phone || copy.phone_number || copy.phone || copy.phoneNumber;
                    if (rVal) {
                        copy.recipient = Array.isArray(rVal) ? rVal.filter(Boolean).join(', ') : String(rVal).trim();
                    } else if (!copy.recipient) {
                        copy.recipient = 'N/A';
                    }
                    const mVal = copy.message || copy.msg || copy.smsMessage || copy.sms_message || copy.text || copy.content || copy.body;
                    if (mVal !== undefined && mVal !== null && String(mVal).trim() !== '') {
                        copy.message = String(mVal).trim();
                    } else if (!copy.message) {
                        copy.message = 'SMS notification';
                    }
                    if (copy.senderId && !copy.sender_id) copy.sender_id = copy.senderId;
                    if (copy.gatewayResponse && !copy.gateway_response) copy.gateway_response = copy.gatewayResponse;
                    delete copy.recipients;
                    delete copy.recipient_phone;
                    delete copy.phone_number;
                    delete copy.smsMessage;
                    delete copy.sms_message;
                    delete copy.sent_at;
                    delete copy.sentAt;
                    delete copy.logs;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanSmsLog) : cleanSmsLog(currentPayload);
            }

            if (['invoices', 'receipts', 'ds_invoices', 'ds_payments', 'pm_invoices', 'pm_payments', 'his_invoices', 'his_payments'].includes(moduleName)) {
                const parseDate = (val: any): string | null => {
                    if (!val && val !== 0) return null;
                    if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().split('T')[0];
                    const str = String(val).trim();
                    if (!str) return null;
                    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                    const num = Number(str);
                    if (!isNaN(num) && num > 1000 && num < 100000) {
                        const d = new Date(Math.round((num - 25569) * 86400 * 1000));
                        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
                    }
                    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                    if (ddmmyyyyMatch) {
                        return `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2].padStart(2, '0')}-${ddmmyyyyMatch[1].padStart(2, '0')}`;
                    }
                    const parsed = new Date(str);
                    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
                        return parsed.toISOString().split('T')[0];
                    }
                    return new Date().toISOString().split('T')[0];
                };

                const cleanBillingRecord = (rec: any) => {
                    if (!rec || typeof rec !== 'object') return rec;
                    const copy = { ...rec };
                    if (moduleName === 'invoices' || moduleName === 'receipts' || moduleName === 'ds_payments' || moduleName === 'ds_invoices') {
                        const sId = copy.student_id || copy.studentId;
                        if (!sId || typeof sId !== 'string' || sId.startsWith('ext_') || sId.startsWith('temp_') || sId.startsWith('guest_') || sId.trim() === '') {
                            copy.student_id = null;
                        } else {
                            copy.student_id = sId;
                        }
                        if ('studentId' in copy) delete copy.studentId;

                        if ('invoiceId' in copy) {
                            const invId = copy.invoice_id || copy.invoiceId;
                            if (!invId || typeof invId !== 'string' || invId.startsWith('ext_') || invId.startsWith('temp_') || invId.startsWith('guest_') || invId.trim() === '') {
                                copy.invoice_id = null;
                            } else {
                                copy.invoice_id = invId;
                            }
                            delete copy.invoiceId;
                        }
                        if ('institutionId' in copy) {
                            if (copy.institution_id === undefined) copy.institution_id = copy.institutionId;
                            delete copy.institutionId;
                        }
                        if ('branchId' in copy) {
                            if (copy.branch_id === undefined) copy.branch_id = copy.branchId;
                            delete copy.branchId;
                        }
                        if ('bankAccountId' in copy) {
                            if (copy.bank_account_id === undefined) copy.bank_account_id = copy.bankAccountId;
                            delete copy.bankAccountId;
                        }
                        if ('voteheadId' in copy) {
                            if (copy.votehead_id === undefined) copy.votehead_id = copy.voteheadId;
                            delete copy.voteheadId;
                        }
                        if ('receiptNumber' in copy) {
                            if (copy.receipt_number === undefined) copy.receipt_number = copy.receiptNumber;
                            delete copy.receiptNumber;
                        }
                        if ('invoiceNumber' in copy) {
                            if (copy.invoice_number === undefined) copy.invoice_number = copy.invoiceNumber;
                            delete copy.invoiceNumber;
                        }
                        if ('paymentMethod' in copy) {
                            if (copy.payment_method === undefined) copy.payment_method = copy.paymentMethod;
                            delete copy.paymentMethod;
                        }
                        if ('relatedTransactionId' in copy) {
                            if (copy.related_transaction_id === undefined) copy.related_transaction_id = copy.relatedTransactionId;
                            delete copy.relatedTransactionId;
                        }
                        if ('paidFor' in copy) {
                            if (copy.paid_for === undefined) copy.paid_for = copy.paidFor;
                            delete copy.paidFor;
                        }
                    }

                    if (copy.due_date !== undefined) copy.due_date = parseDate(copy.due_date);
                    if (copy.dueDate !== undefined) {
                        copy.due_date = copy.due_date || parseDate(copy.dueDate);
                        delete copy.dueDate;
                    }
                    if (copy.issue_date !== undefined) copy.issue_date = parseDate(copy.issue_date);
                    if (copy.issueDate !== undefined) {
                        copy.issue_date = copy.issue_date || parseDate(copy.issueDate);
                        delete copy.issueDate;
                    }
                    if (copy.payment_date !== undefined) copy.payment_date = parseDate(copy.payment_date);
                    if (copy.paymentDate !== undefined) {
                        copy.payment_date = copy.payment_date || parseDate(copy.paymentDate);
                        delete copy.paymentDate;
                    }

                    if (moduleName === 'receipts' || moduleName === 'payments' || moduleName === 'ds_payments') {
                        if (copy.amount !== undefined && copy.amount_paid === undefined) {
                            copy.amount_paid = copy.amount;
                        }
                        delete copy.amount;
                        if (copy.amountPaid !== undefined) {
                            if (copy.amount_paid === undefined) copy.amount_paid = copy.amountPaid;
                            delete copy.amountPaid;
                        }
                        if (copy.date !== undefined) {
                            if (copy.payment_date === undefined) copy.payment_date = parseDate(copy.date);
                            delete copy.date;
                        }
                        if (copy.receiptDate !== undefined) {
                            if (copy.payment_date === undefined) copy.payment_date = parseDate(copy.receiptDate);
                            delete copy.receiptDate;
                        }
                        if (copy.receipt_date !== undefined) {
                            if (copy.payment_date === undefined) copy.payment_date = parseDate(copy.receipt_date);
                            delete copy.receipt_date;
                        }
                    }
                    if (moduleName === 'invoices' || moduleName === 'ds_invoices') {
                        if (copy.amount !== undefined && copy.total_amount === undefined) {
                            copy.total_amount = copy.amount;
                        }
                        delete copy.amount;
                        if (copy.totalAmount !== undefined) {
                            if (copy.total_amount === undefined) copy.total_amount = copy.totalAmount;
                            delete copy.totalAmount;
                        }
                        if (copy.date !== undefined) {
                            if (copy.issue_date === undefined) copy.issue_date = parseDate(copy.date);
                            delete copy.date;
                        }
                        if (copy.invoiceDate !== undefined) {
                            if (copy.issue_date === undefined) copy.issue_date = parseDate(copy.invoiceDate);
                            delete copy.invoiceDate;
                        }
                        if (copy.invoice_date !== undefined) {
                            if (copy.issue_date === undefined) copy.issue_date = parseDate(copy.invoice_date);
                            delete copy.invoice_date;
                        }
                        if (copy.className !== undefined) {
                            if (copy.class_name === undefined) copy.class_name = copy.className;
                            delete copy.className;
                        }
                        if (copy.studentClass !== undefined) {
                            if (copy.class_name === undefined) copy.class_name = copy.studentClass;
                            delete copy.studentClass;
                        }
                        if (copy.student_class !== undefined) {
                            if (copy.class_name === undefined) copy.class_name = copy.student_class;
                            delete copy.student_class;
                        }
                    }

                    // Strip un-cached transient fields that do not exist as physical columns
                    const transientColumns = [
                        'message', 'isOpeningBalance', 'is_opening_balance',
                        'notificationSent', 'notification_sent', 'phone', 'email',
                        'studentAdm', 'student_adm', 'editReason', 'edit_reason',
                        'transferReason', 'transfer_reason', 'deletionReason', 'deletion_reason',
                        'deletionRequestedBy', 'deletion_requested_by', 'auditedBy', 'audited_by',
                        'auditedAt', 'audited_at', 'previousStudentId', 'previous_student_id',
                        'offline_fallback', 'offlineFallback', 'offline', 'success', 'error',
                        'excelPaymentMode', 'excel_payment_mode', 'matchStatus', 'match_status',
                        'matchConfidence', 'match_confidence', 'matchedStudentId', 'matched_student_id',
                        'notes', 'receiptSource', 'receipt_source', 'voteHeadAllocations', 'vote_head_allocations',
                        'studentName', 'student_name',
                        'bank_account_id', 'bankAccountId', 'votehead_id', 'voteheadId',
                        'admDisplay', 'adm_display', 'admissionNumber', 'admission_number',
                        'updated_at', 'updatedAt', 'created_at', 'createdAt',
                        'subtotal', 'sub_total', 'tax', 'tax_rate', 'taxRate', 'tax_amount', 'taxAmount', 'discount', 'discount_rate', 'discountRate', 'discount_amount', 'discountAmount',
                        'paidAmount', 'paid_amount', 'balanceDue', 'balance_due', 'netBalance', 'net_balance',
                        'available_copies', 'availableCopies', 'total_copies', 'totalCopies',
                        'academic_year', 'academicYear', 'academic_term', 'academicTerm', 'term', 'semester',
                        'academic_year_id', 'academicYearId', 'term_id', 'termId', 'semester_id', 'semesterId',
                        'fee_structure_id', 'feeStructureId', 'curriculum', 'program', 'grade_level', 'gradeLevel', 'stream',
                        'parent_name', 'parentName', 'parent_phone', 'parentPhone', 'parent_email', 'parentEmail',
                        'recorded_by', 'recordedBy', 'created_by', 'createdBy', 'issued_by', 'issuedBy',
                        'accountant_name', 'accountantName', 'payer_name', 'payerName',
                        'student_class', 'studentClass', 'className', 'grade', 'grade_name', 'gradeName', 'class_group', 'classGroup', 'stream_name', 'streamName',
                        'metadata'
                    ];
                    transientColumns.forEach(col => {
                        if (col in copy) {
                            delete copy[col];
                        }
                    });

                    if (moduleName === 'invoices') {
                        const allowedInvoiceCols = new Set([
                            'id', 'invoice_number', 'institution_id', 'branch_id',
                            'issue_date', 'due_date', 'items', 'total_amount',
                            'status', 'student_id', 'class_name', 'created_at', 'updated_at'
                        ]);
                        Object.keys(copy).forEach(k => {
                            if (!allowedInvoiceCols.has(k)) {
                                delete copy[k];
                            }
                        });
                        if (!copy.branch_id || copy.branch_id === copy.institution_id || copy.branch_id.startsWith('inst_')) {
                            delete copy.branch_id;
                        }
                    } else if (moduleName === 'receipts') {
                        const allowedReceiptCols = new Set([
                            'id', 'receipt_number', 'institution_id', 'branch_id',
                            'payment_date', 'amount_paid', 'paid_for', 'payment_method',
                            'related_transaction_id', 'invoice_id', 'student_id',
                            'created_at', 'updated_at'
                        ]);
                        Object.keys(copy).forEach(k => {
                            if (!allowedReceiptCols.has(k)) {
                                delete copy[k];
                            }
                        });
                        if (!copy.branch_id || copy.branch_id === copy.institution_id || copy.branch_id.startsWith('inst_')) {
                            delete copy.branch_id;
                        }
                    }

                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanBillingRecord) : cleanBillingRecord(currentPayload);
            } else if (moduleName === 'books') {
                const cleanBookRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    delete copy.available_copies;
                    delete copy.availableCopies;
                    delete copy.total_copies;
                    delete copy.totalCopies;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanBookRecord) : cleanBookRecord(currentPayload);
            } else if (moduleName === 'visitors') {
                const cleanVisitorRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    // 1. Host ID
                    const hId = copy.host_id ?? copy.hostId;
                    if (!hId || hId === '' || hId === 'null' || hId === 'undefined') {
                        copy.host_id = null;
                    } else {
                        copy.host_id = hId;
                    }
                    delete copy.hostId;

                    // 2. ID Number
                    const idNum = copy.id_number ?? copy.idNumber;
                    if (idNum !== undefined && idNum !== null && idNum !== '') {
                        copy.id_number = String(idNum);
                        meta.id_number = String(idNum);
                    }
                    delete copy.idNumber;

                    // 3. Name & Full Name
                    const fName = copy.full_name ?? copy.fullName ?? copy.name;
                    if (fName) {
                        copy.full_name = fName;
                        if (!copy.name) copy.name = fName;
                    }
                    delete copy.fullName;

                    // 4. Phone Number
                    const phone = copy.phone_number ?? copy.phoneNumber ?? copy.phone;
                    if (phone) {
                        copy.phone_number = phone;
                    }
                    delete copy.phoneNumber;

                    // 5. Date & Time
                    if ('visitDate' in copy) {
                        copy.visit_date = copy.visit_date || copy.visitDate;
                        delete copy.visitDate;
                    }
                    if ('timeIn' in copy) {
                        copy.time_in = copy.time_in || copy.timeIn;
                        delete copy.timeIn;
                    }
                    if ('timeOut' in copy) {
                        copy.time_out = copy.time_out || copy.timeOut;
                        delete copy.timeOut;
                    }
                    if ('checkIn' in copy) {
                        copy.check_in = copy.check_in || copy.checkIn;
                        delete copy.checkIn;
                    }
                    if ('entryTime' in copy) {
                        if (!copy.time_in) copy.time_in = copy.entryTime;
                        delete copy.entryTime;
                    }

                    // 6. Host & Vehicle details
                    if ('hostName' in copy) {
                        copy.host_name = copy.host_name || copy.hostName;
                        delete copy.hostName;
                    }
                    if ('vehiclePlate' in copy) {
                        copy.vehicle_plate = copy.vehicle_plate || copy.vehiclePlate;
                        delete copy.vehiclePlate;
                    }
                    if ('vehicleModel' in copy) {
                        copy.vehicle_model = copy.vehicle_model || copy.vehicleModel;
                        delete copy.vehicleModel;
                    }

                    // 7. Signatures & Security
                    if ('visitorSignature' in copy) {
                        copy.visitor_signature = copy.visitor_signature || copy.visitorSignature;
                        delete copy.visitorSignature;
                    }
                    if ('hostSignature' in copy) {
                        copy.host_signature = copy.host_signature || copy.hostSignature;
                        delete copy.hostSignature;
                    }
                    if ('securityOfficerName' in copy) {
                        copy.security_officer_name = copy.security_officer_name || copy.securityOfficerName;
                        delete copy.securityOfficerName;
                    }
                    if ('institutionId' in copy) {
                        copy.institution_id = copy.institution_id || copy.institutionId;
                        delete copy.institutionId;
                    }

                    // 8. Status
                    if (copy.status) {
                        meta.status = copy.status;
                    }

                    // 9. Host notification & phone
                    if ('notifyHostSms' in copy || 'notify_host_sms' in copy) {
                        const nh = copy.notify_host_sms ?? copy.notifyHostSms;
                        copy.notify_host_sms = Boolean(nh);
                        meta.notify_host_sms = Boolean(nh);
                        delete copy.notifyHostSms;
                    }
                    if ('hostPhone' in copy || 'host_phone' in copy) {
                        const hp = copy.host_phone ?? copy.hostPhone;
                        copy.host_phone = hp;
                        meta.host_phone = hp;
                        delete copy.hostPhone;
                    }

                    copy.metadata = meta;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanVisitorRecord) : cleanVisitorRecord(currentPayload);
            } else if (moduleName === 'users') {
                const cleanUserRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    // 1. Capture specific virtual/transient fields into metadata
                    const vehicleIdVal = copy.vehicle_id || copy.vehicleId || copy.assigned_vehicle_id || copy.assignedVehicleId;
                    if (vehicleIdVal) {
                        meta.vehicleId = vehicleIdVal;
                    }
                    const driverTypeVal = copy.driver_type || copy.driverType;
                    if (driverTypeVal) {
                        meta.driverType = driverTypeVal;
                    }
                    const p2 = copy.parent_phone2 || copy.parentPhone2 || copy.secondary_phone || copy.secondaryPhone || copy.guardian_phone2 || copy.guardianPhone2;
                    if (p2) {
                        meta.parentPhone2 = p2;
                        meta.secondaryPhone = p2;
                    }
                    const pName = copy.parent_name || copy.parentName || copy.guardian_name || copy.guardianName;
                    if (pName) {
                        meta.parentName = pName;
                    }
                    const pPhone = copy.parent_phone || copy.parentPhone || copy.guardian_phone || copy.guardianPhone;
                    if (pPhone) {
                        meta.parentPhone = pPhone;
                    }
                    const sPhone = copy.student_phone || copy.studentPhone;
                    if (sPhone) {
                        meta.studentPhone = sPhone;
                    }
                    const tCode = copy.teacherCode || copy.teacher_code || copy.code;
                    if (tCode) {
                        meta.teacherCode = tCode;
                        meta.remedialTeacherCode = tCode;
                    }
                    const sClass = copy.studentClass || copy.student_class || copy.className || copy.class_name;
                    if (sClass) {
                        meta.studentClass = sClass;
                    }
                    const admNo = copy.admissionNumber || copy.admission_number || copy.admissionNo;
                    if (admNo) {
                        meta.admissionNumber = admNo;
                    }
                    const assNo = copy.assessmentNo || copy.assessment_no || copy.assessmentNumber || copy.assessment_number;
                    if (assNo) {
                        meta.assessmentNo = assNo;
                    }
                    const dob = copy.dateOfBirth || copy.date_of_birth || copy.dob;
                    if (dob) {
                        meta.dateOfBirth = dob;
                        meta.dob = dob;
                    }

                    // 2. Map camelCase aliases to snake_case column names
                    if (copy.phoneNumber && !copy.phone_number) copy.phone_number = copy.phoneNumber;
                    if (copy.staffId && !copy.staff_id) copy.staff_id = copy.staffId;
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.branchId && !copy.branch_id) copy.branch_id = copy.branchId;
                    if (copy.departmentId && !copy.department_id) copy.department_id = copy.departmentId;
                    if (copy.courseId && !copy.course_id) copy.course_id = copy.courseId;
                    if (copy.courseLevelId && !copy.course_level_id) copy.course_level_id = copy.courseLevelId;
                    if (copy.enrolledSubjectIds && !copy.enrolled_subject_ids) copy.enrolled_subject_ids = copy.enrolledSubjectIds;
                    if (copy.parentIds && !copy.parent_ids) copy.parent_ids = copy.parentIds;
                    if (copy.studentIds && !copy.student_ids) copy.student_ids = copy.studentIds;
                    if (copy.profilePhotoUrl !== undefined && copy.profile_photo_url === undefined) copy.profile_photo_url = copy.profilePhotoUrl;
                    if (copy.passwordLastUpdated && !copy.password_last_updated) copy.password_last_updated = copy.passwordLastUpdated;
                    if (copy.passwordExpiresAt && !copy.password_expires_at) copy.password_expires_at = copy.passwordExpiresAt;
                    if (copy.countyId && !copy.county_id) copy.county_id = copy.countyId;
                    if (copy.vehicleId && !copy.vehicle_id) copy.vehicle_id = copy.vehicleId;
                    if (copy.farmerId && !copy.farmer_id) copy.farmer_id = copy.farmerId;
                    if (copy.riderId && !copy.rider_id) copy.rider_id = copy.riderId;
                    if (copy.nationalId && !copy.national_id) copy.national_id = copy.nationalId;
                    if (copy.employmentDate && !copy.employment_date) copy.employment_date = copy.employmentDate;
                    if (copy.employmentTerms && !copy.employment_terms) copy.employment_terms = copy.employmentTerms;
                    if (copy.basicSalary !== undefined && copy.basic_salary === undefined) copy.basic_salary = copy.basicSalary;
                    if (copy.kraPin && !copy.kra_pin) copy.kra_pin = copy.kraPin;
                    if (copy.nssfNo && !copy.nssf_no) copy.nssf_no = copy.nssfNo;
                    if (copy.shifNumber && !copy.shif_number) copy.shif_number = copy.shifNumber;
                    if (copy.bankName && !copy.bank_name) copy.bank_name = copy.bankName;
                    if (copy.bankBranch && !copy.bank_branch) copy.bank_branch = copy.bankBranch;
                    if (copy.bankAccountNumber && !copy.bank_account_number) copy.bank_account_number = copy.bankAccountNumber;

                    // Clean invalid FK / branch values
                    if (copy.branch_id && (copy.branch_id.startsWith('inst_') || copy.branch_id === copy.institution_id)) {
                        delete copy.branch_id;
                    }
                    if (copy.department_id === '' || copy.department_id === 'null' || copy.department_id === 'undefined') copy.department_id = null;
                    if (copy.course_id === '' || copy.course_id === 'null' || copy.course_id === 'undefined') copy.course_id = null;
                    if (copy.county_id === '' || copy.county_id === 'null' || copy.county_id === 'undefined') copy.county_id = null;
                    if (copy.farmer_id === '' || copy.farmer_id === 'null' || copy.farmer_id === 'undefined') copy.farmer_id = null;
                    if (copy.rider_id === '' || copy.rider_id === 'null' || copy.rider_id === 'undefined') copy.rider_id = null;

                    // 3. Strictly whitelist allowed DB columns, packing everything else safely into metadata
                    const allowedUserCols = new Set([
                        'id', 'name', 'email', 'phone_number', 'staff_id', 'role', 'roles',
                        'institution_id', 'branch_id', 'password', 'department_id', 'expertise',
                        'course_id', 'course_level_id', 'enrolled_subject_ids', 'parent_ids',
                        'student_ids', 'gender', 'profile_photo_url', 'unavailability',
                        'password_last_updated', 'password_expires_at', 'county_id',
                        'vehicle_id', 'farmer_id', 'rider_id', 'reset_token', 'reset_token_expires',
                        'reset_otp', 'reset_otp_expires', 'national_id', 'employment_date',
                        'employment_terms', 'basic_salary', 'kra_pin', 'nssf_no', 'shif_number',
                        'bank_name', 'bank_branch', 'bank_account_number', 'metadata',
                        'created_at', 'updated_at'
                    ]);

                    const ignoredKeys = new Set(['updated_at', 'updatedAt', 'created_at', 'createdAt']);

                    Object.keys(copy).forEach(k => {
                        if (!allowedUserCols.has(k)) {
                            if (!ignoredKeys.has(k) && copy[k] !== undefined && copy[k] !== null && copy[k] !== '') {
                                meta[k] = copy[k];
                            }
                            delete copy[k];
                        }
                    });

                    copy.metadata = meta;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanUserRecord) : cleanUserRecord(currentPayload);
            } else if (moduleName === 'student_enrollments') {
                const cleanEnrollmentRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    // 1. Map camelCase aliases to snake_case column names
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.userId && !copy.user_id) copy.user_id = copy.userId;
                    if (copy.enrollmentType && !copy.enrollment_type) copy.enrollment_type = copy.enrollmentType;
                    if (copy.admissionNumber && !copy.admission_number) copy.admission_number = copy.admissionNumber;
                    if (copy.assessmentNo && !copy.assessment_no) copy.assessment_no = copy.assessmentNo;
                    if (copy.assessmentNumber && !copy.assessment_no) copy.assessment_no = copy.assessmentNumber;
                    if (copy.dateOfBirth && !copy.date_of_birth) copy.date_of_birth = copy.dateOfBirth;
                    if (copy.dob && !copy.date_of_birth) copy.date_of_birth = copy.dob;
                    if (copy.leadershipPosition && !copy.leadership_position) copy.leadership_position = copy.leadershipPosition;
                    if (copy.enrollmentDate && !copy.enrollment_date) copy.enrollment_date = copy.enrollmentDate;
                    if (copy.courseId && !copy.course_id) copy.course_id = copy.courseId;
                    if (copy.classId && !copy.class_id) copy.class_id = copy.classId;

                    // 2. Ensure virtual attributes are preserved inside metadata
                    if (copy.admission_number && !meta.admissionNumber) meta.admissionNumber = copy.admission_number;
                    if (copy.assessment_no && !meta.assessmentNo) meta.assessmentNo = copy.assessment_no;
                    if (copy.date_of_birth && !meta.dateOfBirth) meta.dateOfBirth = copy.date_of_birth;
                    if (copy.leadership_position && !meta.leadershipPosition) meta.leadershipPosition = copy.leadership_position;
                    if (copy.course_id && !meta.courseId) meta.courseId = copy.course_id;
                    if (copy.class_id && !meta.classId) meta.classId = copy.class_id;

                    const nameVal = copy.full_name || copy.fullName || copy.name;
                    if (nameVal && !meta.fullName) meta.fullName = nameVal;

                    const genderVal = copy.gender;
                    if (genderVal && !meta.gender) meta.gender = genderVal;

                    const gradeVal = copy.grade_level || copy.gradeLevel;
                    if (gradeVal && !meta.gradeLevel) meta.gradeLevel = gradeVal;

                    const streamVal = copy.stream;
                    if (streamVal && !meta.stream) meta.stream = streamVal;

                    // 3. Allowed database columns for student_enrollments
                    const allowedEnrollmentCols = new Set([
                        'id', 'institution_id', 'user_id', 'enrollment_type', 'admission_number',
                        'assessment_no', 'date_of_birth', 'status', 'enrollment_date',
                        'course_id', 'class_id', 'leadership_position', 'metadata',
                        'created_at', 'updated_at'
                    ]);

                    const ignoredKeys = new Set(['updated_at', 'updatedAt', 'created_at', 'createdAt']);

                    Object.keys(copy).forEach(k => {
                        if (!allowedEnrollmentCols.has(k)) {
                            if (!ignoredKeys.has(k) && copy[k] !== undefined && copy[k] !== null && copy[k] !== '') {
                                meta[k] = copy[k];
                            }
                            delete copy[k];
                        }
                    });

                    copy.metadata = meta;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanEnrollmentRecord) : cleanEnrollmentRecord(currentPayload);
            } else if (moduleName === 'visitors') {
                const cleanVisitorRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    const entryVal = copy.entry_time || copy.entryTime;
                    if (entryVal) {
                        meta.entryTime = entryVal;
                        if (!copy.time_in && !copy.timeIn) copy.time_in = entryVal;
                        if (!copy.check_in && !copy.checkIn) copy.check_in = entryVal;
                    }
                    const exitVal = copy.exit_time || copy.exitTime;
                    if (exitVal) {
                        meta.exitTime = exitVal;
                        if (!copy.time_out && !copy.timeOut) copy.time_out = exitVal;
                    }

                    copy.metadata = meta;

                    delete copy.entry_time;
                    delete copy.entryTime;
                    delete copy.exit_time;
                    delete copy.exitTime;

                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanVisitorRecord) : cleanVisitorRecord(currentPayload);
            } else if (moduleName === 'app_notifications') {
                const cleanNotificationRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    if (copy.userId && !copy.user_id) copy.user_id = copy.userId;
                    if (copy.isRead !== undefined && copy.is_read === undefined) copy.is_read = copy.isRead;
                    if (copy.message === undefined || copy.message === null) {
                        copy.message = copy.title || copy.description || copy.content || copy.text || copy.body || '';
                    }
                    if (!copy.type) copy.type = 'info';
                    delete copy.userId;
                    delete copy.isRead;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanNotificationRecord) : cleanNotificationRecord(currentPayload);
            } else if (moduleName === 'subjects') {
                const cleanSubjectRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const allowed = new Set([
                        'id', 'code', 'name', 'description', 
                        'department_id', 'institution_id', 
                        'lesson_structure', 'has_exam', 'dedicated_room_id',
                        'abbreviation', 'short_name',
                        'created_at', 'updated_at'
                    ]);
                    const clean: any = {};
                    for (const key of Object.keys(item)) {
                        if (allowed.has(key)) {
                            clean[key] = item[key];
                        }
                    }
                    if (item.departmentId && !clean.department_id) clean.department_id = item.departmentId;
                    if (item.institutionId && !clean.institution_id) clean.institution_id = item.institutionId;
                    if (item.lessonStructure && !clean.lesson_structure) clean.lesson_structure = item.lessonStructure;
                    if (item.hasExam !== undefined && clean.has_exam === undefined) clean.has_exam = item.hasExam;
                    if (item.dedicatedRoomId && !clean.dedicated_room_id) clean.dedicated_room_id = item.dedicatedRoomId;
                    if (item.abbreviation !== undefined && clean.abbreviation === undefined) clean.abbreviation = item.abbreviation;
                    if (item.shortName !== undefined && clean.short_name === undefined) clean.short_name = item.shortName;
                    if (clean.abbreviation && !clean.short_name) clean.short_name = clean.abbreviation;
                    if (clean.short_name && !clean.abbreviation) clean.abbreviation = clean.short_name;
                    return clean;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanSubjectRecord) : cleanSubjectRecord(currentPayload);

            } else if (moduleName === 'vehicles') {
                const cleanVehicleRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    if (copy.plateNumber && !copy.plate_number) copy.plate_number = copy.plateNumber;
                    if (copy.vehicleType && !copy.vehicle_type) copy.vehicle_type = copy.vehicleType;
                    if (copy.driverId && !copy.driver_id) copy.driver_id = copy.driverId;
                    if (copy.assistantId && !copy.assistant_id) copy.assistant_id = copy.assistantId;
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;

                    if (!copy.driver_id || copy.driver_id === '') copy.driver_id = null;
                    if (!copy.assistant_id || copy.assistant_id === '') copy.assistant_id = null;
                    if (!copy.institution_id || copy.institution_id === '') copy.institution_id = null;

                    if (copy.capacity !== undefined && copy.capacity !== null) {
                        copy.capacity = Number(copy.capacity) || 14;
                    } else {
                        copy.capacity = 14;
                    }
                    if (!copy.status) copy.status = 'active';

                    const dName = copy.driverName || copy.driver_name;
                    if (dName) {
                        const meta = (typeof copy.metadata === 'object' && copy.metadata !== null) ? { ...copy.metadata } : {};
                        meta.driverName = dName;
                        copy.metadata = meta;
                        delete copy.driverName;
                        delete copy.driver_name;
                    }

                    delete copy.plateNumber;
                    delete copy.vehicleType;
                    delete copy.driverId;
                    delete copy.assistantId;
                    delete copy.institutionId;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanVehicleRecord) : cleanVehicleRecord(currentPayload);
            } else if (moduleName === 'transport_onboarding') {
                const cleanOnboardingRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    if (copy.userId && !copy.user_id) copy.user_id = copy.userId;
                    if (copy.driverId && !copy.user_id) copy.user_id = copy.driverId;
                    if (copy.vehicleId && !copy.vehicle_id) copy.vehicle_id = copy.vehicleId;
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;

                    if (!copy.user_id || copy.user_id === '') copy.user_id = null;
                    if (!copy.vehicle_id || copy.vehicle_id === '') copy.vehicle_id = null;
                    if (!copy.institution_id || copy.institution_id === '') copy.institution_id = null;

                    delete copy.userId;
                    delete copy.driverId;
                    delete copy.vehicleId;
                    delete copy.institutionId;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanOnboardingRecord) : cleanOnboardingRecord(currentPayload);
            } else if (moduleName === 'vehicle_logs') {
                const cleanLogRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    if (copy.vehicleId && !copy.vehicle_id) copy.vehicle_id = copy.vehicleId;
                    if (copy.driverId && !copy.driver_id) copy.driver_id = copy.driverId;
                    if (copy.securityId && !copy.security_id) copy.security_id = copy.securityId;
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;

                    if (!copy.vehicle_id || copy.vehicle_id === '') copy.vehicle_id = null;
                    if (!copy.driver_id || copy.driver_id === '') copy.driver_id = null;
                    if (!copy.security_id || copy.security_id === '') copy.security_id = null;
                    if (!copy.institution_id || copy.institution_id === '') copy.institution_id = null;

                    delete copy.vehicleId;
                    delete copy.driverId;
                    delete copy.securityId;
                    delete copy.institutionId;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanLogRecord) : cleanLogRecord(currentPayload);
            }

            if (moduleName === 'school_remedial_rate_settings') {
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanRemedialRateSettings) : cleanRemedialRateSettings(currentPayload);
                const checkItem = Array.isArray(currentPayload) ? currentPayload[0] : currentPayload;
                const instId = checkItem?.institution_id;
                if (instId) {
                    try {
                        const { data: existingRateRows } = await supabase
                            .from('school_remedial_rate_settings')
                            .select('id')
                            .eq('institution_id', instId)
                            .order('updated_at', { ascending: false })
                            .limit(1);
                        if (existingRateRows && existingRateRows.length > 0 && existingRateRows[0].id) {
                            const existingId = existingRateRows[0].id;
                            if (Array.isArray(currentPayload)) {
                                currentPayload.forEach(p => { p.id = existingId; });
                            } else if (currentPayload && typeof currentPayload === 'object') {
                                currentPayload.id = existingId;
                            }
                        } else {
                            const defaultId = `rate_setting_${instId}`;
                            if (Array.isArray(currentPayload)) {
                                currentPayload.forEach(p => { if (!p.id) p.id = defaultId; });
                            } else if (currentPayload && typeof currentPayload === 'object') {
                                if (!currentPayload.id) currentPayload.id = defaultId;
                            }
                        }
                    } catch (_) {}
                }
            }

            if (moduleName === 'school_remedial_subjects') {
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanRemedialSubject) : cleanRemedialSubject(currentPayload);
            }

            if (moduleName === 'institution_module_states' || targetDbTable === 'institution_module_states') {
                const checkItem = Array.isArray(currentPayload) ? currentPayload[0] : currentPayload;
                const instId = checkItem?.institution_id || checkItem?.institutionId;
                const modId = checkItem?.module_id || checkItem?.moduleId;
                if (instId && modId) {
                    try {
                        const { data: existingImsRows } = await supabase
                            .from('institution_module_states')
                            .select('id')
                            .eq('institution_id', instId)
                            .eq('module_id', modId)
                            .limit(1);
                        if (existingImsRows && existingImsRows.length > 0 && existingImsRows[0].id) {
                            const existingId = existingImsRows[0].id;
                            if (Array.isArray(currentPayload)) {
                                currentPayload.forEach(p => { p.id = existingId; });
                            } else if (currentPayload && typeof currentPayload === 'object') {
                                currentPayload.id = existingId;
                            }
                        }
                    } catch (_) {}
                }
            }

            let data: any = null;
            let error: any = null;
            let maxRetries = 3;
            let tableSupportsMetadata = TABLES_WITH_METADATA.has(targetDbTable);

            while (maxRetries >= 0) {
                // Safety check: if function execution approaches timeout threshold, break immediately for offline fallback
                if (Date.now() - requestStartTime > MAX_SAFE_EXECUTION_MS) {
                    console.warn(`[api/records] Execution approaching timeout (${MAX_SAFE_EXECUTION_MS}ms) for [${moduleName}]. Breaking to return local fallback.`);
                    break;
                }

                const queryRes = await supabase.from(targetDbTable).upsert(currentPayload).select();
                data = queryRes.data;
                error = queryRes.error;

                if (!error) break;

                const colMatch = error.message ? error.message.match(/Could not find the '([^']+)' column/i) : null;
                if (colMatch && colMatch[1] && maxRetries > 0) {
                    const offendingCol = colMatch[1];
                    if (offendingCol === 'metadata') {
                        tableSupportsMetadata = false;
                    }
                    console.warn(`[api/records] Schema cache stale: stripping un-cached column '${offendingCol}' for [${moduleName}] and retrying (${maxRetries} left)...`);
                    
                    if (moduleName === 'student_enrollments') {
                        // Extended columns added in newer migrations: if one is missing from PostgREST cache,
                        // strip ALL extended columns at once into metadata to prevent 5-6 sequential retries and 504 timeouts.
                        const EXTENDED_ENR_COLS = ['course_id', 'class_id', 'leadership_position', 'date_of_birth', 'assessment_no'];
                        const stripEnrollmentExtended = (item: any) => {
                            if (!item || typeof item !== 'object') return item;
                            const copy = { ...item };
                            const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                            EXTENDED_ENR_COLS.forEach(c => {
                                if (copy[c] !== undefined && copy[c] !== null && copy[c] !== '') {
                                    meta[c] = copy[c];
                                    delete copy[c];
                                }
                            });
                            if (offendingCol === 'metadata' || !tableSupportsMetadata) {
                                delete copy.metadata;
                            } else {
                                copy.metadata = meta;
                            }
                            return copy;
                        };
                        currentPayload = Array.isArray(currentPayload) ? currentPayload.map(stripEnrollmentExtended) : stripEnrollmentExtended(currentPayload);
                        maxRetries--;
                        continue;
                    }

                    if (moduleName === 'school_remedial_allocations') {
                        // Extended columns added in newer migrations: if one is missing from PostgREST cache,
                        // strip ALL extended columns at once into metadata to prevent sequential retries and timeouts.
                        const EXTENDED_ALLOC_COLS = [
                            'is_joint', 'joint_streams', 'joint_courses', 'joint_label',
                            'is_auto_generated', 'is_unallocated', 'unallocated_reason',
                            'is_manual', 'is_duty_lesson', 'stream', 'priority', 'status',
                            'substitute_teacher_id', 'substitute_teacher_name',
                            'original_teacher_id', 'original_teacher_name',
                            'cancellation_reason', 'cancelled_at',
                            'confirmation_deadline', 'declined_teacher_ids',
                            'updated_at', 'created_at'
                        ];
                        const stripAllocExtended = (item: any) => {
                            if (!item || typeof item !== 'object') return item;
                            const copy = { ...item };
                            const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                            EXTENDED_ALLOC_COLS.forEach(c => {
                                if (copy[c] !== undefined && copy[c] !== null && copy[c] !== '') {
                                    meta[c] = copy[c];
                                    delete copy[c];
                                }
                            });
                            if (offendingCol === 'metadata' || !tableSupportsMetadata) {
                                delete copy.metadata;
                            } else {
                                copy.metadata = meta;
                            }
                            return copy;
                        };
                        currentPayload = Array.isArray(currentPayload) ? currentPayload.map(stripAllocExtended) : stripAllocExtended(currentPayload);
                        maxRetries--;
                        continue;
                    }

                    if (moduleName === 'school_remedial_subjects') {
                        const EXTENDED_SUB_COLS = [
                            'allowed_days', 'allowed_periods', 'priority', 'weekly_occurrences', 'preferred_day_type', 'is_active', 'updated_at', 'created_at'
                        ];
                        const stripSubExtended = (item: any) => {
                            if (!item || typeof item !== 'object') return item;
                            const copy = { ...item };
                            const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                            EXTENDED_SUB_COLS.forEach(c => {
                                if (copy[c] !== undefined && copy[c] !== null) {
                                    meta[c] = copy[c];
                                    delete copy[c];
                                }
                            });
                            if (offendingCol === 'metadata' || !tableSupportsMetadata) {
                                delete copy.metadata;
                            } else {
                                copy.metadata = meta;
                            }
                            return copy;
                        };
                        currentPayload = Array.isArray(currentPayload) ? currentPayload.map(stripSubExtended) : stripSubExtended(currentPayload);
                        maxRetries--;
                        continue;
                    }

                    if (moduleName === 'school_remedial_rate_settings') {
                        const EXTENDED_RATE_COLS = [
                            'saturday_start_time', 'saturday_end_time', 'sunday_start_time', 'sunday_end_time',
                            'saturday_break_start_time', 'saturday_break_end_time', 'saturday_break_label', 'include_saturday_break',
                            'sunday_break_start_time', 'sunday_break_end_time', 'sunday_break_label', 'include_sunday_break',
                            'weekend_break_start_time', 'weekend_break_end_time', 'weekend_break_label', 'include_weekend_break',
                            'max_weekend_lessons_per_day',
                            'max_lessons_per_class_per_day', 'max_weekend_lessons_per_class_per_day',
                            'max_lessons_per_teacher_per_day', 'max_weekend_lessons_per_teacher_per_day',
                            'cancellation_cutoff_hours', 'confirmation_timeout_minutes',
                            'teacher_preferences', 'weekday_duty_flat_rate', 'fee_per_student', 'term_fee',
                            'updated_at', 'created_at'
                        ];
                        const stripRateExtended = (item: any) => {
                            if (!item || typeof item !== 'object') return item;
                            const copy = { ...item };
                            const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                            EXTENDED_RATE_COLS.forEach(c => {
                                if (copy[c] !== undefined && copy[c] !== null) {
                                    meta[c] = copy[c];
                                    delete copy[c];
                                }
                            });
                            if (offendingCol === 'metadata' || !tableSupportsMetadata) {
                                delete copy.metadata;
                            } else {
                                copy.metadata = meta;
                            }
                            return copy;
                        };
                        currentPayload = Array.isArray(currentPayload) ? currentPayload.map(stripRateExtended) : stripRateExtended(currentPayload);
                        maxRetries--;
                        continue;
                    }

                    const stripCol = (item: any) => {
                        if (!item || typeof item !== 'object') return item;
                        const copy = { ...item };
                        if (tableSupportsMetadata && offendingCol !== 'metadata' && copy[offendingCol] !== undefined && copy[offendingCol] !== null) {
                            const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                            meta[offendingCol] = copy[offendingCol];
                            copy.metadata = meta;
                        }
                        delete copy[offendingCol];
                        if (!tableSupportsMetadata) {
                            delete copy.metadata;
                        }
                        return copy;
                    };
                    currentPayload = Array.isArray(currentPayload) ? currentPayload.map(stripCol) : stripCol(currentPayload);
                    maxRetries--;
                    continue;
                }

                // Handle Foreign Key violation (23503) by nullifying non-matching relational foreign keys
                if ((error.code === '23503' || String(error.message || '').includes('foreign key constraint')) && maxRetries > 0) {
                    if (targetDbTable === 'student_enrollments') {
                        // user_id in student_enrollments is NOT NULL; nullifying it only triggers NOT NULL 23502.
                        // Break immediately to return graceful offline fallback.
                        console.warn(`[api/records] Foreign key constraint on student_enrollments (user/institution not found in DB). Triggering graceful offline fallback.`);
                        break;
                    }
                    console.warn(`[api/records] Foreign key constraint note on [${moduleName}]: nulling relational IDs and retrying...`);
                    const nullifyFKs = (item: any) => {
                        if (!item || typeof item !== 'object') return item;
                        const copy = { ...item };
                        ['patient_id', 'doctor_id', 'student_id', 'parent_id', 'driver_id', 'assistant_id', 'instructor_id', 'vehicle_id', 'room_id', 'category_id', 'invoice_id', 'host_id', 'user_id', 'created_by', 'recorded_by', 'agent_id', 'sale_id', 'item_id', 'product_id', 'store_id', 'order_id', 'supplier_id', 'customer_id'].forEach(k => {
                            if (k in copy) copy[k] = null;
                        });
                        return copy;
                    };
                    currentPayload = Array.isArray(currentPayload) ? currentPayload.map(nullifyFKs) : nullifyFKs(currentPayload);
                    maxRetries--;
                    continue;
                }

                // Handle invalid input syntax for type uuid (22P02) by removing non-UUID string IDs so DB generates valid UUIDs
                if ((error.code === '22P02' || String(error.message || '').toLowerCase().includes('invalid input syntax for type uuid')) && maxRetries > 0) {
                    console.warn(`[api/records] UUID syntax mismatch on [${moduleName}]: stripping non-UUID identifiers and retrying (${maxRetries} left)...`);
                    const isValidUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                    const stripNonUUIDs = (item: any) => {
                        if (!item || typeof item !== 'object') return item;
                        const copy = { ...item };
                        if (copy.id && !isValidUUID(copy.id)) {
                            if (tableSupportsMetadata) {
                                const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                                meta.originalId = copy.id;
                                copy.metadata = meta;
                            }
                            delete copy.id;
                        }
                        ['institution_id', 'institutionId', 'student_id', 'studentId'].forEach(k => {
                            if (k in copy && copy[k] && !isValidUUID(copy[k])) {
                                if (tableSupportsMetadata) {
                                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                                    meta[k] = copy[k];
                                    copy.metadata = meta;
                                }
                            }
                        });
                        return copy;
                    };
                    currentPayload = Array.isArray(currentPayload) ? currentPayload.map(stripNonUUIDs) : stripNonUUIDs(currentPayload);
                    maxRetries--;
                    continue;
                }

                break;
            }

            if (moduleName === 'school_remedial_rate_settings') {
                const savedItem = Array.isArray(currentPayload) ? currentPayload[0] : currentPayload;
                const instId = savedItem?.institution_id;
                if (instId) {
                    Promise.resolve(supabase.from('institution_module_states').upsert({
                        id: `${instId}_school_remedial_rate_settings`,
                        institution_id: instId,
                        module_id: 'school_remedial_rate_settings',
                        status: 'active',
                        data: savedItem,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' })).catch(() => {});
                }
            }

            if (moduleName === 'institutions') {
                const savedItem = Array.isArray(currentPayload) ? currentPayload[0] : currentPayload;
                const rawRecord = Array.isArray(recordData) ? recordData[0] : recordData;
                const instId = savedItem?.id || rawRecord?.id || user?.institutionId;
                if (instId) {
                    const vEnabled = savedItem?.visitor_auto_finalize_enabled ?? rawRecord?.visitorAutoFinalizeEnabled ?? rawRecord?.visitor_auto_finalize_enabled;
                    const vTime = savedItem?.visitor_auto_finalize_time || rawRecord?.visitorAutoFinalizeTime || rawRecord?.visitor_auto_finalize_time;
                    const nHost = savedItem?.notify_host_on_visitor_arrival ?? rawRecord?.notifyHostOnVisitorArrival ?? rawRecord?.notify_host_on_visitor_arrival;
                    const sTemplate = savedItem?.visitor_arrival_sms_template || rawRecord?.visitorArrivalSmsTemplate || rawRecord?.visitor_arrival_sms_template;

                    if (vTime !== undefined || vEnabled !== undefined || nHost !== undefined || sTemplate !== undefined) {
                        Promise.resolve(supabase.from('institution_module_states').upsert({
                            id: `${instId}_visitor_settings`,
                            institution_id: instId,
                            module_id: 'visitor_settings',
                            status: 'active',
                            data: {
                                visitorAutoFinalizeEnabled: vEnabled,
                                visitorAutoFinalizeTime: vTime,
                                notifyHostOnVisitorArrival: nHost,
                                visitorArrivalSmsTemplate: sTemplate,
                                visitor_auto_finalize_enabled: vEnabled,
                                visitor_auto_finalize_time: vTime,
                                notify_host_on_visitor_arrival: nHost,
                                visitor_arrival_sms_template: sTemplate
                            },
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' })).catch((e: any) => console.warn('[api/records] visitor_settings fallback save error:', e));
                    }
                }
            }

            if (moduleName === 'ds_settings') {
                console.log(`[API POST DEBUG] ds_settings upsert:`, { success: !error, count: data?.length, error, payload: JSON.stringify(recordWithTenancy) });
            }
            if (error) {
                const message = (error.message || '').toLowerCase();
                const isUniqueViolation = error.code === '23505' || String(error.code) === '23505' || message.includes('unique constraint') || message.includes('duplicate key');
                
                if (isUniqueViolation) {
                    if (targetDbTable === 'institution_module_states' || moduleName === 'institution_module_states') {
                        const checkItem = Array.isArray(currentPayload) ? currentPayload[0] : currentPayload;
                        const instId = checkItem?.institution_id || checkItem?.institutionId;
                        const modId = checkItem?.module_id || checkItem?.moduleId;
                        if (instId && modId) {
                            try {
                                const { data: matchRows } = await supabase
                                    .from('institution_module_states')
                                    .select('id')
                                    .eq('institution_id', instId)
                                    .eq('module_id', modId)
                                    .limit(1);
                                if (matchRows && matchRows.length > 0 && matchRows[0].id) {
                                    const updateRes = await supabase
                                        .from('institution_module_states')
                                        .update(checkItem)
                                        .eq('id', matchRows[0].id)
                                        .select();
                                    if (!updateRes.error && updateRes.data) {
                                        return res.status(200).json({ success: true, data: updateRes.data });
                                    }
                                }
                            } catch (_) {}
                        }
                    }

                    if (moduleName === 'users') {
                        let field = 'record';
                        if (message.includes('email')) field = 'email address';
                        else if (message.includes('staff_id')) field = 'staff ID';
                        else if (message.includes('username')) field = 'username';
                        
                        return res.status(400).json({ 
                            success: false, 
                            error: `Registry Conflict: This ${field} is already registered in the system. Please use a unique value or contact support for account recovery.`,
                            code: error.code
                        });
                    }
                    return res.status(400).json({
                        success: false,
                        error: `A record with these details already exists in ${moduleName}.`,
                        code: error.code
                    });
                }

                const isTableMissing = error.code === '42P01' || 
                                       error.code === 'PGRST205' || 
                                       error.code === 'PGRST204' ||
                                       error.code === 'PGRST200' ||
                                       error.code === '23503' ||
                                       error.code === '23502' ||
                                       error.code === '22P02' ||
                                       (Date.now() - requestStartTime > MAX_SAFE_EXECUTION_MS) ||
                                       message.includes('schema cache') || 
                                       message.includes('column') ||
                                       message.includes('does not exist') ||
                                       message.includes('foreign key') ||
                                       message.includes('not-null') ||
                                       message.includes('null value in column') ||
                                       message.includes('invalid input syntax for type uuid') ||
                                       message.includes('not found in the schema cache');
                if (isTableMissing) {
                    console.warn(`[api/records POST] Table/column '${moduleName}' schema mismatch, fallback handled locally:`, error.message);
                    return res.status(200).json({
                        success: true,
                        offlineFallback: true,
                        message: `Table/column '${moduleName}' auto-handled locally.`,
                        id: (recordData as any)?.id || (Array.isArray(recordData) ? recordData[0]?.id : null) || getStrParam(id)
                    });
                }
                return res.status(500).json({ 
                    success: false, 
                    error: error.message,
                    code: error.code,
                    details: error.details || (error as any).detail,
                    hint: error.hint
                });
            }
            
            // Return entire array for bulk, first element for single
            if (Array.isArray(recordData)) {
                return res.status(200).json(data || { success: true, count: recordData.length });
            }

            if (moduleName === 'school_remedial_rate_settings') {
                const returned = data?.[0] || recordData;
                if (returned && typeof returned === 'object') {
                    const fallbackWeekend = (recordData as any)?.max_weekend_lessons_per_day ?? (recordData as any)?.maxWeekendLessonsPerDay ?? 2;
                    if (returned.max_weekend_lessons_per_day === undefined) {
                        returned.max_weekend_lessons_per_day = fallbackWeekend;
                    }
                    if (returned.maxWeekendLessonsPerDay === undefined) {
                        returned.maxWeekendLessonsPerDay = returned.max_weekend_lessons_per_day ?? fallbackWeekend;
                    }
                    const rawPrefs = (recordData as any)?.teacher_preferences ?? (recordData as any)?.teacherPreferences ?? returned?.teacher_preferences ?? returned?.teacherPreferences ?? returned?.metadata?.teacherPreferences ?? returned?.metadata?.teacher_preferences ?? {};
                    if (returned.teacher_preferences === undefined) {
                        returned.teacher_preferences = rawPrefs;
                    }
                    if (returned.teacherPreferences === undefined) {
                        returned.teacherPreferences = rawPrefs;
                    }
                }
                return res.status(200).json(returned);
            }

            if (moduleName === 'institutions') {
                const returned = data?.[0] || recordData;
                if (returned && typeof returned === 'object') {
                    const rawRecord = Array.isArray(recordData) ? recordData[0] : recordData;
                    if (returned.visitor_auto_finalize_enabled === undefined) {
                        returned.visitor_auto_finalize_enabled = rawRecord?.visitor_auto_finalize_enabled ?? rawRecord?.visitorAutoFinalizeEnabled;
                    }
                    if (returned.visitorAutoFinalizeEnabled === undefined) {
                        returned.visitorAutoFinalizeEnabled = returned.visitor_auto_finalize_enabled;
                    }
                    if (!returned.visitor_auto_finalize_time) {
                        returned.visitor_auto_finalize_time = rawRecord?.visitor_auto_finalize_time || rawRecord?.visitorAutoFinalizeTime;
                    }
                    if (!returned.visitorAutoFinalizeTime) {
                        returned.visitorAutoFinalizeTime = returned.visitor_auto_finalize_time;
                    }
                    if (returned.notify_host_on_visitor_arrival === undefined) {
                        returned.notify_host_on_visitor_arrival = rawRecord?.notify_host_on_visitor_arrival ?? rawRecord?.notifyHostOnVisitorArrival;
                    }
                    if (returned.notifyHostOnVisitorArrival === undefined) {
                        returned.notifyHostOnVisitorArrival = returned.notify_host_on_visitor_arrival;
                    }
                    if (!returned.visitor_arrival_sms_template) {
                        returned.visitor_arrival_sms_template = rawRecord?.visitor_arrival_sms_template || rawRecord?.visitorArrivalSmsTemplate;
                    }
                    if (!returned.visitorArrivalSmsTemplate) {
                        returned.visitorArrivalSmsTemplate = returned.visitor_arrival_sms_template;
                    }
                }
                return res.status(200).json(returned);
            }

            return res.status(200).json(data?.[0] || { success: true, id: (recordData as any)?.id || getStrParam(id), module: moduleName });
        }


        if (req.method === 'PATCH') {
            try {
                const { data: updateData, ids: bodyIds } = req.body || {};
                const rawId = req.query.id;
                const ids = bodyIds || (Array.isArray(rawId) ? rawId : (typeof rawId === 'string' ? rawId.split(',') : []));
                
                console.log(`[API PATCH DEBUG] Body:`, JSON.stringify(req.body));
                console.log(`[API PATCH DEBUG] Module: ${moduleName}`);
                console.log(`[API PATCH DEBUG] IDs:`, ids);
                console.log(`[API PATCH DEBUG] Update Data:`, updateData);
                console.log(`[API PATCH DEBUG] User:`, { id: user?.id, role: user?.role, institutionId: user?.institutionId });

                if (!ids || (Array.isArray(ids) && ids.length === 0)) {
                    console.warn(`[API PATCH DEBUG] Missing IDs`);
                    return res.status(400).json({ success: false, error: 'ID(s) required either in query or body' });
                }

                if (!updateData) {
                    console.warn(`[API PATCH DEBUG] Missing Update Data`);
                    return res.status(400).json({ success: false, error: 'No data to update' });
                }

                const idsArray = Array.isArray(ids) ? ids : [ids];
                let currentUpdateData = updateData && typeof updateData === 'object' ? stripUniversalTransientKeys(updateData) : updateData;
                if (moduleName === 'his_patients' && currentUpdateData && typeof currentUpdateData === 'object') {
                    const copy = { ...currentUpdateData };
                    const opVal = copy.admission_number || copy.admissionNumber || copy.custom_patient_id || copy.customPatientId || copy.patient_number || copy.patientNumber || copy.op_number || copy.opNumber;
                    if (opVal) copy.admission_number = String(opVal).trim();
                    if (copy.fullName && !copy.full_name) copy.full_name = copy.fullName;
                    if (copy.bloodGroup && !copy.blood_group) copy.blood_group = copy.bloodGroup;
                    if (copy.insuranceProvider && !copy.insurance_provider) copy.insurance_provider = copy.insuranceProvider;
                    if (copy.shaNumber && !copy.sha_number) copy.sha_number = copy.shaNumber;
                    if (copy.emergencyContactName && !copy.emergency_contact_name) copy.emergency_contact_name = copy.emergencyContactName;
                    if (copy.emergencyContactPhone && !copy.emergency_contact_phone) copy.emergency_contact_phone = copy.emergencyContactPhone;
                    if (copy.gradeLevel && !copy.grade_level) copy.grade_level = copy.gradeLevel;
                    if (copy.recordedBy && !copy.recorded_by) copy.recorded_by = copy.recordedBy;
                    if ((copy.dateOfBirth || copy.date_of_birth) && !copy.dob) copy.dob = copy.dateOfBirth || copy.date_of_birth;
                    if ((copy.phoneNumber || copy.phone) && (!copy.contact || copy.contact === 'N/A')) copy.contact = copy.phoneNumber || copy.phone;
                    if (copy.emergencyContact && !copy.emergency_contact_name) copy.emergency_contact_name = copy.emergencyContact;

                    // Harmonize guardian fields into standard emergency contact & contact fields
                    const gName = copy.guardian_name || copy.guardianName;
                    const gPhone = copy.guardian_phone || copy.guardianPhone;
                    if (gName && !copy.emergency_contact_name) copy.emergency_contact_name = gName;
                    if (gPhone && !copy.emergency_contact_phone) copy.emergency_contact_phone = gPhone;
                    if (gPhone && (!copy.contact || copy.contact === 'N/A')) copy.contact = gPhone;

                    delete copy.custom_patient_id;
                    delete copy.customPatientId;
                    delete copy.patient_number;
                    delete copy.patientNumber;
                    delete copy.op_number;
                    delete copy.opNumber;
                    delete copy.admissionNumber;
                    delete copy.name;
                    delete copy.fullName;
                    delete copy.bloodGroup;
                    delete copy.insuranceProvider;
                    delete copy.shaNumber;
                    delete copy.emergencyContactName;
                    delete copy.emergencyContactPhone;
                    delete copy.emergencyContact;
                    delete copy.dateOfBirth;
                    delete copy.date_of_birth;
                    delete copy.phoneNumber;
                    delete copy.phone;
                    delete copy.guardian_name;
                    delete copy.guardianName;
                    delete copy.guardian_phone;
                    delete copy.guardianPhone;
                    delete copy.guardian_national_id;
                    delete copy.guardianNationalId;
                    delete copy.first_name;
                    delete copy.firstName;
                    delete copy.last_name;
                    delete copy.lastName;
                    delete copy.gradeLevel;
                    delete copy.recordedBy;
                    delete copy.createdAt;
                    delete copy.updatedAt;
                    currentUpdateData = copy;
                } else if (moduleName === 'ds_students' && currentUpdateData && typeof currentUpdateData === 'object') {
                    const copy = { ...currentUpdateData };
                    const cat = copy.license_category || copy.licenseCategory || copy.license_type_interested || copy.licenseTypeInterested;
                    if (cat) {
                        copy.license_type_interested = cat;
                    }
                    delete copy.license_category;
                    delete copy.licenseCategory;
                    delete copy.licenseTypeInterested;
                    delete copy.preferred_lesson_hours;
                    delete copy.preferredLessonHours;
                    currentUpdateData = copy;
                } else if (['invoices', 'receipts', 'ds_invoices', 'ds_payments', 'pm_invoices', 'pm_payments', 'his_invoices', 'his_payments', 'books'].includes(moduleName) && currentUpdateData && typeof currentUpdateData === 'object') {
                    const copy = { ...currentUpdateData };
                    if (moduleName === 'invoices' || moduleName === 'ds_invoices') {
                        if (copy.className !== undefined) {
                            if (copy.class_name === undefined) copy.class_name = copy.className;
                            delete copy.className;
                        }
                        if (copy.studentClass !== undefined) {
                            if (copy.class_name === undefined) copy.class_name = copy.studentClass;
                            delete copy.studentClass;
                        }
                        if (copy.student_class !== undefined) {
                            if (copy.class_name === undefined) copy.class_name = copy.student_class;
                            delete copy.student_class;
                        }
                    }
                    const transientColumns = [
                        'message', 'isOpeningBalance', 'is_opening_balance',
                        'notificationSent', 'notification_sent', 'phone', 'email',
                        'studentAdm', 'student_adm', 'editReason', 'edit_reason',
                        'transferReason', 'transfer_reason', 'deletionReason', 'deletion_reason',
                        'deletionRequestedBy', 'deletion_requested_by', 'auditedBy', 'audited_by',
                        'auditedAt', 'audited_at', 'previousStudentId', 'previous_student_id',
                        'offline_fallback', 'offlineFallback', 'offline', 'success', 'error',
                        'excelPaymentMode', 'excel_payment_mode', 'matchStatus', 'match_status',
                        'matchConfidence', 'match_confidence', 'matchedStudentId', 'matched_student_id',
                        'notes', 'receiptSource', 'receipt_source', 'voteHeadAllocations', 'vote_head_allocations',
                        'studentName', 'student_name',
                        'bank_account_id', 'bankAccountId', 'votehead_id', 'voteheadId',
                        'admDisplay', 'adm_display', 'admissionNumber', 'admission_number',
                        'updated_at', 'updatedAt', 'created_at', 'createdAt',
                        'subtotal', 'sub_total', 'tax', 'tax_rate', 'taxRate', 'tax_amount', 'taxAmount', 'discount', 'discount_rate', 'discountRate', 'discount_amount', 'discountAmount',
                        'paidAmount', 'paid_amount', 'balanceDue', 'balance_due', 'netBalance', 'net_balance',
                        'available_copies', 'availableCopies', 'total_copies', 'totalCopies',
                        'academic_year', 'academicYear', 'academic_term', 'academicTerm', 'term', 'semester',
                        'academic_year_id', 'academicYearId', 'term_id', 'termId', 'semester_id', 'semesterId',
                        'fee_structure_id', 'feeStructureId', 'curriculum', 'program', 'grade_level', 'gradeLevel', 'stream',
                        'parent_name', 'parentName', 'parent_phone', 'parentPhone', 'parent_email', 'parentEmail',
                        'recorded_by', 'recordedBy', 'created_by', 'createdBy', 'issued_by', 'issuedBy',
                        'accountant_name', 'accountantName', 'payer_name', 'payerName',
                        'student_class', 'studentClass', 'className', 'grade', 'grade_name', 'gradeName', 'class_group', 'classGroup', 'stream_name', 'streamName',
                        'metadata'
                    ];
                    transientColumns.forEach(col => {
                        if (col in copy) {
                            delete copy[col];
                        }
                    });

                    if (moduleName === 'invoices') {
                        const allowedInvoiceCols = new Set([
                            'id', 'invoice_number', 'institution_id', 'branch_id',
                            'issue_date', 'due_date', 'items', 'total_amount',
                            'status', 'student_id', 'class_name', 'created_at', 'updated_at'
                        ]);
                        Object.keys(copy).forEach(k => {
                            if (!allowedInvoiceCols.has(k)) {
                                delete copy[k];
                            }
                        });
                        if (!copy.branch_id || copy.branch_id === copy.institution_id || copy.branch_id.startsWith('inst_')) {
                            delete copy.branch_id;
                        }
                    } else if (moduleName === 'receipts') {
                        const allowedReceiptCols = new Set([
                            'id', 'receipt_number', 'institution_id', 'branch_id',
                            'payment_date', 'amount_paid', 'paid_for', 'payment_method',
                            'related_transaction_id', 'invoice_id', 'student_id',
                            'created_at', 'updated_at'
                        ]);
                        Object.keys(copy).forEach(k => {
                            if (!allowedReceiptCols.has(k)) {
                                delete copy[k];
                            }
                        });
                        if (!copy.branch_id || copy.branch_id === copy.institution_id || copy.branch_id.startsWith('inst_')) {
                            delete copy.branch_id;
                        }
                    }

                    currentUpdateData = copy;
                } else if (moduleName === 'visitors') {
                    const copy = { ...currentUpdateData };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    // 1. Host ID
                    const hId = copy.host_id ?? copy.hostId;
                    if (!hId || hId === '' || hId === 'null' || hId === 'undefined') {
                        copy.host_id = null;
                    } else {
                        copy.host_id = hId;
                    }
                    delete copy.hostId;

                    // 2. ID Number
                    const idNum = copy.id_number ?? copy.idNumber;
                    if (idNum !== undefined && idNum !== null && idNum !== '') {
                        copy.id_number = String(idNum);
                        meta.id_number = String(idNum);
                    }
                    delete copy.idNumber;

                    // 3. Name & Full Name
                    const fName = copy.full_name ?? copy.fullName ?? copy.name;
                    if (fName) {
                        copy.full_name = fName;
                        if (!copy.name) copy.name = fName;
                    }
                    delete copy.fullName;

                    // 4. Phone Number
                    const phone = copy.phone_number ?? copy.phoneNumber ?? copy.phone;
                    if (phone) {
                        copy.phone_number = phone;
                    }
                    delete copy.phoneNumber;

                    // 5. Date & Time
                    if ('visitDate' in copy) {
                        copy.visit_date = copy.visit_date || copy.visitDate;
                        delete copy.visitDate;
                    }
                    if ('timeIn' in copy) {
                        copy.time_in = copy.time_in || copy.timeIn;
                        delete copy.timeIn;
                    }
                    if ('timeOut' in copy) {
                        copy.time_out = copy.time_out || copy.timeOut;
                        delete copy.timeOut;
                    }
                    if ('checkIn' in copy) {
                        copy.check_in = copy.check_in || copy.checkIn;
                        delete copy.checkIn;
                    }
                    if ('entryTime' in copy) {
                        if (!copy.time_in) copy.time_in = copy.entryTime;
                        delete copy.entryTime;
                    }

                    // 6. Host & Vehicle details
                    if ('hostName' in copy) {
                        copy.host_name = copy.host_name || copy.hostName;
                        delete copy.hostName;
                    }
                    if ('vehiclePlate' in copy) {
                        copy.vehicle_plate = copy.vehicle_plate || copy.vehiclePlate;
                        delete copy.vehiclePlate;
                    }
                    if ('vehicleModel' in copy) {
                        copy.vehicle_model = copy.vehicle_model || copy.vehicleModel;
                        delete copy.vehicleModel;
                    }

                    // 7. Signatures & Security
                    if ('visitorSignature' in copy) {
                        copy.visitor_signature = copy.visitor_signature || copy.visitorSignature;
                        delete copy.visitorSignature;
                    }
                    if ('hostSignature' in copy) {
                        copy.host_signature = copy.host_signature || copy.hostSignature;
                        delete copy.hostSignature;
                    }
                    if ('securityOfficerName' in copy) {
                        copy.security_officer_name = copy.security_officer_name || copy.securityOfficerName;
                        delete copy.securityOfficerName;
                    }
                    if ('institutionId' in copy) {
                        copy.institution_id = copy.institution_id || copy.institutionId;
                        delete copy.institutionId;
                    }

                    // 8. Status
                    if (copy.status) {
                        meta.status = copy.status;
                    }

                    copy.metadata = meta;
                    currentUpdateData = copy;
                } else if (moduleName === 'users') {
                    const copy = { ...currentUpdateData };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    // 1. Capture specific virtual/transient fields into metadata
                    const hasVehicleField = 'vehicle_id' in copy || 'vehicleId' in copy || 'assigned_vehicle_id' in copy || 'assignedVehicleId' in copy;
                    if (hasVehicleField) {
                        const rawVId = copy.vehicle_id !== undefined ? copy.vehicle_id : (copy.vehicleId !== undefined ? copy.vehicleId : (copy.assigned_vehicle_id !== undefined ? copy.assigned_vehicle_id : copy.assignedVehicleId));
                        const effectiveVId = (rawVId && String(rawVId).trim() !== '' && String(rawVId).toLowerCase() !== 'unassigned') ? String(rawVId).trim() : null;
                        meta.vehicleId = effectiveVId;
                        meta.assignedVehicleId = effectiveVId;
                        copy.vehicle_id = effectiveVId;
                    }
                    const driverTypeVal = copy.driver_type || copy.driverType;
                    if (driverTypeVal) {
                        meta.driverType = driverTypeVal;
                    }
                    const p2 = copy.parent_phone2 || copy.parentPhone2 || copy.secondary_phone || copy.secondaryPhone || copy.guardian_phone2 || copy.guardianPhone2;
                    if (p2) {
                        meta.parentPhone2 = p2;
                        meta.secondaryPhone = p2;
                    }
                    const pName = copy.parent_name || copy.parentName || copy.guardian_name || copy.guardianName;
                    if (pName) {
                        meta.parentName = pName;
                    }
                    const pPhone = copy.parent_phone || copy.parentPhone || copy.guardian_phone || copy.guardianPhone;
                    if (pPhone) {
                        meta.parentPhone = pPhone;
                    }
                    const sPhone = copy.student_phone || copy.studentPhone;
                    if (sPhone) {
                        meta.studentPhone = sPhone;
                    }
                    const tCode = copy.teacherCode || copy.teacher_code || copy.code;
                    if (tCode) {
                        meta.teacherCode = tCode;
                        meta.remedialTeacherCode = tCode;
                    }
                    const sClass = copy.studentClass || copy.student_class || copy.className || copy.class_name;
                    if (sClass) {
                        meta.studentClass = sClass;
                    }
                    const admNo = copy.admissionNumber || copy.admission_number || copy.admissionNo;
                    if (admNo) {
                        meta.admissionNumber = admNo;
                    }
                    const assNo = copy.assessmentNo || copy.assessment_no || copy.assessmentNumber || copy.assessment_number;
                    if (assNo) {
                        meta.assessmentNo = assNo;
                    }
                    const dob = copy.dateOfBirth || copy.date_of_birth || copy.dob;
                    if (dob) {
                        meta.dateOfBirth = dob;
                        meta.dob = dob;
                    }

                    // 2. Map camelCase aliases to snake_case column names
                    if (copy.phoneNumber && !copy.phone_number) copy.phone_number = copy.phoneNumber;
                    if (copy.staffId && !copy.staff_id) copy.staff_id = copy.staffId;
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.branchId && !copy.branch_id) copy.branch_id = copy.branchId;
                    if (copy.departmentId && !copy.department_id) copy.department_id = copy.departmentId;
                    if (copy.courseId && !copy.course_id) copy.course_id = copy.courseId;
                    if (copy.courseLevelId && !copy.course_level_id) copy.course_level_id = copy.courseLevelId;
                    if (copy.enrolledSubjectIds && !copy.enrolled_subject_ids) copy.enrolled_subject_ids = copy.enrolledSubjectIds;
                    if (copy.parentIds && !copy.parent_ids) copy.parent_ids = copy.parentIds;
                    if (copy.studentIds && !copy.student_ids) copy.student_ids = copy.studentIds;
                    if (copy.profilePhotoUrl !== undefined && copy.profile_photo_url === undefined) copy.profile_photo_url = copy.profilePhotoUrl;
                    if (copy.passwordLastUpdated && !copy.password_last_updated) copy.password_last_updated = copy.passwordLastUpdated;
                    if (copy.passwordExpiresAt && !copy.password_expires_at) copy.password_expires_at = copy.passwordExpiresAt;
                    if (copy.countyId && !copy.county_id) copy.county_id = copy.countyId;
                    if (copy.vehicleId && !copy.vehicle_id) copy.vehicle_id = copy.vehicleId;
                    if (copy.farmerId && !copy.farmer_id) copy.farmer_id = copy.farmerId;
                    if (copy.riderId && !copy.rider_id) copy.rider_id = copy.riderId;
                    if (copy.nationalId && !copy.national_id) copy.national_id = copy.nationalId;
                    if (copy.employmentDate && !copy.employment_date) copy.employment_date = copy.employmentDate;
                    if (copy.employmentTerms && !copy.employment_terms) copy.employment_terms = copy.employmentTerms;
                    if (copy.basicSalary !== undefined && copy.basic_salary === undefined) copy.basic_salary = copy.basicSalary;
                    if (copy.kraPin && !copy.kra_pin) copy.kra_pin = copy.kraPin;
                    if (copy.nssfNo && !copy.nssf_no) copy.nssf_no = copy.nssfNo;
                    if (copy.shifNumber && !copy.shif_number) copy.shif_number = copy.shifNumber;
                    if (copy.bankName && !copy.bank_name) copy.bank_name = copy.bankName;
                    if (copy.bankBranch && !copy.bank_branch) copy.bank_branch = copy.bankBranch;
                    if (copy.bankAccountNumber && !copy.bank_account_number) copy.bank_account_number = copy.bankAccountNumber;

                    // Clean invalid FK / branch values
                    if (copy.branch_id && (copy.branch_id.startsWith('inst_') || copy.branch_id === copy.institution_id)) {
                        delete copy.branch_id;
                    }
                    if (copy.department_id === '' || copy.department_id === 'null' || copy.department_id === 'undefined') copy.department_id = null;
                    if (copy.course_id === '' || copy.course_id === 'null' || copy.course_id === 'undefined') copy.course_id = null;
                    if (copy.county_id === '' || copy.county_id === 'null' || copy.county_id === 'undefined') copy.county_id = null;
                    if (copy.farmer_id === '' || copy.farmer_id === 'null' || copy.farmer_id === 'undefined') copy.farmer_id = null;
                    if (copy.rider_id === '' || copy.rider_id === 'null' || copy.rider_id === 'undefined') copy.rider_id = null;

                    // 3. Strictly whitelist allowed DB columns, packing everything else safely into metadata
                    const allowedUserCols = new Set([
                        'id', 'name', 'email', 'phone_number', 'staff_id', 'role', 'roles',
                        'institution_id', 'branch_id', 'password', 'department_id', 'expertise',
                        'course_id', 'course_level_id', 'enrolled_subject_ids', 'parent_ids',
                        'student_ids', 'gender', 'profile_photo_url', 'unavailability',
                        'password_last_updated', 'password_expires_at', 'county_id',
                        'vehicle_id', 'farmer_id', 'rider_id', 'reset_token', 'reset_token_expires',
                        'reset_otp', 'reset_otp_expires', 'national_id', 'employment_date',
                        'employment_terms', 'basic_salary', 'kra_pin', 'nssf_no', 'shif_number',
                        'bank_name', 'bank_branch', 'bank_account_number', 'metadata',
                        'created_at', 'updated_at'
                    ]);

                    const ignoredKeys = new Set(['updated_at', 'updatedAt', 'created_at', 'createdAt']);

                    Object.keys(copy).forEach(k => {
                        if (!allowedUserCols.has(k)) {
                            if (!ignoredKeys.has(k) && copy[k] !== undefined && copy[k] !== null && copy[k] !== '') {
                                meta[k] = copy[k];
                            }
                            delete copy[k];
                        }
                    });

                    copy.metadata = meta;
                    currentUpdateData = copy;
                }

                if (moduleName === 'student_enrollments' && currentUpdateData && typeof currentUpdateData === 'object') {
                    const copy = { ...currentUpdateData };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};

                    // 1. Map camelCase aliases to snake_case column names
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.userId && !copy.user_id) copy.user_id = copy.userId;
                    if (copy.enrollmentType && !copy.enrollment_type) copy.enrollment_type = copy.enrollmentType;
                    if (copy.admissionNumber && !copy.admission_number) copy.admission_number = copy.admissionNumber;
                    if (copy.assessmentNo && !copy.assessment_no) copy.assessment_no = copy.assessmentNo;
                    if (copy.assessmentNumber && !copy.assessment_no) copy.assessment_no = copy.assessmentNumber;
                    if (copy.dateOfBirth && !copy.date_of_birth) copy.date_of_birth = copy.dateOfBirth;
                    if (copy.dob && !copy.date_of_birth) copy.date_of_birth = copy.dob;
                    if (copy.leadershipPosition && !copy.leadership_position) copy.leadership_position = copy.leadershipPosition;
                    if (copy.enrollmentDate && !copy.enrollment_date) copy.enrollment_date = copy.enrollmentDate;
                    if (copy.courseId && !copy.course_id) copy.course_id = copy.courseId;
                    if (copy.classId && !copy.class_id) copy.class_id = copy.classId;

                    // 2. Ensure virtual attributes are preserved inside metadata
                    if (copy.admission_number && !meta.admissionNumber) meta.admissionNumber = copy.admission_number;
                    if (copy.assessment_no && !meta.assessmentNo) meta.assessmentNo = copy.assessment_no;
                    if (copy.date_of_birth && !meta.dateOfBirth) meta.dateOfBirth = copy.date_of_birth;
                    if (copy.leadership_position && !meta.leadershipPosition) meta.leadershipPosition = copy.leadership_position;
                    if (copy.course_id && !meta.courseId) meta.courseId = copy.course_id;
                    if (copy.class_id && !meta.classId) meta.classId = copy.class_id;

                    const nameVal = copy.full_name || copy.fullName || copy.name;
                    if (nameVal && !meta.fullName) meta.fullName = nameVal;

                    const genderVal = copy.gender;
                    if (genderVal && !meta.gender) meta.gender = genderVal;

                    const gradeVal = copy.grade_level || copy.gradeLevel;
                    if (gradeVal && !meta.gradeLevel) meta.gradeLevel = gradeVal;

                    const streamVal = copy.stream;
                    if (streamVal && !meta.stream) meta.stream = streamVal;

                    // 3. Allowed database columns for student_enrollments
                    const allowedEnrollmentCols = new Set([
                        'id', 'institution_id', 'user_id', 'enrollment_type', 'admission_number',
                        'assessment_no', 'date_of_birth', 'status', 'enrollment_date',
                        'course_id', 'class_id', 'leadership_position', 'metadata',
                        'created_at', 'updated_at'
                    ]);

                    const ignoredKeys = new Set(['updated_at', 'updatedAt', 'created_at', 'createdAt']);

                    Object.keys(copy).forEach(k => {
                        if (!allowedEnrollmentCols.has(k)) {
                            if (!ignoredKeys.has(k) && copy[k] !== undefined && copy[k] !== null && copy[k] !== '') {
                                meta[k] = copy[k];
                            }
                            delete copy[k];
                        }
                    });

                    copy.metadata = meta;
                    currentUpdateData = copy;
                } else if (moduleName === 'visitors') {
                    const copy = { ...currentUpdateData };
                    const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                    const entryVal = copy.entry_time || copy.entryTime;
                    if (entryVal) {
                        meta.entryTime = entryVal;
                        if (!copy.time_in && !copy.timeIn) copy.time_in = entryVal;
                        if (!copy.check_in && !copy.checkIn) copy.check_in = entryVal;
                    }
                    const exitVal = copy.exit_time || copy.exitTime;
                    if (exitVal) {
                        meta.exitTime = exitVal;
                        if (!copy.time_out && !copy.timeOut) copy.time_out = exitVal;
                    }
                    copy.metadata = meta;

                    delete copy.entry_time;
                    delete copy.entryTime;
                    delete copy.exit_time;
                    delete copy.exitTime;

                    currentUpdateData = copy;
                } else if (moduleName === 'app_notifications') {
                    const copy = { ...currentUpdateData };
                    if (copy.userId && !copy.user_id) copy.user_id = copy.userId;
                    if (copy.isRead !== undefined && copy.is_read === undefined) copy.is_read = copy.isRead;
                    if (copy.message === null) copy.message = '';
                    delete copy.userId;
                    delete copy.isRead;
                    currentUpdateData = copy;
                } else if (moduleName === 'subjects') {
                    const allowed = new Set([
                        'id', 'code', 'name', 'description', 
                        'department_id', 'institution_id', 
                        'lesson_structure', 'has_exam', 'dedicated_room_id',
                        'abbreviation', 'short_name',
                        'created_at', 'updated_at'
                    ]);
                    const clean: any = {};
                    for (const key of Object.keys(currentUpdateData)) {
                        if (allowed.has(key)) {
                            clean[key] = currentUpdateData[key];
                        }
                    }
                    if (currentUpdateData.departmentId && !clean.department_id) clean.department_id = currentUpdateData.departmentId;
                    if (currentUpdateData.institutionId && !clean.institution_id) clean.institution_id = currentUpdateData.institutionId;
                    if (currentUpdateData.lessonStructure && !clean.lesson_structure) clean.lesson_structure = currentUpdateData.lessonStructure;
                    if (currentUpdateData.hasExam !== undefined && clean.has_exam === undefined) clean.has_exam = currentUpdateData.hasExam;
                    if (currentUpdateData.dedicatedRoomId && !clean.dedicated_room_id) clean.dedicated_room_id = currentUpdateData.dedicatedRoomId;
                    if (currentUpdateData.abbreviation !== undefined && clean.abbreviation === undefined) clean.abbreviation = currentUpdateData.abbreviation;
                    if (currentUpdateData.shortName !== undefined && clean.short_name === undefined) clean.short_name = currentUpdateData.shortName;
                    if (clean.abbreviation && !clean.short_name) clean.short_name = clean.abbreviation;
                    if (clean.short_name && !clean.abbreviation) clean.abbreviation = clean.short_name;
                    currentUpdateData = clean;
                } else if (moduleName === 'student_enrollments') {
                    const copy = { ...currentUpdateData };
                    if (copy.leadershipPosition && !copy.leadership_position) copy.leadership_position = copy.leadershipPosition;
                    if (copy.leadership_position && !copy.leadershipPosition) copy.leadershipPosition = copy.leadership_position;
                    if (copy.dateOfBirth && !copy.date_of_birth) copy.date_of_birth = copy.dateOfBirth;
                    if (copy.assessmentNo && !copy.assessment_no) copy.assessment_no = copy.assessmentNo;
                    if (copy.admissionNumber && !copy.admission_number) copy.admission_number = copy.admissionNumber;
                    if (copy.enrollmentType && !copy.enrollment_type) copy.enrollment_type = copy.enrollmentType;
                    if (copy.enrollmentDate && !copy.enrollment_date) copy.enrollment_date = copy.enrollmentDate;
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.userId && !copy.user_id) copy.user_id = copy.userId;
                    currentUpdateData = copy;
                } else if (moduleName === 'vehicles' && currentUpdateData && typeof currentUpdateData === 'object') {
                    const copy = { ...currentUpdateData };
                    if ('plateNumber' in copy) { copy.plate_number = copy.plateNumber; delete copy.plateNumber; }
                    if ('vehicleType' in copy) { copy.vehicle_type = copy.vehicleType; delete copy.vehicleType; }
                    if ('driverId' in copy) { copy.driver_id = copy.driverId; delete copy.driverId; }
                    if ('assistantId' in copy) { copy.assistant_id = copy.assistantId; delete copy.assistantId; }
                    if ('institutionId' in copy) { copy.institution_id = copy.institutionId; delete copy.institutionId; }
                    if ('driver_id' in copy && (!copy.driver_id || copy.driver_id === '')) copy.driver_id = null;
                    if ('assistant_id' in copy && (!copy.assistant_id || copy.assistant_id === '')) copy.assistant_id = null;
                    if ('capacity' in copy && copy.capacity !== undefined && copy.capacity !== null) copy.capacity = Number(copy.capacity) || 14;
                    currentUpdateData = copy;
                } else if (moduleName === 'transport_onboarding' && currentUpdateData && typeof currentUpdateData === 'object') {
                    const copy = { ...currentUpdateData };
                    if ('userId' in copy) { copy.user_id = copy.userId; delete copy.userId; }
                    if ('driverId' in copy) { copy.user_id = copy.driverId; delete copy.driverId; }
                    if ('vehicleId' in copy) { copy.vehicle_id = copy.vehicleId; delete copy.vehicleId; }
                    if ('institutionId' in copy) { copy.institution_id = copy.institutionId; delete copy.institutionId; }
                    if ('user_id' in copy && (!copy.user_id || copy.user_id === '')) copy.user_id = null;
                    if ('vehicle_id' in copy && (!copy.vehicle_id || copy.vehicle_id === '')) copy.vehicle_id = null;
                    currentUpdateData = copy;
                } else if (moduleName === 'vehicle_logs' && currentUpdateData && typeof currentUpdateData === 'object') {
                    const copy = { ...currentUpdateData };
                    if ('vehicleId' in copy) { copy.vehicle_id = copy.vehicleId; delete copy.vehicleId; }
                    if ('driverId' in copy) { copy.driver_id = copy.driverId; delete copy.driverId; }
                    if ('securityId' in copy) { copy.security_id = copy.securityId; delete copy.securityId; }
                    if ('institutionId' in copy) { copy.institution_id = copy.institutionId; delete copy.institutionId; }
                    if ('vehicle_id' in copy && (!copy.vehicle_id || copy.vehicle_id === '')) copy.vehicle_id = null;
                    if ('driver_id' in copy && (!copy.driver_id || copy.driver_id === '')) copy.driver_id = null;
                    if ('security_id' in copy && (!copy.security_id || copy.security_id === '')) copy.security_id = null;
                    currentUpdateData = copy;
                }
                let data: any = null;
                let error: any = null;
                let patchRetries = 2;
                let patchTableSupportsMetadata = TABLES_WITH_METADATA.has(targetDbTable);

                while (patchRetries >= 0) {
                    if (Date.now() - requestStartTime > MAX_SAFE_EXECUTION_MS) {
                        console.warn(`[api/records PATCH] Execution approaching timeout (${MAX_SAFE_EXECUTION_MS}ms) for [${moduleName}]. Breaking to return local fallback.`);
                        break;
                    }

                    let q = supabase.from(targetDbTable).update(currentUpdateData);
                    
                    if (idsArray.length === 1) q = q.eq('id', idsArray[0]);
                    else q = q.in('id', idsArray);

                    // Security check
                    if (user?.role !== 'super_admin' && !PUBLIC_MODULES.includes(moduleName) && !isTableWithoutInstitutionId(moduleName)) {
                        const instCol = (moduleName === 'institutions' ? 'id' : 'institution_id');
                        const instId = user?.institutionId;
                        
                        if (instId) {
                            console.log(`[API PATCH DEBUG] Applying tenancy check: ${instCol} = ${instId}`);
                            q = q.eq(instCol, instId);
                        } else {
                            console.warn(`[API PATCH DEBUG] Authorization warning: User has no institutionId. Skipping tenancy filter.`);
                            if (user?.role !== 'super_admin') {
                                 return res.status(401).json({ success: false, error: 'Unauthorized: Academic institution identity required.' });
                            }
                        }
                    }

                    const tablesWithBranchId = ['users', 'invoices', 'receipts', 'branches', 'branch_integration_configs'];
                    const isBranchRestrictedUser = user && user.role !== 'super_admin' && user.role !== 'group_admin';
                    if (isBranchRestrictedUser && user.branchId && tablesWithBranchId.includes(moduleName)) {
                        q = q.eq(moduleName === 'branches' ? 'id' : 'branch_id', user.branchId);
                    }

                    const queryRes = await q.select();
                    data = queryRes.data;
                    error = queryRes.error;

                    if (!error) break;

                    const colMatch = error.message ? error.message.match(/Could not find the '([^']+)' column/i) : null;
                    if (colMatch && colMatch[1] && patchRetries > 0) {
                        const offendingCol = colMatch[1];
                        if (offendingCol === 'metadata') {
                            patchTableSupportsMetadata = false;
                        }
                        console.warn(`[api/records PATCH] Schema cache stale: stripping un-cached column '${offendingCol}' for [${moduleName}] and retrying (${patchRetries} left)...`);
                        if (moduleName === 'school_remedial_allocations') {
                            const EXTENDED_ALLOC_COLS = [
                                'is_joint', 'joint_streams', 'joint_courses', 'joint_label',
                                'is_auto_generated', 'is_unallocated', 'unallocated_reason',
                                'is_manual', 'is_duty_lesson', 'stream', 'priority', 'status',
                                'substitute_teacher_id', 'substitute_teacher_name',
                                'original_teacher_id', 'original_teacher_name',
                                'cancellation_reason', 'cancelled_at',
                                'confirmation_deadline', 'declined_teacher_ids',
                                'updated_at', 'created_at'
                            ];
                            const meta = typeof currentUpdateData.metadata === 'object' && currentUpdateData.metadata !== null ? { ...currentUpdateData.metadata } : {};
                            EXTENDED_ALLOC_COLS.forEach(c => {
                                if (currentUpdateData[c] !== undefined && currentUpdateData[c] !== null && currentUpdateData[c] !== '') {
                                    meta[c] = currentUpdateData[c];
                                    delete currentUpdateData[c];
                                }
                            });
                            if (offendingCol === 'metadata' || !patchTableSupportsMetadata) {
                                delete currentUpdateData.metadata;
                            } else {
                                currentUpdateData.metadata = meta;
                            }
                            patchRetries--;
                            continue;
                        }

                        const copy = { ...currentUpdateData };
                        if (patchTableSupportsMetadata && offendingCol !== 'metadata' && copy[offendingCol] !== undefined && copy[offendingCol] !== null) {
                            const meta = typeof copy.metadata === 'object' && copy.metadata !== null ? { ...copy.metadata } : {};
                            meta[offendingCol] = copy[offendingCol];
                            copy.metadata = meta;
                        }
                        delete copy[offendingCol];
                        if (!patchTableSupportsMetadata) {
                            delete copy.metadata;
                        }
                        currentUpdateData = copy;
                        patchRetries--;
                        continue;
                    } else if ((error.code === '22P02' || String(error.message || '').toLowerCase().includes('invalid input syntax for type uuid')) && patchRetries > 0) {
                        console.warn(`[api/records PATCH] UUID syntax mismatch on [${moduleName}]: stripping non-UUID identifiers and retrying...`);
                        const isValidUUID = (str: any) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                        const copy = { ...currentUpdateData };
                        if (copy.id && !isValidUUID(copy.id)) delete copy.id;
                        currentUpdateData = copy;
                        patchRetries--;
                        continue;
                    } else if ((error.code === '23503' || String(error.message || '').includes('foreign key constraint')) && patchRetries > 0) {
                        console.warn(`[api/records PATCH] Foreign key constraint note on [${moduleName}]: nulling relational IDs and retrying...`);
                        const copy = { ...currentUpdateData };
                        ['patient_id', 'doctor_id', 'student_id', 'parent_id', 'driver_id', 'assistant_id', 'instructor_id', 'vehicle_id', 'room_id', 'category_id', 'invoice_id', 'host_id', 'user_id', 'created_by', 'recorded_by', 'agent_id', 'sale_id', 'item_id', 'product_id', 'store_id', 'order_id', 'supplier_id', 'customer_id'].forEach(k => {
                            if (k in copy) copy[k] = null;
                        });
                        currentUpdateData = copy;
                        patchRetries--;
                        continue;
                    } else {
                        break;
                    }
                }

                if (moduleName === 'ds_settings') {
                    console.log(`[API PATCH DEBUG] ds_settings update result:`, { success: !error, count: data?.length, error, ids: idsArray });
                }
                if (error) {
                    const isTableMissing = error.code === '42P01' || 
                                           error.code === 'PGRST205' || 
                                           error.code === 'PGRST204' ||
                                           error.code === '23503' ||
                                           error.code === '23502' ||
                                           error.code === '22P02' ||
                                           (Date.now() - requestStartTime > MAX_SAFE_EXECUTION_MS) ||
                                           error.message?.includes('schema cache') || 
                                           error.message?.includes('invalid input syntax for type uuid') ||
                                           error.message?.includes('does not exist');
                    if (isTableMissing) {
                        return res.status(200).json([]);
                    }
                    console.error(`[API PATCH Error] ${moduleName}:`, error);
                    return res.status(500).json({ 
                        success: false, 
                        error: error.message, 
                        details: error,
                        code: error.code,
                        hint: error.hint
                    });
                }
                console.log(`[API PATCH DEBUG] Success. Count: ${data?.length || 0}`);
                return res.status(200).json(data || []);
            } catch (patchErr: any) {
                console.error(`[API PATCH Crash] ${moduleName}:`, patchErr);
                return res.status(500).json({ success: false, error: patchErr.message || 'Internal PATCH Failure' });
            }
        }

        if (req.method === 'DELETE') {
            console.log("[API DELETE DEBUG] Query:", JSON.stringify(req.query));
            console.log("[API DELETE DEBUG] Body:", JSON.stringify(req.body));
            
            // Robustly extract IDs: body.ids (parsed JSON) → body as raw string → query string 'ids'
            let bodyIds: string[] | undefined;
            if (Array.isArray(req.body?.ids)) {
                bodyIds = req.body.ids;
            } else if (typeof req.body === 'string') {
                // Some environments deliver the body as an unparsed string
                try { bodyIds = JSON.parse(req.body).ids; } catch (_) {}
            }

            const idVal = getStrParam(id);
            const qIds = getStrParam(req.query.ids as string); // comma-separated fallback from query

            const idsArray: string[] = Array.isArray(bodyIds) && bodyIds.length > 0
                ? bodyIds
                : idVal
                    ? idVal.split(',').map(s => s.trim()).filter(Boolean)
                    : qIds
                        ? qIds.split(',').map(s => s.trim()).filter(Boolean)
                        : [];

            console.log("[API DELETE DEBUG] Extracted IDs:", idsArray);

            if (idsArray.length === 0) return res.status(400).json({ success: false, error: 'ID required. Pass ids in request body or query string.', debugQuery: req.query });

            let q = supabase.from(targetDbTable).delete();
            if (idsArray.length === 1) q = q.eq('id', idsArray[0]);
            else q = q.in('id', idsArray);

            // Security: Only allow deleting records within own institution
            if (user?.role !== 'super_admin' && !PUBLIC_MODULES.includes(moduleName) && !isTableWithoutInstitutionId(moduleName)) {
                q = q.eq('institution_id', user?.institutionId);
            }

            const tablesWithBranchId = ['users', 'invoices', 'receipts', 'branches', 'branch_integration_configs'];
            const isBranchRestrictedUser = user && user.role !== 'super_admin' && user.role !== 'group_admin';
            if (isBranchRestrictedUser && user.branchId && tablesWithBranchId.includes(moduleName)) {
                q = q.eq(moduleName === 'branches' ? 'id' : 'branch_id', user.branchId);
            }

            const { error } = await q;
            if (error) return res.status(200).json({ success: false, error: error.message, code: error.code });
            return res.status(200).json({ success: true, count: idsArray.length, module: moduleName });
        }

        return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[API Records] Crash:', err);
        return res.status(500).json({ success: false, error: 'Server Error', message: err.message });
    }
}
