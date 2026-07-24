const Stripe = require('stripe');

async function main() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const products = await stripe.products.search({ query: "metadata['forgevid_key']:'pilot_5'", limit: 1 });
  const product = products.data[0] || await stripe.products.create({
    name: 'ForgeVid 5-Video Business Pilot',
    description: 'Five non-expiring ForgeVid video credits. One-time payment; no subscription.',
    metadata: { forgevid_key: 'pilot_5', credits: '5' },
  });
  const prices = await stripe.prices.list({ product: product.id, active: true, type: 'one_time', limit: 100 });
  const price = prices.data.find((candidate) => candidate.currency === 'usd' && candidate.unit_amount === 9900)
    || await stripe.prices.create({ product: product.id, currency: 'usd', unit_amount: 9900 });
  console.log(`STRIPE_PILOT_PRICE_ID=${price.id}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
