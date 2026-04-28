import fs from 'fs';
const content = fs.readFileSync('src/components/AlumnaeLoginView.tsx', 'utf8');
const lines = content.split('\n');
let count = 0;
for (let i = 360; i < lines.length; i++) {
    const line = lines[i];
    const opens = (line.match(/<div/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    count += opens;
    count -= closes;
    console.log(`${i + 1}: ${line.trim()} | depth: ${count}`);
}
