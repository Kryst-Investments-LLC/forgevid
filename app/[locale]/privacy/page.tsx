"use client";
import React from 'react';
import EnglishPrivacy from '@/app/privacy/page';
import LocaleNotice from '@/components/LocaleNotice';

export default function LocalizedPrivacy() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="privacy" />
      <EnglishPrivacy />
    </div>
  );
}


