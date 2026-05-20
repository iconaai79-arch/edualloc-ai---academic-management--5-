const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const connectionString = "postgresql://postgres.iconaai79-arch:v-O%7D%3FGp%5B7%40I_v4B@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '216_create_showroom_settings_table.sql');

    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    const client = new Client({ connectionString });

    try {
        console.log('🔍 Connecting to Supabase DB...');
        await client.connect();
        console.log('✅ Connected successfully\n');

        const sql = fs.readFileSync(migrationPath, 'utf-8');
        console.log(`📊 Executing SQL (${sql.length} characters)...`);

        await client.query(sql);
        console.log('✨ Showroom Settings Migration completed successfully!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) console.error('Details:', error.detail);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration().catch(console.error);
