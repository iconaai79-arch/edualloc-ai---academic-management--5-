const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Missing Supabase URL or Key in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugNcbaConfig() {
  console.log("🔍 Fetching Global NCBA Configuration...");
  
  const { data: settings, error } = await supabase
    .from('settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error("❌ Error fetching settings:", error.message);
    return;
  }

  const data = settings?.data || {};
  const ncba = data.ncba_config || data.ncbaConfig;

  if (!ncba) {
    console.warn("⚠️ No NCBA configuration found in global settings (id: 1).");
    return;
  }

  console.log("\n==========================================");
  console.log("       NCBA CONFIGURATION DIAGNOSTICS      ");
  console.log("==========================================");
  
  const fields = [
    'clientId', 'client_id', 'consumerKey', 'consumer_key', 
    'callbackUsername', 'callback_username',
    'clientSecret', 'client_secret', 'secretKey', 'secret_key',
    'consumerSecret', 'consumer_secret'
  ];

  console.log("\n[1] Field Discovery:");
  fields.forEach(f => {
    const val = ncba[f];
    if (val !== undefined && val !== null) {
      const sanitized = String(val).replace(/[^\x20-\x7E]/g, ' [HIDDEN] ').trim();
      const fingerprint = sanitized.substring(0, 4);
      const isMatch = String(val) === sanitized;
      
      console.log(`- ${f.padEnd(17)}: Found | Fingerprint: ${fingerprint}*** | Length: ${String(val).length} | Valid Chars: ${isMatch ? '✅ Yes' : '❌ Has Hidden/Non-Printable Chars'}`);
    } else {
      console.log(`- ${f.padEnd(17)}: Not Present or Empty`);
    }
  });

  console.log("\n[2] Connection Strategy:");
  console.log(`- Auth Method     : ${ncba.authMethod || 'bearer (default)'}`);
  console.log(`- Base URL        : ${ncba.baseUrl || ncba.base_url || 'MISSING'}`);
  console.log(`- STK Push Base   : ${ncba.stkPushBaseUrl || ncba.stk_push_base_url || 'Using Base URL'}`);
  console.log(`- Mock Mode       : ${ncba.isMock === true || ncba.isMock === 'true' ? '✅ ON' : '❌ OFF'}`);

  console.log("\n[3] 401 Unauthorized Troubleshooting Tips:");
  if (ncba.authMethod === 'basic') {
    console.log("💡 Tip: You are using BASIC auth. Ensure your credentials are the 'Bank-Direct' static keys, NOT OAuth consumer keys.");
  } else {
    console.log("💡 Tip: You are using OAUTH bearer auth. Ensure you haven't switched these with the static basic credentials.");
  }
  console.log("💡 Tip: Standard NCBA Client IDs are often long strings. If your ID is very short (e.g. 8 chars), verify it's the right key.");
  console.log("💡 Tip: If ❌ Has Hidden Chars is flagged, your Client ID may contain invisible whitespace which will cause a 401.");
  console.log("💡 Tip: Check for 'IP Whitelisting'. Your server MUST be allowed to communicate with NCBA.");
  console.log("==========================================\n");
}

debugNcbaConfig();
