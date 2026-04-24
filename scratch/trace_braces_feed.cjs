
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Downloads\\edualloc-ai---academic-management (5)\\src\\components\\AlumnaePortalView.tsx', 'utf8');
const lines = content.split('\n');

let braceLevel = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let prev = braceLevel;
    for (let char of line) {
        if (char === '{') braceLevel++;
        if (char === '}') braceLevel--;
    }
    if (i + 1 >= 420 && i + 1 <= 516) {
        console.log(`${i + 1} | ${braceLevel} | ${line.trim().substring(0, 50)}`);
    }
}
