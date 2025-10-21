import { NextResponse } from 'next/server';
import { generateImageWithDalle, generateImageWithSDXL } from '@/lib/video-generator';
export async function POST(req) {
    try {
        const { prompt, model } = await req.json();
        if (!prompt || typeof prompt !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid prompt' }, { status: 400 });
        }
        let imageUrl;
        if (model === 'sdxl') {
            imageUrl = await generateImageWithSDXL(prompt);
        }
        else {
            imageUrl = await generateImageWithDalle(prompt);
        }
        // TODO: Add billing, analytics, authentication, and rate limiting logic here
        return NextResponse.json({ imageUrl });
    }
    catch (error) {
        return NextResponse.json({ error: error.message || 'Image generation failed' }, { status: 500 });
    }
}
