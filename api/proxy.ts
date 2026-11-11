import type { IncomingMessage, ServerResponse } from 'node:http';
// Explicit .js: Vercel runs this file as native Node ESM, which needs full specifiers.
import { handleApi } from '../server/proxy.js';

/**
 * Single function behind every /api/* path. vercel.json rewrites
 * /api/<anything> to /api/proxy?__path=<anything>; the original path is
 * rebuilt here. (A `[...path].ts` catch-all only matched one segment on
 * Vercel's non-Next runtime: see docs/BUG_LOG.md, BUG-15.)
 */
export function originalUrl(raw: string): string {
  const u = new URL(raw, 'http://local');
  const p = u.searchParams.get('__path');
  if (p === null) return u.pathname + u.search;
  u.searchParams.delete('__path');
  const qs = u.searchParams.toString();
  return `/api/${p}${qs ? `?${qs}` : ''}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('allow', 'GET, HEAD');
    res.end();
    return;
  }
  const result = await handleApi(originalUrl(req.url || '/'));
  res.statusCode = result.status;
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.end(req.method === 'HEAD' ? undefined : Buffer.from(result.body));
}
