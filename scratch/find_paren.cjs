const fs = require('fs');
const content = fs.readFileSync('src/components/SettingsManager.tsx', 'utf8');

let p = 0;
let start = content.indexOf('return (');
if (start === -1) {
    console.log("Could not find return (");
    process.exit(1);
}

let inStr = false;
let quoteChar = '';
let inComment = false;
let multiLineComment = false;

for (let i = start; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1];

    if (!inStr && !inComment) {
        if (c === '/' && next === '/') {
            inComment = true;
            multiLineComment = false;
        } else if (c === '/' && next === '*') {
            inComment = true;
            multiLineComment = true;
        } else if (c === '"' || c === "'" || c === '`') {
            inStr = true;
            quoteChar = c;
        } else if (c === '(') {
            p++;
        } else if (c === ')') {
            p--;
        }
    } else if (inStr) {
        if (c === quoteChar && content[i - 1] !== '\\') {
            inStr = false;
        }
    } else if (inComment) {
        if (!multiLineComment && c === '\n') {
            inComment = false;
        } else if (multiLineComment && c === '*' && next === '/') {
            inComment = false;
            i++;
        }
    }

    if (p === 0 && i > start + 8) {
        const lines = content.substring(0, i).split('\n');
        console.log(`Paren hits 0 at index ${i}, line ${lines.length}`);
        console.log(`Context: ${content.substring(i-10, i+10)}`);
        break;
    }
}
