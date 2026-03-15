import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';
import { getAuthenticatedUser } from '../lib/auth-server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createServiceClient();
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    // JWT Validation & Institution Derivation
    const authUser = await getAuthenticatedUser(supabase);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized' });

    try {
        if (req.method === 'GET') {
            const { id } = req.query;
            let query = supabase.from('institutions').select('*');

            // Regular users can only see their own institution
            if (authUser.role !== 'super_admin') {
                query = query.eq('id', authUser.institutionId);
            } else if (id) {
                query = query.eq('id', id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(id && Array.isArray(data) ? data[0] : data);
        }

        if (req.method === 'POST') {
            // Only super_admin can create or update institutions generally
            if (authUser.role !== 'super_admin') {
                // Allow regular admin to update THEIR OWN institution ONLY
                const instData = req.body;
                if (!instData || instData.id !== authUser.institutionId) {
                    return res.status(403).json({ error: 'Forbidden: You can only update your own institution' });
                }
            }

            const instData = req.body;
            if (!instData) return res.status(400).json({ error: 'Missing request body' });

            const { data, error } = await supabase.from('institutions').upsert(instData).select();
            if (error) throw error;
            return res.status(200).json(data ? data[0] : null);
        }

        if (req.method === 'DELETE') {
            // ONLY super_admin can delete institutions
            if (authUser.role !== 'super_admin') {
                return res.status(403).json({ error: 'Forbidden: Only super admins can delete institutions' });
            }

            const { id } = req.query;
            if (!id || Array.isArray(id)) return res.status(400).json({ error: 'Missing or invalid id parameter' });

            const { error } = await supabase.from('institutions').delete().eq('id', id);
            if (error) throw error;
            return res.status(200).json({ success: true, message: 'Institution deleted' });
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err: any) {
        console.error('API Error:', err);
        return res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
}