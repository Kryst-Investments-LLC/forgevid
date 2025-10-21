import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { name, description, category, duration, aspectRatio, resolution, tags, thumbnail, previewUrl, templateData, isPublic } = body;
        const template = await prisma.template.create({
            data: {
                name,
                description,
                category,
                duration: duration || 30,
                aspectRatio: aspectRatio || "16:9",
                resolution: resolution || "1080p",
                tags,
                thumbnail: thumbnail || "",
                previewUrl,
                templateData: templateData ? JSON.stringify(templateData) : "{}",
                isPublic: isPublic || false,
                createdById: session.user.id,
            },
        });
        return NextResponse.json(template);
    }
    catch (error) {
        console.error('Template creation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
export async function GET(request) {
    try {
        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const category = url.searchParams.get('category');
        const search = url.searchParams.get('search');
        const where = {
            OR: [
                { isPublic: true },
                // Include user's private templates if authenticated
            ],
        };
        if (category) {
            where.category = category;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [templates, total] = await Promise.all([
            prisma.template.findMany({
                where,
                orderBy: [
                    { usageCount: 'desc' },
                    { createdAt: 'desc' },
                ],
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    createdBy: { select: { id: true, name: true } },
                },
            }),
            prisma.template.count({ where }),
        ]);
        return NextResponse.json({
            templates,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        console.error('Template fetch error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
export async function PUT(request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { id, name, description, category, templateData, isPublic } = body;
        const template = await prisma.template.findUnique({
            where: { id },
        });
        if (!template || template.createdById !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }
        const updatedTemplate = await prisma.template.update({
            where: { id },
            data: {
                name,
                description,
                category,
                templateData: templateData ? JSON.stringify(templateData) : undefined,
                isPublic,
            },
        });
        return NextResponse.json(updatedTemplate);
    }
    catch (error) {
        console.error('Template update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
export async function DELETE(request) {
    try {
        const session = await getServerSession();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = new URL(request.url);
        const templateId = url.searchParams.get('id');
        if (!templateId) {
            return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
        }
        const template = await prisma.template.findUnique({
            where: { id: templateId },
        });
        if (!template || template.createdById !== session.user.id) {
            return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
        }
        await prisma.template.delete({
            where: { id: templateId },
        });
        return NextResponse.json({ message: 'Template deleted' });
    }
    catch (error) {
        console.error('Template delete error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
