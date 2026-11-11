import type { HistoryPoint } from './types';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_GAP_MS = 36 * 60 * 60 * 1000;

/**
 * For series longer than a week, keep one point per UTC day (the last one),
 * plus the very first point so the line starts where tracking started.
 */
export function downsampleDaily(points: HistoryPoint[]): HistoryPoint[] {
  if (points.length < 2 || points[points.length - 1].timestamp - points[0].timestamp <= WEEK_MS) return points;
  const byDay = new Map<string, HistoryPoint>();
  for (const p of points) byDay.set(new Date(p.timestamp).toISOString().slice(0, 10), p);
  const out = Array.from(byDay.values());
  return out[0] === points[0] ? out : [points[0], ...out];
}

/** Five evenly spaced, rounded x-axis ticks. */
export function timeTicks(min: number, max: number): number[] {
  return max > min ? Array.from({ length: 5 }, (_, i) => Math.round(min + ((max - min) * i) / 4)) : [min];
}

/** Y domain with 10% headroom (at least $100), always including zero. */
export function yDomain(values: number[]): [number, number] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(Math.abs(hi - lo) * 0.1, 100);
  return [Math.min(lo - pad, 0), hi + pad];
}

/**
 * Daily P&L from a cumulative series: the difference between consecutive
 * snapshots, attributed to the UTC day of the later snapshot (minus 1s, so a
 * midnight snapshot counts for the day that just ended). Gaps over 36h are
 * skipped rather than dumped onto one day.
 */
export function dailyPnl(history: HistoryPoint[]): { daily: Map<string, number>; start: Date | null } {
  if (!history || history.length < 2) return { daily: new Map(), start: null };
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const daily = new Map<string, number>();
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];
    if (cur.timestamp - prev.timestamp > MAX_GAP_MS) continue;
    const key = new Date(cur.timestamp - 1000).toISOString().split('T')[0];
    daily.set(key, (daily.get(key) || 0) + (cur.pnl - prev.pnl));
  }
  return { daily, start: new Date(sorted[0].timestamp) };
}

export interface MonthSummary {
  total: number;
  winDays: number;
  lossDays: number;
  tradingDays: number;
  bestDay: number;
  bestPnl: number;
}

export function summarizeMonth(get: (day: number) => number | null, lastDay: number): MonthSummary {
  let total = 0,
    winDays = 0,
    lossDays = 0,
    tradingDays = 0,
    bestDay = -1,
    bestPnl = -Infinity;
  for (let d = 1; d <= lastDay; d++) {
    const v = get(d);
    if (v === null) continue;
    total += v;
    tradingDays++;
    if (v > 0) winDays++;
    else if (v < 0) lossDays++;
    if (v > bestPnl) {
      bestPnl = v;
      bestDay = d;
    }
  }
  return { total, winDays, lossDays, tradingDays, bestDay, bestPnl };
}

export function dayTileBg(v: number | null, day: number, s: MonthSummary): string {
  if (v === null) return 'bg-muted/30';
  if (day === s.bestDay && s.bestPnl > 0) return 'bg-yellow-500/60';
  if (Math.abs(v) < 100) return 'bg-muted/40';
  if (v >= 1e4) return 'bg-green-600/60';
  if (v >= 5e3) return 'bg-green-500/50';
  if (v >= 2e3) return 'bg-green-500/40';
  if (v >= 500) return 'bg-green-500/30';
  if (v > 0) return 'bg-green-500/20';
  if (v <= -1e4) return 'bg-red-600/60';
  if (v <= -5e3) return 'bg-red-500/50';
  if (v <= -2e3) return 'bg-red-500/40';
  if (v <= -500) return 'bg-red-500/30';
  return 'bg-red-500/20';
}

export function dayTileText(v: number | null, day: number, s: MonthSummary): string {
  if (v === null) return 'text-muted-foreground/50';
  if (day === s.bestDay && s.bestPnl > 0) return 'text-yellow-600 dark:text-yellow-400';
  if (Math.abs(v) < 100) return 'text-muted-foreground';
  return v >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
}
