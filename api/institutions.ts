import { VercelRequest, VercelResponse } from '@vercel/node';
import { createAuthenticatedClient } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createAuthenticatedClient(req.headers.authorization);
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    try {
        if (req.method === 'GET') {
            const { id } = req.query;
            let query = supabase.from('institutions').select('*');

            if (id) {
                query = query.eq('id', id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return res.status(200).json(id && Array.isArray(data) ? data[0] : data);
        }

        if (req.method === 'POST') {
            const instData = req.body;
            if (!instData) return res.status(400).json({ error: 'Missing request body' });

            const { data, error } = await supabase.from('institutions').upsert(instData).select();
            if (error) throw error;
            return res.status(200).json(data ? data[0] : null);
        }

        if (req.method === 'DELETE') {
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