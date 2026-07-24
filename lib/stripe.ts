import Stripe from 'stripe';
import { lazyClient } from './lazy-client';

// Constructed on first use, not at import: `next build` imports every route to
// collect page data, and secrets may only exist at runtime.
export const stripe = lazyClient<Stripe>(() => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(secretKey, {
    apiVersion: '2025-09-30.clover',
    typescript: true,
  });
});

export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

// Pricing plans — allowances match lib/quota.ts PLAN_QUOTAS (2026-07 credit-system
// relaunch). Duration caps live there, not here; these numbers are the monthly
// video counts sold on the pricing page.
export const PRICING_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 2,
    features: ['2 video generations per month (up to 60s)', 'Basic templates', 'Standard quality'],
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    credits: 30,
    features: [
      '30 video generations per month (up to 90s)',
      'All templates',
      'HD quality',
      'Priority support',
      'Top up with extra credits anytime',
    ],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    credits: 100,
    features: [
      '100 video generations per month (up to 120s)',
      'All templates',
      '4K quality',
      'Custom branding',
      'Priority support',
      'Top up with extra credits anytime',
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    credits: 250,
    features: [
      '250 video generations per month (up to 150s)',
      'All templates',
      '4K quality',
      'Custom branding',
      'API access',
      'Dedicated support',
      'Top up with extra credits anytime',
    ],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
} as const;

export type PricingPlan = keyof typeof PRICING_PLANS;

// One-time credit purchases — the purchased-credit pool (lib/credits.ts).
// Never expire, consumed only once the monthly plan allowance runs out.
// TOPUP10/TOPUP25 undercut SINGLE's per-video price on purpose to reward
// existing subscribers, so they require an active paid plan (enforced
// server-side in the checkout-session route — never trust the client).
export const CREDIT_PACKS = {
  PILOT: {
    id: 'pilot',
    credits: 5,
    price: 99,
    stripePriceId: process.env.STRIPE_PILOT_PRICE_ID,
  },
  SINGLE: {
    id: 'single',
    credits: 1,
    price: 19,
    stripePriceId: process.env.STRIPE_SINGLE_PRICE_ID,
  },
  TOPUP10: {
    id: 'topup10',
    credits: 10,
    price: 15,
    stripePriceId: process.env.STRIPE_TOPUP10_PRICE_ID,
    requiresSubscription: true,
  },
  TOPUP25: {
    id: 'topup25',
    credits: 25,
    price: 29,
    stripePriceId: process.env.STRIPE_TOPUP25_PRICE_ID,
    requiresSubscription: true,
  },
} as const;

export type CreditPackKey = keyof typeof CREDIT_PACKS;
