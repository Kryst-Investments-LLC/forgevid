import Stripe from 'stripe';
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});
export const PRICE_IDS = {
    FREE: 'price_free',
    STARTER: 'price_starter',
    PRO: 'price_pro',
    ENTERPRISE: 'price_enterprise',
};
