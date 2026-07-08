"use client"

import { Suspense } from 'react';
import { usePostHogPageView } from '@/lib/posthog-client';

function PageViewTracker() {
  usePostHogPageView();
  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </>
  );
}
