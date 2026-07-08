# Stripe Payment Integration Setup Guide

## 1. Create Stripe Account and Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create an account or sign in
3. Go to **Developers > API Keys**
4. Copy your **Publishable key** and **Secret key**

## 2. Create Products and Prices

1. Go to **Products** in Stripe Dashboard
2. Create products for each plan:
   - **Starter Plan**: $29/month
   - **Pro Plan**: $99/month  
   - **Enterprise Plan**: $299/month
3. For each product, create a recurring price (monthly)
4. Copy the **Price IDs** for each plan

## 3. Set up Webhooks

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `https://yourdomain.com/api/webhooks/stripe`
4. Select events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Copy the **Webhook signing secret**

## 4. Update Environment Variables

Add these to your `.env` file:

```env
# Stripe
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Stripe Price IDs
STRIPE_STARTER_PRICE_ID="price_starter_plan_id"
STRIPE_PRO_PRICE_ID="price_pro_plan_id"
STRIPE_ENTERPRISE_PRICE_ID="price_enterprise_plan_id"
```

## 5. Test the Integration

1. Start your development server: `npm run dev`
2. Go to `/pricing` to see the pricing page
3. Test with Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

## 6. Production Deployment

1. Switch to live mode in Stripe Dashboard
2. Update environment variables with live keys
3. Update webhook endpoint URL to production domain
4. Test with real payment methods

## Features Implemented

✅ **Pricing Page** (`/pricing`)
- Display all subscription plans
- Stripe checkout integration
- Customer portal access

✅ **Subscription Management**
- Dashboard subscription widget
- Plan upgrade/downgrade
- Billing management

✅ **Stripe Webhooks**
- Payment success/failure handling
- Subscription lifecycle management
- Automatic plan updates

✅ **Database Integration**
- User subscription tracking
- Payment history
- Plan feature enforcement

## Next Steps

1. Set up your Stripe account and get the API keys
2. Update the `.env` file with your Stripe credentials
3. Test the payment flow
4. Deploy to production with live Stripe keys

The payment system is now fully integrated and ready for production use!
