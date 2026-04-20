
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing Super Admin credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function inspectSettings() {
    console.log("Querying system_settings id=1...");
    const { data, error } = await supabase.from('system_settings').select('*').eq('id', 1).maybeSingle();
    
    if (error) {
        console.error("DB Error:", error);
        return;
    }
    
    if (!data) {
        console.warn("No settings found in system_settings with id=1");
        return;
    }
    
    const settings = data.data || {};
    console.log("Settings found. Keys:", Object.keys(settings));
    
    if (settings.googleDriveConfig) {
        console.log("googleDriveConfig:", JSON.stringify(settings.googleDriveConfig, null, 2));
    } else {
        console.warn("googleDriveConfig NOT FOUND in settings object.");
    }
    
    if (settings.google_drive_config) {
        console.log("google_drive_config (legacy):", JSON.stringify(settings.google_drive_config, null, 2));
    }

    console.log("Querying company_details (fallback)...");
    const { data: comp } = await supabase.from('company_details').select('*').maybeSingle();
    if (comp) {
        console.log("company_details google_drive_config:", JSON.stringify(comp.google_drive_config, null, 2));
    }
}

inspectSettings();
