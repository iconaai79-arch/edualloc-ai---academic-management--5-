import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    return res.status(200).json({
        status: 'ok',
        message: 'Debug endpoint reached',
        timestamp: new Date().toISOString(),
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('URL'))
    });
}
