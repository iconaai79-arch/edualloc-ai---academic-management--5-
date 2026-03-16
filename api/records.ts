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
                let q = supabase.from(module as string).select(columns);
                
                // Enforce filters
                if (user?.role === 'super_admin') {
                    if (queryInstitutionId) {
                        const filterCol = module === 'institutions' ? 'id' : 'institution_id';
                        q = q.eq(filterCol, queryInstitutionId);
                    }
                } else if (isPublicGet && !user) {
                    if (queryInstitutionId) {
                        const filterCol = module === 'institutions' ? 'id' : 'institution_id';
                        q = q.eq(filterCol, queryInstitutionId);
                    }
                    if (!limit) q = q.limit(10000);
                } else if (user) {
                    const { institutionId } = user;
                    if (module === 'institutions') {
                        q = q.eq('id', institutionId);
                    } else {
                        q = q.eq('institution_id', institutionId);
                    }
                }

                if (order) {
                    const [column, direction] = (order as string).split('.');
                    q = q.order(column, { ascending: direction !== 'desc' });
                }
                
                if (limit) {
                    q = q.limit(parseInt(limit as string));
                }
                return await q;
            };

            // Determine select columns
            let selectString = (select as string) || '*';
            if (isPublicGet && !user && !select) {
                if (module === 'users') {
                    selectString = 'id, name, email, role, roles, institution_id, phone_number, password';
                } else if (module === 'institutions') {
                    selectString = 'id, name, logo_url, institution_type, is_otp_enabled, status, phone_number, institution_code, business_sub_type';
                }
            }

            let { data, error } = await getQuery(selectString);

            // Resilient Fallback: If specific columns fail (42703 - undefined_column), try with '*'
            if (error && error.code === '42703' && selectString !== '*') {
                console.warn(`[API Records] Column mismatch in [${module}], falling back to '*':`, error.message);
                const retry = await getQuery('*');
                data = retry.data;
                error = retry.error;
            }

            if (error) {
                console.error(`[API Records] GET Error [${module}]:`, error);
                return res.status(500).json({ 
                    error: `Database Error [${module}]: ${error.message}`,
                    code: error.code,
                    hint: error.hint || 'Ensure all required columns exist in your database schema.'
                });
            }
            return res.status(200).json(data);
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
