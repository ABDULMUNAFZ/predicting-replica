import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/leaderboard-1d.json';
import {
  apiPeriod,
  applyLeaderboard,
  compareTraders,
  DEFAULT_FILTERS,
  passesFilters,
  sanitizeSearch,
  scoreColor,
  scoreSizeClass,
  sortArrow,
} from '../../src/lib/leaderboard';
import type { LeaderboardTrader } from '../../src/lib/types';

const traders = (fixture as { traders: LeaderboardTrader[] }).traders;

function t(over: Partial<LeaderboardTrader>): LeaderboardTrader {
  return {
    rank: 1,
    name: 'x',
    wallet: null,
    additional_wallets: [],
    wallet_count: 0,
    twitter: '',
    pfp: '',
    polymarket_profile: '',
    platform: 'polymarket',
    kalshi_profile: '',
    kalshi_username: null,
    myriad_profile: '',
    myriad_username: null,
    stats: { pnl: 100, buys: 0, sells: 0 },
    allTimePnl: 0,
    join_date: '2025-01-01',
    smart_score: null,
    affiliated: false,
    ...over,
  };
}

describe('period mapping', () => {
  it('maps UI keys to API params', () => {
    expect(apiPeriod('1d')).toBe('1d');
    expect(apiPeriod('1m')).toBe('30d');
    expect(apiPeriod('1w')).toBe('7d');
    expect(apiPeriod('ytd')).toBe('ytd');
    expect(apiPeriod('all')).toBe('all');
  });
});

describe('filters', () => {
  const f = { ...DEFAULT_FILTERS, hideSports: false, hideEsports: false, bigMovers: false };
  it('"both" traders show under Polymarket and Kalshi but not Hyperliquid', () => {
    const both = t({ platform: 'both' });
    expect(passesFilters(both, { ...f, platform: 'polymarket' })).toBe(true);
    expect(passesFilters(both, { ...f, platform: 'kalshi' })).toBe(true);
    expect(passesFilters(both, { ...f, platform: 'hyperliquid' })).toBe(false);
  });
  it('No sports hides traders with >= 50% sports share; exactly 0.5 is hidden', () => {
    expect(passesFilters(t({ sports_share: 0.5 }), { ...f, hideSports: true })).toBe(false);
    expect(passesFilters(t({ sports_share: 0.49 }), { ...f, hideSports: true })).toBe(true);
  });
  it('No esports only hides esports traders WITHOUT an X account', () => {
    expect(passesFilters(t({ esports_share: 0.9, twitter: '' }), { ...f, hideEsports: true })).toBe(false);
    expect(passesFilters(t({ esports_share: 0.9, twitter: 'https://x.com/a' }), { ...f, hideEsports: true })).toBe(true);
    expect(passesFilters(t({ esports_share: 0.9, twitter: '   ' }), { ...f, hideEsports: true })).toBe(false);
  });
  it('$5+ applies on 1D only', () => {
    const small = t({ stats: { pnl: 4.99, buys: 0, sells: 0 } });
    expect(passesFilters(small, { ...f, bigMovers: true, period: '1d' })).toBe(false);
    expect(passesFilters(small, { ...f, bigMovers: true, period: 'all' })).toBe(true);
    expect(passesFilters(t({ stats: { pnl: -5, buys: 0, sells: 0 } }), { ...f, bigMovers: true, period: '1d' })).toBe(true);
  });
  it('search matches name, wallet or Kalshi username, case-insensitive', () => {
    const tr = t({ name: 'Alpha', wallet: '0xABCdef', kalshi_username: 'kuser' });
    expect(passesFilters(tr, { ...f, search: 'alp' })).toBe(true);
    expect(passesFilters(tr, { ...f, search: 'abcd' })).toBe(true);
    expect(passesFilters(tr, { ...f, search: 'KUS' })).toBe(true);
    expect(passesFilters(tr, { ...f, search: 'zzz' })).toBe(false);
  });
  it('linked and affiliated toggles', () => {
    expect(passesFilters(t({ twitter: '' }), { ...f, linkedOnly: true })).toBe(false);
    expect(passesFilters(t({ affiliated: false }), { ...f, affiliatedOnly: true })).toBe(false);
  });
  it('default filters on the real snapshot keep only a subset and never invent rows', () => {
    const out = applyLeaderboard(traders, DEFAULT_FILTERS, null, 'asc');
    expect(out.length).toBeGreaterThan(300);
    expect(out.length).toBeLessThan(traders.length);
    expect(out.every((x) => Math.abs(x.stats.pnl) >= 5)).toBe(true);
    // No sort selected: API order (rank) is preserved.
    expect(out.map((x) => x.rank)).toEqual([...out.map((x) => x.rank)].sort((a, b) => a - b));
  });
});

describe('sorting', () => {
  it('first click is "asc" (ascending) with a down arrow, matching the reference', () => {
    const rows = [t({ stats: { pnl: 5, buys: 0, sells: 0 } }), t({ stats: { pnl: -1, buys: 0, sells: 0 } }), t({ stats: { pnl: 9, buys: 0, sells: 0 } })];
    expect([...rows].sort(compareTraders('pnl', 'asc', '1d')).map((r) => r.stats.pnl)).toEqual([-1, 5, 9]);
    expect([...rows].sort(compareTraders('pnl', 'desc', '1d')).map((r) => r.stats.pnl)).toEqual([9, 5, -1]);
    expect(sortArrow('pnl', 'pnl', 'asc')).toBe(' ↓');
    expect(sortArrow('pnl', 'pnl', 'desc')).toBe(' ↑');
    expect(sortArrow('score', 'pnl', 'asc')).toBe('');
  });
  it('ROI sort treats missing ROI as lowest and does not produce NaN comparisons', () => {
    const rows = [t({ name: 'a' }), t({ name: 'b', roi: 0.1 }), t({ name: 'c' })];
    const cmp = compareTraders('roi', 'desc', 'all');
    expect(Number.isNaN(cmp(rows[0], rows[2]))).toBe(false);
    expect([...rows].sort(cmp)[0].name).toBe('b');
  });
  it('Sharpe sort uses the period-specific Sharpe', () => {
    const a = t({ name: 'a', smart_score: { tier: 'Good', score: 1, winRate: 0, sharpeRatio: 9, sharpe1d: 1, maxDrawdownPercent: 0, profitFactor: 0, rSquared: 0 } });
    const b = t({ name: 'b', smart_score: { tier: 'Good', score: 1, winRate: 0, sharpeRatio: 1, sharpe1d: 5, maxDrawdownPercent: 0, profitFactor: 0, rSquared: 0 } });
    expect([a, b].sort(compareTraders('sharpe', 'desc', '1d'))[0].name).toBe('b');
    expect([a, b].sort(compareTraders('sharpe', 'desc', 'all'))[0].name).toBe('a');
  });
});

describe('UI helpers', () => {
  it('search input strips symbols and caps at 50 chars', () => {
    expect(sanitizeSearch('<script>alert(1)</script>')).toBe('scriptalert1script');
    expect(sanitizeSearch('a'.repeat(80))).toHaveLength(50);
    expect(sanitizeSearch('ab_c-d e')).toBe('ab_c-d e');
  });
  it('score colour bands', () => {
    expect(scoreColor(80)).toContain('green-700');
    expect(scoreColor(79.9)).toContain('green-600');
    expect(scoreColor(50)).toContain('lime');
    expect(scoreColor(35)).toContain('orange');
    expect(scoreColor(34.9)).toContain('red');
  });
  it('score text shrinks as columns are added', () => {
    expect(scoreSizeClass(0)).toBe('text-lg sm:text-xl');
    expect(scoreSizeClass(1)).toBe('text-base sm:text-lg');
    expect(scoreSizeClass(3)).toBe('text-xs sm:text-sm');
  });
});
