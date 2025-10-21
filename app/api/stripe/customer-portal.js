import { NextResponse } from 'next/server';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
export async function POST(req) {
    const { customerId, returnUrl } = await req.json();
    if (!customerId || !returnUrl) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
        return NextResponse.json({ url: portalSession.url });
    }
    catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
