import { useQuery } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { ThemeToggle } from '../components/ThemeToggle';
import { CategoryPnl } from '../components/profile/CategoryPnl';
import { PnlHistory, PnlOverview } from '../components/profile/Charts';
import { PnlCalendar } from '../components/profile/PnlCalendar';
import { ShareCombo, ShareMonth, SharePnlChart } from '../components/profile/ShareCards';
import { formatJoinMonth, formatTitlePnl, shortWallet } from '../lib/format';
import { avatarLarge, polymarketUrl, stripTracking, twitterHandle, twitterHref } from '../lib/links';
import { useTitle } from '../lib/seo';
import type { TraderDetail } from '../lib/types';

const BackArrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

function platformLabel(t?: TraderDetail): string {
  if (!t) return 'Prediction Market';
  switch (t.platform) {
    case 'kalshi':
      return 'Kalshi';
    case 'myriad':
      return 'Myriad';
    case 'hyperliquid':
      return 'Hyperliquid';
    case 'both':
      return 'Polymarket & Kalshi';
    default:
      return 'Polymarket';
  }
}

function onAvatarError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = '/toplogo.jpg';
}

export default function TraderProfile() {
  const [, params] = useRoute('/account/:wallet');
  const id = params?.wallet ? decodeURIComponent(params.wallet) : '';
  const { data, isLoading, error } = useQuery<{ trader: TraderDetail }>({
    queryKey: ['/api/trader', id],
    queryFn: async () => {
      const r = await fetch(`/api/trader/${encodeURIComponent(id)}`);
      if (!r.ok) throw new Error('Trader not found');
      return r.json();
    },
    enabled: !!id,
    staleTime: 60_000,
  });
  const t = data?.trader;
  const allPnl = formatTitlePnl(t?.stats?.all?.pnl || 0);
  const isWalletName = (n: string) => /^0x[a-fA-F0-9]{40}$/.test(n);
  const title = t
    ? isWalletName(t.name) || !t.name?.trim()
      ? `${shortWallet(t.wallet || t.name)} · ${allPnl} all-time | predicting.top`
      : `${t.name} · ${allPnl} all-time | predicting.top`
    : isLoading
      ? 'Trader Profile | predicting.top'
      : 'Trader Not Found';
  useTitle(title);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-4" />
            <div className="h-4 bg-muted rounded w-96 mb-8" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !t) {
    return (
      <div className="min-h-screen bg-background text-foreground" data-testid="trader-not-found">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Trader Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find a trader with that wallet address or username.</p>
          <a href="/" className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition">
            View Leaderboard
          </a>
        </div>
      </div>
    );
  }

  const historyUrl = `/api/trader/${encodeURIComponent(id)}/history`;
  const shareId = t.platform === 'kalshi' && t.kalshi_username ? t.kalshi_username : t.wallet || t.kalshi_username || id;
  const polyHref = t.platform === 'hyperliquid' ? t.polymarket_profile || 'https://polymarket.com' : polymarketUrl(t.wallet, t.polymarket_profile);
  const kalshiHref = t.kalshi_profile ? stripTracking(t.kalshi_profile) : 'https://kalshi.com';
  const extraWallets = (t.additional_wallets || []).filter((w) => w && w.toLowerCase() !== t.wallet?.toLowerCase());
  const ringBase = t.platform === 'kalshi' ? 'border-green-500/50' : 'border-sky-400/50';
  const ringHover = t.platform === 'kalshi' ? 'group-hover:border-green-500' : 'group-hover:border-sky-400';

  const avatarImg = t.pfp ? (
    <img src={avatarLarge(t.pfp)} alt={`${t.name} profile`} className="w-full h-full object-cover" loading="eager" onError={onAvatarError} />
  ) : null;

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="trader-profile">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition text-sm font-medium"
            >
              <BackArrow />
              Leaderboard
            </a>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-start gap-4 mb-8">
          {avatarImg &&
            ((t.platform === 'kalshi' || t.platform === 'both') && t.kalshi_profile ? (
              <a href={kalshiHref} target="_blank" rel="noopener noreferrer" className="group">
                <div className={`w-20 h-20 rounded-full overflow-hidden border-2 transition-colors ${ringBase} ${ringHover}`}>{avatarImg}</div>
              </a>
            ) : t.polymarket_profile ? (
              <a href={polyHref} target="_blank" rel="noopener noreferrer" className="group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-sky-400/50 group-hover:border-sky-400 transition-colors">
                  {avatarImg}
                </div>
              </a>
            ) : (
              <div className={`w-20 h-20 rounded-full overflow-hidden border-2 ${ringBase}`}>{avatarImg}</div>
            ))}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" data-testid="trader-name">
                {t.name}
              </h1>
              {(t.platform === 'polymarket' || t.platform === 'both' || (t.platform === 'hyperliquid' && t.polymarket_profile)) && (
                <a href={polyHref} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" title="View on Polymarket">
                  <img src="/logos/polymarket.jpg" alt="Polymarket" className="w-5 h-5" />
                </a>
              )}
              {(t.platform === 'kalshi' || t.platform === 'both') && (
                <a href={kalshiHref} target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity" title="View on Kalshi">
                  <img src="/logos/kalshi.jpg" alt="Kalshi" className="w-5 h-5" />
                </a>
              )}
              {t.hyperliquid_profile && (
                <a
                  href={t.hyperliquid_profile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity"
                  title="View on Outcome (Hyperliquid HIP-4)"
                >
                  <img src="/logos/hyperliquid.png" alt="Hyperliquid" className="w-5 h-5 rounded-full" />
                </a>
              )}
              {t.twitter && (
                <a
                  href={twitterHref(t.twitter)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title={`@${twitterHandle(t.twitter)}`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap ${t.platform === 'kalshi' ? 'bg-green-500/10 text-green-400' : t.platform === 'both' ? 'bg-gradient-to-r from-sky-400/10 to-green-500/10 text-foreground' : 'bg-sky-400/10 text-sky-400'}`}
              >
                {platformLabel(t)}
              </span>
              <span className="text-muted-foreground text-sm">
                {t.join_date && `Joined ${formatJoinMonth(t.join_date)}`}
                {(t.views ?? 0) > 0 && ` · ${t.views!.toLocaleString()} views`}
              </span>
            </div>
            {(t.wallet || extraWallets.length > 0) && (
              <div className="text-xs font-mono text-muted-foreground space-y-1">
                {t.wallet && (
                  <p>
                    <a href={`/account/${t.wallet}`} className="hover:text-foreground underline-offset-2 hover:underline" title={t.wallet}>
                      {shortWallet(t.wallet)}
                    </a>
                    <span className="sr-only"> {t.wallet}</span>
                  </p>
                )}
                {extraWallets.map((w) => (
                  <p key={w}>
                    <span className="text-muted-foreground/80">Also: </span>
                    <a href={`/account/${w}`} className="hover:text-foreground underline-offset-2 hover:underline" title={w}>
                      {shortWallet(w)}
                    </a>
                    <span className="sr-only"> {w}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {t.platform === 'kalshi' && t.kalshi_username ? (
          <PnlCalendar kalshiUsername={t.kalshi_username} platform={t.platform} />
        ) : t.wallet ? (
          <PnlCalendar historyUrl={historyUrl} platform={t.platform} />
        ) : null}

        <div className="mb-6 space-y-4">
          {t.platform !== 'kalshi' &&
            (t.wallet ? (
              <PnlHistory
                historyUrl={historyUrl}
                description={
                  t.platform === 'both' && t.kalshi_username
                    ? "Combined Polymarket and Kalshi P&L: all of this trader's Polymarket wallets plus their Kalshi account."
                    : t.platform === 'hyperliquid'
                      ? "Realized P&L on Hyperliquid HIP-4 (outcome) markets, from the trader's fills. Open positions are not included."
                      : undefined
                }
              />
            ) : (
              <PnlOverview stats={t.stats} />
            ))}
          {t.platform === 'kalshi' && t.kalshi_username && <PnlHistory kalshiUsername={t.kalshi_username} />}
          {t.kalshi_username && <CategoryPnl kalshiUsername={t.kalshi_username} />}
          <ShareCombo traderId={shareId} traderName={t.name} platform={t.platform} allTimePnl={t.stats?.all?.pnl} />
          <SharePnlChart
            traderId={shareId}
            traderName={t.name}
            platform={t.platform}
            pnl={{ all: t.stats?.all?.pnl, '30d': t.stats?.['30d']?.pnl, '7d': t.stats?.['7d']?.pnl }}
          />
          <ShareMonth traderId={shareId} traderName={t.name} platform={t.platform} />
        </div>

        {t.smart_score && (
          <div
            className={`bg-card border border-border rounded-lg p-4 mb-8 border-t-2 ${t.platform === 'kalshi' ? 'border-t-green-500/50' : t.platform === 'both' ? 'border-t-border' : 'border-t-sky-400/50'}`}
            data-testid="smart-score"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Smart Score</h3>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{t.smart_score.score}</span>
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded ${
                    t.smart_score.tier === 'Elite'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : t.smart_score.tier === 'Great'
                        ? 'bg-green-500/10 text-green-600 dark:text-green-500'
                        : t.smart_score.tier === 'Good'
                          ? 'bg-lime-500/10 text-lime-600 dark:text-lime-400'
                          : t.smart_score.tier === 'Average'
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                  }`}
                >
                  {t.smart_score.tier}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              {[
                ['Win Rate', `${(t.smart_score.winRate * 100).toFixed(0)}%`],
                ['Sharpe', t.smart_score.sharpeRatio.toFixed(2)],
                ['Max Drawdown', `${(t.smart_score.maxDrawdownPercent * 100).toFixed(1)}%`],
                ['Profit Factor', t.smart_score.profitFactor.toFixed(2)],
                ['R²', `${(t.smart_score.rSquared * 100).toFixed(0)}%`],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-muted-foreground text-xs mb-1">{k}</div>
                  <div className="font-medium">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition text-sm"
          >
            <BackArrow />
            View the Prediction Market Leaderboard
          </a>
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Track top prediction market traders on Polymarket and Kalshi</p>
          <p className="mt-1">© {new Date().getFullYear()} Predicting.top</p>
        </div>
      </footer>
    </div>
  );
}
