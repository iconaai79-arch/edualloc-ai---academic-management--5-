import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';
import { getAuthenticatedUser } from '../lib/auth-server';

const PUBLIC_MODULES = ['users', 'institutions', 'counties', 'system_settings'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { module, id, select, order, limit, institutionId: queryInstitutionId } = req.query;
    console.log(`[API Records] ${req.method} request for module: ${module}`);

    const getStrParam = (p: any): string => (Array.isArray(p) ? p[0] : (p as string) || '');

    try {
        const supabase = createServiceClient();
        if (!supabase) return res.status(500).json({ success: false, error: 'Database service unavailable' });

        const moduleName = getStrParam(module);
        const recordId = getStrParam(id);
        const queryInstId = getStrParam(queryInstitutionId);
        
        if (!moduleName) return res.status(400).json({ success: false, error: 'Module parameter required' });

        // JWT Validation & Institution Derivation
        const user = await getAuthenticatedUser(supabase, req.headers.authorization);
        
        // Check if it's a public read request
        const isPublicGet = req.method === 'GET' && PUBLIC_MODULES.includes(moduleName);

        if (!user && !isPublicGet) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Invalid session' });
        }

        const institutionId = user?.institutionId;

        if (req.method === 'GET') {
            const getQuery = async (columns: string) => {
                let q = supabase.from(moduleName).select(columns);
                
                // Enforce primary tenancy / role filters
                if (user?.role === 'super_admin') {
                    if (queryInstId) {
                        const filterCol = moduleName === 'institutions' ? 'id' : 'institution_id';
                        q = q.eq(filterCol, queryInstId);
                    }
                } else if (isPublicGet && !user) {
                    if (queryInstId) {
                        const filterCol = moduleName === 'institutions' ? 'id' : 'institution_id';
                        q = q.eq(filterCol, queryInstId);
                    }
                    if (!limit) q = q.limit(100); 
                } else if (user) {
                    const instId = user.institutionId;
                    if (moduleName === 'institutions') {
                        q = q.eq('id', instId);
                    } else {
                        q = q.eq('institution_id', instId);
                    }
                }

                if (recordId) {
                    q = q.eq('id', recordId);
                }

                // Generic Query Param Filtering
                const reserved = ['module', 'id', 'select', 'order', 'limit', 'institutionId'];
                Object.entries(req.query).forEach(([key, val]) => {
                    if (!reserved.includes(key) && val) {
                        try {
                            const value = getStrParam(val);
                            if (value) q = q.eq(key, value);
                        } catch (e) {
                            console.warn(`[API Records] Filter failure for ${key}:`, e);
                        }
                    }
                });

                if (order && typeof order === 'string') {
                    const [column, direction] = order.split('.');
                    if (column) q = q.order(column, { ascending: direction !== 'desc' });
                }
                
                if (limit) {
                    const parsedLimit = parseInt(getStrParam(limit));
                    if (!isNaN(parsedLimit)) q = q.limit(parsedLimit);
                }
                return await q;
            };

            // Determine select columns
            let selectString = getStrParam(select) || '*';
            if (isPublicGet && !user && !select) {
                if (moduleName === 'users') {
                    selectString = 'id, name, email, role, roles, institution_id, phone_number, password';
                } else if (moduleName === 'institutions') {
                    selectString = 'id, name, logo_url, institution_type, is_otp_enabled, status, phone_number, institution_code, business_sub_type, trial_ends_at, subscription_ends_at';
                }
            }

            try {
                let { data, error } = await getQuery(selectString);

                // Fallback for column errors (42703 - undefined_column)
                if (error && error.code === '42703' && selectString !== '*') {
                    console.warn(`[API Records] Column mismatch in [${moduleName}], falling back to '*':`, error.message);
                    const retry = await getQuery('*');
                    data = retry.data;
                    error = retry.error;
                }

                if (error) {
                    console.error(`[API Records] GET Error [${moduleName}]:`, error);
                    return res.status(500).json({ 
                        success: false,
                        error: `Database Error [${moduleName}]: ${error.message}`,
                        code: error.code
                    });
                }
                return res.status(200).json(data || []);
            } catch (innerErr: any) {
                console.error(`[API Records] Internal GET Failure [${moduleName}]:`, innerErr);
                return res.status(500).json({ success: false, error: innerErr.message });
            }
        }

        if (req.method === 'POST') {
            const { data: recordData } = req.body || {};
            if (!recordData) return res.status(400).json({ success: false, error: 'Record data required' });

            const secureData = user?.role === 'super_admin' 
                ? recordData 
                : (Array.isArray(recordData) 
                    ? recordData.map((r: any) => ({ ...r, institution_id: institutionId }))
                    : { ...recordData, institution_id: institutionId });

            if (moduleName === 'institutions' && user?.role !== 'super_admin') {
                return res.status(403).json({ success: false, error: 'Forbidden: Unauthorized to modify institution details' });
            }

            const { data, error } = await supabase.from(moduleName).upsert(secureData).select();
            if (error) {
                console.error(`[API Records] POST Error [${moduleName}]:`, error);
                return res.status(500).json({ success: false, error: `Save Error: ${error.message}` });
            }
            return res.status(200).json(data?.[0] || { success: true });
        }

        if (req.method === 'PATCH') {
            const { id: targetId, ...updates } = req.body || {};
            if (!targetId) return res.status(400).json({ success: false, error: 'ID required for update' });

            // Verify ownership before update
            const { data: existing, error: fetchError } = await supabase
                .from(moduleName)
                .select('institution_id')
                .eq('id', targetId)
                .single();

            if (fetchError || !existing || existing.institution_id !== institutionId) {
                if (user?.role !== 'super_admin') {
                    return res.status(403).json({ success: false, error: 'Forbidden: Access denied to this record' });
                }
            }

            const { data, error } = await supabase.from(moduleName).update(updates).eq('id', targetId).select();
            if (error) {
                console.error(`[API Records] PATCH Error [${moduleName}]:`, error);
                return res.status(500).json({ success: false, error: `Update Error: ${error.message}` });
            }
            return res.status(200).json(data?.[0] || { success: true });
        }

        if (req.method === 'DELETE') {
            const targetId = recordId || req.body?.id;
            if (!targetId) return res.status(400).json({ success: false, error: 'ID required for deletion' });

            // Verify ownership
            const { data: existing, error: fetchError } = await supabase
                .from(moduleName)
                .select('institution_id')
                .eq('id', targetId)
                .single();

            if (fetchError || !existing || existing.institution_id !== institutionId) {
                if (user?.role !== 'super_admin') {
                    return res.status(403).json({ success: false, error: 'Forbidden: Access denied to delete this record' });
                }
            }

            const { error } = await supabase.from(moduleName).delete().eq('id', targetId);
            if (error) {
                console.error(`[API Records] DELETE Error [${moduleName}]:`, error);
                return res.status(500).json({ success: false, error: `Delete Error: ${error.message}` });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err: any) {
        console.error(`[API Records] Critical Failure:`, err);
        return res.status(500).json({ 
            success: false,
            error: 'Internal Server Error', 
            message: err?.message || 'Unexpected server failure'
        });
    }
}
