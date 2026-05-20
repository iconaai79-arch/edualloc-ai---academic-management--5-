const pkg = require('pg');
const { Client } = pkg;
const fs = require('fs');
const path = require('path');

async function run() {
    const client = new Client({
        user: 'postgres.vmyokebkrmyqivkivpxz',
        host: 'aws-0-eu-central-1.pooler.supabase.com',
        database: 'postgres',
        password: 'v-O}?Gp[7@I_v4B',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });

    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '215_add_kcb_fields_to_mpesa_transactions.sql');

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
