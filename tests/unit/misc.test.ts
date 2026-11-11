import { describe, expect, it } from 'vitest';
import { dailyPnl, downsampleDaily, summarizeMonth, timeTicks, yDomain } from '../../src/lib/history';
import { avatarLarge, avatarSmall, polymarketUrl, profilePath, safeTwitterUrl, stripTracking } from '../../src/lib/links';
import { normalizeHandle, validateSubmission } from '../../src/lib/submit';

const H = 3600_000;
const D = 24 * H;

describe('safeTwitterUrl', () => {
  it('accepts https x.com / twitter.com and bare handles', () => {
    expect(safeTwitterUrl('https://x.com/aenews')).toBe('https://x.com/aenews');
    expect(safeTwitterUrl('@aenews')).toBe('https://x.com/aenews');
    expect(safeTwitterUrl('x.com/aenews')).toBe('https://x.com/aenews');
  });
  it('rejects javascript:, http:, foreign hosts and junk', () => {
    expect(safeTwitterUrl('javascript:alert(1)')).toBeNull();
    expect(safeTwitterUrl('http://x.com/a')).toBeNull();
    expect(safeTwitterUrl('https://evil.com/x.com')).toBeNull();
    expect(safeTwitterUrl('https://x.com/javascript:alert(1)')).toBeNull();
    expect(safeTwitterUrl('a handle with spaces')).toBeNull();
    expect(safeTwitterUrl('')).toBeNull();
  });
});

describe('links', () => {
  it('Kalshi-only traders link by username, others by wallet', () => {
    expect(profilePath({ platform: 'kalshi', kalshi_username: 'k', wallet: '0x1' })).toBe('/account/k');
    expect(profilePath({ platform: 'both', kalshi_username: 'k', wallet: '0x1' })).toBe('/account/0x1');
    expect(profilePath({ platform: 'polymarket', kalshi_username: null, wallet: null })).toBeNull();
  });
  it('rewrites twimg and predicting.top avatars to the same-origin proxy', () => {
    const tw = 'https://pbs.twimg.com/profile_images/1350279872321503234/m9ANAo5E_400x400.jpg';
    expect(avatarSmall(tw)).toBe('/api/x-avatar/1350279872321503234/m9ANAo5E_bigger.jpg');
    expect(avatarLarge(tw)).toBe('/api/x-avatar/1350279872321503234/m9ANAo5E_400x400.jpg');
    expect(avatarSmall('https://predicting.top/api/kalshi-avatar/reval')).toBe('/api/kalshi-avatar/reval');
    expect(avatarSmall('https://example.com/a.png')).toBe('https://example.com/a.png');
  });
  it('outbound links carry no referral codes', () => {
    expect(polymarketUrl('0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1')).toBe('https://polymarket.com/profile/0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1');
    expect(stripTracking('https://polymarket.com/@a?via=unbroken0x')).toBe('https://polymarket.com/@a');
    expect(stripTracking('https://kalshi.com/ideas/profiles/a?referral=predictingtop')).toBe('https://kalshi.com/ideas/profiles/a');
  });
});

describe('history math', () => {
  it('daily P&L is the diff between snapshots, attributed to the earlier UTC day at midnight', () => {
    const t0 = Date.UTC(2026, 10, 1);
    const { daily, start } = dailyPnl([
      { timestamp: t0, pnl: 100 },
      { timestamp: t0 + D, pnl: 150 }, // midnight Nov 2 -> counts for Nov 1
      { timestamp: t0 + D + 12 * H, pnl: 140 }, // Nov 2
    ]);
    expect(daily.get('2026-11-01')).toBe(50);
    expect(daily.get('2026-11-02')).toBe(-10);
    expect(start?.getTime()).toBe(t0);
  });
  it('skips gaps over 36h instead of dumping them on one day', () => {
    const t0 = Date.UTC(2026, 10, 1);
    const { daily } = dailyPnl([
      { timestamp: t0, pnl: 0 },
      { timestamp: t0 + 3 * D, pnl: 9999 },
    ]);
    expect(daily.size).toBe(0);
  });
  it('sorts unsorted input', () => {
    const t0 = Date.UTC(2026, 10, 1);
    const { daily } = dailyPnl([
      { timestamp: t0 + 12 * H, pnl: 30 },
      { timestamp: t0, pnl: 10 },
    ]);
    expect(daily.get('2026-11-01')).toBe(20);
  });
  it('month summary counts wins, losses and best day', () => {
    const vals: Record<number, number> = { 1: 10, 2: -5, 3: 0, 5: 40 };
    const s = summarizeMonth((d) => vals[d] ?? null, 5);
    expect(s).toMatchObject({ total: 45, winDays: 2, lossDays: 1, tradingDays: 4, bestDay: 5, bestPnl: 40 });
  });
  it('downsamples long series to one point per day, keeping the first', () => {
    const t0 = Date.UTC(2026, 0, 1, 6);
    const pts = Array.from({ length: 20 * 4 }, (_, i) => ({ timestamp: t0 + i * 6 * H, pnl: i }));
    const out = downsampleDaily(pts);
    expect(out[0]).toBe(pts[0]);
    // 80 points x 6h from Jan 1 06:00 ends Jan 21 00:00: 21 UTC days + the original first point.
    expect(out.length).toBe(22);
    expect(new Set(out.slice(1).map((p) => new Date(p.timestamp).toISOString().slice(0, 10))).size).toBe(21);
    expect(downsampleDaily(pts.slice(0, 10))).toHaveLength(10);
  });
  it('axis helpers', () => {
    expect(timeTicks(0, 100)).toEqual([0, 25, 50, 75, 100]);
    expect(timeTicks(5, 5)).toEqual([5]);
    expect(yDomain([1000, 2000])).toEqual([0, 2100]);
    expect(yDomain([-500, 50])[0]).toBeLessThan(-500);
  });
});

describe('Get listed validation', () => {
  const ok = { x_handle: '@trader_1', account: '0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1', platform: 'polymarket' as const, pnl: '$125,000', website: '' };
  it('accepts a valid entry', () => expect(validateSubmission(ok)).toBeNull());
  it('normalises X URLs and handles', () => {
    expect(normalizeHandle('https://x.com/foo?s=20')).toBe('foo');
    expect(normalizeHandle('@foo')).toBe('foo');
  });
  it('rejects bad handles, empty account, and bad P&L characters with the reference messages', () => {
    expect(validateSubmission({ ...ok, x_handle: 'has space' })).toMatch(/valid X handle/);
    expect(validateSubmission({ ...ok, x_handle: 'a'.repeat(16) })).toMatch(/valid X handle/);
    expect(validateSubmission({ ...ok, account: '  ' })).toMatch(/Enter your Polymarket wallet/);
    expect(validateSubmission({ ...ok, account: '<script>' })).toMatch(/wallet address, Kalshi username/);
    expect(validateSubmission({ ...ok, pnl: '' })).toBe('Enter your P&L.');
    expect(validateSubmission({ ...ok, pnl: '100%' })).toMatch(/numbers and/);
  });
});
