import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { sendSubscriptionReceiptEmail, sendSubscriptionCancelledEmail } from '@/lib/email';
import { grantCredits } from '@/lib/credits';
import type Stripe from 'stripe';

/** Maps a Stripe checkout metadata `pack` id to the CreditLedger reason. */
const CREDIT_PURCHASE_REASON: Record<string, 'purchase_single' | 'purchase_topup10' | 'purchase_topup25'> = {
  single: 'purchase_single',
  topup10: 'purchase_topup10',
  topup25: 'purchase_topup25',
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // One-time credit-pack purchase (SINGLE/TOPUP10/TOPUP25) — a distinct
        // flow from the subscription checkout below: grant the ledger, record a
        // Payment for the revenue dashboard, and stop. No Subscription touched.
        if (session.mode === 'payment' && session.metadata?.type === 'credit_purchase') {
          const creditUserId = session.metadata.userId || session.client_reference_id;
          const credits = Number(session.metadata.credits);
          const reason = session.metadata.pack ? CREDIT_PURCHASE_REASON[session.metadata.pack] : undefined;

          if (!creditUserId || !reason || !Number.isFinite(credits) || credits <= 0) {
            console.error('[Webhook] Missing/invalid credit_purchase metadata:', session.metadata);
            break;
          }

          await grantCredits({
            userId: creditUserId,
            credits,
            reason,
            stripeSessionId: session.id,
          });

          try {
            await prisma.payment.create({
              data: {
                userId: creditUserId,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency || 'usd',
                status: 'SUCCEEDED',
                stripePaymentId: (session.payment_intent as string) || session.id,
                description: `Credit pack: ${session.metadata.pack} (${credits} credits)`,
                metadata: JSON.stringify({
                  type: 'credit_purchase',
                  pack: session.metadata.pack,
                  credits,
                  stripeSessionId: session.id,
                }),
              },
            });
          } catch (error) {
            console.error('[Webhook] Failed to record credit-pack payment:', error);
          }

          console.log(`[Webhook] Granted ${credits} credits (${session.metadata.pack}) to user ${creditUserId}`);
          break;
        }

        const userId = session.client_reference_id || session.metadata?.userId;
        const planId = session.metadata?.planId || session.metadata?.plan;

        if (!userId || !planId) {
          console.error('Missing userId or planId in session metadata');
          break;
        }

        const existing = await prisma.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (existing) {
          await prisma.subscription.update({
            where: { id: existing.id },
            data: {
              plan: planId.toLowerCase(),
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        } else {
          await prisma.subscription.create({
            data: {
              userId,
              plan: planId.toLowerCase(),
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }

        console.log(`Subscription created for user ${userId}, plan ${planId}`);

        // Send subscription receipt email
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
        if (user?.email) {
          sendSubscriptionReceiptEmail(user.email, user.name || 'Creator', {
            plan: planId,
            amount: session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00',
            currency: session.currency || 'usd',
            billingPeriod: 'Monthly',
            invoiceId: session.invoice as string || session.id,
            date: new Date().toLocaleDateString(),
          }).catch((err) => console.error('[Email] Receipt email failed:', err));
        }

        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        try {
          await prisma.subscription.updateMany({
            where: {
              metadata: { contains: subscription.id },
            },
            data: {
              status: subscription.status === 'active' ? 'ACTIVE' :
                     subscription.status === 'canceled' ? 'CANCELLED' :
                     subscription.status === 'past_due' ? 'PAST_DUE' : 'INCOMPLETE',
              currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
              currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
              metadata: JSON.stringify({
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customerId,
              }),
            },
          });
        } catch (error) {
          console.error('Error updating subscription:', error);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment succeeded for invoice ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment failed for invoice ${invoice.id}`);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
