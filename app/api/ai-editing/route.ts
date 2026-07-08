import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { securityConfigs } from '@/lib/api-security';
import {
  analyzeVideo,
  generateAutoEditSuggestions,
  applyVideoEdit,
  type VideoEditRequest,
} from '@/features/ai-editing-ai';

async function handlePost(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, videoUrl, prompt, editType, parameters, outputFormat, quality } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'analyze': {
        if (!videoUrl) {
          return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
        }
        const analysis = await analyzeVideo(videoUrl);
        return NextResponse.json({ success: true, data: analysis });
      }

      case 'suggest': {
        if (!videoUrl || !prompt) {
          return NextResponse.json({ error: 'Video URL and prompt are required' }, { status: 400 });
        }
        const suggestions = await generateAutoEditSuggestions(videoUrl, prompt);
        return NextResponse.json({ success: true, data: suggestions });
      }

      case 'edit': {
        if (!videoUrl || !editType) {
          return NextResponse.json({ error: 'Video URL and edit type are required' }, { status: 400 });
        }
        const editRequest: VideoEditRequest = {
          videoUrl,
          editType,
          parameters: parameters || {},
          outputFormat: outputFormat || 'mp4',
          quality: quality || '1080p',
        };
        const result = await applyVideoEdit(editRequest);
        return NextResponse.json({ success: true, data: result });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[AI Editing] Error:', error);
    return NextResponse.json({ error: 'AI editing operation failed' }, { status: 500 });
  }
}

export const POST = securityConfigs.authenticated(handlePost);
