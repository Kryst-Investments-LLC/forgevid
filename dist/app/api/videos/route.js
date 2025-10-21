import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// Only keep valid GET and POST handlers here. All other code is removed.
// GET: Return a list of videos from the database
export async function GET() {
    try {
        const videos = await prisma.video.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50, // limit for performance
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                thumbnail: true,
                duration: true,
                fileSize: true,
                createdAt: true,
                updatedAt: true
            }
        });
        return NextResponse.json({ videos });
    }
    catch (error) {
        return NextResponse.json({ error: 'Failed to fetch videos', details: String(error) }, { status: 500 });
    }
}
// POST: (Stub) Implement video creation logic here as needed
export async function POST(req) {
    return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
