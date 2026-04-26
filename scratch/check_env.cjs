
const path = require('path');
const fs = require('fs');

const envLocalPath = path.join(process.cwd(), '.env.local');
console.log('Checking .env.local at:', envLocalPath);
if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    console.log('Content exists. Length:', content.length);
    const lines = content.split('\n');
    lines.forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim();
                console.log(`Key: ${key}, Value: ${value ? 'PRESENT' : 'EMPTY'}`);
            }
        }
    });
} else {
    console.log('.env.local NOT FOUND');
}
