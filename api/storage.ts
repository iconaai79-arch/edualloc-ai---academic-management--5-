import { VercelRequest, VercelResponse } from '@vercel/node';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Dedicated Talksasa Local Storage Upload Endpoint
 * Receives file data (base64) and persists directly to Talksasa static storage:
 * - /public/storage/eduai/[path]
 * - /dist/storage/eduai/[path]
 * Returns the Talksasa relative URL: /storage/eduai/[path]
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'online',
            service: 'Talksasa Storage Handler',
            root: '/storage/eduai/'
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    try {
        const body = req.body || {};
        const rawPath = body.path || body.fileName || body.name || `letterhead_${Date.now()}.png`;
        const rawData = body.fileData || body.content || body.file || body.data;

        if (!rawData) {
            return res.status(400).json({ success: false, message: 'Missing file data for upload' });
        }

        // Clean & sanitize target path
        let cleanPath = String(rawPath).replace(/^[\\\/]+/, '');
        if (cleanPath.startsWith('storage/eduai/')) {
            cleanPath = cleanPath.slice('storage/eduai/'.length);
        } else if (cleanPath.startsWith('eduai/')) {
            cleanPath = cleanPath.slice('eduai/'.length);
        }
        // Prevent path traversal
        cleanPath = cleanPath.replace(/\.\.[\/\\]/g, '').replace(/^[\\\/]+/, '');
        if (!cleanPath) {
            cleanPath = `uploads/${Date.now()}_file.png`;
        }

        // Decode Base64 data
        const base64Data = typeof rawData === 'string' ? rawData.replace(/^data:[^;]+;base64,/, '') : '';
        const buffer = Buffer.from(base64Data, 'base64');

        if (buffer.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or empty file payload' });
        }

        // 1. Primary write to public/storage/eduai
        const publicBase = path.resolve(process.cwd(), 'public', 'storage', 'eduai');
        const publicTarget = path.resolve(publicBase, cleanPath);
        fs.mkdirSync(path.dirname(publicTarget), { recursive: true });
        fs.writeFileSync(publicTarget, buffer);

        // 2. Mirror write to dist/storage/eduai (for immediate production static serving)
        try {
            const distBase = path.resolve(process.cwd(), 'dist', 'storage', 'eduai');
            const distTarget = path.resolve(distBase, cleanPath);
            fs.mkdirSync(path.dirname(distTarget), { recursive: true });
            fs.writeFileSync(distTarget, buffer);
        } catch (distErr) {
            console.warn('[Storage] Mirroring to dist directory note:', distErr);
        }

        const relativeUrl = `/storage/eduai/${cleanPath.replace(/\\/g, '/')}`;
        console.log(`[Talksasa Storage] Successfully stored file: ${relativeUrl} (${buffer.length} bytes)`);

        return res.status(200).json({
            success: true,
            url: relativeUrl,
            path: cleanPath,
            size: buffer.length
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
