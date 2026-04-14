const fs = require('fs');
const content = fs.readFileSync('src/components/SettingsManager.tsx', 'utf8');

let curly = 0;
let paren = 0;
let square = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') curly++;
    if (char === '}') curly--;
    if (char === '(') paren++;
    if (char === ')') paren--;
    if (char === '[') square++;
    if (char === ']') square--;
    
    if (curly < 0 || paren < 0 || square < 0) {
        console.log(`Unbalanced at index ${i} (char: ${char})`);
        // Find line number
        const lines = content.substring(0, i).split('\n');
        console.log(`Line: ${lines.length}`);
    }
}

console.log(`Final counts: Curly: ${curly}, Paren: ${paren}, Square: ${square}`);
