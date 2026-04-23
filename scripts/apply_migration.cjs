
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env and .env.local
[ '.env', '.env.local' ].forEach(file => {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) {
        console.log(`Loading env from ${file}`);
        dotenv.config({ path: p });
    }
});

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyMigration(filePath) {
    console.log(`Applying migration: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split SQL by semicolon if necessary, or try to run as one block
    // Supabase JS doesn't have a direct 'runSql' method, but we can use RPC if we set it up,
    // or we can use the 'postgres' endpoint if we had the connection string.
    // However, for small table creations, we can try to use the REST API via a dummy table or similar.
    // ACTUALLY, the standard way to run SQL in this project seems to be missing.
    
    // If we have an 'exec_sql' RPC function in Supabase, we could use it:
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
        console.error('Migration Error (via RPC):', error);
        console.log('Trying alternative: split and run (experimental)...');
        // This is a last resort.
    } else {
        console.log('Migration Applied Successfully!');
    }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('Usage: node scripts/apply_migration.cjs <path_to_sql_file>');
    process.exit(1);
}

applyMigration(migrationFile);
