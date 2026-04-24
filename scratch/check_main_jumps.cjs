
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
    if (i + 1 >= 320 && i + 1 <= 740) {
        if (braceLevel === 1 && parenLevel === 1) {
            // expected
        } else if (i + 1 === 336 || i + 1 === 356 || i + 1 === 415 || i + 1 === 522 || i + 1 === 577 || i + 1 === 618 || i + 1 === 645 || i + 1 === 732) {
             console.log(`${i + 1} | ${braceLevel} | ${parenLevel} | ${line.trim().substring(0, 50)}`);
        } else if (braceLevel < 1 || parenLevel < 1) {
             console.log(`DECREASE at ${i + 1} | ${braceLevel} | ${parenLevel} | ${line.trim()}`);
        }
    }
}
