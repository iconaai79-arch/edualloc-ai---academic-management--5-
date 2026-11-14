const fs = require('fs');
const path = require('path');
const https = require('https');

const downloadsDir = 'C:/Users/hp/Downloads';
const publicStorageRoot = path.join(__dirname, '..', 'public', 'storage', 'eduai');

// 1. Collect all SQL files in Downloads
const sqlFiles = fs.readdirSync(downloadsDir)
  .filter(f => f.endsWith('.sql'))
  .map(f => path.join(downloadsDir, f));

const urlRegex = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/eduai\/([^\s'"\\)]+)/gi;

const relativePaths = new Map(); // decodedPath -> fullUrl

for (const file of sqlFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = urlRegex.exec(content)) !== null) {
      const fullUrl = match[0];
      const rawRel = match[1];
      // Skip driving_school generated statement PDFs unless it's an image
      const lower = rawRel.toLowerCase();
      if (lower.startsWith('driving_school/') && lower.endsWith('.pdf')) {
        continue;
      }
      const decodedRel = decodeURIComponent(rawRel);
      relativePaths.set(decodedRel, fullUrl);
    }
  } catch (err) {
    console.warn(`Warning reading ${path.basename(file)}:`, err.message);
  }
}

console.log(`Found ${relativePaths.size} unique picture/asset URLs across ${sqlFiles.length} SQL backup files.`);

function downloadFile(url, destPath) {
  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      return resolve({ status: 'cached', url, destPath });
    }
    const req = https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadFile(res.headers.location, destPath).then(resolve);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return resolve({ status: 'failed', code: res.statusCode, url });
      }
      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close(() => resolve({ status: 'downloaded', url, destPath }));
      });
      fileStream.on('error', (err) => {
        resolve({ status: 'error', error: err.message, url });
      });
    });
    req.on('error', (err) => resolve({ status: 'error', error: err.message, url }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 'timeout', url });
    });
  });
}

async function main() {
  let downloaded = 0;
  let cached = 0;
  let failed = 0;
  const entries = Array.from(relativePaths.entries());

  for (let i = 0; i < entries.length; i++) {
    const [decodedRel, fullUrl] = entries[i];
    const destPath = path.join(publicStorageRoot, decodedRel);
    const res = await downloadFile(fullUrl, destPath);
    if (res.status === 'downloaded') {
      downloaded++;
      console.log(`[${i + 1}/${entries.length}] Downloaded: ${decodedRel}`);
    } else if (res.status === 'cached') {
      cached++;
      console.log(`[${i + 1}/${entries.length}] Cached: ${decodedRel}`);
    } else {
      failed++;
      console.warn(`[${i + 1}/${entries.length}] FAILED (${res.status} ${res.code || res.error || ''}): ${fullUrl}`);
    }
  }

  console.log(`\nSummary: ${downloaded} downloaded, ${cached} already cached, ${failed} failed (Total: ${entries.length}).`);
}

main();
