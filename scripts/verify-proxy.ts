/**
 * The guarded proxy is the SSRF boundary for the headless browser. If it can
 * be talked into connecting to a private address, the whole headless feature
 * becomes an SSRF hole. So test it directly, against real sockets.
 *
 *   npm run verify:proxy
 */

import http from 'http';
import net from 'net';
import type { AddressInfo } from 'net';
import { startGuardedProxy } from '../lib/guarded-proxy';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) console.log(`  ok  ${msg}`);
  else {
    failures++;
    console.error(`  FAIL ${msg}`);
  }
}

/** Make a plain-http request THROUGH the proxy (absolute-form request line). */
function throughProxy(proxyPort: number, targetUrl: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(targetUrl);
    const req = http.request(
      {
        host: '127.0.0.1',
        port: proxyPort,
        method: 'GET',
        path: targetUrl, // absolute-form: this is what a proxy client sends
        headers: { Host: u.host },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/** Attempt a CONNECT tunnel THROUGH the proxy; resolves with the status line. */
function connectThroughProxy(proxyPort: number, authority: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(proxyPort, '127.0.0.1', () => {
      socket.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`);
    });
    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString();
      if (data.includes('\r\n\r\n')) {
        socket.destroy();
        resolve(data.split('\r\n')[0]);
      }
    });
    socket.on('error', reject);
    socket.setTimeout(4000, () => {
      socket.destroy();
      reject(new Error('connect timeout'));
    });
  });
}

async function main() {
  // A stand-in "internal service" the proxy must never let a client reach.
  const secret = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end('INTERNAL-SECRET');
  });
  await new Promise<void>((r) => secret.listen(0, '127.0.0.1', r));
  const secretPort = (secret.address() as AddressInfo).port;

  const proxy = await startGuardedProxy();
  console.log(`proxy on 127.0.0.1:${proxy.port}, internal service on ${secretPort}`);

  try {
    console.log('\nHTTP proxying...');
    // The whole point: a client using the proxy CANNOT reach loopback.
    const loop = await throughProxy(proxy.port, `http://127.0.0.1:${secretPort}/`);
    assert(loop.status === 403, `refuses http://127.0.0.1 (got ${loop.status})`);
    assert(!loop.body.includes('INTERNAL-SECRET'), 'the internal body never leaks through the proxy');

    const meta = await throughProxy(proxy.port, 'http://169.254.169.254/latest/meta-data/');
    assert(meta.status === 403, `refuses the cloud metadata IP (got ${meta.status})`);

    const priv = await throughProxy(proxy.port, 'http://10.0.0.1/');
    assert(priv.status === 403, `refuses a private 10.x address (got ${priv.status})`);

    console.log('\nCONNECT (https) tunnelling...');
    const connLoop = await connectThroughProxy(proxy.port, `127.0.0.1:${secretPort}`);
    assert(/403/.test(connLoop), `refuses CONNECT to loopback (got "${connLoop}")`);

    const connMeta = await connectThroughProxy(proxy.port, '169.254.169.254:443');
    assert(/403/.test(connMeta), `refuses CONNECT to metadata (got "${connMeta}")`);

    assert(proxy.blocked.length >= 5, `every refusal was recorded (${proxy.blocked.length} blocked)`);
  } finally {
    await proxy.close();
    secret.close();
  }

  if (failures > 0) {
    console.error(`\nFAIL — ${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log('\nPASS — the headless proxy enforces the SSRF policy on every hop.');
}

main().catch((err) => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
