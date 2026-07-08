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

// Pricing plans
export const PRICING_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    credits: 3,
    features: ['3 video generations per month', 'Basic templates', 'Standard quality'],
  },
  STARTER: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    credits: 20,
    features: ['20 video generations per month', 'All templates', 'HD quality', 'Priority support'],
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 99,
    credits: 100,
    features: ['100 video generations per month', 'All templates', '4K quality', 'Custom branding', 'Priority support'],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    credits: 500,
    features: ['500 video generations per month', 'All templates', '4K quality', 'Custom branding', 'API access', 'Dedicated support'],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
} as const;

export type PricingPlan = keyof typeof PRICING_PLANS;