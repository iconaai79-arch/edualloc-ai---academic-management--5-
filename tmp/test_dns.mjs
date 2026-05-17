import dns from 'dns';
import fetch from 'node-fetch';

const host = "vmyokebkrmyqivkivpxz.supabase.co";

dns.resolve4(host, (err, addresses) => {
    if (err) {
        console.error(`❌ DNS resolution failed for ${host}:`, err.message);
    } else {
        console.log(`✅ DNS resolved successfully for ${host}:`, addresses);
    }
});

fetch(`https://${host}`)
    .then(res => {
        console.log(`✅ HTTP Fetch status for ${host}:`, res.status);
    })
    .catch(err => {
        console.error(`❌ HTTP Fetch failed for ${host}:`, err.message);
    });
