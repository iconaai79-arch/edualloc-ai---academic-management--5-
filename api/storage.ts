import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

const MIME_MAP: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jfif': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain; charset=utf-8'
};

let _pgPool: any = null;
let _storageTableEnsured = false;

const getPgPool = async () => {
    if (_pgPool) return _pgPool;
    const connectionString =
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL ||
        process.env.VITE_DATABASE_URL ||
        process.env.SUPABASE_DB_URL;
    if (!connectionString) return null;

    try {
        const pgModule: any = await import('pg');
        const Pool = pgModule.Pool || pgModule.default?.Pool || null;
        if (!Pool) return null;

        const cleanConnString = connectionString.trim();
        const isLocal = cleanConnString.includes('localhost') || cleanConnString.includes('127.0.0.1') || cleanConnString.includes('postgres:') || cleanConnString.includes('sslmode=disable');
        _pgPool = new Pool({
            connectionString: cleanConnString,
            ssl: isLocal ? false : { rejectUnauthorized: false },
            max: 5,
            idleTimeoutMillis: 15000,
            connectionTimeoutMillis: 8000
        });
        return _pgPool;
    } catch (err) {
        console.warn('[Talksasa Storage] Direct PG pool init warning:', err);
        return null;
    }
};

const ensureStorageTable = async (pool: any) => {
    if (_storageTableEnsured || !pool) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.storage_files (
                path TEXT PRIMARY KEY,
                content_type TEXT DEFAULT 'application/octet-stream',
                data_base64 TEXT NOT NULL,
                size_bytes INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        _storageTableEnsured = true;
    } catch (err) {
        console.warn('[Talksasa Storage] Table creation warning:', err);
    }
};

const sanitizeStoragePath = (rawPath: string): string => {
    let cleanPath = String(rawPath || '').trim().replace(/^[\\\/]+/, '');
    if (cleanPath.startsWith('storage/eduai/')) {
        cleanPath = cleanPath.slice('storage/eduai/'.length);
    } else if (cleanPath.startsWith('eduai/')) {
        cleanPath = cleanPath.slice('eduai/'.length);
    }
    cleanPath = cleanPath.replace(/\.\.[\/\\]/g, '').replace(/^[\\\/]+/, '').replace(/\\/g, '/');
    return cleanPath;
};

const detectMimeType = (filePath: string, explicitType?: string, dataUrl?: string): string => {
    if (explicitType && typeof explicitType === 'string' && explicitType.includes('/')) {
        return explicitType;
    }
    if (dataUrl && typeof dataUrl === 'string') {
        const match = dataUrl.match(/^data:([^;]+);base64,/i);
        if (match && match[1]) return match[1];
    }
    const ext = path.extname(filePath).toLowerCase();
    return MIME_MAP[ext] || 'application/octet-stream';
};

/**
 * Talksasa Durable Storage Endpoint (Upload + Retrieve)
 * - POST /api/storage: Persists file to PostgreSQL (public.storage_files) AND local disk (public/ & dist/storage/eduai/).
 *   Returns `/api/storage?path=<encodedPath>` which always resolves on Talksasa Vercel-adapter runtime and survives redeploys.
 * - GET /api/storage?path=<path>: Streams the file bytes from disk or PostgreSQL with proper Content-Type & caching headers.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // =========================================================================
    // GET: Retrieve & stream file by ?path=...
    // =========================================================================
    if (req.method === 'GET') {
        const rawQueryPath = Array.isArray(req.query?.path) ? req.query.path[0] : (req.query?.path as string | undefined);
        if (!rawQueryPath) {
            return res.status(200).json({
                status: 'online',
                service: 'Talksasa Durable Storage Handler',
                root: '/storage/eduai/'
            });
        }

        const cleanPath = sanitizeStoragePath(decodeURIComponent(rawQueryPath));
        if (!cleanPath) {
            return res.status(400).json({ success: false, message: 'Invalid storage path' });
        }

        const contentTypeFallback = detectMimeType(cleanPath);

        // 1. Check local disk first (dist/storage/eduai then public/storage/eduai)
        const diskCandidates = [
            path.resolve(process.cwd(), 'dist', 'storage', 'eduai', cleanPath),
            path.resolve(process.cwd(), 'public', 'storage', 'eduai', cleanPath)
        ];

        for (const candidate of diskCandidates) {
            try {
                if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                    const buf = fs.readFileSync(candidate);
                    res.setHeader('Content-Type', contentTypeFallback);
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                    res.setHeader('Content-Length', String(buf.length));
                    res.status(200);
                    return res.end(buf);
                }
            } catch (_) {}
        }

        // 2. Fetch from Talksasa PostgreSQL (public.storage_files) — durable across restarts/redeploys
        try {
            const pool = await getPgPool();
            if (pool) {
                await ensureStorageTable(pool);
                const dbRes = await pool.query(
                    `SELECT content_type, data_base64 FROM public.storage_files WHERE path = $1 LIMIT 1`,
                    [cleanPath]
                );
                if (dbRes?.rows && dbRes.rows.length > 0) {
                    const row = dbRes.rows[0];
                    const buf = Buffer.from(row.data_base64, 'base64');
                    const mime = row.content_type || contentTypeFallback;

                    // Warm local disk cache asynchronously (best-effort)
                    try {
                        const publicTarget = path.resolve(process.cwd(), 'public', 'storage', 'eduai', cleanPath);
                        fs.mkdirSync(path.dirname(publicTarget), { recursive: true });
                        fs.writeFileSync(publicTarget, buf);
                    } catch (_) {}

                    res.setHeader('Content-Type', mime);
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                    res.setHeader('Content-Length', String(buf.length));
                    res.status(200);
                    return res.end(buf);
                }
            }
        } catch (dbErr: any) {
            console.error('[Talksasa Storage GET] DB retrieval error:', dbErr?.message || dbErr);
        }

        return res.status(404).json({ success: false, message: 'File not found in Talksasa storage', path: cleanPath });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // =========================================================================
    // POST: Upload & persist file to PostgreSQL + local disk
    // =========================================================================
    try {
        const body = req.body || {};
        const rawPath = body.path || body.fileName || body.name || `letterhead_${Date.now()}.png`;
        const rawData = body.fileData || body.content || body.file || body.data;

        if (!rawData) {
            return res.status(400).json({ success: false, message: 'Missing file data for upload' });
        }

        let cleanPath = sanitizeStoragePath(rawPath);
        if (!cleanPath) {
            cleanPath = `uploads/${Date.now()}_file.png`;
        }

        const mimeType = detectMimeType(cleanPath, body.contentType, typeof rawData === 'string' ? rawData : undefined);
        const base64Data = typeof rawData === 'string' ? rawData.replace(/^data:[^;]+;base64,/, '') : '';
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or empty file payload' });
        }

        let persistedToDb = false;
        let persistedToDisk = false;

        // 1. Persist to Talksasa PostgreSQL (primary durable store — survives container restarts & Vercel-adapter builds)
        try {
            const pool = await getPgPool();
            if (pool) {
                await ensureStorageTable(pool);
                await pool.query(
                    `INSERT INTO public.storage_files (path, content_type, data_base64, size_bytes, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, NOW(), NOW())
                     ON CONFLICT (path) DO UPDATE SET
                        content_type = EXCLUDED.content_type,
                        data_base64 = EXCLUDED.data_base64,
                        size_bytes = EXCLUDED.size_bytes,
                        updated_at = NOW()`,
                    [cleanPath, mimeType, base64Data, buffer.length]
                );
                persistedToDb = true;
            }
        } catch (dbErr: any) {
            console.warn('[Talksasa Storage POST] PostgreSQL write warning:', dbErr?.message || dbErr);
        }

        // 2. Write to public/storage/eduai & dist/storage/eduai on disk
        try {
            const publicBase = path.resolve(process.cwd(), 'public', 'storage', 'eduai');
            const publicTarget = path.resolve(publicBase, cleanPath);
            fs.mkdirSync(path.dirname(publicTarget), { recursive: true });
            fs.writeFileSync(publicTarget, buffer);
            persistedToDisk = true;
        } catch (pubErr) {
            console.warn('[Talksasa Storage POST] public disk write note:', pubErr);
        }

        try {
            const distBase = path.resolve(process.cwd(), 'dist', 'storage', 'eduai');
            const distTarget = path.resolve(distBase, cleanPath);
            fs.mkdirSync(path.dirname(distTarget), { recursive: true });
            fs.writeFileSync(distTarget, buffer);
            persistedToDisk = true;
        } catch (distErr) {
            console.warn('[Talksasa Storage POST] dist disk write note:', distErr);
        }

        if (!persistedToDb && !persistedToDisk) {
            return res.status(500).json({ success: false, message: 'Failed to persist file to either database or filesystem.' });
        }

        // Return the guaranteed Talksasa API retrieval URL so it never hits SPA index.html fallback
        const retrievalUrl = `/api/storage?path=${encodeURIComponent(cleanPath)}`;
        const staticUrl = `/storage/eduai/${cleanPath}`;
        console.log(`[Talksasa Storage] Stored ${cleanPath} (${buffer.length} bytes, db=${persistedToDb}, disk=${persistedToDisk})`);

        return res.status(200).json({
            success: true,
            url: retrievalUrl,
            staticUrl,
            path: cleanPath,
            contentType: mimeType,
            size: buffer.length,
            persistedToDb,
            persistedToDisk
        });
    } catch (err: any) {
        console.error('[Talksasa Storage] Upload error:', err);
        return res.status(500).json({
            success: false,
            message: 'Failed to write file to Talksasa storage',
            error: err.message
        });
    }
}
