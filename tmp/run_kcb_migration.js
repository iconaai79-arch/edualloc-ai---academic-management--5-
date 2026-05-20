const pkg = require('pg');
const { Client } = pkg;
const fs = require('fs');
const path = require('path');

async function run() {
    // Correct connection credentials with project-specific username and unencoded password
    const client = new Client({
        user: 'postgres.vmyokebkrmyqivkivpxz',
        host: 'aws-0-eu-central-1.pooler.supabase.com',
        database: 'postgres',
        password: 'v-O}?Gp[7@I_v4B',
        port: 6543,
        ssl: { rejectUnauthorized: false }
    });

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '213_add_kcb_config_to_institutions.sql');

    console.log(`🚀 Executing migration: ${migrationPath}`);

    try {
        await client.connect();
        console.log('✅ Connected to database successfully.');

        const sql = fs.readFileSync(migrationPath, 'utf-8');
        console.log(`📊 Executing SQL (${sql.length} characters)...`);

        await client.query(sql);
        console.log('✨ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        if (error.detail) console.error('Details:', error.detail);
    } finally {
        await client.end();
    }
}

run().catch(console.error);
