
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Downloads\\edualloc-ai---academic-management (5)\\src\\components\\AlumnaePortalView.tsx', 'utf8');
const lines = content.split('\n');

let braceLevel = 0;
let parenLevel = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let prevB = braceLevel;
    let prevP = parenLevel;
    for (let char of line) {
        if (char === '{') braceLevel++;
        if (char === '}') braceLevel--;
        if (char === '(') parenLevel++;
        if (char === ')') parenLevel--;
    }
    if (i + 1 === 516) {
        console.log(`Line 516: Before=${prevB}|${prevP}, After=${braceLevel}|${parenLevel}, Content=${line.trim()}`);
    }
}
