import { getRequestConfig } from 'next-intl/server';

// Shared with app/[locale]/layout.tsx and middleware.ts.
const locales = ['en', 'es', 'hi', 'zh', 'ja', 'fr', 'it', 'ko', 'pt', 'de'];

// next-intl v4: the config receives an awaitable `requestLocale` — the old
// `{ locale }` destructure got undefined here, which made the notFound()
// guard fire and 404 EVERY /es, /fr, ... locale route in production.
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !locales.includes(locale)) locale = 'en';

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
