/**
 * Content-Security-Policy with a per-request nonce.
 *
 * Why this file exists: the CSP used to be a STATIC header in next.config.mjs
 * that said `script-src 'self' https://js.stripe.com`. Next.js bootstraps the
 * client with INLINE <script> tags (`self.__next_f.push(...)`), which that
 * policy forbids — so the browser refused every one of them and React never
 * hydrated. The entire application was a dead static shell: no Generate button,
 * no scene editor, no navigation. Nothing that needed JavaScript worked.
 *
 * A static header cannot carry a nonce, so the policy has to be built per
 * request here. Next reads the nonce out of the Content-Security-Policy header
 * we attach to the REQUEST and stamps it onto its own inline scripts.
 *
 * Edge runtime: Web Crypto only, no Node `crypto`.
 */

/** 128 bits of randomness, base64 — regenerated for every single request. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildCsp(isDev: boolean): string {
  const connectSrc = [
    "'self'",
    isDev ? 'ws://localhost:3000' : null,
    isDev ? 'ws://localhost:3001' : null,
    'wss://forgevid.com',
    'https://api.stripe.com',
    'https://api.pexels.com',
    'https://api.openai.com',
    'https://api.replicate.com',
    'https://us.i.posthog.com',
    '*.vercel-insights.com',
    '*.vercel-analytics.com',
    process.env.CDN_BASE_URL || null,
    process.env.BACKEND_API_ORIGIN || null,
    process.env.NEXT_PUBLIC_COLLABORATION_URL || null,
  ]
    .filter(Boolean)
    .join(' ');

  return [
    "default-src 'self'",
    // Scripts: 'self' authorises the /_next/static chunks, 'unsafe-inline'
    // authorises Next's inline bootstrap (self.__next_f.push(...)), and https:
    // lets trusted third parties (Stripe.js) load. We deliberately do NOT use a
    // nonce or 'strict-dynamic': Next statically prerenders these pages, so the
    // per-request nonce generated in middleware can never be stamped onto the
    // build-time <script> tags. Under 'strict-dynamic' that left EVERY script
    // unauthorised and the app a dead, un-hydrated shell (no Generate button, no
    // nav, no signup). And per the CSP spec a nonce makes browsers ignore
    // 'unsafe-inline', so the two cannot coexist — this is the policy that
    // actually hydrates in production.
    `script-src 'self' 'unsafe-inline' https:${isDev ? " 'unsafe-eval'" : ''}`,
    // Tailwind and styled-jsx emit inline <style>; there is no nonce path for
    // them, and inline CSS is not a script-execution vector.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    // Hero + example videos are same-origin; Cloudinary serves renders in prod.
    "media-src 'self' blob: https://res.cloudinary.com",
    `connect-src ${connectSrc}`,
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}
