import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ThemeToggle } from '../components/ThemeToggle';
import { avatarSmall } from '../lib/links';
import { useTitle } from '../lib/seo';
import { KALSHI_GUIDE, LeaderboardGuide } from './guides';

interface KalshiRow {
  rank: number;
  name: string;
  kalshi_username: string;
  pfp?: string;
  pnl: number;
  profile_path?: string;
  kalshi_url: string;
}

const PERIODS = [
  { key: 'all', label: 'ALL' },
  { key: '30d', label: '1M' },
  { key: '7d', label: '7D' },
  { key: '1d', label: '1D' },
] as const;
const PAGE = 100;

const fmt = (v: number) => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function KAvatar({ row }: { row: KalshiRow }) {
  const [failed, setFailed] = useState(false);
  return row.pfp && !failed ? (
    <img src={avatarSmall(row.pfp)} alt="" loading="lazy" onError={() => setFailed(true)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" />
  ) : (
    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground uppercase">
      {row.name.slice(0, 1)}
    </div>
  );
}

const btn = (on: boolean) =>
  `px-2.5 sm:px-3 py-1 border text-xs sm:text-sm font-medium whitespace-nowrap ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-gray-200 dark:hover:bg-gray-700'}`;

export default function KalshiLeaderboard() {
  useTitle(KALSHI_GUIDE.title);
  const [period, setPeriod] = useState<string>('all');
  const [nonSports, setNonSports] = useState(false);
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(search);
  const { data, isLoading, isError } = useQuery<{ traders: KalshiRow[]; tracked?: number; lastUpdated?: string }>({
    queryKey: ['/api/kalshi-leaderboard', period, nonSports],
    queryFn: async () => {
      const r = await fetch(`/api/kalshi-leaderboard?period=${period}&limit=1000${nonSports ? '&nonSports=1' : ''}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 300_000,
  });
  const rows = useMemo(() => {
    const all = data?.traders ?? [];
    const s = q.trim().toLowerCase();
    return s ? all.filter((r) => r.name.toLowerCase().includes(s) || r.kalshi_username.toLowerCase().includes(s)) : all;
  }, [data, q]);

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-5 overflow-x-hidden" data-testid="kalshi-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl sm:text-2xl font-normal">Kalshi Leaderboard</h1>
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xs sm:text-sm px-2 sm:px-3 py-1 border border-border hover:bg-primary hover:text-primary-foreground">
                All platforms
              </Link>
              <ThemeToggle />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            The top {data?.tracked ? data.tracked.toLocaleString('en-US') : '1,000'} Kalshi traders, tracked over time
          </p>
          {data?.lastUpdated && (
            <p className="text-xs text-muted-foreground">
              P&amp;L updated{' '}
              {new Date(data.lastUpdated).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">P&amp;L:</span>
            <div className="flex gap-1">
              {PERIODS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setPeriod(key);
                    setLimit(PAGE);
                  }}
                  className={btn(period === key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setNonSports((v) => !v);
                setLimit(PAGE);
              }}
              title="Only traders who make most of their profit outside sports"
              className={btn(nonSports)}
            >
              Non-sports
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Search Kalshi traders..."
              maxLength={50}
              autoComplete="off"
              spellCheck={false}
              className="px-3 py-1 border border-border bg-background text-foreground text-sm w-full sm:w-56 focus:ring-2 focus:ring-ring"
            />
            <span className="text-sm whitespace-nowrap">{rows.length.toLocaleString('en-US')} traders</span>
          </div>
        </div>

        {isError && <p className="text-sm text-muted-foreground py-8 text-center">Could not load the Kalshi leaderboard.</p>}
        {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading Kalshi traders…</p>}
        {!isLoading && !isError && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? 'No traders match that search.' : 'Kalshi traders are still being collected. Check back shortly.'}
          </p>
        )}

        {rows.length > 0 && (
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-1 sm:p-3 font-normal w-10 sm:w-16 text-sm sm:text-lg">#</th>
                <th className="p-0.5 sm:p-2 font-normal w-9 sm:w-14" />
                <th className="text-left p-1 sm:p-3 font-normal text-sm sm:text-lg">Trader</th>
                <th className="text-right p-1 sm:p-3 font-normal text-sm sm:text-lg">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((r) => (
                <tr key={r.kalshi_username} className="border-b border-border hover:bg-muted/50">
                  <td className="p-1 sm:p-3 text-sm sm:text-base text-muted-foreground">{r.rank}</td>
                  <td className="p-0.5 sm:p-2">
                    <KAvatar row={r} />
                  </td>
                  <td className="p-1 sm:p-3 text-sm sm:text-base truncate">
                    {r.profile_path ? (
                      <Link href={r.profile_path} className="hover:underline">
                        {r.name}
                      </Link>
                    ) : (
                      <a href={r.kalshi_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {r.name}
                      </a>
                    )}
                    {r.profile_path && r.name !== r.kalshi_username && <span className="text-muted-foreground text-xs ml-2">@{r.kalshi_username}</span>}
                  </td>
                  <td className={`p-1 sm:p-3 text-right text-sm sm:text-base tabular-nums ${r.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(r.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {rows.length > limit && (
          <div className="flex justify-center mt-6">
            <button onClick={() => setLimit((l) => l + PAGE)} className="text-sm px-4 py-2 border border-border hover:bg-primary hover:text-primary-foreground">
              Show more ({(rows.length - limit).toLocaleString('en-US')} left)
            </button>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-8">
          Rankings come from Kalshi's public profiles. Daily, weekly and monthly P&amp;L are measured from our own snapshots, so they fill in over the first
          days a trader is tracked.
        </p>
        <LeaderboardGuide guide={KALSHI_GUIDE} />
      </div>
    </div>
  );
}
