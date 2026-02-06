import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!supabase) {
        return res.status(200).json({
            success: false,
            status: 'offline',
            dbName: 'Local Storage Fallback',
            message: 'Supabase URL or Key missing in server environment.',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Attempt a simple ping to see if the project is reachable
        // Even if tables don't exist, this verifies the connection to Supabase itself
        const { error } = await supabase.from('institutions').select('id', { count: 'exact', head: true }).limit(1);
        
        const url = process.env.SUPABASE_URL || '';
        const dbName = url.replace('https://', '').split('.')[0] || 'supabase-instance';

        // Code 42P01 means "relation does not exist" - the connection works, but schema is missing
        if (error && error.code !== '42P01') throw error;

        return res.status(200).json({
            success: true,
            status: error?.code === '42P01' ? 'setup_required' : 'online',
            dbName: dbName,
            engine: 'PostgreSQL (Supabase)',
            message: error?.code === '42P01' ? 'Supabase connected. Schema initialization required.' : 'Connected to cloud cluster successfully.',
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        return res.status(500).json({
            success: false,
            status: 'offline',
            dbName: 'Local Storage Fallback',
            message: 'Cloud database unreachable.',
            error_detail: e.message
        });
    }
}