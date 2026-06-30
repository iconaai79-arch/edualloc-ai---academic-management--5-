import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function main() {
    let supabaseUrl = '';
    let supabaseKey = '';

    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            supabaseUrl = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/)?.[1]?.trim().replace(/['"]/g, '') || '';
            // Try Service Role Key first
            supabaseKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)/)?.[1]?.trim().replace(/['"]/g, '') ||
                          envContent.match(/VITE_SUPABASE_ANON_KEY\s*=\s*(.*)/)?.[1]?.trim().replace(/['"]/g, '') || '';
        }
    } catch (e) {
        console.error("Failed to read .env.local:", e.message);
    }

    if (!supabaseUrl || !supabaseKey) {
        console.log("Supabase URL or Key missing in .env.local. We are likely in Local Storage mode.");
        return;
    }

    console.log("Connecting to Supabase at:", supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: leads, error } = await supabase.from('ds_leads').select('id, institution_id, full_name, phone, created_at');
    if (error) {
        console.error("Error fetching ds_leads:", error);
    } else {
        console.log(`Successfully fetched ${leads.length} leads from database.`);
        console.log("Last 10 leads in database:");
        console.log(leads.slice(-10));
    }
}

main();
