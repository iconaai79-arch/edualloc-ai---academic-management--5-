
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkCounts() {
    const { count: userCount, error: userError } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: instCount, error: instError } = await supabase.from('institutions').select('*', { count: 'exact', head: true });
    const { count: countyCount, error: countyError } = await supabase.from('counties').select('*', { count: 'exact', head: true });

    console.log('--- Database Record Counts ---');
    console.log('Users:', userError ? 'Error: ' + userError.message : userCount);
    console.log('Institutions:', instError ? 'Error: ' + instError.message : instCount);
    console.log('Counties:', countyError ? 'Error: ' + countyError.message : countyCount);
}

checkCounts();
