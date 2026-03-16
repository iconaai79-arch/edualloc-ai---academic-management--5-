
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('--- Diagnosis ---');
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
    }

    console.log('Testing connection to [users]...');
    const { data: users, error: userError } = await supabase.from('users').select('id, email').limit(1);
    if (userError) {
        console.error('User Fetch Error:', userError);
    } else {
        console.log('Success! Found users:', users.length);
    }
}

testConnection();
