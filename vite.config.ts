import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleApi } from './server/proxy';

// Runs the same /api handler the Vercel function uses, inside the dev/preview server.
function replicaApi(): Plugin {
  const mw = async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/')) return next();
    const r = await handleApi(req.url);
    res.statusCode = r.status;
    for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
    res.end(Buffer.from(r.body));
  };
  return {
    name: 'replica-api',
    configureServer(server) {
      server.middlewares.use(mw);
    },
    configurePreviewServer(server) {
      server.middlewares.use(mw);
    },
  };
}

export default defineConfig({
  plugins: [react(), replicaApi()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          query: ['@tanstack/react-query', 'wouter'],
          charts: ['recharts'],
        },
      },
    },
  },
});
