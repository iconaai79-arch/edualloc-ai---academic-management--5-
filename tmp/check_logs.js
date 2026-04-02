
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: Missing environment variables for Supabase.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkLogs() {
    console.log('Fetching last 20 activity logs...');
    const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Fetch Error:', error);
    } else {
        console.table(data.map(log => ({
            time: new Date(log.timestamp).toLocaleTimeString(),
            action: log.action,
            details: typeof log.details === 'string' ? log.details.substring(0, 100) : JSON.stringify(log.details).substring(0, 100)
        })));
    }
}

checkLogs();
