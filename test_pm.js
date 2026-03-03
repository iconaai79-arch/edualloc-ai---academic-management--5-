import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'src/.env' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'http://localhost:54321',
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'dummy'
);

(async () => {
    const { data, error } = await supabase.from('pm_properties').select('id').limit(1);
    console.log("Data:", data, "Error:", error);
})();
