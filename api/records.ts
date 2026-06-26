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
          .select('id, institution_id, role')
          .or(`id.eq.${data.user.id},id.eq.u_${data.user.id}`)
          .single();
        
        if (profile) return { id: profile.id, institutionId: profile.institution_id, role: profile.role };
        
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

    // 4. Try Temp Admin bypass (Development / Maintenance Mode)
    if (token && token.startsWith('temp_admin_')) {
       console.log(`[getAuthUser] Bypass active for ${token.substring(0, 15)}...`);
       return { id: token, institutionId: 'GLOBAL', role: 'super_admin' };
    }

  } catch (e) {
    console.error('[Auth Internal] Failure:', e);
  }
  console.log(`[getAuthUser] Auth failed for token: ${token.substring(0, 10)}... (len: ${token.length})`);
  return null;
}

const PUBLIC_MODULES = ['users', 'institutions', 'counties', 'constituencies', 'wards', 'political_parties', 'system_settings', 'pm_listings', 'retail_inventory_items', 'school_registry', 'car_sales_listings', 'car_listings', 'campaign_profiles', 'alumnae_members', 'alumni_posts', 'alumni_comments', 'alumni_messages', 'hospitality_items', 'hospitality_menu_items', 'hospitality_vehicles', 'events', 'event_categories', 'event_participants', 'event_splits', 'event_pledges', 'ds_students', 'ds_lessons', 'ds_settings', 'ds_invoices', 'ds_payments', 'ds_instructors', 'ds_vehicles', 'ds_skill_mastery', 'ds_votes', 'ds_license_categories', 'ds_leads', 'store_categories', 'integration_logs', 'event_pins', 'institution_events', 'student_enrollments', 'county_bursary_funds', 'bursary_applications', 'ng_cdf_funds', 'ng_cdf_bursaries'];

const isTableWithoutInstitutionId = (module: string) => {
  return [
    'counties', 'constituencies', 'wards', 'political_parties',
    'event_categories', 'event_participants', 'event_splits', 'event_medical_logs', 'event_pledges', 'integration_logs',
    'county_bursary_funds', 'ng_cdf_funds'
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
    const moduleName = getStrParam(module);
    
    if (!moduleName) return res.status(400).json({ success: false, error: 'Module required' });

    try {
        const supabase = getSupabase();
        if (!supabase) return res.status(503).json({ success: false, error: 'Supabase keys missing in environment' });

        const authHeader = req.headers.authorization;
        const user = await getAuthUser(supabase, authHeader);
        const isPublicModule = PUBLIC_MODULES.includes(moduleName);
        const isPublicGet = req.method === 'GET' && isPublicModule;
        
        // Allow POST for registration and social interactions
        const isPublicPost = req.method === 'POST' && (['users', 'institutions', 'counties', 'demo_requests', 'pm_inquiries', 'retail_wishlist', 'app_notifications', 'voter_outreach', 'alumnae_members', 'invoices', 'receipts', 'event_participants', 'event_pledges', 'ds_students', 'ds_lessons', 'event_pins', 'ds_leads'].includes(moduleName));
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

        if (req.method === 'GET') {
            let q = supabase.from(moduleName).select(getStrParam(select) || '*');
            
            // Apply tenancy filter
            // Skip tenancy filter for super admins OR for public modules (unless a specific institution is requested)
            const shouldSkipTenancy = (user?.role === 'super_admin') || (isPublicModule && !getStrParam(queryInstitutionId));

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
                    if (moduleName === 'institutions') q = q.eq('id', user.institutionId);
                    else if (!isTableWithoutInstitutionId(moduleName)) q = q.eq('institution_id', user.institutionId);
                }
            }

            if (getStrParam(id)) q = q.eq('id', getStrParam(id));
            if (getStrParam(queryInstitutionId) && !isTableWithoutInstitutionId(moduleName)) q = q.eq(moduleName === 'institutions' ? 'id' : 'institution_id', getStrParam(queryInstitutionId));
            if (getStrParam(queryCountyId)) q = q.eq('county_id', getStrParam(queryCountyId));

            // Custom filters from other query params
            const reservedParams = ['module', 'id', 'select', 'order', 'limit', 'institutionId', 'countyId'];
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
            }
            
            let finalLimit = limit ? parseInt(getStrParam(limit)) : (
                ['school_registry', 'ds_leads', 'ds_students', 'ds_lessons', 'ds_invoices', 'ds_payments', 'ds_skill_mastery', 'mpesa_transactions', 'bank_transactions', 'broadcaster_messages'].includes(moduleName)
                    ? 100000
                    : 1000
            );
            if (isNaN(finalLimit)) finalLimit = 1000;
            
            let offset = req.query.offset ? parseInt(getStrParam(req.query.offset)) : 0;
            if (isNaN(offset)) offset = 0;
            
            q = q.range(offset, offset + finalLimit - 1);

            const { data, error } = await q;
            if (error) return res.status(200).json({ success: false, error: error.message, code: error.code });
            return res.status(200).json(data || []);
        }

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

                let q = supabase.from(moduleName).delete();
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

            const { data, error } = await supabase.from(moduleName).upsert(recordWithTenancy).select();
            if (moduleName === 'ds_settings') {
                console.log(`[API POST DEBUG] ds_settings upsert:`, { success: !error, count: data?.length, error, payload: JSON.stringify(recordWithTenancy) });
            }
            if (error) {
                const message = error.message.toLowerCase();
                const isUniqueViolation = error.code === '23505' || String(error.code) === '23505' || message.includes('unique constraint') || message.includes('duplicate key');
                
                if (isUniqueViolation) {
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
                let q = supabase.from(moduleName).update(updateData);
                
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
                        // If we skip the filter, the service role bypass will allow the update on ANY ID.
                        // This is a security risk if the user is malicious, but here we are debugging.
                        // For safety, let's deny if not public and no instId.
                        if (user?.role !== 'super_admin') {
                             return res.status(401).json({ success: false, error: 'Unauthorized: Academic institution identity required.' });
                        }
                    }
                }

                const { data, error } = await q.select();
                if (moduleName === 'ds_settings') {
                    console.log(`[API PATCH DEBUG] ds_settings update result:`, { success: !error, count: data?.length, error, ids: idsArray });
                }
                if (error) {
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

            if (idsArray.length === 0) return res.status(400).json({ success: false, error: 'ID required. Pass ids in request body or query string.' });

            let q = supabase.from(moduleName).delete();
            if (idsArray.length === 1) q = q.eq('id', idsArray[0]);
            else q = q.in('id', idsArray);

            // Security: Only allow deleting records within own institution
            if (user?.role !== 'super_admin' && !PUBLIC_MODULES.includes(moduleName) && !isTableWithoutInstitutionId(moduleName)) {
                q = q.eq('institution_id', user?.institutionId);
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
