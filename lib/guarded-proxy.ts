/**
 * A loopback HTTP/HTTPS proxy that enforces ForgeVid's SSRF policy.
 *
 * Why this exists: lib/safe-fetch.ts is airtight because it validates the IP
 * inside the socket's own `lookup` hook. A headless browser does none of that
 * — Chromium resolves DNS itself, connects itself, and will happily fetch
 * http://169.254.169.254/ or an internal admin panel if a page redirects or a
 * sub-resource points there. Handing an attacker-supplied URL to a browser
 * without a network boundary is strictly worse than fetch().
 *
 * So the browser is launched with `--proxy-server` pointed here and
 * `--proxy-bypass-list=<-loopback>` (which forces even localhost through the
 * proxy). Every request the page makes — the document, its scripts, its
 * images, its XHRs, and any redirect — must pass this guard, which resolves
 * the host and refuses non-public addresses. The browser never learns a route
 * to anything private.
 *
 * This is defence in depth, not the only defence: the page URL is validated by
 * assertSafeUrlShape first, and Playwright's routing blocks non-http schemes.
 * But a proxy is the only control that covers sub-resources the page fetches
 * on its own.
 */

import dns from 'dns';
import http from 'http';
import net from 'net';
import type { Duplex } from 'stream';
import { isBlockedIp } from './safe-fetch';

export interface GuardedProxy {
  port: number;
  /** Hosts this proxy refused. Surfaced in logs — useful, and a tripwire. */
  readonly blocked: string[];
  close: () => Promise<void>;
}

/** Resolve a hostname to a public address, or throw. */
async function resolvePublic(hostname: string): Promise<string> {
  // A bare IP literal never reaches DNS.
  const literal = hostname.startsWith('[') ? hostname.slice(1, -1) : hostname;
  if (net.isIP(literal)) {
    if (isBlockedIp(literal)) throw new Error(`blocked address ${literal}`);
    return literal;
  }

  const addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  const safe = addresses.find((a) => !isBlockedIp(a.address));
  if (!safe) throw new Error(`${hostname} resolves only to non-public addresses`);
  return safe.address;
}

function parseHostPort(authority: string, fallbackPort: number): { host: string; port: number } {
  // [::1]:443 | example.com:443 | example.com
  const bracket = authority.match(/^\[([^\]]+)\](?::(\d+))?$/);
  if (bracket) return { host: bracket[1], port: Number(bracket[2] ?? fallbackPort) };
  const [host, port] = authority.split(':');
  return { host, port: Number(port ?? fallbackPort) };
}

/**
 * Start the proxy on an ephemeral loopback port.
 *
 * Handles both proxy modes:
 *   - CONNECT (https): we tunnel bytes only after the target IP is vetted.
 *   - absolute-form GET/POST (http): forwarded to the vetted IP.
 */
export async function startGuardedProxy(): Promise<GuardedProxy> {
  const blocked: string[] = [];

  const refuse = (socketOrRes: Duplex | http.ServerResponse, host: string, reason: string) => {
    blocked.push(host);
    console.warn(`[GuardedProxy] refused ${host}: ${reason}`);
    if (socketOrRes instanceof http.ServerResponse) {
      socketOrRes.writeHead(403, { 'Content-Type': 'text/plain' });
      socketOrRes.end('Blocked by ForgeVid SSRF policy');
    } else {
      socketOrRes.end('HTTP/1.1 403 Forbidden\r\n\r\n');
    }
  };

  const server = http.createServer(async (req, res) => {
    let target: URL;
    try {
      // Proxied plain-http requests carry an absolute URI in the request line.
      target = new URL(req.url ?? '');
    } catch {
      res.writeHead(400).end('Bad proxy request');
      return;
    }

    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      refuse(res, target.hostname, `scheme ${target.protocol}`);
      return;
    }

    let address: string;
    try {
      address = await resolvePublic(target.hostname);
    } catch (error) {
      refuse(res, target.hostname, (error as Error).message);
      return;
    }

    const upstream = http.request(
      {
        host: address,
        port: Number(target.port || 80),
        path: target.pathname + target.search,
        method: req.method,
        // The vetted IP is what we connect to; Host preserves virtual hosting.
        headers: { ...req.headers, host: target.host },
      },
      (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      },
    );
    upstream.on('error', () => res.writeHead(502).end('Upstream error'));
    req.pipe(upstream);
  });

  // https:// goes through CONNECT. We must vet the host BEFORE the tunnel
  // opens, because after that it is opaque TLS and we can see nothing.
  server.on('connect', async (req, clientSocket, head) => {
    const { host, port } = parseHostPort(req.url ?? '', 443);

    let address: string;
    try {
      address = await resolvePublic(host);
    } catch (error) {
      refuse(clientSocket, host, (error as Error).message);
      return;
    }

    const upstream = net.connect(port, address, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    upstream.on('error', () => clientSocket.destroy());
    clientSocket.on('error', () => upstream.destroy());
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;

  return {
    port,
    blocked,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
