import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServerClient } from '../lib/supabase';
import pkg from 'pg';
const { Pool } = pkg;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const supabase = createServerClient(req.headers.authorization);
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
            return res.status(200).json({
                success: true,
                message: "Migration script received. Please run this SQL in your Supabase SQL Editor to initialize the schema."
            });
        }

        if (action === 'execute_sql') {
            const { sql } = req.body;
            if (!sql) return res.status(400).json({ error: 'SQL query required' });

            // Connection string validation
            const connectionString = 
                process.env.DATABASE_URL || 
                process.env.POSTGRES_URL || 
                process.env.VITE_DATABASE_URL ||
                process.env.SUPABASE_DB_URL; // Reordered to prioritize common ones, VITE_DATABASE_URL is now explicitly checked earlier

            if (!connectionString) {
                return res.status(500).json({
                    success: false,
                    error: "Database connection string missing.",
                    message: "Please add DATABASE_URL to your .env.local file to enable direct SQL execution.",
                    hint: "Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
                });
            }

            const pool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 10000 // 10s timeout
            });

            let client;
            try {
                client = await pool.connect();
                const result = await client.query(sql);
                return res.status(200).json({
                    success: true,
                    data: result.rows,
                    command: result.command,
                    rowCount: result.rowCount
                });
            } catch (err: any) {
                console.error("[SQL Engine Error]:", err);
                return res.status(500).json({
                    success: false,
                    error: err.message || "SQL Execution Error",
                    detail: err.detail,
                    hint: err.hint || "Check your SQL syntax and database connection string."
                });
            } finally {
                if (client) client.release();
                await pool.end(); // Clear the pool for this request to avoid leaks in serverless/Vite context
            }
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}