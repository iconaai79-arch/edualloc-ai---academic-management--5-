const https = require('https');

const host = 'c2bapis.ncbagroup.com';
const paths = [
    '/payments/oauth/v1/generate', // Confirmed potential
    '/payments/api/v1/stk-push/initiate', // Current
    '/api/v1/stk-push/initiate',
    '/payments/v1/stk-push/initiate',
    '/stk/v1/initiate'
];

async function testPath(path) {
    return new Promise((resolve) => {
        console.log(`\nTesting Path: ${path}`);
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`  Status: ${res.statusCode}`);
            console.log(`  Location: ${res.headers.location || 'N/A'}`);
            console.log(`  ContentType: ${res.headers['content-type'] || 'N/A'}`);
            
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 401 || res.statusCode === 400 || res.statusCode === 404) {
                    console.log(`  Response: ${data.substring(0, 100)}...`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`  ❌ Failed: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

async function run() {
    console.log(`--- NCBA STK Path Discovery ---`);
    for (const path of paths) {
        await testPath(path);
    }
}

run();
