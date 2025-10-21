import { NextResponse } from 'next/server';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });
export async function POST(req) {
    const { priceId, successUrl, cancelUrl, customerEmail } = await req.json();
    if (!priceId || !successUrl || !cancelUrl) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: customerEmail,
        });
        return NextResponse.json({ url: session.url });
    }
    catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
