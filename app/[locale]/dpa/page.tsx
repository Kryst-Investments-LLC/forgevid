"use client";
import React from 'react';
import EnglishDpa from '@/app/dpa/page';
import LocaleNotice from '@/components/LocaleNotice';

export default function LocalizedDpa() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="dpa" />
      <EnglishDpa />
    </div>
  );
}


