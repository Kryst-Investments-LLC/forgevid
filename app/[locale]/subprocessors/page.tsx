"use client";
import React from 'react';
import EnglishSubprocessors from '@/app/subprocessors/page';
import LocaleNotice from '@/components/LocaleNotice';

export default function LocalizedSubprocessors() {
  return (
    <div className="min-h-screen">
      <LocaleNotice pageType="subprocessors" />
      <EnglishSubprocessors />
    </div>
  );
}


