import { NextResponse } from "next/server";
import { stripe, PRICE_IDS } from "@/lib/stripe";
export async function POST(req) {
    try {
        const { plan, userId } = await req.json();
        if (!plan || !userId) {
            return NextResponse.json({ error: "Missing plan or userId" }, { status: 400 });
        }
        if (!(plan in PRICE_IDS)) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }
        const priceId = PRICE_IDS[plan];
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true&plan=${plan}`,
            cancel_url: `${process.env.NEXTAUTH_URL}/?canceled=true`,
            client_reference_id: userId,
            metadata: {
                userId,
                plan,
            },
        });
        return NextResponse.json({ sessionId: session.id, url: session.url });
    }
    catch (error) {
        console.error("Stripe checkout error:", error);
        return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
}
