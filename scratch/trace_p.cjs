const fs = require('fs');
const content = fs.readFileSync('src/components/SettingsManager.tsx', 'utf8');

let p = 0;
let start = content.indexOf('return (');
console.log(`Searching from ${start}`);

for (let i = start; i < content.length; i++) {
    if (content[i] === '(') p++;
    if (content[i] === ')') p--;
    
    if (p === 0) {
        const lines = content.substring(0, i).split('\n');
        console.log(`DEPTH 0 at line ${lines.length}`);
        console.log(`CONTEXT: ${content.substring(i-50, i+50)}`);
        // Don't break, keep going!
    }
}
