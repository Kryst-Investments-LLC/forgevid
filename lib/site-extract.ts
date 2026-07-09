/**
 * "Paste a URL, get a commercial" — step 1: understand the page.
 *
 * parseSiteHtml() is PURE (html string in, structured brief out) so the whole
 * extraction is verifiable offline without a network. The network lives in
 * lib/safe-fetch.ts, behind SSRF guards.
 *
 * We read the static HTML only: no headless browser. In practice marketing
 * pages carry what we need in <title>, meta description and OG tags even when
 * the body is client-rendered — and when they don't, we say so rather than
 * inventing copy.
 *
 * Relative imports only — reachable from the worker process.
 */

import { safeFetch } from './safe-fetch';

export interface SiteContent {
  /** Product/company name, best effort. */
  brand: string;
  title: string;
  description: string;
  /** h1/h2 marketing headlines, deduped and ordered by prominence. */
  headings: string[];
  /** Body copy worth feeding to the scriptwriter. */
  paragraphs: string[];
  /** Absolute image URLs, best candidates first (og:image wins). */
  images: string[];
  siteName: string | null;
  canonicalUrl: string | null;
  sourceUrl: string;
  /** True when the page gave us almost nothing (likely a JS-only shell). */
  sparse: boolean;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  trade: '™',
  reg: '®',
  copy: '©',
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeFromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeFromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function safeFromCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return '';
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function collapse(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Remove regions that never contain marketing copy (and would poison it). */
function stripNoise(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

/** Structured product/organization data a page publishes about itself. */
export interface StructuredData {
  name?: string;
  description?: string;
  images: string[];
}

/**
 * Read schema.org JSON-LD.
 *
 * This is the cheapest way to rescue a client-rendered page: frameworks and
 * SEO plugins emit <script type="application/ld+json"> during SSR even when
 * the visible body is an empty <div id="root">. No browser required.
 */
export function parseJsonLd(html: string): StructuredData {
  const out: StructuredData = { images: [] };
  const blocks = html.match(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  if (!blocks) return out;

  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    // @graph is how most CMSs nest their entities.
    if (Array.isArray(node['@graph'])) node['@graph'].forEach(visit);

    const type = String(node['@type'] ?? '').toLowerCase();
    const interesting = ['organization', 'product', 'website', 'softwareapplication', 'webpage', 'service'];
    if (type && !interesting.some((t) => type.includes(t))) return;

    if (!out.name && typeof node.name === 'string') out.name = node.name.trim();
    if (!out.description && typeof node.description === 'string') {
      out.description = node.description.trim();
    }
    const image = node.image ?? node.logo ?? node.thumbnailUrl;
    for (const candidate of Array.isArray(image) ? image : [image]) {
      if (typeof candidate === 'string') out.images.push(candidate);
      else if (candidate && typeof candidate.url === 'string') out.images.push(candidate.url);
    }
  };

  for (const block of blocks) {
    const body = block.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
    try {
      visit(JSON.parse(body));
    } catch {
      // A single malformed block must not lose the others.
    }
  }
  return out;
}

/**
 * Copy inside <noscript> is written FOR the no-JavaScript reader — which is
 * exactly what we are. stripNoise removes it from the main pass (it is usually
 * "please enable JavaScript"), so pull real sentences out of it separately.
 */
function noscriptParagraphs(html: string): string[] {
  const blocks = html.match(/<noscript\b[^>]*>([\s\S]*?)<\/noscript>/gi) ?? [];
  const out: string[] = [];
  for (const block of blocks) {
    for (const text of textOfTags(block, 'p', 5)) {
      if (/enable\s+javascript|javascript\s+is\s+(required|disabled)/i.test(text)) continue;
      if (text.length >= 40) out.push(text);
    }
  }
  return out;
}

/** All <meta> tags as { name|property (lowercased) -> content }. */
function metaMap(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key =
      tag.match(/\b(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? '';
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1];
    if (key && content && !map.has(key)) map.set(key, decodeEntities(content).trim());
  }
  return map;
}

function textOfTags(html: string, tag: string, limit: number): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null && out.length < limit) {
    const text = collapse(match[1]);
    if (text.length >= 2 && text.length <= 200) out.push(text);
  }
  return out;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((v) => {
    const key = v.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Resolve a possibly-relative URL; drop anything that isn't http(s). */
function absolutize(candidate: string, base: string): string | null {
  try {
    const url = new URL(candidate, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Brand name from og:site_name, else the title before a separator, else host. */
function inferBrand(siteName: string | null, title: string, sourceUrl: string): string {
  if (siteName && siteName.length <= 60) return siteName;

  // "Acme — Invoicing for freelancers" / "Acme | Invoicing" / "Acme: Invoicing"
  const split = title.split(/\s+[|–—\-:·]\s+/);
  if (split.length > 1) {
    const first = split[0].trim();
    const last = split[split.length - 1].trim();
    // Brands usually sit on whichever side is shorter.
    const candidate = first.length <= last.length ? first : last;
    if (candidate.length >= 2 && candidate.length <= 40) return candidate;
  }
  if (title && title.length <= 40) return title.trim();

  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '');
    const label = host.split('.')[0];
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return 'the product';
  }
}

/** Skip tracking pixels, sprites, icons and data URIs. */
function looksLikeContentImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.startsWith('data:')) return false;
  if (/\.svg($|\?)/.test(lower)) return false;
  if (/(sprite|pixel|tracking|favicon|logo-?icon|1x1|spacer)/.test(lower)) return false;
  return true;
}

/**
 * Pure extraction. `baseUrl` resolves relative links and seeds the brand
 * fallback; nothing here touches the network.
 */
export function parseSiteHtml(html: string, baseUrl: string): SiteContent {
  const clean = stripNoise(html);
  const meta = metaMap(html); // metas live in <head>; noise-stripping can't hurt, but read raw

  const rawTitle = clean.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '';
  const title = collapse(rawTitle);

  // Structured data survives client-side rendering; read it before giving up.
  const jsonLd = parseJsonLd(html);

  const ogTitle = meta.get('og:title') ?? meta.get('twitter:title') ?? '';
  const description =
    meta.get('og:description') ||
    meta.get('description') ||
    meta.get('twitter:description') ||
    jsonLd.description ||
    '';
  const siteName =
    meta.get('og:site_name') ?? meta.get('application-name') ?? jsonLd.name ?? null;

  const canonical =
    clean
      .match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i)?.[0]
      ?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;

  const headings = dedupe(
    [ogTitle, ...textOfTags(clean, 'h1', 3), ...textOfTags(clean, 'h2', 6)].filter(Boolean),
  ).slice(0, 8);

  const paragraphs = dedupe([
    ...textOfTags(clean, 'p', 30).filter((p) => p.length >= 40 && p.length <= 400),
    ...noscriptParagraphs(html),
    ...(jsonLd.description && jsonLd.description.length >= 40 ? [jsonLd.description] : []),
  ]).slice(0, 8);

  // og:image is the publisher's own choice of hero art — the best scene still.
  const imageCandidates = [
    meta.get('og:image:secure_url'),
    meta.get('og:image'),
    meta.get('twitter:image'),
    meta.get('twitter:image:src'),
    clean
      .match(/<link\b[^>]*\brel\s*=\s*["']image_src["'][^>]*>/i)?.[0]
      ?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1],
    ...jsonLd.images,
  ].filter((v): v is string => Boolean(v));

  const images = dedupe(
    imageCandidates
      .map((candidate) => absolutize(candidate, canonical || baseUrl))
      .filter((v): v is string => Boolean(v))
      .filter(looksLikeContentImage),
  ).slice(0, 6);

  const brand = inferBrand(siteName, ogTitle || title, baseUrl);

  // Honest signal for the caller: did we actually learn anything?
  const sparse = !description && headings.length === 0 && paragraphs.length === 0;

  return {
    brand,
    title: title || ogTitle,
    description,
    headings,
    paragraphs,
    images,
    siteName,
    canonicalUrl: canonical ? absolutize(canonical, baseUrl) : null,
    sourceUrl: baseUrl,
    sparse,
  };
}

/**
 * Decode a page's bytes using the charset it declares.
 *
 * Assuming UTF-8 mojibakes every legacy-encoded page — and marketing sites in
 * Spanish, French and German are still commonly served as windows-1252, where
 * "Rentabilité" would arrive as "RentabilitÃ©" and end up in the narration.
 * Header charset wins, then <meta charset>, then UTF-8.
 */
export function decodeHtmlBody(body: Buffer, contentType: string): string {
  const fromHeader = contentType.match(/charset\s*=\s*["']?([\w-]+)/i)?.[1];

  // The meta tag is ASCII-compatible in every encoding we care about, so it is
  // safe to look for it in a provisional latin1 read of the first few KB.
  const head = body.subarray(0, 4096).toString('latin1');
  const fromMeta =
    head.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i)?.[1] ??
    head.match(/<meta[^>]+content\s*=\s*["'][^"']*charset=([\w-]+)/i)?.[1];

  const label = (fromHeader || fromMeta || 'utf-8').toLowerCase();
  if (/^(utf-?8|ascii|us-ascii)$/.test(label)) return body.toString('utf8');

  try {
    // Node ships full ICU: windows-1252, iso-8859-1, shift_jis all decode here.
    return new TextDecoder(label, { fatal: false }).decode(body);
  } catch {
    return body.toString('utf8');
  }
}

/** A rendered page plus the screenshots the browser took, if any. */
export interface ExtractResult extends SiteContent {
  /** PNG buffers of the live UI — only present when headless rendering ran. */
  screenshots?: Buffer[];
  /** How the page was read, for honesty in the API response. */
  renderedWith: 'static' | 'headless';
}

/**
 * Fetch a page through the SSRF guard and extract its brief.
 *
 * When the static read comes back sparse (a client-rendered shell) AND headless
 * rendering is enabled, retry with a real browser behind the guarded proxy —
 * that both recovers the text and captures screenshots of the live product.
 * The browser is never the first attempt: it is slow and heavy, and most pages
 * do not need it.
 */
export async function extractSite(rawUrl: string): Promise<ExtractResult> {
  const { body, finalUrl, contentType } = await safeFetch(rawUrl, {
    maxBytes: 2 * 1024 * 1024,
    timeoutMs: 10_000,
    acceptTypes: ['text/html', 'application/xhtml+xml'],
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });

  const staticContent = parseSiteHtml(decodeHtmlBody(body, contentType), finalUrl);

  if (!staticContent.sparse) {
    return { ...staticContent, renderedWith: 'static' };
  }

  // Only reached for pages that gave static parsing nothing.
  const { isHeadlessEnabled, renderPage } = await import('./headless-render');
  if (!isHeadlessEnabled()) {
    return { ...staticContent, renderedWith: 'static' };
  }

  try {
    const rendered = await renderPage(finalUrl, { shots: 3 });
    const headlessContent = parseSiteHtml(rendered.html, rendered.finalUrl);
    if (rendered.blockedHosts.length > 0) {
      console.warn('[extractSite] proxy blocked during render:', rendered.blockedHosts.join(', '));
    }
    return {
      ...headlessContent,
      // A rendered page that STILL has no text is honestly still sparse; but if
      // we have screenshots, the commercial can be built from those.
      sparse: headlessContent.sparse && rendered.screenshots.length === 0,
      screenshots: rendered.screenshots,
      renderedWith: 'headless',
    };
  } catch (error) {
    console.warn('[extractSite] headless render failed:', error instanceof Error ? error.message : error);
    return { ...staticContent, renderedWith: 'static' };
  }
}

/**
 * Everything the scriptwriter should see, as compact text. Kept separate from
 * the GPT call so the exact model input is inspectable in a test.
 */
export function briefForModel(content: SiteContent): string {
  const lines = [
    `URL: ${content.sourceUrl}`,
    `Brand: ${content.brand}`,
    content.title && `Page title: ${content.title}`,
    content.description && `Meta description: ${content.description}`,
    content.headings.length > 0 && `Headlines:\n- ${content.headings.join('\n- ')}`,
    content.paragraphs.length > 0 && `Body copy:\n- ${content.paragraphs.join('\n- ')}`,
  ].filter(Boolean);
  return lines.join('\n');
}
