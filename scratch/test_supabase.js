
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function test() {
    let url = '';
    let key = '';

    try {
        const env = fs.readFileSync('.env.local', 'utf8');
        url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
        key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';
    } catch (e) {}

    console.log("URL:", url || 'MISSING');
    console.log("KEY:", key ? "PRESENT" : "MISSING");
    
    if (!url || !key) {
        console.error("Missing config - please check .env.local");
        return;
    }

    try {
        const supabase = createClient(url, key);
        console.log("Client created. Fetching...");
        const { data, error } = await supabase.from('institutions').select('id').limit(1);
        
        if (error) {
            console.error("Fetch Error:", error);
        } else {
            console.log("Fetch Success. Found records:", data.length);
        }
    } catch (err) {
        console.error("Fatal connectivity error:", err);
    }
}

test();
