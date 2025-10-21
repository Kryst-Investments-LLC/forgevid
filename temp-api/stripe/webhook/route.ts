import { type NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/database"
import type Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const plan = session.metadata?.plan

        if (userId && plan) {
          // Update user subscription in database
          await prisma.subscription.upsert({
            where: { 
              userId: userId
            },
            create: {
              userId,
              plan: plan.toLowerCase(),
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
            update: {
              plan: plan.toLowerCase(),
              status: 'ACTIVE',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          })
          console.log(`User ${userId} subscribed to ${plan} plan`)
        }
        break
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Update user subscription status in database
        // Since we don't have stripeCustomerId field, we'll use the subscription ID metadata or session reference
        try {
          await prisma.subscription.updateMany({
            where: { 
              // We'll update based on the subscription metadata when available
              OR: [
                { metadata: { contains: subscription.id } },
                { metadata: { contains: customerId } }
              ]
            },
            data: {
              status: subscription.status === 'active' ? 'ACTIVE' : 
                     subscription.status === 'canceled' ? 'CANCELLED' :
                     subscription.status === 'past_due' ? 'PAST_DUE' : 'INCOMPLETE',
              currentPeriodStart: new Date(subscription.current_period_start * 1000),
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
              metadata: JSON.stringify({ 
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: customerId 
              }),
            },
          })
        } catch (error) {
          console.error('Error updating subscription:', error)
        }
        console.log(`Subscription ${subscription.id} updated for customer ${customerId}`)
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment succeeded for invoice ${invoice.id}`)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment failed for invoice ${invoice.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
