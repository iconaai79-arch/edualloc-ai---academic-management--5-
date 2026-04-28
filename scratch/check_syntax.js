import fs from 'fs';
const content = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/src/components/AlumnaePortalView.tsx', 'utf8');
let parens = 0;
let braces = 0;
let brackets = 0;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '(') parens++;
    if (content[i] === ')') parens--;
    if (content[i] === '{') braces++;
    if (content[i] === '}') braces--;
    if (content[i] === '[') brackets++;
    if (content[i] === ']') brackets--;
}
console.log('Parens:', parens);
console.log('Braces:', braces);
console.log('Brackets:', brackets);
if (parens !== 0 || braces !== 0 || brackets !== 0) {
    console.error('MISMATCH!');
    process.exit(1);
}
