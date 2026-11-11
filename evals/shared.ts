import fs from 'node:fs';
import path from 'node:path';
import type { BrowserContext, Page, Route } from '@playwright/test';

export const ORIGINAL = process.env.ORIGINAL_URL || 'https://predicting.top';
export const REPLICA = process.env.REPLICA_URL || 'http://localhost:5179';
export const OUT_DIR = path.resolve('public/evals');
export const REPORT = path.join(OUT_DIR, 'report.json');

/** Frozen "now" so "Joined 1032d", the calendar month and "updated" stamps match on both sites. */
export const FROZEN_NOW = process.env.FROZEN_NOW || new Date().toISOString();

export function readReport(): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  } catch {
    return {};
  }
}

export function writeReport(patch: Record<string, unknown>) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const next = { ...readReport(), ...patch, generatedAt: new Date().toISOString(), originalUrl: ORIGINAL, replicaUrl: REPLICA };
  fs.writeFileSync(REPORT, JSON.stringify(next, null, 2));
}

/**
 * One shared API cache for both sites. Every `/api/*` request from either
 * origin is answered from the same captured upstream response, so both pages
 * render from byte-identical data. Any visual difference left is layout/CSS,
 * not "the numbers moved between screenshots".
 */
export class ApiRecorder {
  private cache = new Map<string, Promise<{ status: number; headers: Record<string, string>; body: Buffer }>>();

  private key(u: URL) {
    return u.pathname + u.search;
  }

  private fetchUpstream(u: URL) {
    const k = this.key(u);
    if (!this.cache.has(k)) {
      this.cache.set(
        k,
        (async () => {
          const r = await fetch(ORIGINAL + k, { headers: { 'user-agent': 'predicting-replica eval (interview assignment)' } });
          const body = Buffer.from(await r.arrayBuffer());
          return { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' }, body };
        })(),
      );
    }
    return this.cache.get(k)!;
  }

  async attach(ctx: BrowserContext) {
    await ctx.route(/\/api\//, async (route: Route) => {
      const u = new URL(route.request().url());
      const res = await this.fetchUpstream(u);
      await route.fulfill({ status: res.status, headers: { ...res.headers, 'access-control-allow-origin': '*' }, body: res.body });
    });
    // Third-party analytics on the original are irrelevant to layout; block them for determinism.
    await ctx.route(/googletagmanager|google-analytics|i\.replit\.com|posthog/, (r) => r.abort());
  }
}

export async function prepare(page: Page, theme: 'dark' | 'light') {
  // tsx/esbuild wraps named functions with a `__name` helper; functions we ship into the
  // browser via page.evaluate need it defined there too (string form avoids the transform).
  await page.addInitScript('globalThis.__name = globalThis.__name || ((f) => f);');
  await page.clock.setFixedTime(new Date(FROZEN_NOW));
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
    } catch {
      /* ignore */
    }
  }, theme);
}

/** Wait for fonts, images and chart animations so both screenshots are settled frames. */
export async function settle(page: Page, selector: string) {
  await page.waitForSelector(selector, { timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) => (img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r), setTimeout(r, 5000))))),
    );
  });
  await page.waitForTimeout(1500);
}
