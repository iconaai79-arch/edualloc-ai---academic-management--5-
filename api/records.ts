import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createServerClient(req.headers.authorization);
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    const { module, id, institutionId } = req.query;

    if (!module) return res.status(400).json({ error: 'Module parameter required' });

    if (req.method === 'GET') {
        let query = supabase.from(module as string).select('*');
        if (institutionId) {
            // FIXED: If the module is 'institutions', filter by 'id'
            const filterCol = module === 'institutions' ? 'id' : 'institution_id';
            query = query.eq(filterCol, institutionId);
        }
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }

    if (req.method === 'POST') {
        const { data: recordData } = req.body;
        const { data, error } = await supabase.from(module as string).upsert(recordData).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }

    if (req.method === 'PATCH') {
        const { id: recordId, ...updates } = req.body;
        const { data, error } = await supabase.from(module as string).update(updates).eq('id', recordId).select();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data[0]);
    }

    if (req.method === 'DELETE') {
        if (!id) return res.status(400).json({ error: 'ID required for deletion' });
        const { error } = await supabase.from(module as string).delete().eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
