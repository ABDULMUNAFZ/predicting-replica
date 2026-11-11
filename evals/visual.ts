/**
 * Visual parity eval.
 *
 * For each (page, viewport, theme) case: load the live original and the
 * replica in the same Chromium, with identical API data (ApiRecorder), the
 * same frozen clock and the same viewport, take full-page screenshots and
 * score them with pixelmatch.
 *
 *   matchPercent = 100 * (1 - differingPixels / max(areaA, areaB))
 *
 * Height differences count as fully differing rows, so a page that is
 * "pixel perfect but 200px taller" is still penalised. The replica's
 * disclosure badge is masked (and the report says so).
 *
 * Usage: REPLICA_URL=http://localhost:5179 npx tsx evals/visual.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { ApiRecorder, ORIGINAL, OUT_DIR, REPLICA, prepare, settle, writeReport } from './shared';

const PROFILE = process.env.EVAL_PROFILE || '0x44c1dfe43260c94ed4f1d00de2e1f80fb113ebc1'; // aenews: Polymarket + Kalshi
const KALSHI_PROFILE = process.env.EVAL_KALSHI_PROFILE || 'BuckeyesAreNuts';
const THRESHOLD = Number(process.env.VISUAL_THRESHOLD || 97);
const MAX_HEIGHT = 4000;

interface Case {
  id: string;
  page: string;
  path: string;
  ready: string;
  viewport: { width: number; height: number };
  theme: 'dark' | 'light';
  action?: (p: Page) => Promise<void>;
  /** Negative control: CSS injected into the replica only. The case must FAIL for the eval to be trusted. */
  sabotageCss?: string;
}

const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } };

const CASES: Case[] = [];
for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  for (const theme of ['dark', 'light'] as const) {
    CASES.push({ id: `home-${vpName}-${theme}`, page: '/', path: '/', ready: '[data-testid=leaderboard-table] tbody tr', viewport: vp, theme });
  }
  CASES.push({
    id: `profile-${vpName}-dark`,
    page: '/account/aenews',
    path: `/account/${PROFILE}`,
    ready: 'h1',
    viewport: vp,
    theme: 'dark',
  });
}
CASES.push({
  id: 'profile-kalshi-desktop-dark',
  page: `/account/${KALSHI_PROFILE}`,
  path: `/account/${KALSHI_PROFILE}`,
  ready: 'h1',
  viewport: VIEWPORTS.desktop,
  theme: 'dark',
});
CASES.push({
  id: 'home-desktop-dark-all-columns',
  page: '/ (ALL + Sharpe/Win%/ROI on)',
  path: '/',
  ready: '[data-testid=leaderboard-table] tbody tr',
  viewport: VIEWPORTS.desktop,
  theme: 'dark',
  action: async (p) => {
    await p.click('[data-testid=button-period-all]');
    for (const label of ['Sharpe', 'Win%', 'ROI']) await p.click(`button:text-is("${label}")`);
    await p.waitForTimeout(800);
  },
});
CASES.push({
  id: 'control-sabotaged-home',
  page: '/ (negative control: replica row cells padding-top 12px to 10px)',
  path: '/',
  ready: '[data-testid=leaderboard-table] tbody tr',
  viewport: VIEWPORTS.desktop,
  theme: 'dark',
  sabotageCss: '[data-testid=leaderboard-table] td{padding-top:10px!important}',
});
CASES.push({ id: 'kalshi-desktop-dark', page: '/kalshi', path: '/kalshi', ready: 'table tbody tr', viewport: VIEWPORTS.desktop, theme: 'dark' });

function crop(png: PNG, w: number, h: number): PNG {
  const out = new PNG({ width: w, height: h });
  // Pad with opaque magenta so missing area always counts as a difference.
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 255;
    out.data[i + 1] = 0;
    out.data[i + 2] = 255;
    out.data[i + 3] = 255;
  }
  PNG.bitblt(png, out, 0, 0, Math.min(png.width, w), Math.min(png.height, h), 0, 0);
  return out;
}

async function shoot(page: Page, url: string, c: Case): Promise<Buffer> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await settle(page, c.ready);
  if (c.action) {
    await c.action(page);
    // Interactions trigger new lazy images; wait for them again so we diff settled frames.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.evaluate(() => window.scrollTo(0, 0));
    await settle(page, c.ready);
  }
  return page.screenshot({ fullPage: true, animations: 'disabled' });
}

async function main() {
  fs.mkdirSync(path.join(OUT_DIR, 'shots'), { recursive: true });
  const browser = await chromium.launch();
  const recorder = new ApiRecorder();
  const results = [];

  for (const c of CASES) {
    const ctxA = await browser.newContext({ viewport: c.viewport, deviceScaleFactor: 1, colorScheme: c.theme });
    const ctxB = await browser.newContext({ viewport: c.viewport, deviceScaleFactor: 1, colorScheme: c.theme });
    await recorder.attach(ctxA);
    await recorder.attach(ctxB);
    const [pa, pb] = [await ctxA.newPage(), await ctxB.newPage()];
    await prepare(pa, c.theme);
    await prepare(pb, c.theme);
    // The badge is hidden for the screenshot rather than painted over, so it cannot hide real differences beneath it.
    await pb.addInitScript(() => {
      const s = document.createElement('style');
      s.textContent = '[data-testid=replica-badge]{visibility:hidden!important}';
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
    });

    if (c.sabotageCss) {
      await pb.addInitScript((css) => {
        document.addEventListener('DOMContentLoaded', () => {
          const s = document.createElement('style');
          s.textContent = css;
          document.head.appendChild(s);
        });
      }, c.sabotageCss);
    }

    let pngA: PNG, pngB: PNG;
    try {
      const [a, b] = await Promise.all([shoot(pa, ORIGINAL + c.path, c), shoot(pb, REPLICA + c.path, c)]);
      pngA = PNG.sync.read(a);
      pngB = PNG.sync.read(b);
    } catch (e) {
      console.error(`✗ ${c.id}: ${(e as Error).message}`);
      results.push({ id: c.id, page: c.page, viewport: `${c.viewport.width}x${c.viewport.height}`, theme: c.theme, matchPercent: 0, threshold: THRESHOLD, pass: false, original: '', replica: '', diff: '', error: (e as Error).message });
      await ctxA.close();
      await ctxB.close();
      continue;
    }

    const w = Math.max(pngA.width, pngB.width);
    const h = Math.min(Math.max(pngA.height, pngB.height), MAX_HEIGHT);
    const A = crop(pngA, w, h);
    const B = crop(pngB, w, h);
    const diff = new PNG({ width: w, height: h });
    const bad = pixelmatch(A.data, B.data, diff.data, w, h, { threshold: 0.1, includeAA: false });
    const matchPercent = 100 * (1 - bad / (w * h));

    const rel = (n: string) => `/evals/shots/${c.id}-${n}.png`;
    fs.writeFileSync(path.join(OUT_DIR, 'shots', `${c.id}-original.png`), PNG.sync.write(A));
    fs.writeFileSync(path.join(OUT_DIR, 'shots', `${c.id}-replica.png`), PNG.sync.write(B));
    fs.writeFileSync(path.join(OUT_DIR, 'shots', `${c.id}-diff.png`), PNG.sync.write(diff));

    // A control case passes when the diff CATCHES the sabotage (score drops below threshold).
    const pass = c.sabotageCss ? matchPercent < THRESHOLD : matchPercent >= THRESHOLD;
    console.log(`${pass ? '✓' : '✗'} ${c.id.padEnd(34)} ${matchPercent.toFixed(2)}%  (orig ${pngA.width}x${pngA.height}, replica ${pngB.width}x${pngB.height})`);
    results.push({
      id: c.id,
      page: c.page,
      viewport: `${c.viewport.width}x${c.viewport.height}`,
      theme: c.theme,
      matchPercent: Number(matchPercent.toFixed(3)),
      threshold: THRESHOLD,
      pass,
      original: rel('original'),
      replica: rel('replica'),
      diff: rel('diff'),
      heights: { original: pngA.height, replica: pngB.height },
      control: !!c.sabotageCss,
    });
    await ctxA.close();
    await ctxB.close();
  }
  await browser.close();
  writeReport({ visual: results, visualNote: 'Replica disclosure badge hidden during capture. Identical API data and clock on both sites.' });
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} visual cases passed (threshold ${THRESHOLD}%, control must fall below it)`);
  process.exitCode = failed ? 1 : 0;
}

main();
