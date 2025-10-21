import { NextRequest, NextResponse } from 'next/server';

// Runway Gen-2 API endpoint and key from environment
const RUNWAY_API_URL = 'https://api.runwayml.com/v1/generate';
const RUNWAY_API_KEY = process.env.RUNWAY_API_KEY;

// Example: POST /api/ai/runway { prompt: string, ... }
export async function POST(req: NextRequest) {
  if (!RUNWAY_API_KEY) {
    return NextResponse.json({ error: 'Runway API key not configured' }, { status: 500 });
  }

  const body = await req.json();
  const { prompt, ...params } = body;
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  try {
    // Call Runway Gen-2 API
    const runwayRes = await fetch(RUNWAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNWAY_API_KEY}`,
      },
      body: JSON.stringify({ prompt, ...params }),
    });

    if (!runwayRes.ok) {
      const error = await runwayRes.text();
      return NextResponse.json({ error: 'Runway API error', details: error }, { status: 502 });
    }

    const data = await runwayRes.json();
    // The response may include a video URL or job ID for polling
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to call Runway API', details: String(err) }, { status: 500 });
  }
}
