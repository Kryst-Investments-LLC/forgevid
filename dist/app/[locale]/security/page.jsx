"use client";
import React from 'react';
import EnglishSecurity from '@/app/security/page';
import LocaleNotice from '@/components/LocaleNotice';
export default function LocalizedSecurity() {
    return (<div className="min-h-screen">
      <LocaleNotice pageType="security"/>
      <EnglishSecurity />
    </div>);
}
