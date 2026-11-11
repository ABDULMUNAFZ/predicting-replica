import { describe, expect, it, vi } from 'vitest';
import { buildUpstreamUrl, handleApi, matchRule } from '../../server/proxy';

const dec = new TextDecoder();
const okJson = (data: unknown) => vi.fn(async () => new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } }));

describe('allow-list', () => {
  it('matches documented endpoints only', () => {
    expect(matchRule('/api/leaderboard')).toBeTruthy();
    expect(matchRule('/api/trader/0xabc')).toBeTruthy();
    expect(matchRule('/api/trader/0xabc/history')).toBeTruthy();
    expect(matchRule('/api/kalshi/foo/categories')).toBeTruthy();
    expect(matchRule('/api/x-avatar/123/abc_bigger.jpg')).toBeTruthy();
    expect(matchRule('/api/submissions')).toBeUndefined();
    expect(matchRule('/api/admin')).toBeUndefined();
    expect(matchRule('/api/trader/a/b/c')).toBeUndefined();
    expect(matchRule('/api/x-avatar/123/../../etc.jpg')).toBeUndefined();
  });
  it('unknown routes return 404 without calling upstream', async () => {
    const f = vi.fn();
    const r = await handleApi('/api/submissions', f as unknown as typeof fetch);
    expect(r.status).toBe(404);
    expect(f).not.toHaveBeenCalled();
  });
});

describe('upstream URL', () => {
  it('forwards only allowed params and clamps invalid periods', () => {
    const u = buildUpstreamUrl(new URL('http://x/api/leaderboard?period=evil&token=secret&limit=5'));
    expect(u).toBe('https://predicting.top/api/leaderboard?period=1d&limit=5');
  });
  it('keeps valid periods', () => {
    expect(buildUpstreamUrl(new URL('http://x/api/leaderboard?period=ytd'))).toContain('period=ytd');
  });
});

describe('handleApi', () => {
  it('passes JSON through with cache headers', async () => {
    const f = okJson({ traders: [] });
    const r = await handleApi('/api/leaderboard?period=1d', f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(r.headers['cache-control']).toContain('s-maxage=30');
    expect(r.headers['x-replica-source']).toBe('upstream');
    expect(JSON.parse(dec.decode(r.body))).toEqual({ traders: [] });
  });
  it('falls back to the bundled snapshot when upstream throws', async () => {
    const f = vi.fn(async () => {
      throw new Error('ECONNRESET');
    });
    const r = await handleApi('/api/leaderboard?period=all', f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(r.headers['x-replica-source']).toBe('snapshot');
    const body = JSON.parse(dec.decode(r.body));
    expect(body._snapshot).toBe(true);
    expect(body.traders.length).toBeGreaterThan(100);
  });
  it('falls back on upstream 5xx for the leaderboard', async () => {
    const f = vi.fn(async () => new Response('boom', { status: 503 }));
    const r = await handleApi('/api/daily-profit', f as unknown as typeof fetch);
    expect(r.status).toBe(200);
    expect(JSON.parse(dec.decode(r.body))._snapshot).toBe(true);
  });
  it('passes a 404 for an unknown trader through (so the UI shows "Trader Not Found")', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 404 }));
    const r = await handleApi('/api/trader/nobody', f as unknown as typeof fetch);
    expect(r.status).toBe(404);
  });
  it('returns 502 for non-fallback routes when upstream is down', async () => {
    const f = vi.fn(async () => {
      throw new Error('down');
    });
    const r = await handleApi('/api/trader/x', f as unknown as typeof fetch);
    expect(r.status).toBe(502);
  });
});
