import { describe, expect, it } from 'vitest';
import {
  daysAgo,
  formatAxis,
  formatCategory,
  formatDay,
  formatJoinMonth,
  formatMonthly,
  formatMover,
  formatPnl,
  formatShareAmount,
  formatTitlePnl,
  formatWhole,
  parseJoinDate,
  shortWallet,
  shortWalletName,
} from '../../src/lib/format';

describe('formatPnl (leaderboard P&L cell)', () => {
  it('shows cents with a sign on desktop', () => {
    expect(formatPnl(103514.301).full).toBe('+$103,514.30');
    // Reference quirk: negatives render as "$-42.50" (sign prefix is only added for >= 0). Kept for parity.
    expect(formatPnl(-42.5).full).toBe('$-42.50');
    expect(formatPnl(0).full).toBe('+$0.00');
  });
  it('compacts to k at 100k and M at 1M on phones, and keeps full below 100k', () => {
    expect(formatPnl(103514.3).compact).toBe('+$104k');
    expect(formatPnl(90218.84).compact).toBe('+$90,218.84');
    expect(formatPnl(4919109.43).compact).toBe('+$4.9M');
    expect(formatPnl(-250000).compact).toBe('$-250k');
  });
});

describe('formatMover (biggest move chip)', () => {
  it('rounds to whole K and uses an explicit minus', () => {
    expect(formatMover(105816)).toBe('+$106K');
    expect(formatMover(-2400)).toBe('-$2K');
    expect(formatMover(312)).toBe('+$312');
    expect(formatMover(1_250_000)).toBe('+$1.3M');
  });
});

describe('profile and chart formatters', () => {
  it('title P&L uses 2dp M and 1dp K', () => {
    expect(formatTitlePnl(4919109.43)).toBe('+$4.92M');
    expect(formatTitlePnl(12345)).toBe('+$12.3K');
    expect(formatTitlePnl(-999)).toBe('$-999'); // same reference quirk as formatPnl
  });
  it('axis labels', () => {
    expect(formatAxis(1_500_000)).toBe('+$1.5M');
    expect(formatAxis(-25_000)).toBe('-$25K');
    expect(formatAxis(0)).toBe('+$0');
  });
  it('category rows', () => {
    expect(formatCategory(1_220_000)).toBe('+$1.22M');
    expect(formatCategory(-10_200)).toBe('-$10.2K');
    expect(formatCategory(348)).toBe('+$348');
  });
  it('calendar formats', () => {
    expect(formatWhole(12345.6)).toBe('+$12,346');
    expect(formatWhole(-5)).toBe('-$5');
    expect(formatDay(1234)).toBe('+$1.2K');
    expect(formatDay(-87)).toBe('-$87');
    expect(formatMonthly(1_234_567)).toBe('+$1.23M');
    expect(formatMonthly(12_345)).toBe('+$12.35K');
  });
  it('share text amounts', () => {
    expect(formatShareAmount(4_919_109)).toBe('$4.92M');
    expect(formatShareAmount(185_123)).toBe('$185K');
    expect(formatShareAmount(12_345)).toBe('$12.3K');
    expect(formatShareAmount(-950)).toBe('$950');
  });
});

describe('join dates', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  it('parses ISO, YYYY-MM-DD and "Mon YYYY"', () => {
    expect(parseJoinDate('2024-01-13T23:31:49.73Z')?.toISOString()).toBe('2024-01-13T23:31:49.730Z');
    expect(parseJoinDate('Oct 2025')?.getMonth()).toBe(9);
    expect(parseJoinDate('')).toBeNull();
    expect(parseJoinDate('not a date')).toBeNull();
  });
  it('days ago', () => {
    expect(daysAgo('2026-11-11T11:00:00Z', now).short).toBe('0d');
    expect(daysAgo('2026-11-10T11:00:00Z', now).short).toBe('1d');
    expect(daysAgo('2024-01-13T23:31:49.73Z', now).short).toBe('1032d');
    expect(daysAgo(null, now).short).toBe('–');
  });
  it('profile header month', () => {
    expect(formatJoinMonth('Oct 2025')).toBe('Oct 2025');
    expect(formatJoinMonth('october 2025')).toBe('Oct 2025');
    expect(formatJoinMonth('2024-01-13T23:31:49.73Z')).toBe('Jan 2024');
  });
});

describe('wallet shortening', () => {
  const w = '0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1';
  it('table uses an ellipsis character only for real 40-hex wallets', () => {
    expect(shortWalletName(w)).toBe('0x44c1…ebc1');
    expect(shortWalletName('aenews')).toBe('aenews');
  });
  it('profile uses three dots above 12 chars', () => {
    expect(shortWallet(w)).toBe('0x44c1...ebc1');
    expect(shortWallet('short')).toBe('short');
  });
});
