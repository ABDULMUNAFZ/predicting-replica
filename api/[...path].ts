import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleApi } from '../server/proxy';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('allow', 'GET, HEAD');
    res.end();
    return;
  }
  const result = await handleApi(req.url || '/');
  res.statusCode = result.status;
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.end(req.method === 'HEAD' ? undefined : Buffer.from(result.body));
}
