/**
 * Data layer for the replica.
 *
 * predicting.top publishes a free, keyless, CORS-enabled public API
 * (documented at https://predicting.top/api-docs). The replica's own `/api/*`
 * routes forward an allow-listed set of those endpoints, add caching headers,
 * and fall back to a bundled snapshot when the upstream is slow or down so the
 * page never renders empty.
 *
 * Shared by the Vite dev server (vite.config.ts) and the Vercel function
 * (api/[...path].ts), so local dev and production run the same code path.
 */

export const UPSTREAM = (process.env.UPSTREAM_BASE || 'https://predicting.top').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS || 8000);

export interface ProxyResult {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
}

type Rule = { pattern: RegExp; cache: string; fallback?: (url: URL) => Promise<unknown> };

const SHORT = 'public, max-age=0, s-maxage=30, stale-while-revalidate=120';
const MEDIUM = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
const IMAGE = 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800';

const PERIODS = ['1d', '7d', '30d', '90d', 'ytd', 'all'] as const;

// Static import map (not a template string) so the serverless bundler traces every file.
const SNAPSHOTS: Record<string, () => Promise<{ default: unknown }>> = {
  '1d': () => import('../fixtures/leaderboard-1d.json'),
  '30d': () => import('../fixtures/leaderboard-30d.json'),
  ytd: () => import('../fixtures/leaderboard-ytd.json'),
  all: () => import('../fixtures/leaderboard-all.json'),
};

async function leaderboardFallback(url: URL) {
  const p = url.searchParams.get('period') || '1d';
  // Snapshots exist for the four periods the UI exposes.
  const mod = await (SNAPSHOTS[p] ?? SNAPSHOTS['1d'])();
  return { ...(mod.default as object), _snapshot: true };
}

async function dailyProfitFallback() {
  const mod = await import('../fixtures/daily-profit.json');
  return { ...(mod.default ?? mod), _snapshot: true };
}

// Order matters: first match wins.
export const RULES: Rule[] = [
  { pattern: /^\/api\/leaderboard$/, cache: SHORT, fallback: leaderboardFallback },
  { pattern: /^\/api\/daily-profit$/, cache: SHORT, fallback: dailyProfitFallback },
  { pattern: /^\/api\/kalshi-leaderboard$/, cache: SHORT },
  { pattern: /^\/api\/embed\/leaderboard$/, cache: SHORT },
  { pattern: /^\/api\/trader\/[^/]+$/, cache: SHORT },
  { pattern: /^\/api\/trader\/[^/]+\/(history|positions|trades)$/, cache: MEDIUM },
  { pattern: /^\/api\/kalshi\/[^/]+\/(history|categories|category-change)$/, cache: MEDIUM },
  { pattern: /^\/api\/kalshi-avatar\/[^/]+$/, cache: IMAGE },
  { pattern: /^\/api\/x-avatar\/\d+\/[\w-]+\.(jpg|jpeg|png|webp)$/, cache: IMAGE },
  { pattern: /^\/api\/og\/(calendar|trader|pnl|combo)\/[^/]+$/, cache: MEDIUM },
  { pattern: /^\/api\/m\/insights$/, cache: SHORT },
  { pattern: /^\/api\/p\/overview$/, cache: SHORT },
];

/** Query params forwarded upstream. Anything else is dropped. */
const ALLOWED_PARAMS = new Set(['period', 'limit', 'offset', 'sizeThreshold', 'month', 'range', 'theme', 'size', 'v', 'nonSports']);

export function matchRule(pathname: string): Rule | undefined {
  return RULES.find((r) => r.pattern.test(pathname));
}

export function buildUpstreamUrl(url: URL): string {
  const out = new URL(UPSTREAM + url.pathname);
  for (const [k, v] of url.searchParams) {
    if (ALLOWED_PARAMS.has(k)) out.searchParams.set(k, v.slice(0, 64));
  }
  if (url.pathname === '/api/leaderboard') {
    const p = out.searchParams.get('period');
    if (p && !(PERIODS as readonly string[]).includes(p)) out.searchParams.set('period', '1d');
  }
  return out.toString();
}

const enc = new TextEncoder();
const json = (status: number, data: unknown, cache = 'no-store'): ProxyResult => ({
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache },
  body: enc.encode(JSON.stringify(data)),
});

export async function handleApi(rawUrl: string, fetchImpl: typeof fetch = fetch): Promise<ProxyResult> {
  const url = new URL(rawUrl, 'http://local');
  if (url.pathname === '/api/health') {
    return json(200, { ok: true, upstream: UPSTREAM });
  }
  const rule = matchRule(url.pathname);
  if (!rule) return json(404, { error: 'Not found' });

  const target = buildUpstreamUrl(url);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(target, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'predicting-replica (interview assignment)', accept: '*/*' },
    });
    if (!res.ok) {
      if (rule.fallback && res.status >= 500) return json(200, await rule.fallback(url), 'no-store');
      return json(res.status, { error: res.status === 404 ? 'Not found' : `Upstream ${res.status}` });
    }
    const body = new Uint8Array(await res.arrayBuffer());
    return {
      status: 200,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/octet-stream',
        'cache-control': rule.cache,
        'x-replica-source': 'upstream',
      },
      body,
    };
  } catch {
    if (rule.fallback) {
      const r = json(200, await rule.fallback(url), 'no-store');
      r.headers['x-replica-source'] = 'snapshot';
      return r;
    }
    return json(502, { error: 'Upstream unavailable' });
  } finally {
    clearTimeout(timer);
  }
}
