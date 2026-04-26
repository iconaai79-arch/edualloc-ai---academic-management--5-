const { Client } = require('pg');
const client = new Client('postgresql://postgres.iconaai79-arch:v-O%7D%3FGp%5B7%40I_v4B@aws-0-eu-central-1.pooler.supabase.com:6543/postgres');

async function checkSchema() {
    try {
        await client.connect();
        const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'alumni_posts'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

checkSchema();
