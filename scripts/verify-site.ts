/**
 * URL -> commercial: extraction + SSRF guards, verified offline.
 *
 * The SSRF cases are the point of this file. They run against a REAL local
 * http server (which is itself a blocked target — that's how we prove the
 * guard fires) and a real redirect chain, not against mocks.
 *
 *   npm run verify:site
 */

import http from 'http';
import type { AddressInfo, LookupFunction } from 'net';
import {
  FetchLimitError,
  SsrfError,
  assertSafeUrlShape,
  createSafeFetch,
  isBlockedIp,
  safeFetch,
  withDefaultScheme,
} from '../lib/safe-fetch';
import { briefForModel, decodeEntities, decodeHtmlBody, parseJsonLd, parseSiteHtml } from '../lib/site-extract';
import { buildSceneQueries, sanitizeStockQuery } from '../lib/stock-query';
import {
  buildScriptPrompt,
  commercialScriptSchema,
  narrationWordBudget,
  scriptToGenerationPrompt,
} from '../lib/commercial-script';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ok  ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL ${msg}`);
  }
}

async function assertRejects(fn: () => Promise<unknown>, msg: string, type?: Function) {
  try {
    await fn();
    failures++;
    console.error(`  FAIL ${msg} (it RESOLVED — the guard did not fire)`);
  } catch (error) {
    if (type && !(error instanceof type)) {
      failures++;
      console.error(`  FAIL ${msg} (wrong error type: ${(error as Error).name})`);
      return;
    }
    console.log(`  ok  ${msg}`);
  }
}

function checkIpBlocking() {
  console.log('\nIP blocklist (fails closed)...');
  const blocked = [
    '127.0.0.1',
    '127.9.9.9',
    '10.0.0.5',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // AWS/GCP/Azure metadata — the classic SSRF target
    '100.64.0.1', // CGNAT
    '0.0.0.0',
    '255.255.255.255',
    '224.0.0.1',
    '::1',
    '::',
    'fe80::1',
    'fc00::1',
    'fd00::abcd',
    'ff02::1',
    '::ffff:169.254.169.254', // v4-mapped metadata
    '::ffff:127.0.0.1',
    '::ffff:a9fe:a9fe', // hex v4-mapped metadata
    '64:ff9b::a9fe:a9fe', // NAT64-wrapped metadata
    '2002:a9fe:a9fe::1', // 6to4-wrapped metadata
    'not-an-ip',
    '',
  ];
  for (const ip of blocked) assert(isBlockedIp(ip), `blocked: ${ip || '(empty)'}`);

  const allowed = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:2800:220:1:248:1893:25c8:1946'];
  for (const ip of allowed) assert(!isBlockedIp(ip), `allowed: ${ip}`);

  // 172.15/172.32 sit just outside the private /12 — a classic off-by-one.
  assert(!isBlockedIp('172.15.0.1'), 'allowed: 172.15.0.1 (just below the private /12)');
  assert(!isBlockedIp('172.32.0.1'), 'allowed: 172.32.0.1 (just above the private /12)');
}

async function checkUrlShape() {
  console.log('\nURL shape rejection...');
  const bad = [
    'file:///etc/passwd',
    'gopher://evil.test/_x',
    'ftp://example.com/x',
    'javascript:alert(1)',
    'http://user:pass@example.com/',
    'http://localhost/admin',
    'http://127.0.0.1:5432/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://internal.local/',
    'not a url',
  ];
  for (const url of bad) {
    try {
      assertSafeUrlShape(url);
      failures++;
      console.error(`  FAIL should reject: ${url}`);
    } catch {
      console.log(`  ok  rejects ${url}`);
    }
  }
  assert(!!assertSafeUrlShape('https://example.com/pricing'), 'accepts a normal https url');
  assert(!!assertSafeUrlShape('http://example.com'), 'accepts a normal http url');

  console.log('\nDefault scheme (what users actually paste)...');
  assert(withDefaultScheme('acme.com') === 'https://acme.com', 'a bare domain gets https://');
  assert(withDefaultScheme('acme.com/pricing') === 'https://acme.com/pricing', 'a bare path gets https://');
  assert(withDefaultScheme('  acme.com  ') === 'https://acme.com', 'surrounding whitespace is trimmed');
  assert(withDefaultScheme('https://acme.com') === 'https://acme.com', 'an https url is untouched');
  assert(withDefaultScheme('http://acme.com') === 'http://acme.com', 'an http url is untouched');
  // The bug this function exists to prevent: https:// + file:// => host "file".
  assert(withDefaultScheme('file:///etc/passwd') === 'file:///etc/passwd', 'file:// is NOT prefixed (would mask the scheme error)');
  assert(withDefaultScheme('javascript:alert(1)') === 'javascript:alert(1)', 'javascript: is NOT prefixed');
  assert(withDefaultScheme('acme.com:8080/x') === 'https://acme.com:8080/x', 'host:port is not mistaken for a scheme');
  // ...and the mangled form must still be refused if it ever slips through.
  try {
    assertSafeUrlShape(withDefaultScheme('file:///etc/passwd'));
    failures++;
    console.error('  FAIL file:// survived the shape check');
  } catch (error) {
    assert(error instanceof SsrfError && /Unsupported protocol: file/.test((error as Error).message),
      'file:// is rejected as an unsupported protocol, not a DNS error');
  }
}

/** A local server IS a private target — every request to it must be refused. */
async function checkLoopbackRefused(port: number) {
  console.log('\nLive SSRF guard (against a real local server)...');
  await assertRejects(
    () => safeFetch(`http://127.0.0.1:${port}/`),
    'refuses to fetch loopback by IP',
    SsrfError,
  );
  await assertRejects(
    () => safeFetch(`http://localhost:${port}/`),
    'refuses to fetch localhost by name',
    SsrfError,
  );
  await assertRejects(
    () => safeFetch(`http://[::1]:${port}/`),
    'refuses IPv6 loopback',
    SsrfError,
  );
  await assertRejects(
    () => safeFetch(`http://169.254.169.254/latest/meta-data/`),
    'refuses the cloud metadata endpoint',
    SsrfError,
  );

  // localtest.me is a public DNS name that resolves to 127.0.0.1 — the shape of
  // a DNS-rebinding payload. The guard must catch it at CONNECT time, not by
  // the name. Needs DNS, so it reports honestly when the network is absent.
  try {
    await safeFetch(`http://localtest.me:${port}/`);
    failures++;
    console.error('  FAIL a public hostname resolving to 127.0.0.1 was fetched (rebinding!)');
  } catch (error) {
    if (error instanceof SsrfError) {
      console.log('  ok  refuses a public hostname that resolves to 127.0.0.1 (rebinding)');
    } else if ((error as NodeJS.ErrnoException).code === 'ENOTFOUND' || (error as NodeJS.ErrnoException).code === 'EAI_AGAIN') {
      console.log('  --  rebinding check SKIPPED (no DNS in this environment)');
    } else {
      failures++;
      console.error(`  FAIL rebinding check errored unexpectedly: ${(error as Error).message}`);
    }
  }
}

/**
 * Size, redirect and content-type bounds.
 *
 * These CANNOT be tested through safeFetch: its guard (rightly) refuses the
 * local test server. createSafeFetch lets the test — and only the test — swap
 * in a lookup that resolves any name to the loopback server, so the limits
 * themselves are exercised for real instead of being masked by the SSRF check.
 */
async function checkFetchLimits(port: number) {
  console.log('\nFetch limits (exercised against a real server)...');

  const toLoopback: LookupFunction = (_hostname, options, callback) => {
    if ((options as { all?: boolean })?.all) {
      return (callback as unknown as (e: unknown, a: unknown) => void)(null, [
        { address: '127.0.0.1', family: 4 },
      ]);
    }
    callback(null, '127.0.0.1', 4);
  };
  const testFetch = createSafeFetch(toLoopback);
  const base = `http://size-limit.test:${port}`;

  const ok = await testFetch(`${base}/`, { acceptTypes: ['text/html'] });
  assert(ok.status === 200 && ok.body.length > 0, 'a normal page is fetched');
  assert(ok.contentType.startsWith('text/html'), 'content type is surfaced');

  await assertRejects(
    () => testFetch(`${base}/huge`, { maxBytes: 1024 }),
    'an oversized Content-Length is refused before the body is read',
    FetchLimitError,
  );
  // A server that declares no size (chunked) bypasses the header check entirely.
  // This is what proves the streaming byte counter, not just the header check.
  await assertRejects(
    () => testFetch(`${base}/chunked-huge`, { maxBytes: 1024 }),
    'a chunked body with NO Content-Length is cut off mid-stream at maxBytes',
    FetchLimitError,
  );
  await assertRejects(
    () => testFetch(`${base}/`, { acceptTypes: ['image'] }),
    'an unexpected content type is refused',
    FetchLimitError,
  );
  await assertRejects(
    () => testFetch(`${base}/loop`, { maxRedirects: 2 }),
    'a redirect loop is bounded',
    FetchLimitError,
  );
  await assertRejects(
    () => testFetch(`${base}/slow`, { timeoutMs: 300 }),
    'a slow server times out',
    FetchLimitError,
  );
  await assertRejects(
    () => testFetch(`${base}/boom`),
    'an upstream 500 is surfaced, not swallowed',
    FetchLimitError,
  );

  // Even with a permissive lookup, a redirect to a blocked LITERAL is refused:
  // the per-hop shape check is independent of DNS.
  await assertRejects(
    () => testFetch(`${base}/redirect-to-metadata`),
    'a redirect toward 169.254.169.254 is refused at the next hop',
    SsrfError,
  );
  await assertRejects(
    () => testFetch(`${base}/redirect-to-file`),
    'a redirect to file:// is refused',
    SsrfError,
  );
}

function checkExtraction() {
  console.log('\nHTML extraction (pure)...');

  const html = `<!doctype html>
<html><head>
  <title>Acme &mdash; Invoicing for freelancers</title>
  <meta name="description" content="Get paid on time, every time. Acme chases invoices so you don&#39;t have to.">
  <meta property="og:site_name" content="Acme">
  <meta property="og:title" content="Acme: invoicing that chases payments for you">
  <meta property="og:image" content="/hero.png">
  <meta property="twitter:image" content="https://cdn.acme.test/card.jpg">
  <link rel="canonical" href="https://acme.test/">
  <script>var evil = "<h1>NOT A HEADING</h1>";</script>
  <style>h1 { color: red }</style>
</head>
<body>
  <h1>Stop chasing invoices</h1>
  <h2>Automatic reminders</h2>
  <h2>Automatic reminders</h2>
  <p>Acme sends polite, escalating reminders until your client pays, so you can spend your time on the work you actually enjoy doing.</p>
  <p>Short.</p>
  <noscript><p>Enable JavaScript to view this ignored paragraph of noise.</p></noscript>
  <img src="/sprite.png">
</body></html>`;

  const content = parseSiteHtml(html, 'https://acme.test/pricing');

  assert(content.brand === 'Acme', `brand from og:site_name (got "${content.brand}")`);
  assert(content.title.includes('Acme — Invoicing'), 'title entity-decoded (&mdash;)');
  assert(content.description.includes("don't have to"), 'numeric entity decoded (&#39;)');
  assert(content.headings[0] === 'Acme: invoicing that chases payments for you', 'og:title leads the headings');
  assert(content.headings.includes('Stop chasing invoices'), 'h1 captured');
  assert(
    content.headings.filter((h) => h === 'Automatic reminders').length === 1,
    'duplicate headings deduped',
  );
  assert(!content.headings.some((h) => h.includes('NOT A HEADING')), 'script contents never become headings');
  assert(content.paragraphs.length === 1, 'only substantial paragraphs kept (short + noscript dropped)');
  assert(!content.paragraphs[0].includes('Enable JavaScript'), 'noscript stripped');
  assert(
    content.images[0] === 'https://acme.test/hero.png',
    `og:image absolutized against canonical (got ${content.images[0]})`,
  );
  assert(content.images.includes('https://cdn.acme.test/card.jpg'), 'twitter:image kept');
  assert(!content.images.some((i) => i.includes('sprite')), 'sprites filtered out');
  assert(content.canonicalUrl === 'https://acme.test/', 'canonical resolved');
  assert(content.sparse === false, 'a real page is not sparse');

  // The honesty signal: a JS-only shell must announce itself, not fabricate.
  const shell = parseSiteHtml('<html><head><title>App</title></head><body><div id="root"></div></body></html>', 'https://app.test/');
  assert(shell.sparse === true, 'a JS-only shell is reported as sparse');

  // Brand inference fallbacks.
  const noSite = parseSiteHtml('<title>Widgets | The best widgets anywhere</title>', 'https://widgets.test/');
  assert(noSite.brand === 'Widgets', `brand from title separator (got "${noSite.brand}")`);
  const noTitle = parseSiteHtml('<html></html>', 'https://www.deepthought.test/x');
  assert(noTitle.brand === 'Deepthought', `brand from hostname (got "${noTitle.brand}")`);

  assert(decodeEntities('&amp;&lt;&gt;&#65;&#x42;') === '&<>AB', 'entity decoder handles named + numeric + hex');

  // Nothing the model sees is invented.
  const brief = briefForModel(content);
  assert(brief.includes('Brand: Acme') && brief.includes('Stop chasing invoices'), 'brief carries the real extracted copy');
  assert(!brief.includes('<'), 'brief carries no raw html');
}

function checkCharset() {
  console.log('\nCharset decoding (non-English pages)...');

  // "Rentabilité" in windows-1252: the accented char is a single byte 0xE9.
  const latin = Buffer.concat([
    Buffer.from('<html><head><title>', 'ascii'),
    Buffer.from([0x52, 0x65, 0x6e, 0x74, 0x61, 0x62, 0x69, 0x6c, 0x69, 0x74, 0xe9]), // Rentabilité
    Buffer.from('</title></head></html>', 'ascii'),
  ]);

  assert(
    decodeHtmlBody(latin, 'text/html; charset=windows-1252').includes('Rentabilité'),
    'windows-1252 from the Content-Type header decodes correctly',
  );
  assert(
    decodeHtmlBody(latin, 'text/html; charset=iso-8859-1').includes('Rentabilité'),
    'iso-8859-1 decodes correctly',
  );

  const metaDeclared = Buffer.concat([
    Buffer.from('<html><head><meta charset="iso-8859-1"><title>', 'ascii'),
    Buffer.from([0xe9]),
    Buffer.from('</title></head></html>', 'ascii'),
  ]);
  assert(
    decodeHtmlBody(metaDeclared, 'text/html').includes('é'),
    'a <meta charset> is honoured when the header omits one',
  );

  // The bug this guards: assuming utf-8 turns é into the replacement char.
  assert(
    decodeHtmlBody(latin, 'text/html').includes('�'),
    'an undeclared legacy page still falls back to utf-8 (documented behaviour)',
  );

  const utf8 = Buffer.from('<title>Rentabilité — croissance</title>', 'utf8');
  assert(decodeHtmlBody(utf8, 'text/html; charset=utf-8').includes('Rentabilité — croissance'), 'utf-8 round-trips');
  assert(decodeHtmlBody(utf8, 'text/html').includes('Rentabilité'), 'utf-8 is the default');
  assert(decodeHtmlBody(utf8, 'text/html; charset=bogus-9000').includes('Rentabilité'), 'an unknown charset falls back to utf-8');

  const parsed = parseSiteHtml(decodeHtmlBody(latin, 'text/html; charset=windows-1252'), 'https://fr.test/');
  assert(parsed.title === 'Rentabilité', `an accented title survives extraction (got "${parsed.title}")`);
}

function checkStockQuery() {
  console.log('\nStock query sanitizer (the makeup-clip bug)...');

  // The exact string that fetched a lipstick clip in a video-editing promo.
  const smile = sanitizeStockQuery("Close-up of person's smile watching finished video");
  assert(!/smile|finished|close-up|watching/.test(smile), `strips camera + emotion words (got "${smile}")`);
  assert(/person|video/.test(smile), `keeps the real subject (got "${smile}")`);

  assert(sanitizeStockQuery('Over-the-shoulder view of a laptop') === 'laptop', 'strips leading camera grammar');
  assert(sanitizeStockQuery('A sleek aspirational premium studio') === 'studio', 'strips abstractions, keeps the noun');
  assert(sanitizeStockQuery("a developer's desk") === 'developer desk', 'drops the possessive');
  assert(sanitizeStockQuery('THE Coffee Cup') === 'coffee cup', 'lowercases and drops stop words');
  assert(sanitizeStockQuery('one two three four five six seven').split(' ').length <= 5, 'caps query length');
  assert(sanitizeStockQuery('') === '', 'empty in, empty out');
  // Never return nothing for real input, even if every word is "abstract".
  assert(sanitizeStockQuery('premium quality success').length > 0, 'a fully-abstract phrase still yields a query');

  console.log('\nScene query ordering...');
  const queries = buildSceneQueries({
    description: "Close-up of a person's smile",
    searchQuery: 'person editing video laptop',
    keywords: ['laptop', 'editing', 'studio'],
  });
  assert(queries[0] === 'person editing video laptop', 'the explicit searchQuery leads');
  assert(queries.includes('laptop editing'), 'a keyword PAIR is tried (more specific than one word)');
  assert(new Set(queries).size === queries.length, 'queries are deduped');
  assert(!queries.includes(''), 'no empty query is ever searched');

  // A scene with no searchQuery (planned before the field existed) still works.
  const legacy = buildSceneQueries({ description: 'Wide shot of a mountain lake', keywords: ['lake'] });
  assert(legacy[0] === 'mountain lake', 'a legacy scene falls back to a sanitized description');
}

function checkStructuredData() {
  console.log('\nStructured data + noscript (rescuing JS-only pages)...');

  const jsonLd = `<html><head>
    <script type="application/ld+json">
    {"@context":"https://schema.org","@graph":[
      {"@type":"Organization","name":"Nimbus","logo":{"url":"https://nimbus.test/logo.png"}},
      {"@type":"WebSite","description":"Nimbus is deployment automation for small teams."}
    ]}
    </script>
    </head><body><div id="root"></div></body></html>`;

  const ld = parseJsonLd(jsonLd);
  assert(ld.name === 'Nimbus', `reads @graph organization name (got "${ld.name}")`);
  assert(!!ld.description && ld.description.includes('deployment automation'), 'reads description from @graph');
  assert(ld.images.includes('https://nimbus.test/logo.png'), 'reads logo object url');

  // The end-to-end win: a shell page that would be sparse becomes usable.
  const content = parseSiteHtml(jsonLd, 'https://nimbus.test/');
  assert(content.sparse === false, 'JSON-LD rescues an otherwise-empty shell from sparse');
  assert(content.brand === 'Nimbus', 'brand comes from JSON-LD when no og:site_name exists');
  assert(content.description.includes('deployment automation'), 'description filled from JSON-LD');

  // noscript copy (written for the no-JS reader — us).
  const noscript = `<html><head><title>App</title></head><body>
    <div id="root"></div>
    <noscript><p>Please enable JavaScript to use this app.</p>
    <p>Zephyr helps remote teams run better standups with async video updates and summaries.</p></noscript>
  </body></html>`;
  const z = parseSiteHtml(noscript, 'https://zephyr.test/');
  assert(z.paragraphs.some((p) => p.includes('async video updates')), 'real noscript copy is captured');
  assert(!z.paragraphs.some((p) => /enable javascript/i.test(p)), '"enable JavaScript" boilerplate is dropped');

  // Malformed JSON-LD must not throw or lose sibling blocks.
  const broken = `<script type="application/ld+json">{ not json </script>
    <script type="application/ld+json">{"@type":"Product","name":"Kept"}</script>`;
  assert(parseJsonLd(broken).name === 'Kept', 'a malformed block does not lose a valid sibling');
}

function checkScriptContract() {
  console.log('\nScript contract...');
  assert(narrationWordBudget(30) === 78, `30s budgets ~78 words (got ${narrationWordBudget(30)})`);
  assert(narrationWordBudget(1) === 12, 'a tiny duration still budgets a floor of words');

  const content = parseSiteHtml(
    '<title>Acme</title><meta name="description" content="Invoices, chased."><h1>Stop chasing invoices</h1>',
    'https://acme.test/',
  );
  const prompt = buildScriptPrompt(content, 30, 'premium');
  assert(prompt.includes('Never invent facts'), 'the prompt forbids fabrication');
  assert(prompt.includes('Stop chasing invoices'), 'the prompt carries the real page copy');
  assert(prompt.includes('about 78 words'), 'the prompt states the word budget');
  assert(prompt.includes('Calm, spare, confident'), 'tone guidance is applied');

  // The Zod boundary: a plausible-but-wrong model reply must not reach the renderer.
  assert(!commercialScriptSchema.safeParse({ brand: 'A' }).success, 'an incomplete script is rejected');
  assert(
    !commercialScriptSchema.safeParse({
      brand: 'A', tagline: 't', narration: 'x'.repeat(25), beats: ['one'], callToAction: 'go',
    }).success,
    'fewer than 2 beats is rejected',
  );
  const good = {
    brand: 'Acme',
    tagline: 'Invoices, chased.',
    narration: 'Acme chases your invoices so you do not have to. Get paid on time.',
    beats: ['a freelancer smiling at a paid invoice', 'a laptop on a clean desk'],
    callToAction: 'Start free at acme.test',
  };
  assert(commercialScriptSchema.safeParse(good).success, 'a well-formed script validates');

  const genPrompt = scriptToGenerationPrompt(good);
  assert(genPrompt.includes('Acme — Invoices, chased.'), 'generation prompt leads with brand + tagline');
  assert(genPrompt.includes('Scenes: a freelancer'), 'beats become scene directions');
  assert(genPrompt.includes('Start free'), 'the CTA closes the video');
}

async function main() {
  const server = http.createServer((req, res) => {
    switch (req.url) {
      case '/redirect-to-metadata':
        res.writeHead(302, { Location: 'http://169.254.169.254/latest/meta-data/' });
        return res.end();
      case '/redirect-to-file':
        res.writeHead(302, { Location: 'file:///etc/passwd' });
        return res.end();
      case '/loop':
        res.writeHead(302, { Location: '/loop' });
        return res.end();
      case '/huge':
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('x'.repeat(64 * 1024));
      case '/chunked-huge': {
        // No Content-Length (chunked). The declared-size check CANNOT fire here,
        // so this is the only case that exercises the streaming byte counter.
        res.writeHead(200, { 'Content-Type': 'text/html', 'Transfer-Encoding': 'chunked' });
        let sent = 0;
        const pump = () => {
          while (sent < 64 * 1024) {
            sent += 4096;
            if (!res.write('x'.repeat(4096))) {
              res.once('drain', pump);
              return;
            }
          }
          res.end();
        };
        pump();
        return;
      }
      case '/slow':
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('too late');
        }, 3000);
        return;
      case '/boom':
        res.writeHead(500, { 'Content-Type': 'text/html' });
        return res.end('server error');
      default:
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end('<title>local test page</title>');
    }
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;

  try {
    checkIpBlocking();
    await checkUrlShape();
    await checkLoopbackRefused(port);
    await checkFetchLimits(port);
    checkExtraction();
    checkCharset();
    checkStockQuery();
    checkStructuredData();
    checkScriptContract();
  } finally {
    server.close();
  }

  if (failures > 0) {
    console.error(`\nFAIL — ${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log('\nPASS — URL ingestion is guarded and the extractor is faithful.');
}

main().catch((error) => {
  console.error('\nFAIL:', error);
  process.exit(1);
});
