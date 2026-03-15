import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServiceClient } from '../lib/supabase';
import pkg from 'pg';
const { Pool } = pkg;

// Diagnostic helper
const getEnvInfo = () => ({
    hasSupabaseUrl: !!process.env.SUPABASE_URL || !!process.env.VITE_SUPABASE_URL,
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY || !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    hasDatabaseUrl: !!process.env.DATABASE_URL || !!process.env.VITE_DATABASE_URL || !!process.env.POSTGRES_URL,
    nodeEnv: process.env.NODE_ENV
});

// Unused getSupabaseClient removed in favor of createServiceClient

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log(`[System API] Request: ${req.method} ${req.url}`);
    
    try {
        const { action } = req.query;

        if (req.method === 'GET' && action === 'ping') {
            return res.status(200).json({ status: 'ok', env: getEnvInfo() });
        }

        const supabase = createServiceClient();
        if (!supabase) return res.status(500).json({ error: 'Database service unavailable - Missing keys', env: getEnvInfo() });

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

                const connectionString = 
                    process.env.DATABASE_URL || 
                    process.env.POSTGRES_URL || 
                    process.env.VITE_DATABASE_URL ||
                    process.env.SUPABASE_DB_URL;

                if (!connectionString) {
                    console.error("[SQL Engine] Missing connection string", getEnvInfo());
                    return res.status(500).json({
                        success: false,
                        error: "Database connection string missing.",
                        message: "Please add DATABASE_URL to your environment variables.",
                        env: getEnvInfo()
                    });
                }

                console.log("[SQL Engine] Initializing pool...");
                const pool = new Pool({
                    connectionString,
                    ssl: { rejectUnauthorized: false },
                    connectionTimeoutMillis: 15000 
                });

                let client;
                try {
                    console.log("[SQL Engine] Connecting to client...");
                    client = await pool.connect();
                    console.log("[SQL Engine] Executing query...");
                    const result = await client.query(sql);
                    console.log("[SQL Engine] Success!");
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
                        hint: err.hint,
                        env: getEnvInfo()
                    });
                } finally {
                    if (client) client.release();
                    await pool.end().catch(() => {});
                }
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
    } catch (globalErr: any) {
        console.error("[System API Critical Failure]:", globalErr);
        return res.status(500).json({ 
            error: "Internal Server Error", 
            message: globalErr.message,
            stack: globalErr.stack,
            env: getEnvInfo()
        });
    }
}