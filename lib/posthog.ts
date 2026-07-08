/**
 * PostHog Server-Side Analytics
 *
 * Captures: signups, video generation, exports, subscriptions, AI usage.
 * Set NEXT_PUBLIC_POSTHOG_KEY and POSTHOG_HOST in .env to enable.
 */

interface PostHogEvent {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
}

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

async function captureEvent(event: PostHogEvent): Promise<void> {
  if (!POSTHOG_KEY) return;

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: event.event,
        distinct_id: event.distinctId,
        properties: {
          ...event.properties,
          $lib: 'forgevid-server',
          $lib_version: '1.0.0',
        },
        timestamp: (event.timestamp || new Date()).toISOString(),
      }),
    });
  } catch (error) {
    console.error('[PostHog] Failed to capture event:', error);
  }
}

export async function identifyUser(
  userId: string,
  properties: { email?: string; name?: string; plan?: string; role?: string }
): Promise<void> {
  if (!POSTHOG_KEY) return;
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event: '$identify',
        distinct_id: userId,
        properties: { $set: properties },
      }),
    });
  } catch (error) {
    console.error('[PostHog] Failed to identify user:', error);
  }
}

export function trackSignUp(userId: string, method: 'email' | 'google' | 'sso'): void {
  captureEvent({ distinctId: userId, event: 'user_signed_up', properties: { method } });
}

export function trackLogin(userId: string, method: 'email' | 'google' | 'sso'): void {
  captureEvent({ distinctId: userId, event: 'user_logged_in', properties: { method } });
}

export function trackVideoGenerated(
  userId: string,
  props: { style: string; duration: number; provider: string; hasAddOns: boolean; tokensUsed: number }
): void {
  captureEvent({ distinctId: userId, event: 'video_generated', properties: props });
}

export function trackVideoExported(
  userId: string,
  props: { format: string; quality: string; duration: number }
): void {
  captureEvent({ distinctId: userId, event: 'video_exported', properties: props });
}

export function trackAIChatMessage(
  userId: string,
  props: { messageCount: number; hasBrief: boolean; tokensUsed: number }
): void {
  captureEvent({ distinctId: userId, event: 'ai_chat_message', properties: props });
}

export function trackTemplateUsed(userId: string, props: { templateId: string; category: string }): void {
  captureEvent({ distinctId: userId, event: 'template_used', properties: props });
}

export function trackSubscriptionStarted(
  userId: string,
  props: { plan: string; amount: number; currency: string }
): void {
  captureEvent({ distinctId: userId, event: 'subscription_started', properties: props });
}

export function trackSubscriptionCancelled(userId: string, plan: string): void {
  captureEvent({ distinctId: userId, event: 'subscription_cancelled', properties: { plan } });
}

export function trackFeatureUsed(userId: string, feature: string, extra?: Record<string, unknown>): void {
  captureEvent({ distinctId: userId, event: 'feature_used', properties: { feature, ...extra } });
}
