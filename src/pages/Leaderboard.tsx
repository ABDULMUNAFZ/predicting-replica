import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ThemeToggle } from '../components/ThemeToggle';
import { formatMover, formatPnl, daysAgo, shortWalletName } from '../lib/format';
import {
  apiPeriod,
  applyLeaderboard,
  sanitizeSearch,
  scoreColor,
  scoreSizeClass,
  sharpeColor,
  sortArrow,
  winRateColor,
  type Filters,
} from '../lib/leaderboard';
import { avatarSmall, polymarketUrl, profilePath, safeTwitterUrl } from '../lib/links';
import { useTitle } from '../lib/seo';
import type { DailyProfit, LeaderboardResponse, LeaderboardTrader, PlatformFilter, SortKey, UiPeriod } from '../lib/types';
import { PolymarketGuide, POLYMARKET_GUIDE } from './guides';

const LOGO = {
  polymarket: '/logos/polymarket.jpg',
  kalshi: '/logos/kalshi.jpg',
  hyperliquid: '/logos/hyperliquid.png',
  x: '/logos/x.jpg',
  myriad: '/logos/myriad.jpg',
  pt: '/logos/pt.jpg',
};

const OFF_BTN =
  'bg-background text-foreground border-border hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500';
const ON_BTN = 'bg-primary text-primary-foreground border-primary';

async function fetchLeaderboard(p: UiPeriod): Promise<LeaderboardResponse> {
  const r = await fetch(`/api/leaderboard?period=${apiPeriod(p)}`);
  if (!r.ok) throw new Error(r.status === 429 ? 'Rate limited - please wait a moment' : 'Failed to fetch leaderboard');
  return r.json();
}

const pageSize = () => (typeof window !== 'undefined' && window.innerWidth < 768 ? 15 : 30);

type ExtraCol = 'sharpe' | 'winrate' | 'roi';

export default function Leaderboard({ platform }: { platform?: 'polymarket' } = {}) {
  const guide = platform === 'polymarket' ? POLYMARKET_GUIDE : null;
  useTitle(guide?.title ?? 'Prediction Market Leaderboard — Top Polymarket & Kalshi Traders | predicting.top');

  const qc = useQueryClient();
  const [period, setPeriod] = useState<UiPeriod>('1d');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [platformF, setPlatformF] = useState<PlatformFilter>(platform ?? 'all');
  const [affiliatedOnly, setAffiliatedOnly] = useState(false);
  const [linkedOnly, setLinkedOnly] = useState(false);
  const [hideSports, setHideSports] = useState(true);
  const [hideEsports, setHideEsports] = useState(true);
  const [bigMovers, setBigMovers] = useState(true);
  const step = useRef(pageSize()).current;
  const [visible, setVisible] = useState(step);
  const [extra, setExtra] = useState<Set<ExtraCol>>(new Set());

  const prefetch = (p: UiPeriod) => {
    if (p === period) return;
    qc.prefetchQuery({ queryKey: ['/api/leaderboard', p], queryFn: () => fetchLeaderboard(p), staleTime: 60_000 });
  };

  const { data: daily } = useQuery<DailyProfit>({
    queryKey: ['/api/daily-profit'],
    queryFn: async () => {
      const r = await fetch('/api/daily-profit');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 60_000,
  });

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['/api/leaderboard', period],
    queryFn: () => fetchLeaderboard(period),
    staleTime: 60_000,
    gcTime: 300_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
    retry: 3,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 10_000),
  });

  // Warm the other periods once the first payload is in, like the reference.
  const warmed = useRef(false);
  useEffect(() => {
    if (!data || warmed.current) return;
    const run = () => {
      warmed.current = true;
      (['1d', '1m', 'ytd', 'all'] as UiPeriod[]).forEach((p) => p !== period && prefetch(p));
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(run, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data]);

  const filters: Filters = {
    platform: platformF,
    affiliatedOnly,
    linkedOnly,
    hideSports,
    hideEsports,
    bigMovers,
    search,
    period,
  };
  const rows = useMemo(
    () => (data?.traders ? applyLeaderboard(data.traders, filters, sortKey, sortDir) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.traders, platformF, affiliatedOnly, linkedOnly, hideSports, hideEsports, search, sortKey, sortDir, period, bigMovers],
  );
  const shown = useDeferredValue(rows);

  const onSort = (k: SortKey) => {
    const dir = sortKey === k ? (sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    setVisible(step);
    setSortKey(k);
    setSortDir(dir);
  };
  const toggleExtra = (k: ExtraCol) =>
    setExtra((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const compact = extra.size > 0;
  const cellText = compact ? 'text-xs sm:text-base' : 'text-sm sm:text-lg';
  const scoreText = scoreSizeClass(extra.size);
  const iconSize = compact ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-5 h-5 sm:w-6 sm:h-6';
  const sharpeLabel = period === '1d' ? '3D' : period === '1w' ? '7D' : period === '1m' ? '30D' : '';
  const sharpeTitle = period === '1d' ? '3D' : period === '1w' ? '7D' : period === '1m' ? '30D' : 'All time';

  if (isLoading) return <LoadingSkeleton heading={guide?.heading} subtitle={guide?.subtitle} />;

  const lastUpdated = data?.lastUpdated && !isNaN(new Date(data.lastUpdated).getTime()) ? new Date(data.lastUpdated) : null;

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-5 overflow-x-hidden" data-testid="leaderboard-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl sm:text-2xl font-normal text-foreground" data-testid="page-title">
              {guide?.heading ?? 'Prediction Market Leaderboard'}
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <p className="text-muted-foreground text-sm">
                {guide?.subtitle ?? 'Top Polymarket, Kalshi & Hyperliquid traders, ranked by P&L in real time'}
              </p>
              {lastUpdated && (
                <p className="text-xs text-muted-foreground" data-testid="last-updated">
                  P&amp;L updated{' '}
                  {lastUpdated.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              )}
            </div>
            {daily && (
              <p className="text-lg font-semibold">
                Today:{' '}
                <span className={daily.daily_profit.startsWith('+') ? 'text-green-500' : 'text-red-500'}>{daily.daily_profit}</span>
              </p>
            )}
          </div>
        </div>

        {isError && data && (
          <div className="mb-4 p-3 border border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm">
            Having trouble refreshing data. Showing cached results. {(error as Error)?.message}
          </div>
        )}

        <div className="mb-5 space-y-3" data-testid="controls-section">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <input
                id="leaderboard-search"
                name="leaderboard-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(sanitizeSearch(e.target.value))}
                placeholder="Search traders..."
                maxLength={50}
                autoComplete="off"
                spellCheck={false}
                className="px-3 py-1 border border-border bg-background text-foreground text-sm w-full sm:w-48 focus:ring-2 focus:ring-ring"
                data-testid="input-search"
              />
              <div className="text-sm text-foreground" data-testid="results-count">
                {rows.length} of {data?.traders.length || 0} traders
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-sm px-2 py-1 border border-border hover:bg-primary hover:text-primary-foreground "
                  data-testid="button-clear-search"
                >
                  Clear
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:inline">P&amp;L:</span>
              <div className="flex gap-1" data-testid="period-selector">
                {(
                  [
                    { key: 'all', label: 'ALL' },
                    { key: 'ytd', label: 'YTD' },
                    { key: '1m', label: '1M' },
                    { key: '1d', label: '1D' },
                  ] as { key: UiPeriod; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key !== period) setVisible(step);
                      setPeriod(key);
                    }}
                    onMouseEnter={() => prefetch(key)}
                    onFocus={() => prefetch(key)}
                    className={`px-2.5 sm:px-3 py-1 border text-xs sm:text-sm font-medium  whitespace-nowrap ${period === key ? ON_BTN : OFF_BTN}`}
                    data-testid={`button-period-${key}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {period === '1d' && (
                <button
                  onClick={() => {
                    setVisible(step);
                    setBigMovers(!bigMovers);
                  }}
                  className={`px-2 sm:px-2.5 py-1 border text-xs sm:text-sm  whitespace-nowrap ${bigMovers ? ON_BTN : OFF_BTN}`}
                  data-testid="button-big-movers-filter"
                  title={bigMovers ? 'Showing traders with ±$5+ daily P&L' : 'Click to filter to big movers only'}
                >
                  $5+
                </button>
              )}
            </div>

            <div className="flex gap-2 items-center flex-wrap" data-testid="platform-filter">
              <div className="flex items-center gap-1 border border-border rounded-sm overflow-hidden">
                {(
                  [
                    { key: 'polymarket', title: 'Polymarket traders', logo: LOGO.polymarket, sr: 'Polymarket' },
                    { key: 'kalshi', title: 'Kalshi traders', logo: LOGO.kalshi, sr: 'Kalshi' },
                    { key: 'hyperliquid', title: 'Hyperliquid HIP-4 traders', logo: LOGO.hyperliquid, sr: 'Hyperliquid' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setVisible(step);
                      setPlatformF(p.key);
                    }}
                    className={`px-2 py-1 flex items-center gap-1 text-xs sm:text-sm  ${platformF === p.key ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                    data-testid={`button-platform-${p.key}`}
                    title={p.title}
                  >
                    <img src={p.logo} alt="" className="w-5 h-5" />
                    <span className="sr-only">{p.sr}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setVisible(step);
                    setPlatformF('all');
                  }}
                  className={`px-2 py-1 text-xs sm:text-sm  ${platformF === 'all' ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  data-testid="button-platform-all"
                  title="All platforms"
                >
                  All
                </button>
              </div>
              <button
                onClick={() => {
                  setVisible(step);
                  setAffiliatedOnly(!affiliatedOnly);
                }}
                className={`p-1 border text-xs sm:text-sm  flex items-center justify-center min-w-[28px] min-h-[28px] flex-shrink-0 ${affiliatedOnly ? ON_BTN : OFF_BTN}`}
                data-testid="button-affiliated-filter"
                title={affiliatedOnly ? 'Showing our affiliated traders' : 'Click to show our traders'}
              >
                <img src={LOGO.pt} alt="PT" className="w-5 h-5 rounded-full" loading="eager" decoding="sync" />
              </button>
              <button
                onClick={() => {
                  setVisible(step);
                  setLinkedOnly(!linkedOnly);
                }}
                className={`px-2 py-1 border text-xs sm:text-sm  flex items-center gap-1 whitespace-nowrap ${linkedOnly ? ON_BTN : OFF_BTN}`}
                data-testid="button-twitter-filter"
                title={linkedOnly ? 'Showing traders with Twitter only' : 'Showing all traders'}
              >
                <img src={LOGO.x} alt="" className="w-3.5 h-3.5" />
                <span className="text-xs">linked</span>
              </button>
              <button
                onClick={() => {
                  setVisible(step);
                  setHideSports(!hideSports);
                }}
                className={`px-2 py-1 border text-xs sm:text-sm whitespace-nowrap ${hideSports ? ON_BTN : OFF_BTN}`}
                data-testid="button-sports-filter"
                title={hideSports ? 'Hiding traders who make most of their profit on sports' : 'Showing sports traders'}
              >
                <span className="text-xs">No sports</span>
              </button>
              <button
                onClick={() => {
                  setVisible(step);
                  setHideEsports(!hideEsports);
                }}
                className={`px-2 py-1 border text-xs sm:text-sm whitespace-nowrap ${hideEsports ? ON_BTN : OFF_BTN}`}
                data-testid="button-esports-filter"
                title={hideEsports ? 'Hiding esports traders without an X account' : 'Showing esports traders'}
              >
                <span className="text-xs">No esports</span>
              </button>
              <div className="hidden sm:flex gap-1 ml-1">
                {(
                  [
                    { key: 'sharpe', label: 'Sharpe', tip: 'Sharpe ratio (changes with selected period)' },
                    { key: 'winrate', label: 'Win%', tip: '% of days with positive returns' },
                    {
                      key: 'roi',
                      label: 'ROI',
                      tip: 'All-time Polymarket P&L / total amount staked across every position. Not affected by deposits, withdrawals or tips. Polymarket only.',
                    },
                  ] as { key: ExtraCol; label: string; tip: string }[]
                ).map(({ key, label, tip }) => (
                  <button
                    key={key}
                    title={tip}
                    onClick={() => toggleExtra(key)}
                    data-testid={`button-column-${key}`}
                    className={`px-2 py-1 border text-xs  ${extra.has(key) ? ON_BTN : 'bg-background text-muted-foreground border-border hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mb-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">Score</span> = consistency 25% * returns 25% * win rate 20% * max loss 15% *
          profit factor 15% <span className="mx-2">|</span> <span className="font-medium text-foreground/70">Sharpe</span> = return /
          volatility
        </p>

        <div className="overflow-hidden">
          <table className="w-full border-collapse table-fixed" data-testid="leaderboard-table">
            <thead>
              <tr className="border-b border-border">
                <th className={`text-left p-1 sm:p-3 font-normal text-foreground w-6 sm:w-12 ${compact ? 'text-xs sm:text-base' : 'text-sm sm:text-lg'}`}>#</th>
                <th className="p-0.5 sm:p-2 font-normal text-foreground w-7 sm:w-14" />
                <th className={`text-left p-1 sm:p-3 font-normal text-foreground md:min-w-[280px] ${compact ? 'text-xs sm:text-base' : 'text-sm sm:text-lg'}`}>
                  Trader
                </th>
                <th
                  className={`text-left p-2 font-normal text-foreground hidden md:table-cell whitespace-nowrap w-16 cursor-pointer hover:bg-muted ${compact ? 'text-xs sm:text-base' : 'text-base sm:text-lg'}`}
                  onClick={() => onSort('joined')}
                  data-testid="header-joined"
                >
                  Joined{sortArrow(sortKey, 'joined', sortDir)}
                </th>
                <th
                  className={`text-center p-1 sm:p-2 font-normal text-foreground cursor-pointer hover:bg-muted whitespace-nowrap ${scoreText}`}
                  onClick={() => onSort('score')}
                  data-testid="header-score"
                >
                  Score{sortArrow(sortKey, 'score', sortDir)}
                </th>
                {extra.has('sharpe') && (
                  <th
                    className={`text-center p-1 sm:p-2 font-normal text-foreground hidden sm:table-cell cursor-pointer hover:bg-muted whitespace-nowrap ${scoreText}`}
                    onClick={() => onSort('sharpe')}
                    title={`Sharpe ratio - ${sharpeTitle}`}
                  >
                    Sharpe {sharpeLabel}
                    {sortArrow(sortKey, 'sharpe', sortDir)}
                  </th>
                )}
                {extra.has('winrate') && (
                  <th
                    className={`text-center p-1 sm:p-2 font-normal text-foreground hidden sm:table-cell cursor-pointer hover:bg-muted whitespace-nowrap ${scoreText}`}
                    onClick={() => onSort('winrate')}
                    title="Win Rate - % of profitable days"
                  >
                    Win%{sortArrow(sortKey, 'winrate', sortDir)}
                  </th>
                )}
                {extra.has('roi') && (
                  <th
                    className={`text-center p-1 sm:p-2 font-normal text-foreground hidden sm:table-cell cursor-pointer hover:bg-muted whitespace-nowrap ${scoreText}`}
                    onClick={() => onSort('roi')}
                    title="Return on Investment: All-time P&L / Total Deposited"
                  >
                    ROI{sortArrow(sortKey, 'roi', sortDir)}
                  </th>
                )}
                <th
                  className={`text-right p-1 sm:p-2 font-normal text-foreground cursor-pointer hover:bg-muted whitespace-nowrap ${compact ? 'text-xs sm:text-base' : 'text-sm sm:text-lg'}`}
                  data-testid="header-pnl"
                  onClick={() => onSort('pnl')}
                >
                  P&amp;L{sortArrow(sortKey, 'pnl', sortDir)}
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, visible).map((t, i) => (
                <Row
                  key={`${t.platform}-${t.wallet || t.kalshi_username || t.name}`}
                  t={t}
                  index={i}
                  period={period}
                  extra={extra}
                  cellText={cellText}
                  scoreText={scoreText}
                  iconSize={iconSize}
                  compact={compact}
                  sharpeTitle={sharpeTitle}
                  refreshing={isFetching && !isLoading}
                />
              ))}
            </tbody>
          </table>
          {shown.length > visible && (
            <button
              onClick={() => setVisible((v) => Math.min(v + step, shown.length))}
              className="w-full py-2 mt-2 text-sm text-muted-foreground hover:text-foreground border border-border hover:bg-accent/50"
              data-testid="button-show-more"
            >
              Show More ({visible} of {shown.length})
            </button>
          )}
        </div>

        {guide && <PolymarketGuide />}

        <footer className="mt-16 pt-8 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <a
              href="https://x.com/predictingtop"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition"
            >
              <img src={LOGO.x} alt="X" className="w-4 h-4 object-cover" />
              <span>Our X</span>
            </a>
            <span className="text-border">|</span>
            <a href="/submit" className="text-muted-foreground hover:text-foreground transition">
              Get listed
            </a>
            <span className="text-border">|</span>
            <a href="/polymarket" className="text-muted-foreground hover:text-foreground transition">
              Polymarket leaderboard
            </a>
            <span className="text-border">|</span>
            <a href="/kalshi" className="text-muted-foreground hover:text-foreground transition">
              Kalshi leaderboard
            </a>
            <span className="text-border">|</span>
            <a href="/terms" className="text-muted-foreground hover:text-foreground transition">
              Terms
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Row({
  t,
  index,
  period,
  extra,
  cellText,
  scoreText,
  iconSize,
  compact,
  sharpeTitle,
  refreshing,
}: {
  t: LeaderboardTrader;
  index: number;
  period: UiPeriod;
  extra: Set<ExtraCol>;
  cellText: string;
  scoreText: string;
  iconSize: string;
  compact: boolean;
  sharpeTitle: string;
  refreshing: boolean;
}) {
  const href = profilePath(t);
  const nameClass = `no-underline text-foreground hover:underline truncate min-w-0 ${compact ? 'max-w-[50px] sm:max-w-[80px] md:max-w-[120px] text-xs sm:text-base' : 'max-w-[60px] sm:min-w-[80px] sm:max-w-none text-sm sm:text-lg'}`;
  const display = t.name ? shortWalletName(t.name) : 'Unknown Trader';
  const twitter = safeTwitterUrl(t.twitter);
  const pnl = formatPnl(t.stats.pnl);
  const sharpe =
    period === '1d'
      ? t.smart_score?.sharpe1d
      : period === '1w'
        ? t.smart_score?.sharpe1w
        : period === '1m'
          ? t.smart_score?.sharpe1m
          : t.smart_score?.sharpeRatio;

  return (
    <tr className="border-b border-border cursor-pointer hover:bg-accent/50" data-testid={`row-trader-${index + 1}`}>
      <td className={`p-1 sm:p-3 ${cellText}`} data-testid={`text-rank-${index + 1}`}>
        {index + 1}
      </td>
      <td className="p-0.5 sm:p-2" data-testid={`cell-avatar-${t.rank}`}>
        <div
          className={`flex-shrink-0 ${compact ? 'w-5 h-5 sm:w-8 sm:h-8' : 'w-6 h-6 sm:w-10 sm:h-10'}`}
          style={{ minWidth: '20px', minHeight: '20px' }}
        >
          <Avatar t={t} />
        </div>
      </td>
      <td className="p-1 sm:p-2 md:min-w-[280px]" data-testid={`cell-trader-${t.rank}`}>
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-hidden">
          {href ? (
            <a href={href} className={nameClass} data-testid={`text-trader-name-${t.rank}`}>
              {display}
            </a>
          ) : (t.platform || 'polymarket') === 'myriad' && t.wallet ? (
            <a
              href={`https://myriad.markets/profile/${t.wallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className={nameClass}
              data-testid={`text-trader-name-${t.rank}`}
            >
              {display}
            </a>
          ) : (
            <span className={nameClass} data-testid={`text-trader-name-${t.rank}`}>
              {display}
            </span>
          )}
          <div className="flex gap-0.5 sm:gap-1 ml-0.5 sm:ml-1.5 flex-shrink-0">
            {t.affiliated && (
              <div className={`${iconSize} flex items-center justify-center flex-shrink-0`} title="Predicting.top Affiliated Trader">
                <img src={LOGO.pt} alt="PT" className={`${iconSize} object-cover rounded-full`} loading="eager" decoding="sync" />
              </div>
            )}
            {twitter && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(twitter, '_blank', 'noopener,noreferrer');
                }}
                className={`${iconSize} flex items-center justify-center hover:opacity-70 `}
                data-testid={`button-twitter-${t.rank}`}
              >
                <img src={LOGO.x} alt="X" className={`${iconSize} object-cover`} />
              </button>
            )}
            {(t.platform === 'both' || t.platform === 'polymarket' || t.polymarket_profile) && t.wallet && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(polymarketUrl(t.wallet, t.polymarket_profile), '_blank', 'noopener,noreferrer');
                }}
                className={`${iconSize} flex items-center justify-center hover:opacity-70 `}
                data-testid={`button-polymarket-${t.rank}`}
              >
                <img src={LOGO.polymarket} alt="Polymarket" className={`${iconSize} object-cover rounded-full`} />
              </button>
            )}
            {(t.kalshi_profile || t.kalshi_username || t.platform === 'both' || t.platform === 'kalshi') &&
              (t.kalshi_username || t.kalshi_profile) && (
                <a
                  href={`/account/${t.kalshi_username}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`${iconSize} flex items-center justify-center hover:opacity-70 `}
                  data-testid={`button-kalshi-${t.rank}`}
                >
                  <img src={LOGO.kalshi} alt="Kalshi" className={`${iconSize} object-cover rounded-full`} />
                </a>
              )}
            {t.hyperliquid_profile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(t.hyperliquid_profile, '_blank', 'noopener,noreferrer');
                }}
                className={`${iconSize} flex items-center justify-center hover:opacity-70 `}
                data-testid={`button-hyperliquid-${t.rank}`}
                title="View on Outcome (Hyperliquid HIP-4)"
              >
                <img src={LOGO.hyperliquid} alt="Hyperliquid" className={`${iconSize} object-cover rounded-full`} />
              </button>
            )}
            {(t.myriad_profile || t.myriad_username || t.platform === 'myriad') && (t.myriad_username || t.myriad_profile || t.wallet) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(t.myriad_profile || `https://myriad.markets/profile/${t.wallet}`, '_blank', 'noopener,noreferrer');
                }}
                className={`${iconSize} flex items-center justify-center hover:opacity-70 `}
                data-testid={`button-myriad-${t.rank}`}
              >
                <img src={LOGO.myriad} alt="Myriad" className={`${iconSize} object-cover rounded-full`} />
              </button>
            )}
          </div>
        </div>
      </td>
      <td className={`p-2 text-left hidden md:table-cell text-muted-foreground whitespace-nowrap w-16 ${compact ? 'text-xs sm:text-base' : 'text-base sm:text-lg'}`}>
        {daysAgo(t.join_date || null).short}
      </td>
      <td className="p-1 sm:p-2 text-center" title="Overall score 0-100">
        {t.smart_score ? (
          <span className={`font-medium ${scoreColor(t.smart_score.score)} ${scoreText}`}>{t.smart_score.score}</span>
        ) : (
          <span className={`text-muted-foreground/40 ${scoreText}`}>–</span>
        )}
      </td>
      {extra.has('sharpe') && (
        <td className="p-1 text-center hidden sm:table-cell" title={`Sharpe Ratio - ${sharpeTitle}`}>
          {sharpe != null ? (
            <span className={`${scoreText} ${sharpeColor(sharpe)}`}>{sharpe.toFixed(2)}</span>
          ) : (
            <span className={`${scoreText} text-muted-foreground/40`}>–</span>
          )}
        </td>
      )}
      {extra.has('winrate') && (
        <td className="p-1 text-center hidden sm:table-cell" title="% of days with profit">
          {t.smart_score ? (
            <span className={`${scoreText} ${winRateColor(t.smart_score.winRate)}`}>{(t.smart_score.winRate * 100).toFixed(0)}%</span>
          ) : (
            <span className={`${scoreText} text-muted-foreground/40`}>–</span>
          )}
        </td>
      )}
      {extra.has('roi') && (
        <td className={`p-1 sm:p-2 text-center hidden sm:table-cell whitespace-nowrap ${scoreText}`}>
          {t.roi !== undefined ? (
            <span className={t.roi * 100 >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {t.roi * 100 >= 0 ? '+' : ''}
              {Math.abs(t.roi * 100) < 10 ? (t.roi * 100).toFixed(1) : (t.roi * 100).toFixed(0)}%
            </span>
          ) : (
            <span className="text-muted-foreground/40">–</span>
          )}
        </td>
      )}
      <td className={`p-1 sm:p-2 text-right text-foreground font-medium whitespace-nowrap ${cellText}`} data-testid={`text-pnl-${t.rank}`}>
        {refreshing ? (
          <div className="h-4 sm:h-5 w-14 sm:w-16 bg-muted  rounded inline-block" />
        ) : (
          <>
            <span className="hidden sm:inline">{pnl.full}</span>
            <span className="sm:hidden">{pnl.compact}</span>
            {period === '1d' && t.day_mover && (
              <div
                className="flex items-center justify-end gap-1 text-[10px] sm:text-xs font-normal text-muted-foreground"
                title={`Biggest move today: ${t.day_mover.label} ${formatPnl(t.day_mover.change).full}`}
              >
                {t.day_mover.icon ? (
                  <img
                    src={t.day_mover.icon}
                    alt={t.day_mover.label}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">{t.day_mover.label}</span>
                )}
                <span className={t.day_mover.change >= 0 ? 'text-green-500' : 'text-red-500'}>{formatMover(t.day_mover.change)}</span>
              </div>
            )}
          </>
        )}
      </td>
    </tr>
  );
}

const FALLBACK = 'w-full h-full rounded-full bg-primary/20 flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary';

function Avatar({ t }: { t: LeaderboardTrader }) {
  const [failed, setFailed] = useState(false);
  const initial = t.name?.charAt(0).toUpperCase() || '?';
  if (!t.pfp || failed) {
    return (
      <div className={FALLBACK} data-testid={`avatar-trader-${t.rank}`}>
        {initial}
      </div>
    );
  }
  return (
    <img
      src={avatarSmall(t.pfp)}
      alt={t.name || 'Trader'}
      className="w-full h-full rounded-full object-cover"
      style={{ aspectRatio: '1 / 1' }}
      loading="lazy"
      data-testid={`avatar-img-trader-${t.rank}`}
      onError={() => setFailed(true)}
    />
  );
}

function LoadingSkeleton({ heading, subtitle }: { heading?: string; subtitle?: string }) {
  const SkRow = () => (
    <tr className="border-b border-border">
      <td className="p-2">
        <div className="h-4 w-6 bg-muted  rounded" />
      </td>
      <td className="p-2">
        <div className="w-8 h-8 bg-muted  rounded-full" />
      </td>
      <td className="p-2">
        <div className="h-4 w-24 bg-muted  rounded" />
      </td>
      <td className="p-2">
        <div className="h-4 w-20 bg-muted  rounded" />
      </td>
    </tr>
  );
  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-5">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl font-normal text-foreground">{heading ?? 'Prediction Market Leaderboard'}</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {subtitle ?? 'Top Polymarket, Kalshi & Hyperliquid traders, ranked by P&L in real time'}
          </p>
        </div>
        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-20 bg-muted  rounded" />
            <div className="h-8 w-28 bg-muted  rounded" />
            <div className="h-8 w-20 bg-muted  rounded" />
          </div>
        </div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left text-sm font-medium text-muted-foreground">#</th>
                <th className="p-2 text-left text-sm font-medium text-muted-foreground" />
                <th className="p-2 text-left text-sm font-medium text-muted-foreground">Trader</th>
                <th className="p-2 text-left text-sm font-medium text-muted-foreground">P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => (
                <SkRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
