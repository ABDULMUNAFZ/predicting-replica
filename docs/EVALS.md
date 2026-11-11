# Evals plan: how the replica is verified

Goal: prove the replica matches predicting.top in **look**, **layout** and **functionality**,
and that the **numbers are right**, with checks that would fail if any of that broke.

Run everything: `npm run eval` (needs the replica running; set `REPLICA_URL`).
Results are written to `public/evals/report.json` and rendered live at **/replica**.
Screenshot pairs and diff masks can be browsed at **/compare**.

## 1. Visual parity (`evals/visual.ts`)
- The original and the replica load in the same Chromium, at the same viewport, the same
  `deviceScaleFactor`, under the same **frozen clock**, and with **byte-identical API data**.
  One recorder captures each `/api/*` response once and serves it to both sites, so
  differences can only come from layout and CSS, not from moving numbers.
- Full-page screenshots, scored with pixelmatch (threshold 0.1, anti-aliasing ignored).
  `match% = 1 − differingPixels / max(area)`. A height mismatch counts as fully different rows.
- Cases: home (desktop 1280 and mobile 390, dark and light), profile (Polymarket+Kalshi trader,
  desktop and mobile), Kalshi-only profile, home with ALL + Sharpe/Win%/ROI columns, `/kalshi`.
- Gate: **≥ 97%** per case.
- **Negative control:** the same home page with a 2px padding change injected into the
  replica only. It must score **below** 97%. If it ever passes, the metric is blind and the
  whole run is untrusted. (Current: 92.22% on prod, correctly failing.)
- The replica's disclosure badge is hidden during capture and the report says so.

## 2. Functional parity (`evals/parity.ts`): 30 scenarios
The same clicks run on both sites, with the same data and clock. Each scenario then records
what the page shows, and the two records must be **identical** (JSON equality):
- every filter (No sports, No esports, $5+, Polymarket, Kalshi, Hyperliquid, linked, affiliated)
- every period (1D, 1M, YTD, ALL; the $5+ button disappears off 1D)
- search, including input sanitising (`<a>` → `a`)
- sort by Score (both directions), P&L, Joined, Sharpe with the extra columns on
- Show More pagination, theme toggle + persistence, row link → profile
- profile header and Smart Score, calendar (expand, monthly YTD, previous month), Kalshi
  category bars, share-card range switch (image URL), unknown trader → "Trader Not Found"
- `/kalshi` with 7D + Non-sports, phone-width compact P&L

## 3. Data correctness (`evals/data.ts`)
- **Proxy fidelity:** the replica's `/api/leaderboard` (1d, all) returns the same trader count
  and top 20 names and P&L as upstream, fetched in parallel (1% tolerance for live ticks).
- **Independent ground truth:** for 6 Polymarket-only traders, the all-time P&L the replica
  shows is compared with **Polymarket's official data API**
  (`data-api.polymarket.com/v2/user-pnl`, field `trade_pnl`). This checks the numbers
  against the source, not against the site being copied. (Current: 6/6 exact to the dollar.)
- **Hardening:** non-allow-listed routes return 404 without touching upstream, junk params are
  dropped and bad periods are clamped, unknown traders return 404, avatars are served
  same-origin, and leaderboard responses carry `s-maxage` caching.

## 4. Unit tests (`tests/unit`, vitest): 53 tests
Formatting rules (including the reference's `$-42.50` quirk), filter/sort semantics
(the "both" platform, 0.5 sports boundary, esports-with-X exception, $5+ only on 1D,
first-click-ascending sort, NaN-safe ROI sort), link safety (`javascript:`/foreign hosts
rejected, referral codes stripped), calendar maths (midnight attribution, gaps over 36h skipped),
form validation messages, and the proxy (allow-list, param stripping, snapshot fallback on
throw and 5xx, 404 passthrough, 502).

## 5. Real-runtime smoke tests (deploy)
- After each deploy, every API route class is hit on the preview URL before promoting to production.
- Fallback is proven in the real runtime by a preview deploy with `UPSTREAM_BASE=https://upstream-down.invalid` (snapshot served).

## Intentional differences (excluded from "exact")
Disclosure badge, `noindex`, no analytics, no affiliate codes, the Get listed form doesn't send,
and Terms text written for the replica. These are listed on `/replica` too.

## Known limits
- Kalshi P&L has no official public per-user endpoint, so it is checked only against
  upstream (proxy fidelity), not against an independent source.
- Share-card images are rendered by predicting.top's own OG endpoint (proxied).
- `/battle` (Polymarket vs Kalshi) is not in the footer and was not replicated.
