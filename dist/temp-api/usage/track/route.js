import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function POST(req) {
    try {
        // Check if database is available
        if (!process.env.DATABASE_URL) {
            console.log('Database not configured, skipping usage tracking');
            return NextResponse.json({ success: true, message: 'Database not configured' });
        }
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { event } = await req.json();
        await prisma.usageRecord.create({
            data: { userId: session.user.id, action: event },
        });
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('Usage tracking error:', error);
        return NextResponse.json({ success: true, message: 'Usage tracking unavailable' });
    }
}
