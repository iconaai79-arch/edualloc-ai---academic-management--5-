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
    // Health endpoint for cloud load balancers & Talksasa health checks
    if (req.url === '/health' || req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), app: 'EduAI Automation' }));
        return;
    }

    try {
        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        let pathname = decodeURIComponent(parsedUrl.pathname);

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

            // If it's a directory, check for index.html inside
            if (!err && stats.isDirectory()) {
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
