const { Client } = require('pg');

async function checkUser() {
    const connectionString = "postgresql://postgres.iconaai79-arch:v-O%7D%3FGp%5B7%40I_v4B@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('Connected to DB');

        const pinRes = await client.query("SELECT * FROM event_pins WHERE id = 'pin_1781703240270_wv8tc'");
        console.log('PIN Record:', pinRes.rows[0]);

        if (pinRes.rows.length > 0) {
            const userId = pinRes.rows[0].user_id;
            const userRes = await client.query("SELECT * FROM users WHERE id = $1", [userId]);
            console.log('User Record:', userRes.rows[0]);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkUser();
