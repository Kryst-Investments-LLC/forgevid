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
            videos: '20',
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
            videos: '500',
            quality: '4k'
          }
        }
      ]
    }
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


