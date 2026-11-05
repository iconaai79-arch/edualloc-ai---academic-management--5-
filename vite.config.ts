
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Inject env into process.env for SSR context (e.g. api routes loaded via ssrLoadModule)
  process.env.SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  process.env.DATABASE_URL = env.DATABASE_URL || env.VITE_DATABASE_URL || "";
  process.env.API_KEY = env.API_KEY || env.VITE_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "";
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || "";
  process.env.OPENAI_API_KEY = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || "";

  return {
    plugins: [
      react(),
      {
        name: 'api-middleware',
        configureServer(server: any) {
          const apiMiddleware = async (req: any, res: any, next: any) => {
            if (req.url?.startsWith('/downloads/')) {
              const fileName = req.url.replace('/downloads/', '').split('?')[0];
              const filePath = path.resolve(process.cwd(), 'downloads', fileName);
              if (fs.existsSync(filePath)) {
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                fs.createReadStream(filePath).pipe(res);
                return;
              }
            }
            console.log(`[Vite Middleware] Request URL: ${req.url}`);
            if (req.url?.startsWith('/api/')) {
              const urlObj = new URL(req.url, `http://${req.headers.host}`);
              const urlParts = urlObj.pathname.split('/');
              const endpoint = urlParts[2];

              if (!endpoint || endpoint.includes('..') || endpoint.includes('\\')) {
                next();
                return;
              }

              const handlerPath = fs.existsSync(`./api/${endpoint}.ts`)
                ? `/api/${endpoint}.ts`
                : `/api/${endpoint}.js`;

              // Handle CORS for all methods
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

              if (req.method === 'OPTIONS' || req.method === 'HEAD') {
                res.statusCode = 200;
                res.end();
                return;
              }

              let body = '';
              req.on('data', (chunk: any) => body += chunk);
              req.on('end', async () => {
                try {
                  const payload = body ? JSON.parse(body) : {};
                  
                  // Mock Vercel Request/Response
                  const vReq: any = {
                    method: req.method,
                    body: payload,
                    headers: req.headers,
                    query: Object.fromEntries(urlObj.searchParams.entries()),
                    url: req.url
                  };

                  const vRes: any = {
                    setHeader: (k: string, v: string) => res.setHeader(k, v),
                    status: (code: number) => {
                      res.statusCode = code;
                      return vRes;
                    },
                    json: (data: any) => {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify(data));
                      return vRes;
                    },
                    end: () => res.end()
                  };

                  // Load handler dynamically based on endpoint
                  const handlerModule = await server.ssrLoadModule(handlerPath);
                  if (handlerModule && handlerModule.default) {
                    await handlerModule.default(vReq, vRes);
                  } else {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: `Handler not found for ${endpoint}` }));
                  }
                } catch (e: any) {
                  console.error(`API Middleware Error [${endpoint}]:`, e);
                  if (!res.headersSent) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      error: "Vite Middleware Crash",
                      message: e.message,
                      stack: e.stack
                    }));
                  }
                }
              });
            } else {
              next();
            }
          };

          server.middlewares.stack.unshift({ route: '', handle: apiMiddleware });
        }
      },
      {
        name: 'hardlink-large-downloads',
        closeBundle() {
          const srcDir = path.resolve(process.cwd(), 'downloads');
          const destDir = path.resolve(process.cwd(), 'dist', 'downloads');
          if (fs.existsSync(srcDir)) {
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            const files = fs.readdirSync(srcDir);
            for (const file of files) {
              const srcFile = path.join(srcDir, file);
              const destFile = path.join(destDir, file);
              if (fs.statSync(srcFile).isFile()) {
                try {
                  if (fs.existsSync(destFile)) fs.unlinkSync(destFile);
                  fs.linkSync(srcFile, destFile);
                  console.log(`[Vite] Hardlinked ${file} -> dist/downloads/${file} (0 bytes used)`);
                } catch {
                  try {
                    fs.copyFileSync(srcFile, destFile);
                  } catch (e) {
                    console.warn(`[Vite] Could not link/copy ${file}:`, e);
                  }
                }
              }
            }
          }
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY),
      'process.env.DATABASE_URL': JSON.stringify(process.env.DATABASE_URL)
    },
    server: {
      proxy: {}
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 2000,
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/').toLowerCase();
            if (normalizedId.includes('node_modules')) {
              if (
                normalizedId.includes('/node_modules/react/') ||
                normalizedId.includes('/node_modules/react-dom/') ||
                normalizedId.includes('/node_modules/scheduler/')
              ) {
                return 'vendor-react';
              }
              if (normalizedId.includes('@supabase') || normalizedId.includes('postgrest') || normalizedId.includes('gotrue')) return 'vendor-supabase';
              if (normalizedId.includes('@google/generative-ai')) return 'vendor-ai';
              if (normalizedId.includes('jspdf') || normalizedId.includes('jspdf-autotable')) return 'vendor-pdf';
              if (normalizedId.includes('xlsx')) return 'vendor-xlsx';
              if (normalizedId.includes('lucide-react')) return 'vendor-lucide';
              if (normalizedId.includes('@capacitor')) return 'vendor-capacitor';
              return 'vendor';
            }
            if (normalizedId.includes('src/components/icons')) {
              return 'ui-icons';
            }
          }
        }
      }
    }
  };
});
