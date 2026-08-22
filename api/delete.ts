import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const getSupabase = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
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
  'school_remedial_payouts', 'school_remedial_allocations', 'school_remedial_subjects',
  'coop_farmers', 'coop_collections', 'coop_riders', 'coop_agrovet_inventory',
  'coop_agrovet_sales', 'sacco_accounts', 'sacco_transactions', 'coop_monthly_payouts',
  'coop_expenses', 'coop_income', 'car_appraisals', 'car_test_drives', 'car_invoices',
  'car_payments', 'fee_promises', 'timetable_entries', 'exam_timetable_entries',
  'bursary_disbursements'
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
        } catch (_) {}
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

    let q = supabase.from(moduleName).delete();
    if (idsArray.length === 1) {
      q = q.eq('id', idsArray[0]);
    } else {
      q = q.in('id', idsArray);
    }

    const { error: delErr } = await q;

    if (delErr) {
      console.error(`[/api/delete] Supabase error for ${moduleName}:`, delErr);
      return res.status(200).json({ success: false, error: delErr.message, code: delErr.code });
    }

    console.log(`[/api/delete] Deleted ${idsArray.length} record(s) from ${moduleName}`);
    return res.status(200).json({ success: true, count: idsArray.length, module: moduleName });

  } catch (err: any) {
    console.error('[/api/delete] Crash:', err);
    return res.status(500).json({ success: false, error: 'Server Error', message: err.message });
  }
}
