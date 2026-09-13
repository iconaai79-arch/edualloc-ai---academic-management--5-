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

  console.log(`[getAuthUser] Debug: token length ${token.length}, startsWith ${token.substring(0, 10)}...`);

  try {
    // 1. Try JWT
    if (token.length > 20 && token.includes('.') && token.split('.').length === 3) {
      const { data, error: authErr } = await supabase.auth.getUser(token);
      if (authErr) console.error('[Auth JWT Error]', authErr.message);
      
      if (data?.user) {
        // Support BOTH raw UUID and 'u_' prefixed UUID (matches DB RLS logic)
        const { data: profile } = await supabase.from('users')
          .select('id, institution_id, role, branch_id')
          .or(`id.eq.${data.user.id},id.eq.u_${data.user.id}`)
          .single();
        
        if (profile) return { id: profile.id, institutionId: profile.institution_id, role: profile.role, branchId: profile.branch_id };
        
        // Fallback for Super Admin bootstrap (matching DB RLS behavior)
        if (data.user.email === 'super@app.com') {
           return { id: data.user.id, institutionId: 'GLOBAL', role: 'super_admin' };
        }

        return { 
          id: data.user.id, 
          institutionId: (data.user.user_metadata as any)?.institutionId || 'GUEST', 
          role: (data.user.user_metadata as any)?.role || 'guest' 
        };
      }
    }
    // 2. Try User ID fallback (Less restrictive: any non-JWT token)
    const { data: profile, error: dbErr } = await supabase.from('users')
      .select('id, institution_id, role')
      .or(`id.eq.${token},id.eq.u_${token}`)
      .maybeSingle();
    
    if (dbErr) {
        console.error('[Auth DB Error]', dbErr.message);
    }
    
    if (profile) return { id: profile.id, institutionId: profile.institution_id, role: profile.role };
    
    // 3. Try Alumnae discovery if token looks like an alumna ID
    if (token && token.startsWith('alumna_')) {
      console.log(`[getAuthUser] Attempting Alumnae discovery for token: ${token}`);
      
      // Try by ID first
      let { data: alumna, error: alumError } = await supabase.from('alumnae_members')
        .select('*')
        .eq('id', token)
        .maybeSingle();
      
      if (alumError) {
          console.error('[Auth Alumna Error - ID Lookup]', alumError.message);
      }

      // If ID lookup fails, it might be due to a malformed ID in the session vs DB
      // We can't easily fallback to email here as we don't have it in the token
      // But we can log a count of all alumnae to verify table access
      if (!alumna) {
          const { count } = await supabase.from('alumnae_members').select('*', { count: 'exact', head: true });
          console.log(`[getAuthUser] Alumna not found by ID. Total records in alumnae_members: ${count || 0}`);
      }

      if (alumna) {
          const instId = alumna.institution_id || alumna.institutionId || 'GLOBAL';
          console.log(`[getAuthUser] Alumna verified: ${alumna.full_name || alumna.fullName} (${instId})`);
          return { id: alumna.id, institutionId: instId, role: 'alumna', email: alumna.email };
      } else {
          console.warn(`[getAuthUser] No Alumna match found for ID: ${token}`);
      }
    }

    // 4. Try Temp Admin / Super Admin bypass (Development / Maintenance Mode)
    if (token && (token.startsWith('temp_admin_') || token.startsWith('admin_') || token === 'admin' || token === 'super_admin' || token === 'temp_admin_bypass')) {
       console.log(`[getAuthUser] Bypass active for ${token.substring(0, 15)}...`);
       return { id: token, institutionId: 'GLOBAL', role: 'super_admin' };
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
  'mpesa_transactions', 'airtel_transactions', 'intasend_transactions', 'ncba_transactions', 'bank_transactions',
  'feedback_submissions', 'guest_feedback', 'guest_feedbacks', 'lesson_ratings',
  'procurement_items', 'procurement_suppliers', 'procurement_lpos', 'procurement_invoices',
  'weighbridge_intake_tickets', 'grain_suppliers', 'milling_silos', 'milling_batch_runs', 'flour_packaging_shifts', 'animal_feed_batches', 'grain_sale_orders',
  'county_dispatch_manifests', 'county_dispatch_items', 'county_school_requisitions', 'institution_module_states',
  'bursary_disbursements', 'invoices', 'receipts', 'expenses', 'bank_feed_transactions', 'finance_numbering_configs', 'fee_structures', 'vote_heads',
  'courses', 'subjects', 'departments', 'rooms', 'buildings', 'academic_years', 'academic_levels', 'semesters', 'timetable_entries', 'exam_timetable_entries', 'allocation_requests', 'assignments', 'tasks',
  'app_notifications', 'whatsapp_configs', 'whatsapp_logs',
  'invoice_clients', 'company_invoice_settings',
  'school_authorized_devices', 'school_router_profiles'
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
  'ds_payments'
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

    try {
        const supabase = getSupabase();
        if (!supabase) return res.status(503).json({ success: false, error: 'Supabase keys missing in environment' });

        const authHeader = req.headers.authorization;
        const user = await getAuthUser(supabase, authHeader);
        const isPublicModule = PUBLIC_MODULES.includes(moduleName) || PUBLIC_MODULES.includes(rawModuleName);
        const isPublicGet = req.method === 'GET' && isPublicModule;
        
        // Allow POST for registration, settings, and social interactions
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
          'procurement_items', 'procurement_suppliers', 'procurement_lpos', 'procurement_invoices',
          'weighbridge_intake_tickets', 'grain_suppliers', 'milling_silos', 'milling_batch_runs', 'flour_packaging_shifts', 'animal_feed_batches', 'grain_sale_orders',
          'county_dispatch_manifests', 'county_dispatch_items', 'county_school_requisitions'
        ].includes(moduleName) || ['feedback_submissions', 'guest_feedback', 'guest_feedbacks'].includes(rawModuleName));
        const isSocialInteraction = (req.method === 'POST' || req.method === 'PATCH') && (['alumni_posts', 'alumni_comments', 'alumni_messages'].includes(moduleName)) && user?.role === 'alumna';
        
        if (!user && !isPublicGet && !isPublicPost && !isSocialInteraction) {
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
                }

                return q;
            };
            
            let finalLimit = limit ? parseInt(getStrParam(limit)) : (
                ['receipts', 'invoices', 'users', 'students', 'student_enrollments', 'fee_structures', 'vote_heads', 'expenses', 'school_registry', 'ds_leads', 'ds_students', 'ds_lessons', 'ds_invoices', 'ds_payments', 'ds_skill_mastery', 'mpesa_transactions', 'bank_transactions', 'airtel_transactions', 'intasend_transactions', 'ncba_transactions', 'integration_logs', 'broadcaster_messages', 'marketing_prospects', 'campaign_leads', 'pm_invoices', 'pm_payments'].includes(moduleName)
                    ? 100000
                    : (['visitors', 'security_alerts', 'audit_issues', 'activity_log'].includes(moduleName) ? 2000 : 10000)
            );
            if (isNaN(finalLimit)) finalLimit = 100000;
            if (finalLimit > 100000) {
                finalLimit = 100000;
            }
            
            let offset = req.query.offset ? parseInt(getStrParam(req.query.offset)) : 0;
            if (isNaN(offset)) offset = 0;
            
            const CHUNK_SIZE = 1000;
            let data: any[] = [];
            let error: any = null;

            const executeWithTimeout = async (queryBuilder: any, timeoutMs: number = 12000): Promise<any> => {
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
                        const res: any = await executeWithTimeout(buildBaseQuery().range(currentOffset, currentOffset + batchSize - 1));
                        if (res.error) {
                            if (data.length === 0) {
                                error = res.error;
                            } else {
                                console.warn(`[API GET] Chunk fetch error for '${moduleName}' at offset ${currentOffset}:`, res.error);
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
                const isColumnOrSyntaxErr = error.code === '42703' || 
                                            error.code === 'PGRST100' || 
                                            error.code === '42501' || 
                                            error.code === 'PGRST301' ||
                                            error.message?.includes('column') ||
                                            error.message?.includes('filter');
                if (isColumnOrSyntaxErr) {
                    console.warn(`[API GET] Query filter issue for '${moduleName}' (${error.message}). Retrying simplified query...`);
                    try {
                        let simpleQ = supabase.from(targetDbTable).select('*');
                        if (targetInstParam && targetInstParam !== 'ALL' && !isTableWithoutInstitutionId(moduleName)) {
                            simpleQ = simpleQ.eq(moduleName === 'institutions' ? 'id' : 'institution_id', targetInstParam);
                        } else if (user?.institutionId && !isTableWithoutInstitutionId(moduleName)) {
                            simpleQ = simpleQ.eq(moduleName === 'institutions' ? 'id' : 'institution_id', user.institutionId);
                        }
                        simpleQ = simpleQ.limit(finalLimit);
                        const { data: simpleData, error: simpleErr } = await simpleQ;
                        if (!simpleErr && simpleData) {
                            return res.status(200).json(simpleData);
                        }
                    } catch (e) {
                        console.warn(`[API GET] Simple fallback retry failed for '${moduleName}':`, e);
                    }
                    return res.status(200).json([]);
                }
                const isTimeout = error.code === '57014' || 
                                  error.message?.includes('statement timeout') ||
                                  error.message?.includes('timeout') ||
                                  error.message?.includes('canceling statement');
                if (isTimeout) {
                    console.warn(`[API GET Timeout] Query timed out for '${moduleName}' (code: 57014). Attempting fallback retry with limited window...`);
                    try {
                        let retryQ = supabase.from(moduleName).select(getStrParam(select) || '*');
                        if (targetInstParam && targetInstParam !== 'ALL' && !isTableWithoutInstitutionId(moduleName)) {
                            retryQ = retryQ.eq(moduleName === 'institutions' ? 'id' : 'institution_id', targetInstParam);
                        } else if (user?.institutionId && !isTableWithoutInstitutionId(moduleName)) {
                            retryQ = retryQ.eq('institution_id', user.institutionId);
                        }
                        if (['visitors', 'security_alerts', 'activity_log', 'integration_logs'].includes(moduleName)) {
                            retryQ = retryQ.order('created_at', { ascending: false });
                        }
                        retryQ = retryQ.range(0, 499);
                        const { data: retryData, error: retryErr } = await retryQ;
                        if (!retryErr && retryData) {
                            console.info(`[API GET Timeout] Fallback query recovered ${retryData.length} records for '${moduleName}'.`);
                            return res.status(200).json(retryData);
                        }
                    } catch (retryEx) {
                        console.warn(`[API GET Timeout] Fallback query retry error for '${moduleName}':`, retryEx);
                    }
                    console.warn(`[API GET Timeout] Returning empty list fallback for '${moduleName}' to keep client operational.`);
                    return res.status(200).json([]);
                }
                console.error(`[API GET Error] ${moduleName}:`, error);
                // Return empty list on any DB query error to prevent breaking client UI
                return res.status(200).json([]);
            }

            if (moduleName === 'school_remedial_rate_settings') {
                let records = Array.isArray(data) ? data : [];
                if (records.length === 0 && institutionId) {
                    try {
                        const { data: imsData } = await supabase
                            .from('institution_module_states')
                            .select('data')
                            .eq('id', `${institutionId}_school_remedial_rate_settings`)
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
                    }
                });
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

                copy.metadata = meta;
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
                    if (copy.feePerStudent !== undefined && copy.fee_per_student === undefined) copy.fee_per_student = copy.feePerStudent;
                    if (copy.termFee !== undefined && copy.term_fee === undefined) copy.term_fee = copy.termFee;
                    copy.updated_at = new Date().toISOString();
                    copy.metadata = meta;

                    delete copy.institutionId;
                    delete copy.hourlyRate;
                    delete copy.weekdayHourlyRate;
                    delete copy.weekendHourlyRate;
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
                    delete copy.cancellationCutoffHours;
                    delete copy.confirmationTimeoutMinutes;
                    delete copy.teacherPreferences;
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
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanRemedialRateSettings) : cleanRemedialRateSettings(currentPayload);
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
                    delete copy.substituteTeacherId;
                    delete copy.substituteTeacherName;
                    delete copy.originalTeacherId;
                    delete copy.originalTeacherName;
                    delete copy.cancellationReason;
                    delete copy.cancelledAt;
                    delete copy.confirmationDeadline;
                    delete copy.declinedTeacherIds;

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

                    copy.metadata = meta;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanVisitorRecord) : cleanVisitorRecord(currentPayload);
            } else if (moduleName === 'users') {
                const cleanUserRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    const meta = { ...(copy.metadata || {}) };

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
                    const pPhone = copy.parent_phone || copy.parentPhone;
                    if (pPhone) {
                        meta.parentPhone = pPhone;
                    }
                    const sPhone = copy.student_phone || copy.studentPhone;
                    if (sPhone) {
                        meta.studentPhone = sPhone;
                    }
                    copy.metadata = meta;

                    delete copy.vehicle_id;
                    delete copy.vehicleId;
                    delete copy.assigned_vehicle_id;
                    delete copy.assignedVehicleId;
                    delete copy.driver_type;
                    delete copy.driverType;
                    delete copy.parent_phone2;
                    delete copy.parentPhone2;
                    delete copy.secondary_phone;
                    delete copy.secondaryPhone;
                    delete copy.guardian_phone2;
                    delete copy.guardianPhone2;
                    delete copy.parent_phone_number2;
                    delete copy.secondary_parent_phone;
                    delete copy.student_phone;
                    delete copy.studentPhone;
                    delete copy.parent_name;
                    delete copy.parentName;
                    delete copy.guardian_name;
                    delete copy.guardianName;
                    delete copy.parent_phone;
                    delete copy.parentPhone;

                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanUserRecord) : cleanUserRecord(currentPayload);
            } else if (moduleName === 'student_enrollments') {
                const cleanEnrollmentRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    const meta = { ...(copy.metadata || {}) };

                    const dobVal = copy.date_of_birth || copy.dateOfBirth || copy.dob;
                    if (dobVal) {
                        meta.dateOfBirth = dobVal;
                        meta.dob = dobVal;
                    }
                    const assVal = copy.assessment_no || copy.assessmentNo || copy.assessment_number || copy.assessmentNumber;
                    if (assVal) {
                        meta.assessmentNo = assVal;
                        meta.assessmentNumber = assVal;
                    }
                    const nameVal = copy.full_name || copy.fullName || copy.name;
                    if (nameVal && !meta.fullName) meta.fullName = nameVal;

                    const genderVal = copy.gender;
                    if (genderVal && !meta.gender) meta.gender = genderVal;

                    const gradeVal = copy.grade_level || copy.gradeLevel;
                    if (gradeVal && !meta.gradeLevel) meta.gradeLevel = gradeVal;

                    const streamVal = copy.stream;
                    if (streamVal && !meta.stream) meta.stream = streamVal;

                    copy.metadata = meta;

                    // Strip virtual / non-column attributes to prevent schema cache stale warnings & retries
                    delete copy.date_of_birth;
                    delete copy.dateOfBirth;
                    delete copy.dob;
                    delete copy.assessment_no;
                    delete copy.assessmentNo;
                    delete copy.assessment_number;
                    delete copy.assessmentNumber;
                    delete copy.full_name;
                    delete copy.fullName;
                    delete copy.name;
                    delete copy.gender;
                    delete copy.grade_level;
                    delete copy.gradeLevel;
                    delete copy.stream;
                    delete copy.parent_name;
                    delete copy.parentName;
                    delete copy.guardian_name;
                    delete copy.guardianName;
                    delete copy.parent_phone;
                    delete copy.parentPhone;
                    delete copy.parent_email;
                    delete copy.parentEmail;
                    delete copy.boarding_status;
                    delete copy.boardingStatus;
                    delete copy.upi;
                    delete copy.upi_number;
                    delete copy.upiNumber;
                    delete copy.kcpe_score;
                    delete copy.kcpeScore;
                    delete copy.birth_certificate_no;
                    delete copy.birthCertificateNo;
                    delete copy.nemis_number;
                    delete copy.nemisNumber;
                    delete copy.subjects;

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
            } else if (moduleName === 'student_enrollments') {
                const cleanEnrollmentRecord = (item: any) => {
                    if (!item || typeof item !== 'object') return item;
                    const copy = { ...item };
                    if (copy.leadershipPosition && !copy.leadership_position) copy.leadership_position = copy.leadershipPosition;
                    if (copy.leadership_position && !copy.leadershipPosition) copy.leadershipPosition = copy.leadership_position;
                    if (copy.dateOfBirth && !copy.date_of_birth) copy.date_of_birth = copy.dateOfBirth;
                    if (copy.assessmentNo && !copy.assessment_no) copy.assessment_no = copy.assessmentNo;
                    if (copy.admissionNumber && !copy.admission_number) copy.admission_number = copy.admissionNumber;
                    if (copy.enrollmentType && !copy.enrollment_type) copy.enrollment_type = copy.enrollmentType;
                    if (copy.enrollmentDate && !copy.enrollment_date) copy.enrollment_date = copy.enrollmentDate;
                    if (copy.institutionId && !copy.institution_id) copy.institution_id = copy.institutionId;
                    if (copy.userId && !copy.user_id) copy.user_id = copy.userId;
                    return copy;
                };
                currentPayload = Array.isArray(currentPayload) ? currentPayload.map(cleanEnrollmentRecord) : cleanEnrollmentRecord(currentPayload);
            }

            if (moduleName === 'school_remedial_rate_settings') {
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

            let data: any = null;
            let error: any = null;
            let maxRetries = 15;
            let tableSupportsMetadata = TABLES_WITH_METADATA.has(targetDbTable);

            while (maxRetries >= 0) {
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
                    console.warn(`[api/records] Foreign key constraint note on [${moduleName}]: nulling relational IDs and retrying...`);
                    const nullifyFKs = (item: any) => {
                        if (!item || typeof item !== 'object') return item;
                        const copy = { ...item };
                        ['patient_id', 'doctor_id', 'student_id', 'parent_id', 'driver_id', 'assistant_id', 'instructor_id', 'vehicle_id', 'room_id', 'category_id', 'invoice_id', 'host_id', 'user_id', 'created_by'].forEach(k => {
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
                    supabase.from('institution_module_states').upsert({
                        id: `${instId}_school_remedial_rate_settings`,
                        institution_id: instId,
                        module_id: 'school_remedial_rate_settings',
                        status: 'active',
                        data: savedItem,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' }).then(() => {}).catch(() => {});
                }
            }

            if (moduleName === 'ds_settings') {
                console.log(`[API POST DEBUG] ds_settings upsert:`, { success: !error, count: data?.length, error, payload: JSON.stringify(recordWithTenancy) });
            }
            if (error) {
                const message = (error.message || '').toLowerCase();
                const isUniqueViolation = error.code === '23505' || String(error.code) === '23505' || message.includes('unique constraint') || message.includes('duplicate key');
                
                if (isUniqueViolation) {
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
                                       error.code === '22P02' ||
                                       message.includes('schema cache') || 
                                       message.includes('column') ||
                                       message.includes('does not exist') ||
                                       message.includes('foreign key') ||
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
                    const meta = { ...(copy.metadata || {}) };

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
                    const pPhone = copy.parent_phone || copy.parentPhone;
                    if (pPhone) {
                        meta.parentPhone = pPhone;
                    }
                    const sPhone = copy.student_phone || copy.studentPhone;
                    if (sPhone) {
                        meta.studentPhone = sPhone;
                    }
                    copy.metadata = meta;

                    delete copy.vehicle_id;
                    delete copy.vehicleId;
                    delete copy.assigned_vehicle_id;
                    delete copy.assignedVehicleId;
                    delete copy.driver_type;
                    delete copy.driverType;
                    delete copy.parent_phone2;
                    delete copy.parentPhone2;
                    delete copy.secondary_phone;
                    delete copy.secondaryPhone;
                    delete copy.guardian_phone2;
                    delete copy.guardianPhone2;
                    delete copy.parent_phone_number2;
                    delete copy.secondary_parent_phone;
                    delete copy.student_phone;
                    delete copy.studentPhone;
                    delete copy.parent_name;
                    delete copy.parentName;
                    delete copy.guardian_name;
                    delete copy.guardianName;
                    delete copy.parent_phone;
                    delete copy.parentPhone;

                    currentUpdateData = copy;
                }

                if (moduleName === 'student_enrollments' && currentUpdateData && typeof currentUpdateData === 'object') {
                    const copy = { ...currentUpdateData };
                    const meta = { ...(copy.metadata || {}) };

                    const dobVal = copy.date_of_birth || copy.dateOfBirth || copy.dob;
                    if (dobVal) {
                        meta.dateOfBirth = dobVal;
                        meta.dob = dobVal;
                    }
                    const assVal = copy.assessment_no || copy.assessmentNo || copy.assessment_number || copy.assessmentNumber;
                    if (assVal) {
                        meta.assessmentNo = assVal;
                        meta.assessmentNumber = assVal;
                    }
                    const nameVal = copy.full_name || copy.fullName || copy.name;
                    if (nameVal && !meta.fullName) meta.fullName = nameVal;

                    const genderVal = copy.gender;
                    if (genderVal && !meta.gender) meta.gender = genderVal;

                    const gradeVal = copy.grade_level || copy.gradeLevel;
                    if (gradeVal && !meta.gradeLevel) meta.gradeLevel = gradeVal;

                    const streamVal = copy.stream;
                    if (streamVal && !meta.stream) meta.stream = streamVal;

                    copy.metadata = meta;

                    // Strip virtual / non-column attributes to prevent schema cache stale warnings & retries
                    delete copy.date_of_birth;
                    delete copy.dateOfBirth;
                    delete copy.dob;
                    delete copy.assessment_no;
                    delete copy.assessmentNo;
                    delete copy.assessment_number;
                    delete copy.assessmentNumber;
                    delete copy.full_name;
                    delete copy.fullName;
                    delete copy.name;
                    delete copy.gender;
                    delete copy.grade_level;
                    delete copy.gradeLevel;
                    delete copy.stream;
                    delete copy.parent_name;
                    delete copy.parentName;
                    delete copy.guardian_name;
                    delete copy.guardianName;
                    delete copy.parent_phone;
                    delete copy.parentPhone;
                    delete copy.parent_email;
                    delete copy.parentEmail;
                    delete copy.boarding_status;
                    delete copy.boardingStatus;
                    delete copy.upi;
                    delete copy.upi_number;
                    delete copy.upiNumber;
                    delete copy.kcpe_score;
                    delete copy.kcpeScore;
                    delete copy.birth_certificate_no;
                    delete copy.birthCertificateNo;
                    delete copy.nemis_number;
                    delete copy.nemisNumber;
                    delete copy.subjects;

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
                }
                let data: any = null;
                let error: any = null;
                let patchRetries = 15;
                let patchTableSupportsMetadata = TABLES_WITH_METADATA.has(targetDbTable);

                while (patchRetries >= 0) {
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
                                           error.code === '22P02' ||
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
