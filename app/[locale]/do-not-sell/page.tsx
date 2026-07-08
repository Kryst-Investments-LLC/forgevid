"use client";
import React from 'react';
import EnglishDoNotSell from '@/app/do-not-sell/page';
import LocaleNotice from '@/components/LocaleNotice';

export default function LocalizedDoNotSell() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="do-not-sell" />
      <EnglishDoNotSell />
    </div>
  );
}


