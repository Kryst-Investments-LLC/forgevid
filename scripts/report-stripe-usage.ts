// This script can be run as a scheduled job (e.g., with node-cron or system cron)
// It will POST to the /api/usage/report-stripe endpoint to automate Stripe usage reporting.

import fetch from 'node-fetch';

const API_URL = process.env.REPORT_STRIPE_URL || 'http://localhost:3000/api/usage/report-stripe';
const API_KEY = process.env.REPORT_STRIPE_KEY || '';

async function reportStripeUsage() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {}),
      },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Unknown error');
    }
    console.log(`[Stripe Usage Report] Success:`, data);
  } catch (error) {
    console.error(`[Stripe Usage Report] Failed:`, error);
    // Optionally: send notification (email, Slack, etc.)
  }
}

// Run immediately if called directly
if (require.main === module) {
  reportStripeUsage();
}

export default reportStripeUsage;
