import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
export async function POST(req) {
    try {
        const { customerId } = await req.json();
        if (!customerId) {
            return NextResponse.json({ error: "Missing customerId" }, { status: 400 });
        }
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
        });
        return NextResponse.json({ url: session.url });
    }
    catch (error) {
        console.error("Customer portal error:", error);
        return NextResponse.json({ error: "Failed to create customer portal session" }, { status: 500 });
    }
}
