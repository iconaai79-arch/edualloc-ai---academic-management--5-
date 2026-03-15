import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';
import { getAuthenticatedUser } from '../lib/auth-server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createServiceClient();
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    // JWT Validation & Institution Derivation
    const authUser = await getAuthenticatedUser(supabase);
    if (!authUser) return res.status(401).json({ error: 'Unauthorized: Invalid session' });

    const { institutionId } = authUser;

    if (req.method === 'GET') {
        let query = supabase.from('users').select('*');

        // Super admin can see all users, others only their colleagues
        if (authUser.role !== 'super_admin') {
            query = query.eq('institution_id', institutionId);
        } else if (req.query.institutionId) {
            query = query.eq('institution_id', req.query.institutionId);
        }

        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const userData = req.body;

        // Enforce institutionId parity unless super_admin
        const secureData = authUser.role === 'super_admin'
            ? userData
            : { ...userData, institution_id: institutionId };

        const { data, error } = await supabase.from('users').upsert(secureData).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}