// AI Selector service for ForgeVid Hybrid Pipeline
// Routes jobs to Runway, SDXL/AnimateDiff, or ESRGAN/Topaz based on duration, resolution, and cost logic.

import { NextRequest, NextResponse } from 'next/server';

// Example: POST /api/ai/select { prompt, duration, resolution, ... }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { prompt, duration, resolution, ...params } = body;
  if (!prompt || !duration || !resolution) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Routing logic
  // Jobs < 30 sec or ≤ 720p → SDXL path
  // Jobs > 30 sec or 4K → Runway path
  // Upscaling if requested
  let route = '';
  if ((duration <= 30 && (resolution === '720p' || resolution === '480p')) || resolution === 'b-roll') {
    route = 'sdxl-animatediff';
  } else if (duration > 30 || resolution === '4K' || resolution === '2160p') {
    route = 'runway';
  } else {
    route = 'sdxl-animatediff'; // Default fallback
  }

  // Optionally, add cost logic here
  // Example: If cost estimate exceeds threshold, fallback to SDXL

  // Call the selected backend API route
  let apiUrl = '';
  if (route === 'runway') {
    apiUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/ai/runway`;
  } else if (route === 'sdxl-animatediff') {
    apiUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/ai/sdxl-animatediff`;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, duration, resolution, ...params }),
    });
    const data = await response.json();
    return NextResponse.json({ route, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to route AI job', details: String(err) }, { status: 500 });
  }
}
