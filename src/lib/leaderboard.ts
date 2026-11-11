import { parseJoinDate } from './format';
import type { LeaderboardTrader, PlatformFilter, SortKey, UiPeriod } from './types';

/** UI period key to API `period` param. */
export function apiPeriod(p: UiPeriod): string {
  switch (p) {
    case '1d':
      return '1d';
    case '1w':
      return '7d';
    case '1m':
      return '30d';
    case '1q':
      return '90d';
    case 'ytd':
      return 'ytd';
    case 'all':
      return 'all';
  }
}

export interface Filters {
  platform: PlatformFilter;
  affiliatedOnly: boolean;
  linkedOnly: boolean;
  hideSports: boolean;
  hideEsports: boolean;
  bigMovers: boolean;
  search: string;
  period: UiPeriod;
}

export const DEFAULT_FILTERS: Filters = {
  platform: 'all',
  affiliatedOnly: false,
  linkedOnly: false,
  hideSports: true,
  hideEsports: true,
  bigMovers: true,
  search: '',
  period: '1d',
};

const hasText = (s: string | null | undefined) => !!s && s.trim() !== '';

export function passesFilters(t: LeaderboardTrader, f: Filters): boolean {
  if (f.platform !== 'all') {
    const p = t.platform || 'polymarket';
    if (p === 'both') {
      // "both" traders count as Polymarket and as Kalshi, never as Hyperliquid.
      if (f.platform !== 'polymarket' && f.platform !== 'kalshi') return false;
    } else if (p !== f.platform) return false;
  }
  if (f.hideSports && (t.sports_share ?? 0) >= 0.5) return false;
  if (f.hideEsports && (t.esports_share ?? 0) >= 0.5 && !t.twitter?.trim()) return false;
  if (f.linkedOnly && !hasText(t.twitter)) return false;
  if (f.affiliatedOnly && !t.affiliated) return false;
  if (f.search) {
    const q = f.search.toLowerCase();
    const hit =
      t.name.toLowerCase().includes(q) ||
      !!t.wallet?.toLowerCase().includes(q) ||
      !!t.kalshi_username?.toLowerCase().includes(q);
    if (!hit) return false;
  }
  // The $5+ toggle only exists (and only applies) on the 1D view.
  if (f.period === '1d' && f.bigMovers && Math.abs(t.stats.pnl) < 5) return false;
  return true;
}

function sortValue(t: LeaderboardTrader, key: SortKey, period: UiPeriod): number {
  const s = t.smart_score;
  switch (key) {
    case 'pnl':
      return t.stats.pnl;
    case 'score':
      return s?.score ?? 0;
    case 'r2':
      return s?.rSquared ?? 0;
    case 'winrate':
      return s?.winRate ?? 0;
    case 'maxdd':
      return s?.maxDrawdownPercent ?? 0;
    case 'pf':
      return s?.profitFactor ?? 0;
    case 'sharpe':
      if (period === '1d') return s?.sharpe1d ?? 0;
      if (period === '1w') return s?.sharpe1w ?? 0;
      if (period === '1m') return s?.sharpe1m ?? 0;
      return s?.sharpeRatio ?? 0;
    case 'roi':
      return t.roi ?? -Infinity;
    case 'joined':
      return parseJoinDate(t.join_date)?.getTime() ?? 0;
  }
}

/**
 * Sort direction semantics copied from the reference: the first click on a
 * column sets "asc", which sorts ascending and shows a ↓ arrow. With no sort
 * column the API order (rank by P&L) is kept.
 */
export function compareTraders(key: SortKey | null, dir: 'asc' | 'desc', period: UiPeriod) {
  return (a: LeaderboardTrader, b: LeaderboardTrader): number => {
    if (!key) return 0;
    const x = sortValue(a, key, period);
    const y = sortValue(b, key, period);
    // -Infinity - -Infinity is NaN; treat equal sentinels as ties so sort stays stable.
    const d = dir === 'asc' ? x - y : y - x;
    return Number.isNaN(d) ? 0 : d;
  };
}

export function applyLeaderboard(
  traders: LeaderboardTrader[],
  f: Filters,
  sortKey: SortKey | null,
  sortDir: 'asc' | 'desc',
): LeaderboardTrader[] {
  return traders.filter((t) => passesFilters(t, f)).sort(compareTraders(sortKey, sortDir, f.period));
}

export function sortArrow(active: SortKey | null, key: SortKey, dir: 'asc' | 'desc'): string {
  if (active !== key) return '';
  return dir === 'asc' ? ' ↓' : ' ↑';
}

/** Search input sanitizing: max 50 chars, letters, digits, space, _ and -. */
export function sanitizeSearch(v: string): string {
  return v.slice(0, 50).replace(/[^a-zA-Z0-9\s_-]/g, '');
}

export function scoreColor(v: number): string {
  if (v >= 80) return 'text-green-700 dark:text-green-400';
  if (v >= 65) return 'text-green-600 dark:text-green-500';
  if (v >= 50) return 'text-lime-600 dark:text-lime-400';
  if (v >= 35) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-500';
}

export function winRateColor(v: number): string {
  if (v >= 0.65) return 'text-green-700 dark:text-green-400';
  if (v >= 0.55) return 'text-green-600 dark:text-green-500';
  if (v >= 0.45) return 'text-lime-600 dark:text-lime-400';
  if (v >= 0.35) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-500';
}

export function sharpeColor(v: number): string {
  if (v >= 2) return 'text-green-700 dark:text-green-400';
  if (v >= 1.5) return 'text-green-600 dark:text-green-500';
  if (v >= 1) return 'text-lime-600 dark:text-lime-400';
  if (v >= 0.5) return 'text-orange-500 dark:text-orange-400';
  return 'text-red-600 dark:text-red-500';
}

/** Score column text size shrinks as optional columns are switched on. */
export function scoreSizeClass(extraCols: number): string {
  const n = 1 + extraCols;
  if (n <= 1) return 'text-lg sm:text-xl';
  if (n === 2) return 'text-base sm:text-lg';
  return 'text-xs sm:text-sm';
}
