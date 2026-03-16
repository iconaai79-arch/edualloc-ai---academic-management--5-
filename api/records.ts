import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';
import { getAuthenticatedUser } from '../lib/auth-server';

const PUBLIC_MODULES = ['users', 'institutions', 'counties', 'system_settings'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { module, id, select, order, limit, institutionId: queryInstitutionId } = req.query;
    console.log(`[API Records] ${req.method} request for module: ${module}`);

    try {
        const supabase = createServiceClient();
        if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

        // JWT Validation & Institution Derivation
        const user = await getAuthenticatedUser(supabase, req.headers.authorization);
        
        // Check if it's a public read request
        const isPublicGet = req.method === 'GET' && PUBLIC_MODULES.includes(module as string);

        if (!user && !isPublicGet) {
            return res.status(401).json({ error: 'Unauthorized: Invalid session' });
        }

        const institutionId = user?.institutionId;

        if (!module) return res.status(400).json({ error: 'Module parameter required' });

        if (req.method === 'GET') {
            const getQuery = async (columns: string) => {
                const tableName = (module as string) || '';
                let q = supabase.from(tableName).select(columns);
                
                // Enforce primary tenancy / role filters
                if (user?.role === 'super_admin') {
                    if (queryInstitutionId) {
                        const filterCol = tableName === 'institutions' ? 'id' : 'institution_id';
                        q = q.eq(filterCol, queryInstitutionId);
                    }
                } else if (isPublicGet && !user) {
                    if (queryInstitutionId) {
                        const filterCol = tableName === 'institutions' ? 'id' : 'institution_id';
                        q = q.eq(filterCol, queryInstitutionId);
                    }
                    if (!limit) q = q.limit(100); 
                } else if (user) {
                    const { institutionId } = user;
                    if (tableName === 'institutions') {
                        q = q.eq('id', institutionId);
                    } else {
                        q = q.eq('institution_id', institutionId);
                    }
                }

                // Handle 'id' parameter explicitly if present (since it's common and reserved)
                if (id) {
                    q = q.eq('id', Array.isArray(id) ? id[0] : id);
                }

                // Generic Query Param Filtering
                const reserved = ['module', 'id', 'select', 'order', 'limit', 'institutionId'];
                Object.entries(req.query).forEach(([key, val]) => {
                    if (!reserved.includes(key) && val) {
                        try {
                            const value = Array.isArray(val) ? val[0] : val;
                            if (value && typeof value === 'string') {
                                q = q.eq(key, value);
                            }
                        } catch (e) {
                            console.warn(`[API Records] Filter failure for ${key}:`, e);
                        }
                    }
                });

                if (order && typeof order === 'string') {
                    const parts = order.split('.');
                    const column = parts[0];
                    const direction = parts[1] || 'asc';
                    q = q.order(column, { ascending: direction !== 'desc' });
                }
                
                if (limit) {
                    const parsedLimit = parseInt(Array.isArray(limit) ? limit[0] : (limit as string));
                    if (!isNaN(parsedLimit)) {
                        q = q.limit(parsedLimit);
                    }
                }
                return await q;
            };

            // Determine select columns
            let selectString = (select as string) || '*';
            const table = (module as string);
            if (isPublicGet && !user && !select) {
                if (table === 'users') {
                    // Password returned temporarily to allow discovery-phase login verification;
                    // In a production environment, this should be moved to a secure RPC or auth endpoint.
                    selectString = 'id, name, email, role, roles, institution_id, phone_number, password';
                } else if (table === 'institutions') {
                    selectString = 'id, name, logo_url, institution_type, is_otp_enabled, status, phone_number, institution_code, business_sub_type, trial_ends_at, subscription_ends_at';
                }
            }

            try {
                let { data, error } = await getQuery(selectString);

                // Fallback for column errors (e.g. column added in migration not yet detected)
                if (error && error.code === '42703' && selectString !== '*') {
                    console.warn(`[API Records] Column mismatch in [${table}], falling back to '*':`, error.message);
                    const retry = await getQuery('*');
                    data = retry.data;
                    error = retry.error;
                }

                if (error) {
                    console.error(`[API Records] GET Error [${table}]:`, error);
                    return res.status(500).json({ 
                        success: false,
                        error: `Database Error [${table}]: ${error.message}`,
                        code: error.code
                    });
                }
                return res.status(200).json(data || []);
            } catch (innerErr: any) {
                console.error(`[API Records] Internal GET Failure [${table}]:`, innerErr);
                return res.status(500).json({ success: false, error: innerErr.message });
            }
        }

        if (req.method === 'POST') {
            const { data: recordData } = req.body;

            // Enforce institutionId parity on POST unless super_admin
            const secureData = user?.role === 'super_admin' 
                ? recordData 
                : (Array.isArray(recordData) 
                    ? recordData.map(r => ({ ...r, institution_id: institutionId }))
                    : { ...recordData, institution_id: institutionId });

            // Special case: if user is not super_admin, they can only upsert records for their institution
            if (module === 'institutions' && user?.role !== 'super_admin') {
                return res.status(403).json({ error: 'Forbidden: Unauthorized to modify institution details' });
            }

            const { data, error } = await supabase.from(module as string).upsert(secureData).select();
            if (error) {
                console.error(`[API Records] POST Error [${module}]:`, error);
                return res.status(500).json({ error: `Save Error: ${error.message}` });
            }
            return res.status(200).json(data[0]);
        }

        if (req.method === 'PATCH') {
            const { id: recordId, ...updates } = req.body;

            // Verify ownership before update
            const { data: existing, error: fetchError } = await supabase
                .from(module as string)
                .select('institution_id')
                .eq('id', recordId)
                .single();

            if (fetchError || !existing || existing.institution_id !== institutionId) {
                if (user?.role !== 'super_admin') {
                    return res.status(403).json({ error: 'Forbidden: Access denied to this record' });
                }
            }

            const { data, error } = await supabase.from(module as string).update(updates).eq('id', recordId).select();
            if (error) {
                console.error(`[API Records] PATCH Error [${module}]:`, error);
                return res.status(500).json({ error: `Update Error: ${error.message}` });
            }
            return res.status(200).json(data[0]);
        }

        if (req.method === 'DELETE') {
            if (!id) return res.status(400).json({ error: 'ID required for deletion' });

            // Verify ownership before delete
            const { data: existing, error: fetchError } = await supabase
                .from(module as string)
                .select('institution_id')
                .eq('id', id)
                .single();

            if (fetchError || !existing || existing.institution_id !== institutionId) {
                if (user?.role !== 'super_admin') {
                    return res.status(403).json({ error: 'Forbidden: Access denied to this record' });
                }
            }

            const { error } = await supabase.from(module as string).delete().eq('id', id);
            if (error) {
                console.error(`[API Records] DELETE Error [${module}]:`, error);
                return res.status(500).json({ error: `Delete Error: ${error.message}` });
            }
            return res.status(200).json({ success: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error(`[API Records] Critical Failure:`, err);
        return res.status(500).json({ 
            error: 'Internal Server Error', 
            message: err.message 
        });
    }
}
