import fs from 'fs';
const content = fs.readFileSync('c:/Users/hp/Downloads/edualloc-ai---academic-management (5)/src/components/AlumnaePortalView.tsx', 'utf8');
let openDivs = 0;
let closeDivs = 0;
const divRegex = /<div\b[^>]*>|<\/div>/g;
let match;
while ((match = divRegex.exec(content)) !== null) {
    if (match[0].startsWith('<div')) openDivs++;
    else closeDivs++;
}
console.log('Open Divs:', openDivs);
console.log('Close Divs:', closeDivs);
console.log('Diff:', openDivs - closeDivs);
