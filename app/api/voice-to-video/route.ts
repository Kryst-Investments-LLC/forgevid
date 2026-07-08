import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { processVoiceToVideo } from '@/features/voice-to-video-ai';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { audio, options } = body;

    if (!audio || typeof audio !== 'string') {
      return NextResponse.json({ error: 'Audio data is required' }, { status: 400 });
    }

    // Convert base64 audio back to a File-like object
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });
    const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

    const voiceOptions = {
      voiceId: session.user.id,
      duration: options?.duration || 30,
      style: options?.videoStyle === 'energetic' ? 'casual' as const
        : options?.videoStyle === 'cinematic' ? 'dramatic' as const
        : 'professional' as const,
      language: options?.language || 'en',
    };

    const result = await processVoiceToVideo(audioFile, voiceOptions);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Voice-to-video error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice-to-video' },
      { status: 500 }
    );
  }
}
