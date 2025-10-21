
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-09-30.clover' });

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${err}` }, { status: 400 });
  }

  // Handle subscription events

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email;
      const subscriptionId = session.subscription as string;
      if (customerEmail && subscriptionId) {
        // Find user by email
        const user = await prisma.user.findUnique({ where: { email: customerEmail } });
        if (user) {
          // Get subscription from Stripe
          const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
          // Log the full subscription object for debugging
          console.log('Stripe Subscription object:', JSON.stringify(stripeSub, null, 2));
          // TODO: Update the following logic after inspecting the structure
        }
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      // Find user by Stripe customer ID (if you store it)
      // For now, update all subscriptions with this Stripe sub ID
      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        canceled: 'CANCELLED',
        past_due: 'PAST_DUE',
        incomplete: 'INCOMPLETE',
        incomplete_expired: 'INCOMPLETE_EXPIRED',
        trialing: 'TRIALING',
        unpaid: 'UNPAID',
      };
      const plan = sub.items.data[0].price.nickname || 'pro';
      // Find all subscriptions for this plan and update
      const subs = await prisma.subscription.findMany({ where: { plan } });
      for (const s of subs) {
        await prisma.subscription.update({
          where: { id: s.id },
          data: {
            status: statusMap[sub.status] as any || 'ACTIVE',
            plan,
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
            metadata: JSON.stringify(sub),
          },
        });
      }
      break;
    }
    // Add more event types as needed
  }

  return NextResponse.json({ received: true });
}
