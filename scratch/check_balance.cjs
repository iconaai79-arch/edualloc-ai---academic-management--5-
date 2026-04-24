
const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\hp\\Downloads\\edualloc-ai---academic-management (5)\\src\\components\\AlumnaePortalView.tsx', 'utf8');

function count(str, sub) {
    let count = 0;
    let pos = str.indexOf(sub);
    while (pos !== -1) {
        count++;
        pos = str.indexOf(sub, pos + 1);
    }
    return count;
}

console.log('Braces { }:', count(content, '{'), count(content, '}'));
console.log('Parens ( ):', count(content, '('), count(content, ')'));
console.log('JSX Tags < >:', count(content, '<'), count(content, '>'));
console.log('Fragments <> </>:', count(content, '<>'), count(content, '</>'));
