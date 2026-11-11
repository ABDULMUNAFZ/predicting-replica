import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useTitle } from '../lib/seo';

// The documented API is predicting.top's own free public API (the replica reads from it).
const BASE = 'https://predicting.top';

const ENDPOINTS: { path: string; summary: string; params?: string; example: string; fields: string[]; image?: boolean }[] = [
  {
    path: '/api/leaderboard',
    summary: 'Full cross-platform leaderboard (Polymarket, Kalshi, Myriad), ranked by P&L for the period.',
    params: 'period=1d|7d|30d|90d|ytd|all',
    example: '/api/leaderboard?period=7d',
    fields: ['rank', 'name', 'platform', 'wallet', 'kalshi_username', 'pfp', 'stats', 'allTimePnl', 'smart_score', 'twitter', 'roi', 'sports_share', 'day_mover'],
  },
  {
    path: '/api/embed/leaderboard',
    summary: 'Compact leaderboard for embedding on your site, with profile links.',
    params: 'period=1d|7d|30d|all',
    example: '/api/embed/leaderboard?period=all',
    fields: ['rank', 'name', 'pnl', 'pfp', 'profile_url', 'platform', 'smart_score', 'win_rate', 'sharpe_ratio'],
  },
  {
    path: '/api/kalshi-leaderboard',
    summary: 'Kalshi-only leaderboard of the top 1,000 Kalshi traders, tracked over time.',
    params: 'period=1d|7d|30d|all, limit=1-2000 (default 1000)',
    example: '/api/kalshi-leaderboard?period=30d&limit=100',
    fields: ['rank', 'kalshi_username', 'name', 'pfp', 'pnl', 'pnl_all', 'kalshi_url', 'profile_path', 'last_synced_at'],
  },
  {
    path: '/api/trader/{wallet-or-kalshi-username}',
    summary: "One trader's profile: P&L by period, wallets, linked accounts and smart score.",
    example: '/api/trader/ProbabilityDuck',
    fields: ['name', 'platform', 'wallet', 'additional_wallets', 'kalshi_username', 'stats', 'smart_score', 'join_date', 'portfolio_value'],
  },
  {
    path: '/api/trader/{wallet}/positions',
    summary: 'Live open Polymarket positions for a tracked trader, largest first.',
    params: 'limit=1-500, offset, sizeThreshold',
    example: '/api/trader/0xec981ed70ae69c5cbcac08c1ba063e734f6bafcd/positions?limit=20',
    fields: ['market', 'outcome', 'size', 'avg_price', 'current_price', 'current_value', 'cash_pnl', 'percent_pnl', 'polymarket_url', 'end_date'],
  },
  {
    path: '/api/trader/{wallet}/trades',
    summary: 'Recent Polymarket trades for a tracked trader.',
    params: 'limit=1-500, offset',
    example: '/api/trader/0xec981ed70ae69c5cbcac08c1ba063e734f6bafcd/trades?limit=20',
    fields: ['time', 'market', 'type', 'outcome', 'amount', 'price', 'shares_amount', 'transaction_hash', 'polymarket_url'],
  },
  {
    path: '/api/kalshi/{username}/history',
    summary: 'All-time P&L history for a Kalshi trader, from our snapshots.',
    example: '/api/kalshi/ProbabilityDuck/history',
    fields: ['history[].timestamp', 'history[].pnl', 'history[].date', 'dataPoints', 'firstDate', 'lastDate'],
  },
  {
    path: '/api/kalshi/{username}/categories',
    summary: "A Kalshi trader's all-time P&L and markets traded by category.",
    example: '/api/kalshi/acedia/categories',
    fields: ['categories[].category', 'categories[].pnl', 'categories[].markets'],
  },
  {
    path: '/api/p/overview',
    summary: "Open Polymarket positions across top traders, with each trader's score.",
    example: '/api/p/overview',
    fields: ['market', 'outcome', 'size', 'current_value', 'cash_pnl', 'trader_name', 'trader_wallet', 'trader_score', 'polymarket_url'],
  },
  {
    path: '/api/m/insights',
    summary: 'Markets top traders are trading most, with buy/sell and yes/no flow.',
    params: 'period=1h|6h|24h|3d|1w, limit=1-200',
    example: '/api/m/insights?period=24h&limit=10',
    fields: ['market', 'totalVolume', 'buyVolume', 'sellVolume', 'yesVolume', 'noVolume', 'netInflow', 'uniqueTraders', 'yesPrice', 'polymarket_url'],
  },
  { path: '/api/daily-profit', summary: 'Combined profit of all tracked traders today.', example: '/api/daily-profit', fields: ['daily_profit', 'raw', 'traders_count'] },
  { path: '/api/kalshi-avatar/{username}', summary: "A Kalshi trader's profile picture (128px WebP).", example: '/api/kalshi-avatar/4thewin', fields: [], image: true },
  {
    path: '/api/og/calendar/{wallet-or-kalshi-username}',
    summary: 'Shareable month card (1080x1350): daily P&L tiles, win/loss record and monthly profit.',
    params: 'month=YYYY-MM (default: current month)',
    example: '/api/og/calendar/ProbabilityDuck',
    fields: [],
    image: true,
  },
  { path: '/api/og/trader/{wallet-or-kalshi-username}', summary: 'Shareable 1200x630 P&L card image for a trader.', example: '/api/og/trader/ProbabilityDuck', fields: [], image: true },
];

const RATE =
  '100 requests per minute per IP across the API (images excluded). Leaderboards allow 120/min, trader profiles 60/min per trader, positions and trades 120/min. Responses include X-RateLimit-Limit, X-RateLimit-Remaining and X-RateLimit-Reset headers.';

const EXAMPLE = `// Top 10 Kalshi traders this month
const res = await fetch("${BASE}/api/kalshi-leaderboard?period=30d&limit=10");
const { traders } = await res.json();
traders.forEach(t => console.log(t.rank, t.name, t.pnl));`;

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      className="text-xs text-muted-foreground hover:text-foreground transition px-2 py-1 rounded bg-secondary shrink-0"
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function ApiDocs() {
  useTitle('Free Prediction Market API — Polymarket & Kalshi Trader Data | predicting.top');
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Public API</h1>
        <p className="text-sm text-muted-foreground mb-2">
          Free, read-only JSON for prediction market traders on Polymarket and Kalshi. No API key needed, and it works from the browser (CORS enabled).
          Leaderboards update every few minutes.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Base URL: <code className="text-foreground">{BASE}</code> · Please credit predicting.top and link back when you display the data.
        </p>
        <section className="mb-8 text-sm">
          <h2 className="font-semibold mb-2">Example</h2>
          <div className="bg-secondary rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
              <span className="text-xs text-muted-foreground">JavaScript</span>
              <CopyButton text={EXAMPLE} />
            </div>
            <pre className="p-3 text-xs overflow-x-auto">
              <code>{EXAMPLE}</code>
            </pre>
          </div>
        </section>
        <h2 className="font-semibold mb-3 text-sm">Endpoints</h2>
        <div className="space-y-4 text-sm">
          {ENDPOINTS.map((a) => (
            <section key={a.path} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-mono text-xs break-all">
                  <span className="text-green-500 mr-2">GET</span>
                  {a.path}
                </h3>
                <CopyButton text={`${BASE}${a.example}`} />
              </div>
              <p className="text-muted-foreground mb-2">{a.summary}</p>
              {a.params && (
                <p className="text-xs mb-1">
                  <span className="text-muted-foreground">Params: </span>
                  <code>{a.params}</code>
                </p>
              )}
              <p className="text-xs mb-1 break-all">
                <span className="text-muted-foreground">Try: </span>
                <a href={`${BASE}${a.example}`} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                  {a.example}
                </a>
              </p>
              {a.image ? (
                <p className="text-xs text-muted-foreground">Returns an image.</p>
              ) : (
                <p className="text-xs">
                  <span className="text-muted-foreground">Fields: </span>
                  <code>{a.fields.join(', ')}</code>
                </p>
              )}
            </section>
          ))}
        </div>
        <section className="mt-8 text-sm">
          <h2 className="font-semibold mb-2">Rate limits</h2>
          <p className="text-muted-foreground">{RATE}</p>
        </section>
      </main>
      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <a href="https://x.com/predictingtop" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition">
            @predictingtop
          </a>
        </div>
      </footer>
    </div>
  );
}
