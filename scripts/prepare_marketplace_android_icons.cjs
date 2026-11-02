const fs = require('fs');
const path = require('path');

const srcIcon = path.join(__dirname, '..', 'public', 'marketplace_icon.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

if (fs.existsSync(srcIcon) && fs.existsSync(resDir)) {
  const drawableDir = path.join(resDir, 'drawable');
  if (fs.existsSync(drawableDir)) {
    fs.copyFileSync(srcIcon, path.join(drawableDir, 'ic_marketplace_launcher.png'));
    console.log('Saved drawable/ic_marketplace_launcher.png');
  }
}
