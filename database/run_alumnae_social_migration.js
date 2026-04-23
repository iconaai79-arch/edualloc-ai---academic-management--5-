
import pkg from 'pg';
const { Client } = pkg;
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Manual .env.local parser to avoid dependency issues
function loadEnv() {
    const envPath = join(process.cwd(), '.env.local');
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                process.env[key] = value;
            }
        });
    }
}

loadEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
    // Hardcoded path to the new migration
    const migrationPath = join(process.cwd(), 'migrations', '20260424_alumnae_social.sql');

    console.log(`🚀 Alumnae Social Migration Executor\n`);

    if (!existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    const connectionString =
        process.env.SUPABASE_DB_URL ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL;

    if (!connectionString) {
        console.error('❌ ERROR: Database connection string not found!\n');
        process.exit(1);
    }

    const client = new Client({ connectionString });

    try {
        console.log('🔍 Connecting...');
        await client.connect();
        console.log('✅ Connected\n');

        const sql = readFileSync(migrationPath, 'utf-8');
        await client.query(sql);
        console.log('✨ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration().catch(console.error);
