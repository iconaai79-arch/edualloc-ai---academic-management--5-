import pkg from 'pg';
const { Client } = pkg;

async function checkConnection() {
    const connectionString = "postgresql://postgres.iconaai79-arch:v-O%7D%3FGp%5B7%40I_v4B@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("SUCCESS: Connected to remote Supabase database!");
        const res = await client.query("SELECT COUNT(*) FROM counties");
        console.log("Counties table count:", res.rows[0].count);
    } catch (err) {
        console.error("FAIL: Connection failed:", err);
    } finally {
        await client.end();
    }
}

checkConnection();
