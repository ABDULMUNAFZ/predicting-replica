import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, Cell, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatAxis, formatOverview } from '../../lib/format';
import { downsampleDaily, timeTicks, yDomain } from '../../lib/history';
import type { HistoryPoint, TraderDetail } from '../../lib/types';

const POLY = '#3b82f6';
const KALSHI = '#10b981';
const COMBINED = '#f59e0b';
const TICK = { fill: '#8b8b8b', fontSize: 11 };

function HistoryTooltip({ active, payload }: { active?: boolean; payload?: { payload: HistoryPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2">
      <p className="text-xs text-neutral-400 mb-1">
        {new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      <p className={`text-sm font-semibold ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {p.polymarket !== undefined && <span className="text-neutral-400 font-normal">Combined </span>}
        {formatAxis(p.pnl)}
      </p>
      {p.polymarket !== undefined && (
        <>
          <p className="text-xs" style={{ color: POLY }}>
            Polymarket {formatAxis(p.polymarket)}
          </p>
          <p className="text-xs" style={{ color: KALSHI }}>
            Kalshi {formatAxis(p.kalshi ?? 0)}
          </p>
        </>
      )}
    </div>
  );
}

const Card = ({ children, testid }: { children: React.ReactNode; testid?: string }) => (
  <div className="bg-card border border-border rounded-lg p-4" data-testid={testid}>
    {children}
  </div>
);

export function PnlHistory({ kalshiUsername, historyUrl, description }: { kalshiUsername?: string; historyUrl?: string; description?: string }) {
  const url = historyUrl ?? (kalshiUsername ? `/api/kalshi/${kalshiUsername}/history` : null);
  const { data, isLoading, error } = useQuery<{ history: HistoryPoint[] }>({
    queryKey: ['pnl-history', url],
    queryFn: async () => {
      const r = await fetch(url!);
      if (!r.ok) throw new Error('Failed to fetch history');
      return r.json();
    },
    enabled: !!url,
    staleTime: 300_000,
  });

  if (isLoading) {
    return (
      <Card testid="pnl-history">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">P&amp;L History</h3>
        <div className="h-48 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading chart...</div>
        </div>
      </Card>
    );
  }
  if (error || !data?.history || data.history.length === 0) {
    return (
      <Card testid="pnl-history">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">P&amp;L History</h3>
        <div className="h-48 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No historical data available yet</p>
        </div>
      </Card>
    );
  }

  const pts = downsampleDaily(data.history);
  const split = pts.some((p) => p.polymarket !== undefined);
  const values = pts.flatMap((p) => (split ? [p.pnl, p.polymarket ?? 0, p.kalshi ?? 0] : [p.pnl]));
  const domain = yDomain(values);
  const color = split ? COMBINED : pts[pts.length - 1].pnl >= pts[0].pnl ? '#22c55e' : '#ef4444';
  const t0 = pts[0].timestamp;
  const t1 = pts[pts.length - 1].timestamp;
  const longRange = t1 - t0 > 330 * 864e5;
  const fmtTick = (v: number) =>
    new Date(v).toLocaleDateString('en-US', longRange ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' });

  return (
    <Card testid="pnl-history">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">P&amp;L History</h3>
        <div className="relative group">
          <svg className="w-4 h-4 text-muted-foreground/60 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-48">
            <div className="bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2 text-xs text-neutral-300 shadow-lg">
              {description ??
                (historyUrl
                  ? "Cumulative Polymarket P&L from Polymarket, all of this trader's wallets combined."
                  : 'We started tracking Kalshi P&L recently, so historical data may be limited.')}
            </div>
          </div>
        </div>
      </div>
      {split && (
        <div className="-mt-2 mb-2 flex items-center gap-3 text-xs text-muted-foreground">
          {[
            ['Combined', color],
            ['Polymarket', POLY],
            ['Kalshi', KALSHI],
          ].map(([label, c]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5" style={{ background: c }} />
              {label}
            </span>
          ))}
        </div>
      )}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pts} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              ticks={timeTicks(t0, t1)}
              axisLine={false}
              tickLine={false}
              tick={TICK}
              tickFormatter={fmtTick}
            />
            <YAxis domain={domain} axisLine={false} tickLine={false} tick={TICK} tickFormatter={(v: number) => formatAxis(v)} width={55} />
            <ReferenceLine y={0} stroke="#404040" strokeWidth={1} strokeDasharray="3 3" />
            <Tooltip content={<HistoryTooltip />} />
            <Line type="monotone" dataKey="pnl" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} isAnimationActive={!isEval()} />
            {split && <Line type="monotone" dataKey="polymarket" stroke={POLY} strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={!isEval()} />}
            {split && <Line type="monotone" dataKey="kalshi" stroke={KALSHI} strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={!isEval()} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Disable chart animation under automated screenshot evals so frames are deterministic. */
function isEval() {
  return typeof navigator !== 'undefined' && navigator.webdriver === true;
}

function OverviewTooltip({ active, payload }: { active?: boolean; payload?: { payload: { fullLabel: string; pnl: number; trades: number } }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-neutral-800 border border-neutral-600 rounded-lg px-3 py-2">
      <p className="text-xs text-neutral-400 mb-1">{p.fullLabel}</p>
      <p className={`text-sm font-semibold ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatOverview(p.pnl)}</p>
      <p className="text-xs text-neutral-400 mt-1">{p.trades} trades</p>
    </div>
  );
}

/** Bar chart shown for traders without a wallet history (no P&L series). */
export function PnlOverview({ stats }: { stats: TraderDetail['stats'] }) {
  const rows = [
    { label: '24h', fullLabel: '24 Hours', s: stats['1d'] },
    { label: '7d', fullLabel: '7 Days', s: stats['7d'] },
    { label: '30d', fullLabel: '30 Days', s: stats['30d'] },
    { label: 'All', fullLabel: 'All Time', s: stats.all },
  ].map((r) => ({ label: r.label, fullLabel: r.fullLabel, pnl: r.s.pnl, trades: r.s.buys + r.s.sells }));
  const m = Math.max(...rows.map((r) => Math.abs(r.pnl)), 100);
  return (
    <Card testid="pnl-overview">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">P&amp;L Overview</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8b8b8b', fontSize: 12 }} />
            <YAxis domain={[-m * 1.15, m * 1.15]} axisLine={false} tickLine={false} tick={TICK} tickFormatter={(v: number) => formatOverview(v)} width={60} />
            <ReferenceLine y={0} stroke="#404040" strokeWidth={1} />
            <Tooltip content={<OverviewTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="pnl" radius={[4, 4, 4, 4]} maxBarSize={45} isAnimationActive={!isEval()}>
              {rows.map((r, i) => (
                <Cell key={`cell-${i}`} fill={r.pnl >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
