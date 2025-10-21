"use client";
import React from 'react';
import EnglishAccessibility from '@/app/accessibility/page';
import LocaleNotice from '@/components/LocaleNotice';

export default function LocalizedAccessibility() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="accessibility" />
      <EnglishAccessibility />
    </div>
  );
}


