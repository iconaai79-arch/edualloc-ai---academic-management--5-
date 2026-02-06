import { VercelRequest, VercelResponse } from '@vercel/node';
import { createAuthenticatedClient } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createAuthenticatedClient(req.headers.authorization);
    if (!supabase) return res.status(500).json({ error: 'Database service unavailable' });

    const { action } = req.query;

    if (req.method === 'GET') {
        if (action === 'getSettings') {
            const { data, error } = await supabase.from('system_settings').select('data').eq('id', 1).single();
            if (error && error.code !== 'PGRST116') {
                return res.status(500).json({ error: error.message });
            }
            return res.status(200).json(data?.data || {});
        }
    }

    if (req.method === 'POST') {
        if (action === 'saveSettings') {
            const { settings } = req.body;
            const { error } = await supabase.from('system_settings').upsert({ id: 1, data: settings });
            if (error) return res.status(500).json({ error: error.message });
            return res.status(200).json({ success: true });
        }

        if (action === 'migrate') {
            const { sql } = req.body;
            // NOTE: Supabase client doesn't support raw SQL execution directly for security.
            // In a production app, you'd use a postgres client like 'pg' or a Supabase RPC function.
            // For this implementation, we return a mock success or guide the user.
            return res.status(200).json({
                success: true,
                message: "Migration script received. Please run this SQL in your Supabase SQL Editor to initialize the schema."
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}