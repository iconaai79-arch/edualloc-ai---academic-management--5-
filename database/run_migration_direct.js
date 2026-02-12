import pkg from 'pg';
const { Client } = pkg;
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Manual .env.local parser to avoid dependency issues if dotenv is not installed
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

/**
 * Direct Database Migration Executor
 * 
 * Usage:
 * node database/run_migration_direct.js [migration_file_name]
 */

async function runMigration() {
    const fileArg = process.argv[2] || 'library_management_update.sql';
    const migrationPath = join(__dirname, fileArg);

    console.log(`🚀 Database Migration Executor: ${fileArg}\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    if (!existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    const connectionString =
        process.env.SUPABASE_DB_URL ||
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL;

    if (!connectionString) {
        console.error('❌ ERROR: Database connection string not found in environment variables!\n');
        console.log('Please set SUPABASE_DB_URL in your .env file.');
        console.log('Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres\n');
        process.exit(1);
    }

    const client = new Client({ connectionString });

    try {
        console.log('🔍 Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        const sql = readFileSync(migrationPath, 'utf-8');
        console.log(`📊 Executing SQL (${sql.length} characters)...`);

        await client.query(sql);
        console.log('✨ Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) console.error('Details:', error.detail);
        if (error.hint) console.error('Hint:', error.hint);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration().catch(console.error);

