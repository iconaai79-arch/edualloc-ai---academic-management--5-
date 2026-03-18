
import pkg from 'pg';
const { Client } = pkg;

async function checkTable() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'institutions'
        `);

        console.log("Columns for 'institutions':");
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });

    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        await client.end();
    }
}

checkTable();
