import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim().replace(/['"]/g, '');
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim().replace(/['"]/g, '');

const supabaseUrl = urlMatch;
const supabaseKey = keyMatch;

const tenantId = `inst_sub_${Date.now()}`;
const newInst = {
    id: tenantId,
    name: 'Test Tenant',
    email: 'test@tenant.com',
    phone_number: '',
    institution_type: 'Primary',
    status: 'trial',
    subscription_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    reseller_id: 'inst_test_123',
};

async function test() {
    console.log("Using URL:", supabaseUrl);

    const res = await fetch(`${supabaseUrl}/rest/v1/institutions`, {
        method: 'POST',
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(newInst)
    });

    if (!res.ok) {
        const err = await res.json();
        console.error("Institution Error:", JSON.stringify(err, null, 2));
    } else {
        console.log("Institution saved successfully");
    }
}
test();
