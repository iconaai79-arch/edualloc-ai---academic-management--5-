const fs = require('fs');
const content = fs.readFileSync('api/integrations.ts', 'utf8');
const lines = content.split('\n');

let stack = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '{') stack.push({ line: i + 1, char: j + 1 });
        if (line[j] === '}') {
            if (stack.length === 0) {
                console.log(`Extra closing brace at Line ${i + 1}, Char ${j + 1}`);
            } else {
                stack.pop();
            }
        }
    }
}

if (stack.length > 0) {
    stack.forEach(s => console.log(`Unclosed opening brace at Line ${s.line}, Char ${s.char}`));
} else {
    console.log('Braces are balanced!');
}
