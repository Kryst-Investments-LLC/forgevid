/**
 * Render a JavaScript-only page, and photograph it.
 *
 * The static extractor (lib/site-extract.ts) reports `sparse: true` when a page
 * gave it nothing — an app shell like `<div id="root"></div>`. That flag is the
 * only trigger for this module: headless Chromium costs seconds and hundreds of
 * megabytes, so the ~90% of marketing pages that ship real HTML never pay it.
 *
 * Two things come back:
 *   1. the rendered HTML, which goes through the SAME parser as a static page
 *   2. screenshots of the real product UI, which beat any stock footage for a
 *      product commercial
 *
 * SECURITY. A browser is a much larger SSRF surface than fetch(): it resolves
 * its own DNS, follows its own redirects, and fetches sub-resources we never
 * see. Three controls, all required:
 *   - the URL is shape-checked (lib/safe-fetch) before the browser starts
 *   - ALL egress is forced through lib/guarded-proxy (including loopback), so
 *     every request the page makes is IP-vetted; nothing private is routable
 *   - route interception aborts any non-http(s) scheme, so file:// cannot be
 *     reached even from inside the page
 *
 * Playwright is an OPTIONAL dependency. If it is not installed the caller gets
 * a clear failure, never a silently empty result.
 */

import { assertSafeUrlShape } from './safe-fetch';
import { startGuardedProxy } from './guarded-proxy';

export class HeadlessUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HeadlessUnavailableError';
  }
}

export interface HeadlessResult {
  html: string;
  /** PNG buffers: the viewport hero shot, then further scroll positions. */
  screenshots: Buffer[];
  finalUrl: string;
  /** Hosts the proxy refused while the page loaded. Empty is the happy path. */
  blockedHosts: string[];
}

export interface HeadlessOptions {
  /** How many screenshots (hero + scrolled sections). */
  shots?: number;
  timeoutMs?: number;
  viewport?: { width: number; height: number };
}

export function isHeadlessEnabled(): boolean {
  return process.env.HEADLESS_BROWSER === '1';
}

/** Load playwright without making it a hard dependency of the app. */
async function loadPlaywright(): Promise<any> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return await import('playwright');
  } catch {
    throw new HeadlessUnavailableError(
      'Headless rendering needs the optional "playwright" package (npm i playwright && npx playwright install chromium)',
    );
  }
}

export async function renderPage(
  rawUrl: string,
  options: HeadlessOptions = {},
): Promise<HeadlessResult> {
  if (!isHeadlessEnabled()) {
    throw new HeadlessUnavailableError('Headless rendering is disabled (set HEADLESS_BROWSER=1)');
  }

  // Shape check first: a browser must never be pointed at file:// or a literal
  // private address, proxy or no proxy.
  const url = assertSafeUrlShape(rawUrl);

  const shots = Math.min(Math.max(options.shots ?? 3, 1), 5);
  const timeoutMs = options.timeoutMs ?? 20_000;
  const viewport = options.viewport ?? { width: 1600, height: 900 };

  const playwright = await loadPlaywright();
  const proxy = await startGuardedProxy();

  let browser: any;
  try {
    browser = await playwright.chromium.launch({
      args: [
        // Force EVERY request, loopback included, through the guarded proxy.
        `--proxy-server=http://127.0.0.1:${proxy.port}`,
        '--proxy-bypass-list=<-loopback>',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      timeout: timeoutMs,
    });

    const context = await browser.newContext({
      viewport,
      // A page cannot ask for the camera, clipboard, or geolocation.
      permissions: [],
      javaScriptEnabled: true,
      ignoreHTTPSErrors: false,
    });
    context.setDefaultTimeout(timeoutMs);

    const page = await context.newPage();

    // Belt and braces: the proxy handles addresses, this handles schemes.
    await page.route('**/*', (route: any) => {
      const requested = route.request().url();
      if (/^https?:/i.test(requested)) return route.continue();
      return route.abort();
    });

    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    // Marketing pages hydrate after DOMContentLoaded; give the network a beat
    // but never hang on an analytics socket that stays open forever.
    await page
      .waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 8000) })
      .catch(() => undefined);

    const html: string = await page.content();
    const finalUrl: string = page.url();

    const screenshots: Buffer[] = [];
    const pageHeight: number = await page.evaluate(
      '() => Math.min(document.body.scrollHeight, 8000)',
    );
    for (let i = 0; i < shots; i++) {
      const y = Math.round((pageHeight - viewport.height) * (i / Math.max(shots - 1, 1)));
      await page.evaluate(`() => window.scrollTo(0, ${Math.max(y, 0)})`);
      await page.waitForTimeout(350); // let lazy images and scroll animations settle
      screenshots.push(await page.screenshot({ type: 'png' }));
      if (pageHeight <= viewport.height) break; // a short page has one shot
    }

    return { html, screenshots, finalUrl, blockedHosts: [...proxy.blocked] };
  } finally {
    await browser?.close().catch(() => undefined);
    await proxy.close();
  }
}
