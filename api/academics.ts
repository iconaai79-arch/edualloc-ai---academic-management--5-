import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createServerClient();
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    if (req.method === 'GET') {
        const { institutionId, type } = req.query;
        if (!type) return res.status(400).json({ error: 'Type required' });
        let query = supabase.from(type as string).select('*');
        if (institutionId) query = query.eq('institution_id', institutionId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
}