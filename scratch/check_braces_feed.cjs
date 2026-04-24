
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Downloads\\edualloc-ai---academic-management (5)\\src\\components\\AlumnaePortalView.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 420; i < 516; i++) {
    const line = lines[i];
    let open = 0, close = 0;
    for (let char of line) {
        if (char === '{') open++;
        if (char === '}') close++;
    }
    if (open !== close) {
        console.log(`${i + 1} | ${open} | ${close} | ${line.trim()}`);
    }
}
