# predicting.top replica (interview assignment)

A working replica of [predicting.top](https://predicting.top), the prediction market
leaderboard, built with AI for the **Elcara LLC-FZ "AI-Native Builder"** hiring assignment.

> **Not affiliated with predicting.top.** Built only for evaluation. Pages are `noindex`,
> carry a visible "Interview replica" badge, and send no analytics.
> Trader data comes from predicting.top's free public API ([docs](https://predicting.top/api-docs)),
> credited as they request.

**Live:** https://predicting-replica.vercel.app · eval report: https://predicting-replica.vercel.app/replica

(All results below are from the run against the live production URL.)

## What's replicated
- Leaderboard: periods (1D/1M/YTD/ALL), $5+, platform filters, linked, affiliated,
  No sports / No esports, search, sort (Joined/Score/P&L/Sharpe/Win%/ROI), optional
  columns, Show More, live refresh, theme toggle.
- Trader profile: header, wallets, P&L calendar (daily/monthly, month navigation),
  P&L history chart (combined/Polymarket/Kalshi), P&L overview, Kalshi category P&L,
  share cards, Smart Score, not-found state.
- `/polymarket`, `/kalshi`, `/api-docs`, `/submit`, `/terms`, 404.

## Extras for reviewers
- **/replica**: live eval report (visual, parity, data, unit).
- **/compare**: drag-to-compare slider and pixel-diff mask, original vs replica.

## Verification at a glance
| Eval | Result |
|------|--------|
| Visual parity (pixelmatch, 9 cases + negative control) | 10/10: 8 cases 100.00%, Kalshi profile 99.98%, control correctly fails at 92.22% |
| Functional parity (same clicks, same data, identical output) | 30/30 |
| Data (proxy fidelity + Polymarket official API as ground truth) | 16/16 |
| Unit tests | 53/53 |

Details: [docs/EVALS.md](docs/EVALS.md) · Bugs caught: [docs/BUG_LOG.md](docs/BUG_LOG.md) ·
Workflow: [docs/WORKFLOW.md](docs/WORKFLOW.md) · Agent rules: [CLAUDE.md](CLAUDE.md)

## Run it
```bash
npm install
npm run dev -- --port 5179
```
```bash
npm test
```
```bash
REPLICA_URL=http://localhost:5179 npm run eval
```

## Architecture
```
src/lib/*          pure logic (format, filters/sort, calendar maths, links, validation): unit-tested
src/pages/*        Leaderboard, TraderProfile, Kalshi, ApiDocs, Submit, Terms, Replica, Compare
server/proxy.ts    allow-listed /api proxy + caching + snapshot fallback (shared by dev and prod)
api/proxy.ts       Vercel function wrapping server/proxy.ts (vercel.json rewrites /api/* here)
evals/*            visual.ts, parity.ts, data.ts, summary.ts
fixtures/*         leaderboard snapshots used when upstream is down
```
