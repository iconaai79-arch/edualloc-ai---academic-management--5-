const https = require('https');

const host = 'c2bapis.ncbagroup.com';
const tokenPath = '/payments/oauth/v1/generate';
const stkPath = '/payments/api/v1/stk-push/initiate';

async function testEndpoint(path, name) {
    return new Promise((resolve) => {
        console.log(`\nTesting ${name}: ${path}`);
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'EduAlloc-AI/1.0.0 (Bank-Integration-Client)',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`  Status: ${res.statusCode}`);
            console.log(`  ContentType: ${res.headers['content-type'] || 'N/A'}`);
            
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`  Response: ${data.substring(0, 150)}...`);
                if (res.statusCode === 401 && data.includes('Unauthorized')) {
                    console.log(`  ✅ Verified: Reached API layer successfully.`);
                } else if (res.statusCode === 302) {
                    console.log(`  ❌ Failed: Still being redirected. Check User-Agent or path.`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`  ❌ Network Error: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

async function run() {
    console.log(`--- NCBA Final Connectivity Verification ---`);
    await testEndpoint(tokenPath, 'Token Endpoint');
    await testEndpoint(stkPath, 'STK Initiation Endpoint');
}

run();
