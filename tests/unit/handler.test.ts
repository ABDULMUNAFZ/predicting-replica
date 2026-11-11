import { describe, expect, it } from 'vitest';
import { originalUrl } from '../../api/proxy';
import { handleApi } from '../../server/proxy';

describe('Vercel rewrite path rebuild', () => {
  it('restores nested paths and keeps the real query', () => {
    expect(originalUrl('/api/proxy?__path=trader/aenews/history')).toBe('/api/trader/aenews/history');
    expect(originalUrl('/api/proxy?__path=leaderboard&period=all')).toBe('/api/leaderboard?period=all');
    expect(originalUrl('/api/proxy?period=all&__path=leaderboard')).toBe('/api/leaderboard?period=all');
  });
  it('passes through direct URLs (dev server)', () => {
    expect(originalUrl('/api/leaderboard?period=1d')).toBe('/api/leaderboard?period=1d');
  });
  it('a crafted __path still goes through the allow-list (cannot escape /api/)', async () => {
    const u = originalUrl('/api/proxy?__path=../../etc/passwd');
    const r = await handleApi(u, (() => {
      throw new Error('upstream must not be called');
    }) as unknown as typeof fetch);
    expect(r.status).toBe(404);
  });
});
