/**
 * MLS / portal feed ingestion, so an agent never touches a CSV.
 *
 * Two shapes cover almost everything an agent's brokerage can hand you:
 *
 *  - RESO Web API JSON — the modern standard. `{ "value": [ {...}, {...} ] }`
 *    with PascalCase fields (ListingKey, UnparsedAddress, ListPrice, ...).
 *  - A portal XML export — every CRM invented its own, so we walk it loosely
 *    and match field names case-insensitively against a list of aliases.
 *
 * Both parsers are PURE (text in, Listing[] out) and verified offline against
 * fixtures. Fetching lives in the route, behind the SSRF guard: a feed URL is
 * attacker-supplied data like any other.
 *
 * Nothing is invented. A listing with no address or no photos is rejected by
 * name, because a listing video that shows the wrong house is worse than no
 * video at all.
 *
 * Relative imports only — reachable from the worker process.
 */

import { XMLParser } from 'fast-xml-parser';
import { ListingParseError, type Listing } from './listing-brief';

/** Case- and separator-insensitive lookup across a record's keys. */
function pick(record: Record<string, unknown>, aliases: string[]): unknown {
  const normalise = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '');
  const wanted = new Set(aliases.map(normalise));
  for (const [key, value] of Object.entries(record)) {
    if (wanted.has(normalise(key))) return value;
  }
  return undefined;
}

function asText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

function asCount(value: unknown): number | undefined {
  const n = Number(asText(value));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** Money arrives as 685000, "685000", or "$685,000". Show it the way it came. */
function asPrice(value: unknown): string | undefined {
  const text = asText(value);
  if (!text) return undefined;
  const bare = Number(text.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(bare) || bare <= 0) return text;
  return `$${bare.toLocaleString('en-US')}`;
}

const ALIASES = {
  ref: ['ListingKey', 'ListingId', 'ListingKeyNumeric', 'MlsNumber', 'MLSNum', 'id', 'ref'],
  address: ['UnparsedAddress', 'StreetAddress', 'FullAddress', 'Address', 'PropertyAddress'],
  price: ['ListPrice', 'Price', 'CurrentPrice', 'AskingPrice'],
  beds: ['BedroomsTotal', 'Bedrooms', 'BedroomsCount', 'Beds', 'NumBedrooms'],
  baths: ['BathroomsTotalInteger', 'BathroomsFull', 'Bathrooms', 'Baths', 'NumBathrooms'],
  highlights: ['PublicRemarks', 'Remarks', 'Description', 'Features', 'MarketingRemarks'],
  media: ['Media', 'Photos', 'Images', 'PhotoUrls', 'Pictures'],
};

/** Photo URLs hide in a dozen shapes. Dig them all out, in order. */
function extractPhotos(raw: unknown): string[] {
  const urls: string[] = [];

  const visit = (node: unknown): void => {
    if (!node) return;
    if (typeof node === 'string') {
      // A whitespace/semicolon/pipe separated list, or a single url.
      for (const part of node.split(/[\s;|]+/)) {
        if (/^https?:\/\//i.test(part)) urls.push(part);
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === 'object') {
      const record = node as Record<string, unknown>;
      // RESO: Media[].MediaURL. Portals: <Photo url="..."> or <Photo>url</Photo>.
      const direct = pick(record, ['MediaURL', 'MediaUrl', 'Url', 'href', '#text', 'Photo', 'Image']);
      if (direct) visit(direct);
      else Object.values(record).forEach(visit);
    }
  };

  visit(raw);
  // Preserve order, drop duplicates.
  return [...new Set(urls)];
}

function toListing(record: Record<string, unknown>, index: number): Listing {
  const address = asText(pick(record, ALIASES.address));
  const photos = extractPhotos(pick(record, ALIASES.media));
  const ref = asText(pick(record, ALIASES.ref)) ?? `feed-${index + 1}`;

  if (!address) throw new ListingParseError(`Feed entry ${index + 1} (${ref}): no address`);
  if (photos.length === 0) throw new ListingParseError(`Feed entry ${index + 1} (${address}): no photos`);

  return {
    ref,
    address,
    price: asPrice(pick(record, ALIASES.price)),
    beds: asCount(pick(record, ALIASES.beds)),
    baths: asCount(pick(record, ALIASES.baths)),
    highlights: asText(pick(record, ALIASES.highlights))?.slice(0, 1000),
    photos,
  };
}

/** RESO Web API: `{ "value": [ ... ] }`, or a bare array. */
export function parseResoJson(text: string): Listing[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ListingParseError('The feed is not valid JSON');
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>)?.value)
      ? ((parsed as Record<string, unknown>).value as unknown[])
      : null;

  if (!rows) throw new ListingParseError('Expected a RESO feed: an array, or an object with a `value` array');
  if (rows.length === 0) throw new ListingParseError('The feed contains no listings');

  return rows.map((row, i) => toListing(row as Record<string, unknown>, i));
}

/** A portal XML export. The listing element can be called almost anything. */
export function parseXmlFeed(text: string): Listing[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    trimValues: true,
  });

  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(text) as Record<string, unknown>;
  } catch {
    throw new ListingParseError('The feed is not valid XML');
  }

  // Find the first array of objects anywhere in the tree: that is the listings.
  const found: Record<string, unknown>[][] = [];
  const walk = (node: unknown): void => {
    if (found.length > 0 || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      if (node.length > 0 && node.every((n) => n && typeof n === 'object')) {
        found.push(node as Record<string, unknown>[]);
      }
      return;
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      if (found.length > 0) return;
      // A single listing does not become an array — recognise it by its address.
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (asText(pick(value as Record<string, unknown>, ALIASES.address))) {
          found.push([value as Record<string, unknown>]);
          return;
        }
      }
      walk(value);
    }
  };
  walk(doc);

  const rows = found[0];
  if (!rows || rows.length === 0) throw new ListingParseError('No listings found in the XML feed');
  return rows.map((row, i) => toListing(row, i));
}

/** Dispatch on the Content-Type, falling back to sniffing the first character. */
export function parseListingsFeed(text: string, contentType = ''): Listing[] {
  const bare = contentType.split(';')[0].trim().toLowerCase();
  if (bare.includes('json')) return parseResoJson(text);
  if (bare.includes('xml')) return parseXmlFeed(text);

  const first = text.trimStart()[0];
  if (first === '{' || first === '[') return parseResoJson(text);
  if (first === '<') return parseXmlFeed(text);
  throw new ListingParseError('Could not tell whether the feed is JSON or XML');
}
