
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Downloads\\edualloc-ai---academic-management (5)\\src\\components\\AlumnaePortalView.tsx', 'utf8');
const lines = content.split('\n');

let braceLevel = 0;
let parenLevel = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') braceLevel++;
        if (char === '}') braceLevel--;
        if (char === '(') parenLevel++;
        if (char === ')') parenLevel--;
    }
    if (i + 1 >= 35 && i + 1 <= 278) {
        if (braceLevel === 1 && parenLevel === 1) {
            // Level 1|1 is expected after return ( starts
        } else if (braceLevel === 1 && parenLevel === 0) {
            // Level 1|0 is expected before return (
        } else {
            // Other levels...
        }
    }
    if (i + 1 === 277) console.log(`Line 277: ${braceLevel}|${parenLevel}`);
    if (i + 1 === 278) console.log(`Line 278: ${braceLevel}|${parenLevel}`);
}
