/**
 * Functional parity eval.
 *
 * Runs the same user interactions on the original and on the replica (same
 * Chromium, same frozen clock, byte-identical API data) and compares what each
 * page then shows: result counts, row order, column headers, sort arrows,
 * calendar totals, etc. A scenario passes only if both pages produce exactly
 * the same observation.
 *
 * Usage: REPLICA_URL=http://localhost:5179 npx tsx evals/parity.ts
 */
import { chromium, type Page } from '@playwright/test';
import { ApiRecorder, ORIGINAL, REPLICA, prepare, settle, writeReport } from './shared';

type Obs = unknown;
interface Scenario {
  id: string;
  description: string;
  path: string;
  ready: string;
  steps?: (p: Page) => Promise<void>;
  observe: (p: Page) => Promise<Obs>;
  viewport?: { width: number; height: number };
}

const TABLE = '[data-testid=leaderboard-table] tbody tr';

async function board(p: Page) {
  return p.evaluate(() => {
    const txt = (s: string) => document.querySelector(s)?.textContent?.trim() ?? null;
    const rows = Array.from(document.querySelectorAll('[data-testid=leaderboard-table] tbody tr')).slice(0, 10);
    return {
      count: txt('[data-testid=results-count]'),
      headers: Array.from(document.querySelectorAll('[data-testid=leaderboard-table] thead th')).map((th) => th.textContent?.trim()),
      rows: rows.map((r) => Array.from(r.querySelectorAll('td')).map((td) => (td as HTMLElement).innerText.replace(/\s+/g, ' ').trim())),
      rendered: document.querySelectorAll('[data-testid=leaderboard-table] tbody tr').length,
      showMore: Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.startsWith('Show More'))?.textContent ?? null,
      bigMovers: !!document.querySelector('[data-testid=button-big-movers-filter]'),
    };
  });
}
const click = (sel: string) => async (p: Page) => {
  await p.click(sel);
  await p.waitForTimeout(400);
};
const clickText = (text: string) => async (p: Page) => {
  await p.locator('button', { hasText: new RegExp(`^${text.replace(/[$+%]/g, '\\$&')}$`) }).first().click();
  await p.waitForTimeout(400);
};
const seq =
  (...fns: ((p: Page) => Promise<void>)[]) =>
  async (p: Page) => {
    for (const f of fns) await f(p);
  };
/** Period switches fetch a new payload; wait until the P&L skeleton is gone. */
const period = (k: string) => async (p: Page) => {
  await p.click(`[data-testid=button-period-${k}]`);
  await p.waitForTimeout(500);
  await p.waitForFunction(() => !document.querySelector('[data-testid=leaderboard-table] tbody .bg-muted'), null, { timeout: 15_000 });
  await p.waitForTimeout(300);
};

const PROFILE = '0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1';
const KALSHI = 'BuckeyesAreNuts';

const SCENARIOS: Scenario[] = [
  { id: 'default', description: 'Default view (1D, $5+, No sports, No esports)', path: '/', ready: TABLE, observe: board },
  { id: 'no-sports-off', description: 'Toggle No sports off', path: '/', ready: TABLE, steps: click('[data-testid=button-sports-filter]'), observe: board },
  { id: 'no-esports-off', description: 'Toggle No esports off', path: '/', ready: TABLE, steps: click('[data-testid=button-esports-filter]'), observe: board },
  { id: 'big-movers-off', description: 'Toggle $5+ off', path: '/', ready: TABLE, steps: click('[data-testid=button-big-movers-filter]'), observe: board },
  { id: 'platform-polymarket', description: 'Platform filter: Polymarket', path: '/', ready: TABLE, steps: click('[data-testid=button-platform-polymarket]'), observe: board },
  { id: 'platform-kalshi', description: 'Platform filter: Kalshi', path: '/', ready: TABLE, steps: click('[data-testid=button-platform-kalshi]'), observe: board },
  { id: 'platform-hyperliquid', description: 'Platform filter: Hyperliquid', path: '/', ready: TABLE, steps: click('[data-testid=button-platform-hyperliquid]'), observe: board },
  { id: 'linked', description: 'X-linked traders only', path: '/', ready: TABLE, steps: click('[data-testid=button-twitter-filter]'), observe: board },
  { id: 'affiliated', description: 'Affiliated (PT) traders only', path: '/', ready: TABLE, steps: click('[data-testid=button-affiliated-filter]'), observe: board },
  { id: 'period-all', description: 'Period ALL ($5+ button disappears)', path: '/', ready: TABLE, steps: period('all'), observe: board },
  { id: 'period-ytd', description: 'Period YTD', path: '/', ready: TABLE, steps: period('ytd'), observe: board },
  { id: 'period-1m', description: 'Period 1M', path: '/', ready: TABLE, steps: period('1m'), observe: board },
  {
    id: 'search',
    description: 'Search "an" (name, wallet and Kalshi username)',
    path: '/',
    ready: TABLE,
    steps: async (p) => {
      await p.fill('[data-testid=input-search]', 'an');
      await p.waitForTimeout(500);
    },
    observe: board,
  },
  {
    id: 'search-sanitize',
    description: 'Search input strips symbols ("<a>" becomes "a")',
    path: '/',
    ready: TABLE,
    steps: async (p) => {
      await p.type('[data-testid=input-search]', '<a>');
      await p.waitForTimeout(500);
    },
    observe: async (p) => ({ value: await p.inputValue('[data-testid=input-search]'), ...(await board(p)) }),
  },
  { id: 'sort-score-1', description: 'Sort by Score (first click)', path: '/', ready: TABLE, steps: click('th:has-text("Score")'), observe: board },
  { id: 'sort-score-2', description: 'Sort by Score (second click)', path: '/', ready: TABLE, steps: seq(click('th:has-text("Score")'), click('th:has-text("Score")')), observe: board },
  { id: 'sort-pnl', description: 'Sort by P&L (first click)', path: '/', ready: TABLE, steps: click('[data-testid=header-pnl]'), observe: board },
  { id: 'sort-joined', description: 'Sort by Joined (first click)', path: '/', ready: TABLE, steps: click('th:has-text("Joined")'), observe: board },
  {
    id: 'columns-all-sort-sharpe',
    description: 'ALL + Sharpe/Win%/ROI columns, sort by Sharpe twice',
    path: '/',
    ready: TABLE,
    steps: seq(period('all'), clickText('Sharpe'), clickText('Win%'), clickText('ROI'), click('th:has-text("Sharpe")'), click('th:has-text("Sharpe")')),
    observe: board,
  },
  { id: 'show-more', description: 'Show More twice', path: '/', ready: TABLE, steps: seq(clickText('Show More.*'), clickText('Show More.*')), observe: board },
  {
    id: 'theme-toggle',
    description: 'Theme toggle flips html class and persists to localStorage',
    path: '/',
    ready: TABLE,
    steps: click('[data-testid=button-theme-toggle]'),
    observe: (p) => p.evaluate(() => ({ cls: document.documentElement.className.trim(), stored: localStorage.getItem('theme') })),
  },
  {
    id: 'row-link',
    description: 'Clicking a trader name opens their profile',
    path: '/',
    ready: TABLE,
    steps: async (p) => {
      await p.click('[data-testid=text-trader-name-1]');
      await p.waitForURL(/\/account\//);
      await p.waitForSelector('h1');
    },
    observe: (p) => p.evaluate(() => ({ path: location.pathname, h1: document.querySelector('h1')?.textContent })),
  },
  {
    id: 'profile-header',
    description: 'Profile header, title, stats card',
    path: `/account/${PROFILE}`,
    ready: 'h1',
    observe: (p) =>
      p.evaluate(() => ({
        title: document.title.replace(/\s*\|.*$/, ''),
        h1: document.querySelector('h1')?.textContent,
        text: (document.querySelector('main') as HTMLElement | null)?.innerText.split('\n').filter((l) => /Joined|Smart Score|Win Rate|Sharpe|Drawdown|Profit Factor|R²|%|Great|Elite|Good/.test(l)),
      })),
  },
  {
    id: 'profile-calendar',
    description: 'Calendar strip, expand, monthly view YTD',
    path: `/account/${PROFILE}`,
    ready: 'h1',
    steps: async (p) => {
      await p.waitForTimeout(1500);
      await p.locator('.border-t-2 svg.transition-transform').first().click();
      await p.waitForTimeout(300);
      await p.locator('button', { hasText: /^Monthly$/ }).click();
      await p.waitForTimeout(300);
    },
    observe: (p) =>
      p.evaluate(() => {
        const box = document.querySelector('.border-t-2') as HTMLElement | null;
        return box?.innerText.split('\n').map((s) => s.trim()).filter(Boolean);
      }),
  },
  {
    id: 'profile-calendar-prev',
    description: 'Calendar previous month',
    path: `/account/${PROFILE}`,
    ready: 'h1',
    steps: async (p) => {
      await p.waitForTimeout(1500);
      await p.click('button[title="Previous month"]');
      await p.waitForTimeout(300);
    },
    observe: (p) => p.evaluate(() => (document.querySelector('.border-t-2') as HTMLElement | null)?.innerText.split('\n').map((s) => s.trim()).filter(Boolean)),
  },
  {
    id: 'profile-kalshi-categories',
    description: 'Kalshi profile: P&L by category rows',
    path: `/account/${KALSHI}`,
    ready: 'h1',
    steps: async (p) => {
      await p.waitForSelector('text=P&L by Category', { timeout: 15_000 });
    },
    observe: (p) =>
      p.evaluate(() => {
        const h = Array.from(document.querySelectorAll('h2')).find((e) => e.textContent === 'P&L by Category');
        return (h?.closest('.bg-card') as HTMLElement | null)?.innerText.split('\n').filter(Boolean);
      }),
  },
  {
    id: 'share-range',
    description: 'Share P&L chart: switch range to 7D updates the image URL',
    path: `/account/${PROFILE}`,
    ready: 'h1',
    steps: async (p) => {
      await p.locator('button[aria-pressed]', { hasText: /^7D$/ }).click();
      await p.waitForTimeout(300);
    },
    observe: (p) => p.evaluate(() => Array.from(document.querySelectorAll('img')).map((i) => new URL(i.src).pathname + new URL(i.src).search).filter((s) => s.startsWith('/api/og/'))),
  },
  {
    id: 'not-found',
    description: 'Unknown trader shows "Trader Not Found"',
    path: '/account/this-trader-does-not-exist-123',
    ready: 'h1',
    observe: (p) => p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent, link: document.querySelector('main a, a[href="/"]')?.textContent })),
  },
  {
    id: 'kalshi-7d-nonsports',
    description: '/kalshi: 7D + Non-sports',
    path: '/kalshi',
    ready: 'table tbody tr',
    steps: async (p) => {
      await p.locator('button', { hasText: /^7D$/ }).click();
      await p.waitForTimeout(600);
      await p.locator('button', { hasText: /^Non-sports$/ }).click();
      await p.waitForSelector('table tbody tr', { timeout: 15_000 });
      await p.waitForTimeout(600);
    },
    observe: (p) =>
      p.evaluate(() => ({
        count: Array.from(document.querySelectorAll('span')).find((s) => / traders$/.test(s.textContent || ''))?.textContent,
        first: Array.from(document.querySelectorAll('table tbody tr')).slice(0, 5).map((r) => (r as HTMLElement).innerText.replace(/\s+/g, ' ')),
      })),
  },
  {
    id: 'mobile-compact-pnl',
    description: 'Phone width: compact P&L ("+$104k") and hidden Joined column',
    path: '/',
    ready: TABLE,
    viewport: { width: 390, height: 844 },
    observe: board,
  },
];

async function run(page: Page, base: string, s: Scenario) {
  await page.goto(base + s.path, { waitUntil: 'domcontentloaded' });
  await settle(page, s.ready);
  if (s.steps) await s.steps(page);
  return s.observe(page);
}

async function main() {
  const browser = await chromium.launch();
  const rec = new ApiRecorder();
  const results = [];
  for (const s of SCENARIOS) {
    const vp = s.viewport ?? { width: 1280, height: 900 };
    const out: Obs[] = [];
    let error: string | undefined;
    for (const base of [ORIGINAL, REPLICA]) {
      const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
      await rec.attach(ctx);
      const page = await ctx.newPage();
      await prepare(page, 'dark');
      try {
        out.push(await run(page, base, s));
      } catch (e) {
        error = `${base === ORIGINAL ? 'original' : 'replica'}: ${(e as Error).message.split('\n')[0]}`;
        out.push(null);
      }
      await ctx.close();
    }
    const [a, b] = out.map((o) => JSON.stringify(o));
    const pass = !error && a === b && a !== 'null';
    console.log(`${pass ? '✓' : '✗'} ${s.id.padEnd(28)} ${s.description}${error ? `  [${error}]` : ''}`);
    if (!pass && !error) {
      console.log('   original:', a.slice(0, 400));
      console.log('   replica: ', b.slice(0, 400));
    }
    results.push({
      id: `parity-${s.id}`,
      description: `Parity: ${s.description}`,
      expected: a.length > 160 ? `${a.slice(0, 157)}…` : a,
      actual: pass ? 'identical' : (b ?? 'null').slice(0, 160) + (error ? ` (${error})` : ''),
      pass,
    });
  }
  await browser.close();
  writeReport({ parity: results });
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} parity scenarios identical`);
  process.exitCode = failed ? 1 : 0;
}

main();
