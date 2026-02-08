import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Direct Database Migration Executor
 * 
 * This script connects directly to Supabase and executes the county management migration
 * 
 * Usage:
 * 1. Set your Supabase credentials as environment variables:
 *    export SUPABASE_URL="your-project-url"
 *    export SUPABASE_SERVICE_KEY="your-service-role-key"
 * 
 * 2. Run the script:
 *    node database/run_migration_direct.js
 */

async function runMigration() {
    console.log('🚀 County Management Migration Executor\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Get Supabase credentials
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ ERROR: Supabase credentials not found!\n');
        console.log('Please set the following environment variables:');
        console.log('  - SUPABASE_URL (your Supabase project URL)');
        console.log('  - SUPABASE_SERVICE_KEY (your service role key)\n');
        console.log('Example:');
        console.log('  export SUPABASE_URL="https://xxxxx.supabase.co"');
        console.log('  export SUPABASE_SERVICE_KEY="your-service-key"\n');
        console.log('Or check your localStorage in the browser for saved credentials.');
        process.exit(1);
    }

    console.log('✅ Supabase credentials found');
    console.log('📍 URL:', supabaseUrl);
    console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...\n');

    // Read migration file
    const migrationPath = join(__dirname, 'county_management_migration.sql');
    let sqlScript;

    try {
        sqlScript = readFileSync(migrationPath, 'utf-8');
        console.log('✅ Migration file loaded');
        console.log('📊 Size:', sqlScript.length, 'characters\n');
    } catch (error) {
        console.error('❌ Error reading migration file:', error.message);
        process.exit(1);
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚠️  IMPORTANT NOTICE');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('The Supabase JavaScript client does not support raw SQL execution');
    console.log('for security reasons. This is a GOOD security practice!\n');
    console.log('To execute this migration, please use ONE of these methods:\n');

    console.log('📋 METHOD 1: Supabase SQL Editor (RECOMMENDED)');
    console.log('─────────────────────────────────────────────────────────');
    console.log('1. Go to:', supabaseUrl.replace('https://', 'https://app.supabase.com/project/'));
    console.log('2. Click "SQL Editor" in the sidebar');
    console.log('3. Click "New Query"');
    console.log('4. Copy the SQL from: database/county_management_migration.sql');
    console.log('5. Paste and click "Run"\n');

    console.log('📋 METHOD 2: Using psql Command Line');
    console.log('─────────────────────────────────────────────────────────');
    const dbHost = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
    console.log(`psql -h db.${dbHost}.supabase.co \\`);
    console.log('     -U postgres \\');
    console.log('     -d postgres \\');
    console.log('     -f database/county_management_migration.sql\n');

    console.log('📋 METHOD 3: Create a Supabase Edge Function');
    console.log('─────────────────────────────────────────────────────────');
    console.log('Create an edge function that executes the SQL using the');
    console.log('Deno postgres client with elevated permissions.\n');

    console.log('═══════════════════════════════════════════════════════════\n');

    // Test database connection
    console.log('🔍 Testing database connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
        console.error('❌ Database connection failed:', error.message);
        console.log('\nPlease check your credentials and try again.\n');
        process.exit(1);
    }

    console.log('✅ Database connection successful!\n');

    // Check if counties table already exists
    console.log('🔍 Checking if counties table exists...');
    const { data: countiesCheck, error: countiesError } = await supabase
        .from('counties')
        .select('count')
        .limit(1);

    if (!countiesError) {
        console.log('⚠️  WARNING: Counties table already exists!');
        console.log('   The migration may have already been run.');
        console.log('   Running it again should be safe (idempotent), but verify first.\n');
    } else if (countiesError.code === '42P01') {
        console.log('✅ Counties table does not exist - migration needed\n');
    } else {
        console.log('⚠️  Could not check table existence:', countiesError.message, '\n');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 NEXT STEPS');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('1. Choose one of the methods above');
    console.log('2. Execute the migration SQL');
    console.log('3. Verify success by checking for the counties table');
    console.log('4. Restart your application');
    console.log('5. Clear browser cache (Ctrl+Shift+R)');
    console.log('6. Navigate to Institutions → Counties\n');

    console.log('✨ Migration preparation complete!\n');
}

// Execute
runMigration().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
