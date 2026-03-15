import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createServiceClient();
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    if (req.method === 'GET') {
        const { institutionId, type } = req.query;
        let table = type === 'semester' ? 'semesters' : 'academic_years';
        let query = supabase.from(table).select('*');
        if (institutionId) query = query.eq('institution_id', institutionId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }
    return res.status(405).json({ error: 'Method not allowed' });
}