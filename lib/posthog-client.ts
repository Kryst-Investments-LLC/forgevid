"use client"

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

/**
 * Lightweight PostHog client — captures page views and custom events
 * without pulling in the full posthog-js SDK.
 */
function capture(event: string, properties?: Record<string, unknown>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;

  const distinctId =
    localStorage.getItem('ph_distinct_id') ||
    (() => {
      const id = `anon_${crypto.randomUUID()}`;
      localStorage.setItem('ph_distinct_id', id);
      return id;
    })();

  fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event,
      distinct_id: distinctId,
      properties: {
        ...properties,
        $current_url: window.location.href,
        $referrer: document.referrer,
        $screen_width: window.screen.width,
        $screen_height: window.screen.height,
        $lib: 'forgevid-client',
      },
      timestamp: new Date().toISOString(),
    }),
    keepalive: true,
  }).catch(() => {});
}

export function usePostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    capture('$pageview', {
      $pathname: pathname,
      $search: searchParams?.toString() || '',
    });
  }, [pathname, searchParams]);
}

export function trackClientEvent(event: string, properties?: Record<string, unknown>) {
  capture(event, properties);
}

/**
 * Link server-side user ID to client anonymous ID
 */
export function identifyClientUser(userId: string, traits?: Record<string, unknown>) {
  if (!POSTHOG_KEY || typeof window === 'undefined') return;

  const anonId = localStorage.getItem('ph_distinct_id');
  if (!anonId) return;

  // Send alias event
  fetch(`${POSTHOG_HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: POSTHOG_KEY,
      event: '$identify',
      distinct_id: userId,
      properties: {
        $anon_distinct_id: anonId,
        $set: traits || {},
      },
    }),
    keepalive: true,
  }).catch(() => {});

  localStorage.setItem('ph_distinct_id', userId);
}
