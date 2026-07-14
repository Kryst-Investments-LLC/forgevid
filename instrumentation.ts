// Next.js instrumentation hook — loads the right Sentry config per runtime.
// Enabled via experimental.instrumentationHook in next.config.mjs.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Capture errors thrown in App Router server components / route handlers (used
// by newer Next; harmless if the running version doesn't call it).
export async function onRequestError(err: unknown, request: unknown, context: unknown) {
  const Sentry = (await import('@sentry/nextjs')) as unknown as {
    captureRequestError?: (e: unknown, r: unknown, c: unknown) => void;
  };
  if (typeof Sentry.captureRequestError === 'function') {
    Sentry.captureRequestError(err, request, context);
  }
}
