import fs from 'fs';
const content = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/src/components/AlumnaePortalView.tsx', 'utf8');
const stack = [];
const regex = /<([a-zA-Z0-9]+)\b([\s\S]*?)>|<\/([a-zA-Z0-9]+)>/g;
let match;
while ((match = regex.exec(content)) !== null) {
    const fullTag = match[0];
    const openTagName = match[1];
    const closeTagName = match[3];
    const startIndex = match.index;
    const lineNumber = content.substring(0, startIndex).split('\n').length;
    
    // Ignore fragments and self-closing tags
    if (fullTag.startsWith('<>') || fullTag.startsWith('</>')) continue;
    if (fullTag.endsWith('/>')) continue;
    
    // Ignore some common components that might be problematic or self-closing in spirit but not syntax
    // Actually, in JSX, if it's not self-closing, it MUST have a closer.
    
    if (openTagName) {
        stack.push({ line: lineNumber, tag: openTagName });
    } else if (closeTagName) {
        if (stack.length > 0) {
            const last = stack.pop();
            if (last.tag !== closeTagName) {
                console.log(`Mismatch at line ${lineNumber}: closed ${closeTagName} but expected ${last.tag} (from line ${last.line})`);
            }
        } else {
            console.log(`Extra </${closeTagName}> at line ${lineNumber}`);
        }
    }
}
stack.forEach(s => console.log(`Unclosed <${s.tag}> from line ${s.line}`));
