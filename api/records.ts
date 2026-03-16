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
            let query = supabase.from(module as string).select(select as string || '*');

            // Always filter by institution_id based on session context if available
            if (user?.role === 'super_admin') {
                // Super admins see everything
                if (queryInstitutionId) {
                    const filterCol = module === 'institutions' ? 'id' : 'institution_id';
                    query = query.eq(filterCol, queryInstitutionId);
                }
            } else if (isPublicGet && !user) {
                // Public unauthenticated request - allow respect of query institutionId if provided
                if (queryInstitutionId) {
                    const filterCol = module === 'institutions' ? 'id' : 'institution_id';
                    query = query.eq(filterCol, queryInstitutionId);
                } else {
                    // Prevent over-fetching on public unauthenticated requests while ensuring stability (Vercel payload limits)
                    // Reduced from 2000 to 500 to prevent payload/timeout issues on login
                    query = query.limit(500);
                }

                if (isPublicGet && !user && !req.query.select) {
                    // Only fetch essential columns for public listings if not specified
                    if (module === 'institutions') {
                        query = query.select('id, name, logo_url, status, type');
                    } else if (module === 'users') {
                        // Only fetch columns needed for client-side authentication to keep payload small
                        query = query.select('id, email, phone, phone_number, password, role, institution_id, status');
                    }
                }
            } else if (user) {
                // Regular users can only see THEIR institution
                const { institutionId } = user;
                if (module === 'institutions') {
                    query = query.eq('id', institutionId);
                } else {
                    // For all other tables, enforce institution_id filter
                    query = query.eq('institution_id', institutionId);
                }
            }

            if (order) {
                const [column, direction] = (order as string).split('.');
                query = query.order(column, { ascending: direction !== 'desc' });
            }
            
            if (limit) {
                query = query.limit(parseInt(limit as string));
            }

            const { data, error } = await query;
            if (error) {
                console.error(`[API Records] GET Error [${module}]:`, error);
                return res.status(500).json({ error: 'Failed to fetch records. Internal server error.' });
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
                return res.status(500).json({ error: 'Failed to save record. Internal server error.' });
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
                return res.status(500).json({ error: 'Failed to update record. Internal server error.' });
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
                return res.status(500).json({ error: 'Failed to delete record. Internal server error.' });
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
