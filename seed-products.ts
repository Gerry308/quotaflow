import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  // Check if product already exists
  const existingProducts = await stripe.products.search({ query: "name:'QuotaFlow Pro'" });
  if (existingProducts.data.length > 0) {
    console.log('QuotaFlow Pro already exists:', existingProducts.data[0].id);
    return;
  }

  // Create QuotaFlow Pro product ($2/month)
  const product = await stripe.products.create({
    name: 'QuotaFlow Pro',
    description: 'Auto-apply to 20-30 jobs/month. AI-tailored resumes. SMS notifications. Workforce Australia reports.',
    metadata: {
      features: 'auto-apply,ai-resumes,sms-notifications,reports',
      target: 'jobseekers',
    },
  });

  // Create monthly price ($2 AUD)
  const monthlyPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: 200, // $2.00 in cents
    currency: 'aud',
    recurring: { interval: 'month' },
    metadata: {
      plan: 'monthly',
    },
  });

  console.log('Created QuotaFlow Pro:', product.id);
  console.log('Monthly price:', monthlyPrice.id, '- $2.00 AUD/month');
}

createProducts().catch(console.error);
