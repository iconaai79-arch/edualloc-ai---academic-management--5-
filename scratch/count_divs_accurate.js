import fs from 'fs';
const content = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/src/components/AlumnaePortalView.tsx', 'utf8');

function countDivs(text) {
    let open = 0;
    let close = 0;
    let i = 0;
    while (i < text.length) {
        if (text.substring(i, i + 5) === '<div ') {
            // Find end of tag
            let j = i + 5;
            let depth = 0;
            while (j < text.length) {
                if (text[j] === '{') depth++;
                if (text[j] === '}') depth--;
                if (text[j] === '>' && depth === 0) break;
                j++;
            }
            if (text[j-1] !== '/') open++;
            i = j;
        } else if (text.substring(i, i + 6) === '</div>') {
            close++;
            i += 6;
        } else {
            i++;
        }
    }
    return { open, close };
}

const lines = content.split('\n');
const feedSection = lines.slice(1667, 1960).join('\n');
console.log('Feed Section:', countDivs(feedSection));

const messagesSection = lines.slice(1377, 1473).join('\n');
console.log('Messages Section:', countDivs(messagesSection));

const supportSection = lines.slice(1115, 1197).join('\n');
console.log('Support Section:', countDivs(supportSection));
