import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jfif': 'image/jpeg',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.wasm': 'application/wasm',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',
    '.pdf': 'application/pdf',
    '.sql': 'text/plain; charset=utf-8'
};

function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
            return;
        }

        const isImmutable = filePath.includes('/assets/') || filePath.includes('\\assets\\');
        const headers = {
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff'
        };

        if (isImmutable) {
            headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else if (filePath.endsWith('.html')) {
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
            headers['Pragma'] = 'no-cache';
            headers['Expires'] = '0';
        }

        res.writeHead(200, headers);
        res.end(data);
    });
}

const server = http.createServer((req, res) => {
    // CORS headers for all API and storage calls
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health endpoint for cloud load balancers & Talksasa health checks
    if (req.url === '/health' || req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), app: 'EduAI Automation' }));
        return;
    }

    try {
        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        let pathname = decodeURIComponent(parsedUrl.pathname);

        // Standalone Server-Side Storage Upload Handler (Talksasa Runtime)
        if (req.method === 'POST' && (pathname === '/api/storage' || (pathname === '/api/integrations' && (req.url.includes('uploadStorage') || req.url.includes('uploadLetterhead') || req.url.includes('uploadFile'))))) {
            let body = '';
            req.on('data', chunk => {
                body += chunk;
                if (body.length > 50 * 1024 * 1024) { // 50MB limit
                    res.writeHead(413, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Payload too large' }));
                    req.destroy();
                }
            });
            req.on('end', () => {
                try {
                    const parsed = body ? JSON.parse(body) : {};
                    const rawPath = parsed.path || parsed.fileName || parsed.name || `letterhead_${Date.now()}.png`;
                    const rawData = parsed.fileData || parsed.content || parsed.file || parsed.data;

                    if (!rawData) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: 'Missing file data' }));
                        return;
                    }

                    let cleanPath = String(rawPath).replace(/^[\\\/]+/, '');
                    if (cleanPath.startsWith('storage/eduai/')) {
                        cleanPath = cleanPath.slice('storage/eduai/'.length);
                    } else if (cleanPath.startsWith('eduai/')) {
                        cleanPath = cleanPath.slice('eduai/'.length);
                    }
                    cleanPath = cleanPath.replace(/\.\.[\/\\]/g, '').replace(/^[\\\/]+/, '');
                    if (!cleanPath) cleanPath = `uploads/${Date.now()}_file.png`;

                    const base64Data = typeof rawData === 'string' ? rawData.replace(/^data:[^;]+;base64,/, '') : '';
                    const buffer = Buffer.from(base64Data, 'base64');

                    // 1. Write to public/storage/eduai
                    const publicBase = path.resolve(__dirname, 'public', 'storage', 'eduai');
                    const publicTarget = path.resolve(publicBase, cleanPath);
                    fs.mkdirSync(path.dirname(publicTarget), { recursive: true });
                    fs.writeFileSync(publicTarget, buffer);

                    // 2. Mirror to dist/storage/eduai
                    try {
                        const distBase = path.resolve(DIST_DIR, 'storage', 'eduai');
                        const distTarget = path.resolve(distBase, cleanPath);
                        fs.mkdirSync(path.dirname(distTarget), { recursive: true });
                        fs.writeFileSync(distTarget, buffer);
                    } catch (dErr) {
                        console.warn('[Server Storage] Dist mirror note:', dErr);
                    }

                    const relativeUrl = `/storage/eduai/${cleanPath.replace(/\\/g, '/')}`;
                    console.log(`[Talksasa Server Storage] Saved ${relativeUrl} (${buffer.length} bytes)`);

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, url: relativeUrl, path: cleanPath, size: buffer.length }));
                } catch (pErr) {
                    console.error('[Server Storage] Parse error:', pErr);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Upload processing failed', error: pErr.message }));
                }
            });
            return;
        }

        // Normalized requested file path in dist
        let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        let targetFile = path.join(DIST_DIR, safePath);

        // Check if file exists in dist
        fs.stat(targetFile, (err, stats) => {
            if (!err && stats.isFile()) {
                const ext = path.extname(targetFile).toLowerCase();
                const contentType = MIME_TYPES[ext] || 'application/octet-stream';
                serveFile(res, targetFile, contentType);
                return;
            }

            // Fallback: check public folder (ensures files uploaded at runtime are immediately served)
            const publicFile = path.join(__dirname, 'public', safePath);
            fs.stat(publicFile, (pubErr, pubStats) => {
                if (!pubErr && pubStats.isFile()) {
                    const ext = path.extname(publicFile).toLowerCase();
                    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
                    serveFile(res, publicFile, contentType);
                    return;
                }

                // If it's a directory, check for index.html inside
                if (!err && stats && stats.isDirectory()) {
                    const subIndex = path.join(targetFile, 'index.html');
                    if (fs.existsSync(subIndex)) {
                        serveFile(res, subIndex, 'text/html; charset=utf-8');
                        return;
                    }
                }

                // SPA Fallback: for all non-file route navigations, serve root index.html
                const rootIndex = path.join(DIST_DIR, 'index.html');
                if (fs.existsSync(rootIndex)) {
                    serveFile(res, rootIndex, 'text/html; charset=utf-8');
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('<h1>EduAI Automation - Application Built Assets Not Found</h1><p>Please run npm run build first.</p>');
                }
            });
        });
    } catch (e) {
        console.error('[Server] Request handling error:', e);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

server.listen(PORT, HOST, () => {
    console.log(`[EduAI Server] Running on http://${HOST}:${PORT}`);
    console.log(`[EduAI Server] Serving static files from: ${DIST_DIR}`);
});
