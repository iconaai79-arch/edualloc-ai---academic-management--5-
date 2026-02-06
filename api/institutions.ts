import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    if (req.method === 'GET') {
        const { data, error } = await supabase.from('institutions').select('*');
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const instData = req.body;
        const { data, error } = await supabase.from('institutions').upsert(instData).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
}