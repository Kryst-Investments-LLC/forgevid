// DALL-E 3 and SDXL image generation API integration for ForgeVid Hybrid Pipeline
// Supports both DALL-E 3 and SDXL for thumbnails and scene stills.

import { NextRequest, NextResponse } from 'next/server';

// Example: POST /api/ai/image { prompt: string, model: 'dalle' | 'sdxl', ... }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, model = 'dalle', ...params } = body;
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  let apiUrl: string;
  let apiKey: string | undefined;
  if (model === 'dalle') {
    apiUrl = process.env.DALLE_API_URL || 'https://api.openai.com/v1/images/generations';
    apiKey = process.env.OPENAI_API_KEY;
  } else if (model === 'sdxl') {
    apiUrl = process.env.SDXL_IMAGE_API_URL || 'https://api.runpod.io/sdxl-image/generate';
    apiKey = process.env.RUNPOD_API_KEY;
  } else {
    return NextResponse.json({ error: 'Invalid model' }, { status: 400 });
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'Image API key not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt, ...params }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'Image API error', details: error }, { status: 502 });
    }

    const data = await response.json();
    // The response may include an image URL or job ID for polling
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to call Image API', details: String(err) }, { status: 500 });
  }
}
