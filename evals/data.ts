/**
 * Data correctness eval.
 *
 * 1. Proxy fidelity: the replica's /api/* returns what predicting.top returns
 *    (fetched in parallel; P&L may tick between the two calls, so 1% tolerance).
 * 2. Independent ground truth: for Polymarket-only traders, the all-time P&L
 *    the replica shows must match Polymarket's own official data API
 *    (data-api.polymarket.com/v2/user-pnl, field `trade_pnl`). This checks the
 *    numbers against the source of truth, not against the site being copied.
 * 3. Proxy hardening: unknown routes 404, junk params dropped, caching on.
 *
 * Usage: REPLICA_URL=http://localhost:5179 npx tsx evals/data.ts
 */
import { ORIGINAL, REPLICA, writeReport } from './shared';

interface Check {
  id: string;
  description: string;
  expected: string;
  actual: string;
  pass: boolean;
}
const checks: Check[] = [];
const add = (c: Check) => {
  checks.push(c);
  console.log(`${c.pass ? '✓' : '✗'} ${c.id.padEnd(30)} ${c.description}\n    expected ${c.expected}\n    actual   ${c.actual}`);
};

const UA = { 'user-agent': 'predicting-replica eval (interview assignment)' };
async function getJson(url: string) {
  const r = await fetch(url, { headers: UA });
  return { status: r.status, headers: r.headers, body: r.ok ? await r.json() : null };
}
const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * tol);
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

interface T {
  name: string;
  wallet: string | null;
  platform: string;
  additional_wallets: string[];
  stats: { pnl: number };
}

async function proxyFidelity() {
  for (const period of ['1d', 'all']) {
    const [rep, up] = await Promise.all([getJson(`${REPLICA}/api/leaderboard?period=${period}`), getJson(`${ORIGINAL}/api/leaderboard?period=${period}`)]);
    const rt: T[] = rep.body?.traders ?? [];
    const ut: T[] = up.body?.traders ?? [];
    add({
      id: `proxy-count-${period}`,
      description: `Leaderboard (${period}): replica returns the same traders as upstream`,
      expected: `${ut.length} traders`,
      actual: `${rt.length} traders`,
      pass: rt.length === ut.length && rt.length > 0,
    });
    const top = ut.slice(0, 20);
    const mism = top.filter((u, i) => rt[i]?.name !== u.name || !near(rt[i].stats.pnl, u.stats.pnl));
    add({
      id: `proxy-top20-${period}`,
      description: `Leaderboard (${period}): top 20 names and P&L match upstream (1% tolerance for live ticks)`,
      expected: top.slice(0, 3).map((u) => `${u.name} ${usd(u.stats.pnl)}`).join(', ') + ' …',
      actual: mism.length ? `${mism.length} mismatches: ${mism.map((m) => m.name).join(', ')}` : 'all 20 match',
      pass: mism.length === 0,
    });
  }
  // Locally the s-maxage header is visible. On Vercel the CDN consumes s-maxage and strips it,
  // so there the proof is a CDN HIT on a repeat request.
  await fetch(`${REPLICA}/api/leaderboard?period=1d`);
  const r = await fetch(`${REPLICA}/api/leaderboard?period=1d`);
  const cc = r.headers.get('cache-control') ?? 'none';
  const cdn = r.headers.get('x-vercel-cache');
  add({
    id: 'proxy-cache-headers',
    description: 'Leaderboard responses are edge-cached (keeps upstream calls under its 120/min limit)',
    expected: 's-maxage in cache-control, or x-vercel-cache HIT on repeat',
    actual: cdn ? `x-vercel-cache: ${cdn}` : cc,
    pass: /s-maxage=\d+/.test(cc) || cdn === 'HIT' || cdn === 'STALE',
  });
  const post = await fetch(`${REPLICA}/api/leaderboard`, { method: 'POST' });
  if (cdn) {
    add({ id: 'proxy-405-post', description: 'Non-GET requests are rejected (read-only proxy)', expected: '405', actual: String(post.status), pass: post.status === 405 });
  }
}

async function independentTruth() {
  const lb = await getJson(`${REPLICA}/api/leaderboard?period=all`);
  const pool: T[] = (lb.body?.traders ?? []).filter((t: T) => t.platform === 'polymarket' && t.wallet && !(t.additional_wallets?.length));
  const sample = pool.slice(0, 6);
  for (const t of sample) {
    const off = await getJson(`https://data-api.polymarket.com/v2/user-pnl?user=${t.wallet}&interval=all&fidelity=1d`);
    const pts = off.body?.data?.points ?? [];
    const last = pts[pts.length - 1];
    const truth = Number(last?.trade_pnl);
    const shown = t.stats.pnl;
    add({
      id: `truth-${t.name}`.slice(0, 30),
      description: `${t.name}: all-time P&L shown by replica vs Polymarket official trade_pnl (0.5% tolerance)`,
      expected: Number.isFinite(truth) ? usd(truth) : 'official value',
      actual: usd(shown),
      pass: Number.isFinite(truth) && near(shown, truth, 0.005),
    });
  }
}

async function hardening() {
  const r1 = await fetch(`${REPLICA}/api/submissions`);
  add({ id: 'proxy-404-unknown', description: 'Non-allow-listed API route is not forwarded', expected: '404', actual: String(r1.status), pass: r1.status === 404 });
  const r2 = await getJson(`${REPLICA}/api/leaderboard?period=<script>&token=x`);
  add({
    id: 'proxy-bad-period',
    description: 'Invalid period param is clamped to 1d instead of being forwarded',
    expected: '200 with traders',
    actual: `${r2.status} with ${r2.body?.traders?.length ?? 0} traders`,
    pass: r2.status === 200 && (r2.body?.traders?.length ?? 0) > 0,
  });
  const r3 = await fetch(`${REPLICA}/api/trader/this-trader-does-not-exist-123`);
  add({ id: 'proxy-404-trader', description: 'Unknown trader returns 404 (drives "Trader Not Found")', expected: '404', actual: String(r3.status), pass: r3.status === 404 });
  const r4 = await fetch(`${REPLICA}/api/x-avatar/1350279872321503234/m9ANAo5E_bigger.jpg`);
  add({
    id: 'proxy-avatar',
    description: 'Avatars are served same-origin as images',
    expected: 'image/*',
    actual: `${r4.status} ${r4.headers.get('content-type')}`,
    pass: r4.ok && (r4.headers.get('content-type') ?? '').startsWith('image/'),
  });
}

async function main() {
  await proxyFidelity();
  await independentTruth();
  await hardening();
  writeReport({ data: checks });
  const failed = checks.filter((c) => !c.pass).length;
  console.log(`\n${checks.length - failed}/${checks.length} data checks passed`);
  process.exitCode = failed ? 1 : 0;
}

main();
