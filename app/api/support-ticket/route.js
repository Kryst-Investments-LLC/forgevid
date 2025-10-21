import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function POST(req) {
    try {
        const { name, email, subject, message, userId } = await req.json();
        if (!name || !email || !subject || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        // Store ticket in DB
        const ticket = await prisma.supportTicket.create({
            data: {
                name,
                email,
                subject,
                message,
                user: userId ? { connect: { id: userId } } : undefined,
            },
        });
        // TODO: Send email notification here (integrate with your email provider)
        return NextResponse.json({ success: true, ticket });
    }
    catch (error) {
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
