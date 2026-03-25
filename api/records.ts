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
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  console.log(`[getAuthUser] Debug: token length ${token.length}, startsWith ${token.substring(0, 10)}...`);

  try {
    // 1. Try JWT
    if (token.includes('.') && token.split('.').length === 3) {
      const { data, error: authErr } = await supabase.auth.getUser(token);
      if (authErr) console.error('[Auth JWT Error]', authErr.message);
      if (data?.user) {
        const { data: profile } = await supabase.from('users').select('id, institution_id, role').eq('id', data.user.id).single();
        if (profile) return { id: profile.id, institutionId: profile.institution_id, role: profile.role };
        
        return { 
          id: data.user.id, 
          institutionId: (data.user.user_metadata as any)?.institutionId || 'GUEST', 
          role: (data.user.user_metadata as any)?.role || 'guest' 
        };
      }
    }
    // 2. Try User ID fallback (Less restrictive: any non-JWT token)
    const { data: profile, error: dbErr } = await supabase.from('users').select('id, institution_id, role').eq('id', token).single();
    if (dbErr) {
        // Only log if it's not a "not found" error to avoid spam
        if (dbErr.code !== 'PGRST116') console.error('[Auth DB Error]', dbErr.message);
    }
    if (profile) return { id: profile.id, institutionId: profile.institution_id, role: profile.role };

  } catch (e) {
    console.error('[Auth Internal] Failure:', e);
  }
  console.log(`[getAuthUser] Auth failed for token: ${token.substring(0, 10)}...`);
  return null;
}

const PUBLIC_MODULES = ['users', 'institutions', 'counties', 'system_settings', 'pm_listings', 'retail_inventory_items'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { module, id, select, order, limit, institutionId: queryInstitutionId } = req.query;
    const getStrParam = (p: any): string => (Array.isArray(p) ? p[0] : (p as string) || '');
    const moduleName = getStrParam(module);
    
    if (!moduleName) return res.status(400).json({ success: false, error: 'Module required' });

    try {
        const supabase = getSupabase();
        if (!supabase) return res.status(500).json({ success: false, error: 'Supabase keys missing in environment' });

        const authHeader = req.headers.authorization;
        const user = await getAuthUser(supabase, authHeader);
        const isPublicModule = PUBLIC_MODULES.includes(moduleName);
        const isPublicGet = req.method === 'GET' && isPublicModule;
        const isRegistration = req.method === 'POST' && (['users', 'institutions', 'counties', 'demo_requests'].includes(moduleName));
        
        if (!user && !isPublicGet && !isRegistration) {
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
                const isCounty = user.role.startsWith('county_');
                if (isCounty) {
                    if (moduleName === 'counties') q = q.eq('id', user.institutionId);
                    else if (moduleName === 'institutions') q = q.eq('county_id', user.institutionId);
                    else q = q.eq('county_id', user.institutionId);
                } else {
                    if (moduleName === 'institutions') q = q.eq('id', user.institutionId);
                    else if (moduleName !== 'counties') q = q.eq('institution_id', user.institutionId);
                }
            }

            if (getStrParam(id)) q = q.eq('id', getStrParam(id));
            if (getStrParam(queryInstitutionId)) q = q.eq(moduleName === 'institutions' ? 'id' : 'institution_id', getStrParam(queryInstitutionId));

            if (order && typeof order === 'string') {
                const [col, dir] = order.split('.');
                q = q.order(col, { ascending: dir !== 'desc' });
            }
            if (limit) q = q.limit(parseInt(getStrParam(limit)));

            const { data, error } = await q;
            if (error) return res.status(200).json({ success: false, error: error.message });
            return res.status(200).json(data || []);
        }

        if (req.method === 'POST') {
            const { data: recordData } = req.body || {};
            if (!recordData) return res.status(400).json({ success: false, error: 'No data' });
            
            // Add tenancy if missing (skip for root tables that don't have this column)
            const skipTenancy = moduleName === 'institutions' || moduleName === 'counties';
            const recordWithTenancy = Array.isArray(recordData) 
                ? recordData.map(r => ({ ...r, ...(skipTenancy ? {} : { institution_id: r.institution_id || user?.institutionId }) }))
                : { ...recordData, ...(skipTenancy ? {} : { institution_id: recordData.institution_id || user?.institutionId }) };

            const { data, error } = await supabase.from(moduleName).upsert(recordWithTenancy).select();
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
                return res.status(500).json({ success: false, error: error.message });
            }
            
            // Return entire array for bulk, first element for single
            if (Array.isArray(recordData)) {
                return res.status(200).json(data || { success: true });
            }
            return res.status(200).json(data?.[0] || { success: true });
        }

        return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err: any) {
        console.error('[API Records] Crash:', err);
        return res.status(500).json({ success: false, error: 'Server Error', message: err.message });
    }
}
