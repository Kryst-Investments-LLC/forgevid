import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const locales = ['en', 'es', 'hi', 'zh', 'ja', 'fr', 'it', 'ko', 'pt', 'de'];


export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000';
  const { locale } = params;
  return {
    alternates: {
      canonical: `${baseUrl}/${locale}/`,
      languages: Object.fromEntries(locales.map(lc => [lc, `${baseUrl}/${lc}/`]))
    }
  };
}

export default async function LocaleLayout(props: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const params = await props.params;

  const {
    children
  } = props;

  const { locale } = params;
  if (!locales.includes(locale as any)) notFound();
  // Without this provider, every client page under [locale] that calls
  // useTranslations() crashes — the messages must be handed to the client.
  const messages = await getMessages({ locale });
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
