import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
});

export const PRICE_IDS = {
  FREE: 'price_free',
  STARTER: 'price_starter',
  PRO: 'price_pro',
  ENTERPRISE: 'price_enterprise',
} as const;

export type PlanType = keyof typeof PRICE_IDS;