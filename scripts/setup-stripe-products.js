/**
 * Stripe Product and Price Setup Script
 * Run this once to create Stripe products and prices for ForgeVid
 * 
 * Usage: node scripts/setup-stripe-products.js
 */

const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not found in environment');
  console.log('Please set your Stripe secret key:');
  console.log('export STRIPE_SECRET_KEY=sk_test_...');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setupProducts() {
  console.log('🚀 Setting up Stripe products and prices for ForgeVid...\n');

  // Recurring subscription plans — allowances match lib/quota.ts PLAN_QUOTAS
  // (2026-07 credit-system relaunch: tighter monthly counts + duration caps,
  // margin-protecting).
  const products = [
    {
      name: 'ForgeVid Starter',
      description: 'Perfect for individuals and small businesses',
      prices: [
        {
          amount: 2900, // $29.00
          currency: 'usd',
          interval: 'month',
          metadata: {
            plan: 'starter',
            videos: '30',
            quality: 'hd'
          }
        }
      ]
    },
    {
      name: 'ForgeVid Pro',
      description: 'Best for growing teams and agencies',
      prices: [
        {
          amount: 9900, // $99.00
          currency: 'usd',
          interval: 'month',
          metadata: {
            plan: 'pro',
            videos: '100',
            quality: '4k'
          }
        }
      ]
    },
    {
      name: 'ForgeVid Enterprise',
      description: 'For large organizations and high-volume users',
      prices: [
        {
          amount: 29900, // $299.00
          currency: 'usd',
          interval: 'month',
          metadata: {
            plan: 'enterprise',
            videos: '250',
            quality: '4k'
          }
        }
      ]
    }
  ];

  // One-time credit packs — the purchased-credit pool (lib/credits.ts). No
  // `recurring` block, so these are one-time Stripe Prices, not subscriptions.
  // TOPUP10/TOPUP25 undercut SINGLE's per-video price on purpose to reward
  // existing subscribers; that gate is enforced server-side at checkout
  // (app/api/payments/create-checkout-session), not here.
  const creditPacks = [
    {
      name: 'ForgeVid Single Video',
      description: 'One video generation credit — no subscription required, never expires',
      amount: 1900, // $19.00
      envVar: 'STRIPE_SINGLE_PRICE_ID',
      metadata: { pack: 'single', credits: '1' },
    },
    {
      name: 'ForgeVid Top-up 10',
      description: '10 video generation credits — active paid subscribers only, never expire',
      amount: 1500, // $15.00
      envVar: 'STRIPE_TOPUP10_PRICE_ID',
      metadata: { pack: 'topup10', credits: '10' },
    },
    {
      name: 'ForgeVid Top-up 25',
      description: '25 video generation credits — active paid subscribers only, never expire',
      amount: 2900, // $29.00
      envVar: 'STRIPE_TOPUP25_PRICE_ID',
      metadata: { pack: 'topup25', credits: '25' },
    },
  ];

  try {
    for (const productData of products) {
      console.log(`Creating product: ${productData.name}...`);

      // Create product
      const product = await stripe.products.create({
        name: productData.name,
        description: productData.description,
      });

      console.log(`✅ Product created: ${product.name} (ID: ${product.id})`);

      // Create prices for this product
      for (const priceData of productData.prices) {
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: priceData.amount,
          currency: priceData.currency,
          recurring: {
            interval: priceData.interval,
          },
          metadata: priceData.metadata,
        });

        console.log(`  ✅ Price created: ${priceData.amount / 100} ${priceData.currency}/${priceData.interval} (ID: ${price.id})`);

        // Output the environment variable format
        const planKey = priceData.metadata.plan.toUpperCase();
        console.log(`  📝 Add to .env: STRIPE_${planKey}_PRICE_ID="${price.id}"`);
      }

      console.log('');
    }

    console.log('💳 Setting up one-time credit packs...\n');

    for (const pack of creditPacks) {
      console.log(`Creating product: ${pack.name}...`);

      const product = await stripe.products.create({
        name: pack.name,
        description: pack.description,
      });

      console.log(`✅ Product created: ${product.name} (ID: ${product.id})`);

      // No `recurring` — a one-time payment Price, charged via
      // checkout.sessions.create({ mode: 'payment', ... }).
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: pack.amount,
        currency: 'usd',
        metadata: pack.metadata,
      });

      console.log(`  ✅ Price created: ${pack.amount / 100} usd one-time (ID: ${price.id})`);
      console.log(`  📝 Add to .env: ${pack.envVar}="${price.id}"`);
      console.log('');
    }

    console.log('✅ All products and prices created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy the Price IDs shown above to your .env file');
    console.log('2. Update lib/stripe.ts if needed');
    console.log('3. Test the subscription flow in your app');
    console.log('\n💡 Webhook setup:');
    console.log('1. Go to https://dashboard.stripe.com/webhooks');
    console.log('2. Add endpoint: https://yourdomain.com/api/webhooks/stripe');
    console.log('3. Select events: checkout.session.completed, customer.subscription.*, invoice.*');
    console.log('4. Copy webhook secret to STRIPE_WEBHOOK_SECRET in .env');

  } catch (error) {
    console.error('❌ Error setting up products:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.log('\n💡 Tip: Make sure you\'re using test keys for development');
      console.log('   Get keys from: https://dashboard.stripe.com/test/apikeys');
    }
    process.exit(1);
  }
}

setupProducts();


