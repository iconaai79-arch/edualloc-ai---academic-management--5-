
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadEnv() {
    const envPath = join(process.cwd(), '.env.local');
    if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                process.env[key] = value;
            }
        });
    }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Diagnosis ---');
console.log('Current Work Dir:', process.cwd());
console.log('URL Present:', !!SUPABASE_URL);
console.log('Service Key Present:', !!SUPABASE_SERVICE_ROLE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing environment variables.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testConnection() {
    console.log('Testing connection to [institutions]...');
    const { data, error } = await supabase.from('institutions').select('id, name').limit(1);
    if (error) {
        console.error('Fetch Error:', error);
    } else {
        console.log('Success! Found institutions:', data.length);
        if (data.length > 0) console.log('Sample:', data[0].name);
    }

    console.log('Testing connection to [users]...');
    const { data: users, error: userError } = await supabase.from('users').select('id, email').limit(1);
    if (userError) {
        console.error('User Fetch Error:', userError);
    } else {
        console.log('Success! Found users:', users.length);
        if (users.length > 0) console.log('Sample User:', users[0].email);
    }
}

testConnection();
