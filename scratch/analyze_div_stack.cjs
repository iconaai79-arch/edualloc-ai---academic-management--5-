const fs = require('fs');
const content = fs.readFileSync('src/components/ds/DSAnalyticsView.tsx', 'utf8');
const lines = content.split('\n');
let stack = [];

lines.forEach((line, i) => {
    let pos = 0;
    while (true) {
        const nextDiv = line.indexOf('<div', pos);
        const nextClose = line.indexOf('</div', pos);
        
        if (nextDiv === -1 && nextClose === -1) break;
        
        if (nextDiv !== -1 && (nextClose === -1 || nextDiv < nextClose)) {
            // Check if self-closing
            const endOfTag = line.indexOf('>', nextDiv);
            if (endOfTag !== -1 && line.substring(nextDiv, endOfTag + 1).includes('/>')) {
                // Ignore self-closing
            } else {
                stack.push({ line: i + 1, content: line.trim() });
            }
            pos = nextDiv + 1;
        } else {
            if (stack.length === 0) {
                console.log(`Error: Extra closing tag at line ${i + 1}`);
            } else {
                stack.pop();
            }
            pos = nextClose + 1;
        }
    }
});

stack.forEach(s => {
    console.log(`Unclosed tag at line ${s.line}: ${s.content}`);
});
