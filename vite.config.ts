
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import fs from 'node:fs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Inject env into process.env for SSR context (e.g. api routes loaded via ssrLoadModule)
  process.env.SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";
  process.env.DATABASE_URL = env.DATABASE_URL || env.VITE_DATABASE_URL || "";
  process.env.API_KEY = env.API_KEY || env.VITE_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "";
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || "";

  return {
    plugins: [
      react(),
      {
        name: 'api-middleware',
        configureServer(server: any) {
          const apiMiddleware = async (req: any, res: any, next: any) => {
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

              if (req.method === 'OPTIONS') {
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
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/').toLowerCase();
            if (normalizedId.includes('node_modules') || normalizedId.includes('src/services') || normalizedId.includes('src/utils') || normalizedId.includes('src/lib')) {
              return 'vendor';
            }
            if (normalizedId.includes('src/components/icons')) {
              return 'ui-icons';
            }
            if (normalizedId.includes('src/components/superadminview')) {
              return 'view-superadmin';
            }
            if (normalizedId.includes('src/components/adminview')) {
              return 'view-admin';
            }
          }
        }
      }
    }
  };
});
