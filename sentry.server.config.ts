// Server-side Sentry. Loaded by instrumentation.ts on the Node runtime.
// Inert unless SENTRY_DSN is set, so local/dev is unaffected.
import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
}
