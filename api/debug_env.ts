import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.status(200).json({
        SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
        DATABASE_URL: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL,
        NODE_ENV: process.env.NODE_ENV
    });
}
