import fs from 'fs';
const content = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/src/components/AlumnaePortalView.tsx', 'utf8');
const stack = [];
const regex = /<div\b([\s\S]*?)>|<\/div>/g;
let match;
while ((match = regex.exec(content)) !== null) {
    const fullTag = match[0];
    const startIndex = match.index;
    const lineNumber = content.substring(0, startIndex).split('\n').length;
    
    if (fullTag.startsWith('<div')) {
        if (!fullTag.endsWith('/>')) {
            stack.push({ line: lineNumber, tag: fullTag });
        }
    } else {
        if (stack.length > 0) {
            stack.pop();
        } else {
            console.log('Extra </div> at line ' + lineNumber);
        }
    }
}
stack.forEach(s => console.log('Unclosed <div> from line ' + s.line));
