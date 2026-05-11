const fs = require('fs');
const content = fs.readFileSync('src/components/ds/DSAnalyticsView.tsx', 'utf8');
const lines = content.split('\n');
let depth = 0;
let inTag = false;
let currentTag = '';

lines.forEach((line, i) => {
    let pos = 0;
    while (pos < line.length) {
        if (!inTag) {
            const openIndex = line.indexOf('<div', pos);
            const closeIndex = line.indexOf('</div', pos);
            
            if (openIndex === -1 && closeIndex === -1) break;
            
            if (openIndex !== -1 && (closeIndex === -1 || openIndex < closeIndex)) {
                inTag = true;
                currentTag = '<div';
                depth++;
                pos = openIndex + 4;
            } else {
                depth--;
                pos = closeIndex + 5;
            }
        } else {
            const endOfTag = line.indexOf('>', pos);
            if (endOfTag === -1) {
                // Tag continues to next line
                pos = line.length;
            } else {
                const tagContent = line.substring(0, endOfTag + 1);
                if (tagContent.trim().endsWith('/>')) {
                    depth--; // It was self-closing, undo the increment
                }
                inTag = false;
                pos = endOfTag + 1;
            }
        }
    }
    if (line.includes('<div') || line.includes('</div')) {
        console.log(`${i + 1}: [${depth}] ${line.trim()}`);
    }
});
