import pkg from 'pg';
const { Client } = pkg;

const passwordRaw = "v-O}?Gp[7@I_v4B";
const passwordEncoded = "v-O%7D%3FGp%5B7%40I_v4B";

const hosts = [
    "aws-0-eu-central-1.pooler.supabase.com",
    "db.vmyokebkrmyqivkivpxz.supabase.co"
];

const users = [
    "postgres.vmyokebkrmyqivkivpxz",
    "postgres.iconaai79-arch",
    "postgres"
];

async function tryConnect(user, host, password, port) {
    const connStr = `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/postgres`;
    console.log(`Trying: user=${user}, host=${host}, port=${port}`);
    const client = new Client({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        await client.connect();
        console.log(`\n🎉 SUCCESS! Connected successfully!`);
        console.log(`Connection string matches: user=${user}, host=${host}, port=${port}\n`);
        
        // Try a simple query
        const res = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' LIMIT 5;");
        console.log("Found tables:", res.rows.map(r => r.tablename));
        
        await client.end();
        return true;
    } catch (err) {
        console.log(`❌ FAILED: ${err.message}`);
        return false;
    }
}

async function runTests() {
    // 1. Try pooler with different users and passwords
    for (const user of users) {
        for (const host of hosts) {
            const port = host.includes("pooler") ? 6543 : 5432;
            const success = await tryConnect(user, host, passwordRaw, port);
            if (success) return;
        }
    }
    console.log("All combinations failed.");
}

runTests().catch(console.error);
