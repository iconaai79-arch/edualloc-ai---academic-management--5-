
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Inject env into process.env for SSR context (e.g. api routes loaded via ssrLoadModule)
  process.env.SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL || "";
  process.env.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  process.env.DATABASE_URL = env.DATABASE_URL || "";
  process.env.API_KEY = env.API_KEY || env.VITE_API_KEY || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || "";
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.API_KEY || "";

  return {
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
      'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY),
      'process.env.DATABASE_URL': JSON.stringify(process.env.DATABASE_URL),
      'process.env': {
        NODE_ENV: JSON.stringify(mode),
        API_KEY: JSON.stringify(process.env.API_KEY),
        GEMINI_API_KEY: JSON.stringify(process.env.GEMINI_API_KEY),
        SUPABASE_URL: JSON.stringify(process.env.SUPABASE_URL),
        SUPABASE_ANON_KEY: JSON.stringify(process.env.SUPABASE_ANON_KEY),
        DATABASE_URL: JSON.stringify(process.env.DATABASE_URL)
      }
    },
    server: {
      proxy: {}
    },
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (req.url?.startsWith('/api/') && req.method === 'POST') {
          // Parse the endpoint from the URL (e.g. /api/ai -> ai, /api/integrations -> integrations)
          // Simple check to prevent directory traversal
          const urlParts = req.url.split('?')[0].split('/');
          const endpoint = urlParts[2]; // /api/ai -> [ '', 'api', 'ai' ]

          if (!endpoint || endpoint.includes('..') || endpoint.includes('\\')) {
            next();
            return;
          }

          let body = '';
          req.on('data', (chunk: any) => body += chunk);
          req.on('end', async () => {
            try {
              const payload = body ? JSON.parse(body) : {};
              // Mock Vercel Request/Response
              const vReq: any = {
                method: 'POST',
                body: payload,
                headers: req.headers
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
              const handlerPath = `/api/${endpoint}.ts`;
              const handlerModule = await server.ssrLoadModule(handlerPath);
              await handlerModule.default(vReq, vRes);
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
      });
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000
    }
  };
});
