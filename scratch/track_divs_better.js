import fs from 'fs';
const content = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/src/components/AlumnaePortalView.tsx', 'utf8');
const stack = [];
const lines = content.split('\n');
const regex = /<div\b[^>]*>|<\/div>/g;
for (let i = 0; i < lines.length; i++) {
    let match;
    while ((match = regex.exec(lines[i])) !== null) {
        const tag = match[0];
        if (tag.startsWith('<div')) {
            if (!tag.endsWith('/>')) {
                stack.push({ line: i + 1, tag });
            }
        } else {
            if (stack.length > 0) stack.pop();
            else console.log('Extra </div> at line ' + (i + 1));
        }
    }
}
stack.forEach(s => console.log('Unclosed <div> from line ' + s.line));
