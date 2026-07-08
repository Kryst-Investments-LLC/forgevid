import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { subject, description, priority, category } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
    }

    const allowedPriorities = ['low', 'medium', 'high'];
    const allowedCategories = ['general', 'billing', 'technical', 'feature'];

    const ticket = await prisma.supportTicket.create({
      data: {
        subject: String(subject).slice(0, 200),
        description: String(description).slice(0, 5000),
        priority: allowedPriorities.includes(priority) ? priority : 'medium',
        category: allowedCategories.includes(category) ? category : 'general',
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
