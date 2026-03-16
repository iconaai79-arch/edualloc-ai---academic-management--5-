import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    return res.status(200).json({
        status: 'online',
        timestamp: new Date().toISOString(),
        env: {
            hasUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
            hasAnonKey: !!process.env.SUPABASE_ANON_KEY || !!process.env.VITE_SUPABASE_ANON_KEY,
            hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV || 'local'
        },
        headers: req.headers
    });
}
