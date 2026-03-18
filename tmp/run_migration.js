import pkg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pkg;

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL || "postgresql://postgres:postgres@localhost:5432/postgres",
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        const migrationPath = path.resolve('database/migrations/107_his_clinical_records.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log("Running migration 107...");
        await client.query(sql);
        console.log("Migration 107 successful");

    } catch (err) {
        console.error("Migration Failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
