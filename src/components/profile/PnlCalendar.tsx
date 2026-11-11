import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDay, formatMonthly, formatWhole } from '../../lib/format';
import { dailyPnl, dayTileBg, dayTileText, summarizeMonth } from '../../lib/history';
import type { HistoryPoint, Platform } from '../../lib/types';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const Chevron = ({ d }: { d: string }) => (
  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

export function topBorder(platform?: Platform): string {
  return platform === 'kalshi' ? 'border-t-green-500/50' : platform === 'both' ? 'border-t-border' : 'border-t-sky-400/50';
}

/** Collapsible month strip + calendar. Mirrors the reference "P&L calendar" widget. */
export function PnlCalendar({ kalshiUsername, historyUrl, platform }: { kalshiUsername?: string; historyUrl?: string; platform?: Platform }) {
  const url = historyUrl ?? (kalshiUsername ? `/api/kalshi/${kalshiUsername}/history` : null);
  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const { data, isLoading } = useQuery<{ history: HistoryPoint[] }>({
    queryKey: ['pnl-history', url],
    queryFn: async () => {
      const r = await fetch(url!);
      if (!r.ok) throw new Error('Failed to fetch history');
      return r.json();
    },
    enabled: !!url && (!!historyUrl || platform === 'kalshi' || platform === 'both'),
    staleTime: 300_000,
  });

  const { daily, start } = dailyPnl(data?.history ?? []);
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const year = first.getFullYear();
  const month = first.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const label = first.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const isCurrent = offset === 0;
  const canGoBack = start ? year > start.getFullYear() || (year === start.getFullYear() && month > start.getMonth()) : true;

  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const get = (d: number) => daily.get(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`) ?? null;
  const summary = summarizeMonth(get, isCurrent ? now.getDate() : daysInMonth);
  const isFuture = (d: number) => (isCurrent ? d > now.getDate() : false);
  const beforeStart = (d: number) => {
    if (!start) return false;
    return new Date(year, month, d) < new Date(start.getFullYear(), start.getMonth(), start.getDate());
  };
  const isStart = (d: number) => (start ? year === start.getFullYear() && month === start.getMonth() && d === start.getDate() : false);

  const thisYear = now.getFullYear();
  const monthly = Array.from({ length: 12 }, () => ({ total: 0, hasData: false }));
  daily.forEach((v, k) => {
    const d = new Date(`${k}T00:00:00`);
    if (d.getFullYear() === thisYear) {
      monthly[d.getMonth()].total += v;
      monthly[d.getMonth()].hasData = true;
    }
  });
  const ytd = monthly.reduce((s, m) => s + (m.hasData ? m.total : 0), 0);
  let bestMonth = -1,
    bestMonthPnl = 0;
  monthly.forEach((m, i) => {
    if (m.hasData && m.total > bestMonthPnl) {
      bestMonthPnl = m.total;
      bestMonth = i;
    }
  });
  const monthBg = (m: { total: number; hasData: boolean }, best: boolean) =>
    m.hasData
      ? best
        ? 'bg-green-500/40'
        : m.total >= 1e4
          ? 'bg-green-500/25'
          : m.total > 0
            ? 'bg-green-500/10'
            : m.total < 0
              ? 'bg-red-500/15'
              : 'bg-muted/30'
      : 'bg-muted/20';

  const border = topBorder(platform);

  if (isLoading) {
    return (
      <div className={`bg-card border border-border rounded-lg p-3 mb-6 border-t-2 ${border}`}>
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-4 bg-muted rounded w-20" />
          <div className="flex-1 flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="w-6 h-6 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stripLast = isCurrent ? now.getDate() : daysInMonth;

  return (
    <div className={`bg-card border border-border rounded-lg mb-6 border-t-2 ${border}`} data-testid="pnl-calendar">
      <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => canGoBack && setOffset((o) => o - 1)}
            className={`p-1 rounded transition-colors ${canGoBack ? 'hover:bg-muted' : 'opacity-30 cursor-not-allowed'}`}
            disabled={!canGoBack}
            title={canGoBack ? 'Previous month' : 'No earlier data'}
          >
            <Chevron d="M15 19l-7-7 7-7" />
          </button>
          <span className="text-sm font-medium text-muted-foreground min-w-[80px] text-center">{label}</span>
          <button
            onClick={() => setOffset((o) => Math.min(o + 1, 0))}
            className={`p-1 rounded transition-colors ${isCurrent ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'}`}
            disabled={isCurrent}
            title="Next month"
          >
            <Chevron d="M9 5l7 7-7 7" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${summary.total >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatWhole(summary.total)}</span>
          <span className="text-xs text-muted-foreground">
            {summary.winDays}W / {summary.lossDays}L
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex gap-0.5">
            {Array.from({ length: Math.min(stripLast, 14) }, (_, i) => {
              const d = stripLast - 13 + i;
              if (d < 1 || beforeStart(d)) return null;
              const v = get(d);
              return (
                <div
                  key={d}
                  className={`w-2 h-4 rounded-sm ${dayTileBg(v, d, summary)}`}
                  title={v !== null ? `Day ${d}: ${formatDay(v)}` : `Day ${d}: No data`}
                />
              );
            })}
          </div>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {open && (
        <div className="px-3 pb-3 border-t border-border/50">
          <div className="flex items-center justify-between mt-3 mb-2" onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
              <button
                onClick={() => setView('daily')}
                className={`px-2.5 py-1 font-medium transition-colors ${view === 'daily' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                Daily
              </button>
              <button
                onClick={() => setView('monthly')}
                className={`px-2.5 py-1 font-medium transition-colors border-l border-border ${view === 'monthly' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
              >
                Monthly
              </button>
            </div>
          </div>

          {view === 'monthly' && (
            <div className="flex flex-col items-center text-center mb-3" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs sm:text-sm font-semibold tracking-widest text-muted-foreground uppercase">{thisYear} YTD</span>
              <span className={`text-4xl sm:text-6xl font-extrabold leading-none tracking-tight ${ytd >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatMonthly(ytd)}
              </span>
            </div>
          )}

          {view === 'monthly' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {MONTHS.map((m, i) => {
                const cell = monthly[i];
                return (
                  <div
                    key={m}
                    className={`rounded-lg border border-border/50 transition-colors flex flex-col items-center justify-center aspect-[3/2] ${monthBg(cell, i === bestMonth)}`}
                    title={cell.hasData ? `${m} ${thisYear}: ${formatWhole(cell.total)}` : `${m}: No data`}
                  >
                    <div className="text-xs sm:text-sm font-semibold tracking-widest text-muted-foreground mb-1">{m}</div>
                    <div
                      className={`text-base sm:text-xl font-bold ${cell.hasData ? (cell.total >= 0 ? 'text-green-500' : 'text-red-500') : 'text-muted-foreground/40'}`}
                    >
                      {cell.hasData ? formatMonthly(cell.total) : '–'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-muted-foreground font-medium">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (d === null) return <div key={`empty-${i}`} className="w-full aspect-square" />;
                  const v = get(d);
                  const today = isCurrent && d === now.getDate();
                  const future = isFuture(d);
                  const startDay = isStart(d);
                  if (beforeStart(d)) {
                    return (
                      <div key={d} className="aspect-square rounded flex items-center justify-center text-[10px]" title="Before tracking started">
                        <span className="text-muted-foreground/20 font-medium">{d}</span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={d}
                      className={`aspect-square rounded flex flex-col items-center justify-center text-[10px] transition-all duration-150 cursor-pointer ${future ? 'bg-muted/20' : dayTileBg(v, d, summary)} ${today ? 'ring-1 ring-primary' : ''} ${startDay ? 'ring-1 ring-blue-400/50' : ''} ${future ? '' : 'hover:scale-110 hover:brightness-110 hover:shadow-md hover:z-10'}`}
                      title={startDay ? 'Tracking started' : v !== null ? formatWhole(v) : 'No data'}
                    >
                      <span className={`font-medium ${future ? 'text-muted-foreground/40' : 'text-foreground/70'}`}>{d}</span>
                      {!future && v !== null && (
                        <span className={`text-[10px] font-bold leading-none ${dayTileText(v, d, summary)}`}>{formatDay(v)}</span>
                      )}
                      {!future && v === null && !startDay && <span className="text-[8px] text-muted-foreground/40">—</span>}
                      {startDay && !future && v === null && <span className="text-[7px] text-blue-400">start</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-red-500/30" />
                  <span>Loss</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-muted/30" />
                  <span>~$0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-green-500/30" />
                  <span>Profit</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded bg-yellow-500/60" />
                  <span>Best</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
