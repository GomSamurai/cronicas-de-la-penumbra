import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function apiDevPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url || '', 'http://localhost');
        if (url.pathname === '/api/game') {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.end();
            return;
          }

          if (req.method === 'POST') {
            try {
              // Inyectar variables de entorno en process.env (especialmente GEMINI_API_KEY)
              Object.assign(process.env, env);

              const buffers: Buffer[] = [];
              for await (const chunk of req) {
                buffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
              }
              const rawBody = Buffer.concat(buffers).toString('utf-8');
              const body = rawBody ? JSON.parse(rawBody) : {};

              const mockReq = Object.assign(req, { body });
              const mockRes = {
                status(code: number) {
                  res.statusCode = code;
                  return mockRes;
                },
                json(data: any) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return mockRes;
                },
                send(data: any) {
                  res.end(data);
                  return mockRes;
                }
              };

              const mod = await server.ssrLoadModule(path.resolve(__dirname, 'api/game.ts'));
              const handler = mod.default || mod;
              await handler(mockReq, mockRes);
            } catch (err: any) {
              console.error('[API Dev Server Error]:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err?.message || 'Error interno del servidor en desarrollo' }));
            }
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      server: {
        port: 3333,
        host: '0.0.0.0',
      },
      plugins: [react(), apiDevPlugin(env)],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

