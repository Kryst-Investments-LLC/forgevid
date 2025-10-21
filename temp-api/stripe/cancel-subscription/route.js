import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
export async function POST(req) {
    try {
        const { subscriptionId } = await req.json();
        if (!subscriptionId) {
            return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
        }
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });
        return NextResponse.json({
            success: true,
            subscription: {
                id: subscription.id,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                currentPeriodEnd: subscription.current_period_end,
            },
        });
    }
    catch (error) {
        console.error("Cancel subscription error:", error);
        return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
    }
}
