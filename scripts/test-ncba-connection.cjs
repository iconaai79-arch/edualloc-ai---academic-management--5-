const https = require('https');
const dns = require('dns');

const targetUrl = process.argv[2] || 'https://c2bapis.ncbagroup.com/payments/oauth/v1/generate';
const url = new URL(targetUrl);

console.log(`\n--- NCBA Connectivity Diagnostic Tool ---`);
console.log(`Target: ${targetUrl}`);
console.log(`Host: ${url.hostname}`);
console.log(`Path: ${url.pathname}\n`);

// 1. DNS Resolution
console.log(`[1/3] Resolving DNS for ${url.hostname}...`);
dns.lookup(url.hostname, (err, address, family) => {
    if (err) {
        console.error(`❌ DNS Lookup Failed: ${err.message}`);
        console.log(`Hint: This host might not exist or your DNS server is blocking it.`);
        process.exit(1);
    }
    console.log(`✅ Resolved to: ${address} (Family: IPv${family})`);

    // 2. TCP Connection
    console.log(`\n[2/3] Testing HTTPS Connection to ${url.hostname}...`);
    const start = Date.now();
    
    const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST', // Use POST as it's more representative for token calls
        headers: {
            'User-Agent': 'EduAlloc-AI/1.0.0 (Bank-Integration-Diagnostic)',
            'Accept': 'application/json'
        },
        timeout: 10000
    }, (res) => {
        const duration = Date.now() - start;
        console.log(`✅ Connection Successful!`);
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Time taken: ${duration}ms`);
        console.log(`Headers:`, res.headers);
        process.exit(0);
    });

    req.on('error', (e) => {
        const duration = Date.now() - start;
        console.error(`\n❌ Connection Failed after ${duration}ms`);
        console.error(`Error Code: ${e.code}`);
        console.error(`Message: ${e.message}`);
        
        if (e.code === 'ETIMEDOUT' || e.code === 'ECONNREFUSED') {
            console.log(`\n--- ANALYSIS ---`);
            console.log(`This is a network-level blockage.`);
            console.log(`1. Your server IP might not be whitelisted by NCBA.`);
            console.log(`2. A firewall (local or ISP) might be blocking outgoing traffic on port 443.`);
            console.log(`3. The bank's endpoint might be down.`);
        }
        process.exit(1);
    });

    req.on('timeout', () => {
        console.error(`❌ Connection Timed Out (10s)`);
        req.destroy();
    });

    req.end();
});
