import { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: 'SQL script is required' });

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) return res.status(500).json({ error: 'DATABASE_URL environment variable is missing on server.' });

    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });

    try {
        await client.connect();
        const statements = sql.split(/;\s*$/m).map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        let executedCount = 0;
        for (const statement of statements) {
            await client.query(statement);
            executedCount++;
        }
        await client.end();
        return res.status(200).json({ success: true, message: `Executed ${executedCount} SQL statements successfully.` });
    } catch (error: any) {
        try { await client.end(); } catch (e) {}
        return res.status(500).json({ success: false, error: error.message || 'Database error occurred.', detail: error.detail });
    }
}