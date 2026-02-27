import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://vmyokebkrmyqivkivpxz.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-key'; // I need to read the actual key if omitted
// Actually, I can just use supabase client

async function test() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    // Let's grab the env from .env
}
test();
