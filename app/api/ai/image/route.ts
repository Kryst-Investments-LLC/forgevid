
import { NextRequest, NextResponse } from 'next/server';
import { generateImageWithDalle, generateImageWithSDXL } from '@/lib/video-generator';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, userId } = await req.json();
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid prompt' }, { status: 400 });
    }
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 });
    }
    let imageUrl: string;
    if (model === 'sdxl') {
      imageUrl = await generateImageWithSDXL(prompt);
    } else {
      imageUrl = await generateImageWithDalle(prompt);
    }
    // Usage metering: create a UsageRecord for this generation
    await prisma.usageRecord.create({
      data: {
        userId,
        action: 'ai_generation',
        resourceType: 'image',
        quantity: 1,
        metadata: JSON.stringify({ model, prompt }),
      },
    });
    return NextResponse.json({ imageUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Image generation failed' }, { status: 500 });
  }
}
