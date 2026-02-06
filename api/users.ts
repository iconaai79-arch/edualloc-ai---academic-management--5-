import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    if (req.method === 'GET') {
        const { institutionId } = req.query;
        let query = supabase.from('users').select('*');
        if (institutionId) query = query.eq('institution_id', institutionId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const userData = req.body;
        const { data, error } = await supabase.from('users').upsert(userData).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}