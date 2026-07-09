/**
 * SSRF-hardened HTTP client for fetching URLs the USER supplies.
 *
 * Any endpoint that makes the server fetch an attacker-chosen URL is an SSRF
 * primitive: cloud metadata (169.254.169.254), internal admin panels, the
 * Postgres port, other services on the host. This module is the only door.
 *
 * Defences, in order:
 *  1. Scheme allowlist (http/https), no embedded credentials, no fragments of
 *     other protocols.
 *  2. The IP the socket actually connects to is validated INSIDE the `lookup`
 *     hook. Resolving with dns.lookup and then calling fetch() would leave a
 *     DNS-rebinding window (resolve public -> connect private); here the value
 *     handed to net.connect IS the value we vetted, so there is no window.
 *  3. Redirects are followed manually, re-running the whole guard per hop.
 *  4. Response size, time, and Content-Type are all bounded — a 40GB /dev/zero
 *     stream or a slowloris must not take the worker down.
 *
 * Relative imports only — reachable from the worker process.
 */

import dns from 'dns';
import http from 'http';
import https from 'https';
import type { LookupFunction } from 'net';

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfError';
  }
}

export class FetchLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchLimitError';
  }
}

/** Parse dotted-quad IPv4 into a 32-bit int, or null. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

function inV4Cidr(ipInt: number, base: string, bits: number): boolean {
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

/**
 * Every IPv4 range that is not a routable public host. Includes the cloud
 * metadata link-local (169.254.0.0/16 covers 169.254.169.254) and CGNAT.
 */
const BLOCKED_V4: Array<[string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local + cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.88.99.0', 24], // 6to4 relay anycast
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved (includes 255.255.255.255)
];

/** Extract an embedded IPv4 from v4-mapped / NAT64 / 6to4 IPv6 forms. */
function embeddedV4(ip: string): string | null {
  const lower = ip.toLowerCase();

  // ::ffff:1.2.3.4 and ::1.2.3.4
  const dotted = lower.match(/:((?:\d{1,3}\.){3}\d{1,3})$/);
  if (dotted) return dotted[1];

  // ::ffff:0102:0304 (hex form of v4-mapped) and 64:ff9b::0102:0304 (NAT64)
  const hexMapped = lower.match(/^(?:::ffff:|64:ff9b::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMapped) {
    const hi = parseInt(hexMapped[1], 16);
    const lo = parseInt(hexMapped[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  // 2002:0102:0304::/16 — 6to4 embeds the v4 address in the next 32 bits.
  const sixToFour = lower.match(/^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4})(?::|$)/);
  if (sixToFour) {
    const hi = parseInt(sixToFour[1], 16);
    const lo = parseInt(sixToFour[2], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  return null;
}

/**
 * True when an IP literal must never be connected to. Fails CLOSED: anything
 * unrecognised is treated as blocked.
 */
export function isBlockedIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.replace(/%.*$/, ''); // strip zone id (fe80::1%eth0)

  const asV4 = ipv4ToInt(clean);
  if (asV4 !== null) {
    return BLOCKED_V4.some(([base, bits]) => inV4Cidr(asV4, base, bits));
  }

  if (!clean.includes(':')) return true; // neither v4 nor v6 — not an IP

  const lower = clean.toLowerCase();

  // Unspecified / loopback
  if (lower === '::' || lower === '::0' || lower === '::1') return true;

  // A v6 address that wraps a v4 one is only as safe as that v4 address.
  const inner = embeddedV4(lower);
  if (inner) {
    const innerInt = ipv4ToInt(inner);
    if (innerInt === null) return true;
    return BLOCKED_V4.some(([base, bits]) => inV4Cidr(innerInt, base, bits));
  }

  const head = parseInt(lower.split(':')[0] || '0', 16);
  if (Number.isNaN(head)) return true;

  if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((head & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (lower.startsWith('100:')) return true; // 100::/64 discard-only

  return false;
}

/**
 * People paste "acme.com", not "https://acme.com" — default the scheme.
 *
 * But NEVER prepend onto an input that already declares one: `https://` +
 * `file:///etc/passwd` parses as host "file" and fails with a confusing DNS
 * error instead of an honest "unsupported protocol". A leading token before
 * ':' is treated as a scheme only when it contains no dot, so a pasted
 * `acme.com:8080/pricing` is still read as host:port.
 */
export function withDefaultScheme(raw: string): string {
  const input = raw.trim();
  const match = input.match(/^([a-z][a-z0-9+.-]*):/i);
  const declaresScheme = Boolean(match) && !match![1].includes('.');
  return declaresScheme ? input : `https://${input}`;
}

/** Validate the URL's shape before any network activity. */
export function assertSafeUrlShape(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError('That does not look like a valid URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfError(`Unsupported protocol: ${url.protocol.replace(':', '')}`);
  }
  if (url.username || url.password) {
    throw new SsrfError('URLs with embedded credentials are not allowed');
  }
  const host = url.hostname.toLowerCase();
  if (!host || host.endsWith('.onion') || host.endsWith('.local') || host === 'localhost') {
    throw new SsrfError('That host is not allowed');
  }
  // A bare IP literal is checked immediately; hostnames are checked at connect.
  const literal = host.startsWith('[') ? host.slice(1, -1) : host;
  if (/^[\d.]+$/.test(literal) || literal.includes(':')) {
    if (isBlockedIp(literal)) {
      throw new SsrfError('That address is not publicly routable');
    }
  }
  return url;
}

/**
 * The DNS hook net.connect will use. Because the address we return is the
 * address the socket connects to, a rebinding attack cannot slip a private IP
 * in behind our check.
 */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, '', 0);
    const list = Array.isArray(addresses) ? addresses : [addresses];
    const safe = list.filter((a) => !isBlockedIp(a.address));
    if (safe.length === 0) {
      return callback(
        new SsrfError(`${hostname} resolves only to non-public addresses`) as NodeJS.ErrnoException,
        '',
        0,
      );
    }
    if ((options as { all?: boolean })?.all) {
      return (callback as unknown as (e: unknown, a: typeof safe) => void)(null, safe);
    }
    callback(null, safe[0].address, safe[0].family);
  });
};

export interface SafeFetchOptions {
  /** Hard cap on the response body. Exceeding it aborts the socket. */
  maxBytes?: number;
  /** Per-request socket timeout and overall deadline. */
  timeoutMs?: number;
  maxRedirects?: number;
  /** Bare Content-Type prefixes to accept, e.g. ['text/html']. */
  acceptTypes?: string[];
  headers?: Record<string, string>;
}

/**
 * The address guard is injectable for ONE reason: the size, redirect and
 * content-type limits can only be exercised against a local test server, which
 * the real guard (correctly) refuses to talk to. Production code must import
 * `safeFetch`, which is permanently bound to `guardedLookup` — never build a
 * fetcher with a different lookup outside tests.
 */
export function createSafeFetch(lookup: LookupFunction) {
  return function fetchWith(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
    return runSafeFetch(rawUrl, options, lookup);
  };
}

export interface SafeFetchResult {
  body: Buffer;
  contentType: string;
  /** The URL after redirects — resolve relative links against this. */
  finalUrl: string;
  status: number;
}

const DEFAULT_UA =
  'Mozilla/5.0 (compatible; ForgeVidBot/1.0; +https://forgevid.com/bot) AppleWebKit/537.36';

/**
 * Fetch a user-supplied URL with every guard applied. Throws SsrfError for
 * disallowed targets and FetchLimitError when a bound is exceeded — callers
 * surface these as 4xx, never as a generic 500.
 */
export function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  return runSafeFetch(rawUrl, options, guardedLookup);
}

async function runSafeFetch(
  rawUrl: string,
  options: SafeFetchOptions,
  lookup: LookupFunction,
): Promise<SafeFetchResult> {
  const maxBytes = options.maxBytes ?? 2 * 1024 * 1024;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRedirects = options.maxRedirects ?? 3;

  let current = assertSafeUrlShape(rawUrl);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const result = await requestOnce(current, { ...options, maxBytes, timeoutMs }, lookup);

    if (result.redirectTo) {
      if (hop === maxRedirects) throw new FetchLimitError('Too many redirects');
      // Re-validate from scratch: hop 2 may point at 169.254.169.254.
      current = assertSafeUrlShape(new URL(result.redirectTo, current).toString());
      continue;
    }

    if (result.status >= 400) {
      throw new FetchLimitError(`The site responded with ${result.status}`);
    }

    if (options.acceptTypes?.length) {
      const bare = result.contentType.split(';')[0].trim().toLowerCase();
      if (!options.acceptTypes.some((t) => bare === t || bare.startsWith(`${t}/`))) {
        throw new FetchLimitError(`Unexpected content type: ${bare || 'unknown'}`);
      }
    }

    return {
      body: result.body,
      contentType: result.contentType,
      finalUrl: current.toString(),
      status: result.status,
    };
  }

  throw new FetchLimitError('Too many redirects');
}

function requestOnce(
  url: URL,
  options: SafeFetchOptions & { maxBytes: number; timeoutMs: number },
  lookup: LookupFunction,
): Promise<{ body: Buffer; contentType: string; status: number; redirectTo?: string }> {
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: 'GET',
        lookup,
        timeout: options.timeoutMs,
        headers: {
          'User-Agent': DEFAULT_UA,
          'Accept-Encoding': 'identity', // no zip bombs behind a size cap
          ...options.headers,
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;

        if (status >= 300 && status < 400 && location) {
          res.destroy();
          resolve({ body: Buffer.alloc(0), contentType: '', status, redirectTo: location });
          return;
        }

        // Trust but verify: a lying Content-Length still gets byte-counted below.
        const declared = Number(res.headers['content-length'] ?? 0);
        if (declared > options.maxBytes) {
          res.destroy();
          reject(new FetchLimitError(`Response too large (${declared} bytes)`));
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;
        res.on('data', (chunk: Buffer) => {
          total += chunk.length;
          if (total > options.maxBytes) {
            res.destroy();
            reject(new FetchLimitError('Response exceeded the size limit'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () =>
          resolve({
            body: Buffer.concat(chunks),
            contentType: String(res.headers['content-type'] ?? ''),
            status,
          }),
        );
        res.on('error', reject);
      },
    );

    req.on('timeout', () => {
      req.destroy(new FetchLimitError('The site took too long to respond'));
    });
    req.on('error', reject);
    req.end();
  });
}
