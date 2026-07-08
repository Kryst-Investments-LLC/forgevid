import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const locales = ['en', 'es', 'hi', 'zh', 'ja', 'fr', 'it', 'ko', 'pt', 'de'];


export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000';
  const { locale } = params;
  return {
    alternates: {
      canonical: `${baseUrl}/${locale}/`,
      languages: Object.fromEntries(locales.map(lc => [lc, `${baseUrl}/${lc}/`]))
    }
  };
}

export default function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  const { locale } = params;
  if (!locales.includes(locale as any)) notFound();
  return <>{children}</>;
}
