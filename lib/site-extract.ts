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

  const ogTitle = meta.get('og:title') ?? meta.get('twitter:title') ?? '';
  const description =
    meta.get('og:description') ||
    meta.get('description') ||
    meta.get('twitter:description') ||
    '';
  const siteName = meta.get('og:site_name') ?? meta.get('application-name') ?? null;

  const canonical =
    clean
      .match(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/i)?.[0]
      ?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? null;

  const headings = dedupe(
    [ogTitle, ...textOfTags(clean, 'h1', 3), ...textOfTags(clean, 'h2', 6)].filter(Boolean),
  ).slice(0, 8);

  const paragraphs = dedupe(
    textOfTags(clean, 'p', 30).filter((p) => p.length >= 40 && p.length <= 400),
  ).slice(0, 8);

  // og:image is the publisher's own choice of hero art — the best scene still.
  const imageCandidates = [
    meta.get('og:image:secure_url'),
    meta.get('og:image'),
    meta.get('twitter:image'),
    meta.get('twitter:image:src'),
    clean
      .match(/<link\b[^>]*\brel\s*=\s*["']image_src["'][^>]*>/i)?.[0]
      ?.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1],
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

/** Fetch a page through the SSRF guard and extract its brief. */
export async function extractSite(rawUrl: string): Promise<SiteContent> {
  const { body, finalUrl, contentType } = await safeFetch(rawUrl, {
    maxBytes: 2 * 1024 * 1024,
    timeoutMs: 10_000,
    acceptTypes: ['text/html', 'application/xhtml+xml'],
    headers: { Accept: 'text/html,application/xhtml+xml' },
  });
  return parseSiteHtml(decodeHtmlBody(body, contentType), finalUrl);
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
