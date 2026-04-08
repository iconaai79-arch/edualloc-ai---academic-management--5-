import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const body = req.body || {};
        const action = body.action || req.query.action;
        
        console.log(`[Integrations Debug] Received action: ${action}`);
        
        return res.status(200).json({ 
            success: true, 
            message: 'Bridge is ONLINE (Debug Mode)', 
            action,
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        return res.status(500).json({ success: false, message: e.message });
    }
}
