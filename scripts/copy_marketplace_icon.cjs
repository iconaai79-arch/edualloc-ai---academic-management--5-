const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\c9b026f6-b577-493a-a1df-7cecdaf747bc\\marketplace_app_icon_1793638401202.jpg';
const dest1 = path.join(__dirname, '..', 'public', 'marketplace_logo_3d.png');
const dest2 = path.join(__dirname, '..', 'public', 'marketplace_icon.png');
const dest3 = path.join(__dirname, '..', 'public', 'marketplace_icon.jpg');

fs.copyFileSync(src, dest1);
fs.copyFileSync(src, dest2);
fs.copyFileSync(src, dest3);

console.log('Successfully copied marketplace icons! File size:', fs.statSync(dest1).size);
