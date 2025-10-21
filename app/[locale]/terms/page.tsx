"use client";
import React from 'react';
import EnglishTerms from '@/app/terms/page';
import LocaleNotice from '@/components/LocaleNotice';

export default function LocalizedTerms() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="terms" />
      <EnglishTerms />
    </div>
  );
}


