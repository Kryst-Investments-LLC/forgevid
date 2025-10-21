import React from 'react';
import { notFound } from 'next/navigation';
const locales = ['en', 'es', 'hi', 'zh', 'ja', 'fr', 'it', 'ko', 'pt', 'de'];
export async function generateMetadata({ params }) {
    const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000';
    const { locale } = params;
    return {
        alternates: {
            canonical: `${baseUrl}/${locale}/`,
            languages: Object.fromEntries(locales.map(lc => [lc, `${baseUrl}/${lc}/`]))
        }
    };
}
export default function LocaleLayout({ children, params }) {
    const { locale } = params;
    if (!locales.includes(locale))
        notFound();
    return <>{children}</>;
}
