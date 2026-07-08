import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OpenAI } from 'openai';
import { generateVideoFromPrompt, cleanupOldVideos } from '@/lib/video-generator';
import { generateVideoWithReplicate } from '@/lib/replicate-video';
import { securityConfigs } from '@/lib/api-security';
import { trackVideoGenerated, trackFeatureUsed } from '@/lib/posthog';
import { analyzeEmotion, selectAssetsForEmotion, generateEmotionAwareScript } from '@/features/emotion-ai';

const aiGenerationSchema = z.object({
  prompt: z.string().min(1).max(2000),
  type: z.enum(['VIDEO_GENERATION', 'STORYBOARD', 'SCRIPT_WRITING', 'VOICE_SYNTHESIS', 'IMAGE_GENERATION']),
  settings: z.record(z.any()).optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function synthesizeWithElevenLabs(text: string, voiceId: string = 'ErXwobaYiN019PkySvjV') {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return {
      audioUrl: `data:audio/mpeg;base64,${audioBase64}`,
      cost: Math.ceil(text.length / 100) * 0.0001 // Estimated cost per character
    };
  } catch (error) {
    console.error('ElevenLabs API error:', error);
    throw new Error('Voice synthesis failed');
  }
}

async function handleGenerateVideo(body: any, userId: string) {
  try {
    const { prompt, style, duration, addOns, enableEmotionAware } = body;
    
    console.log('[AI API] Generating REAL video:', { prompt, style, duration, addOns, enableEmotionAware });
    
    // Step 1: Analyze emotion from prompt (if enabled)
    let detectedEmotion = null;
    let emotionAssets = null;
    
    if (enableEmotionAware) {
      console.log('[AI API] Analyzing emotion from prompt...');
      detectedEmotion = await analyzeEmotion(prompt);
      emotionAssets = selectAssetsForEmotion(detectedEmotion.emotion);
      console.log(`[AI API] Detected emotion: ${detectedEmotion.emotion} (confidence: ${detectedEmotion.confidence.toFixed(2)})`);
    }
    
    // Step 2: Generate video script using OpenAI with emotion-aware enhancements
    console.log('[AI API] Step 2: Generating script with OpenAI...');
    const scriptResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional video script writer and director. Create a detailed video script that can be used to generate a ${duration}-second ${style} video. Include:
          - Scene descriptions with timestamps
          - Visual elements and camera angles
          - Suggested background music/sound effects
          - Text overlays or captions
          - Transitions between scenes
          
          Style guidelines for "${style}":
          ${style === 'modern' ? 'Clean, minimalist, contemporary design with smooth transitions' : ''}
          ${style === 'cinematic' ? 'Film-like quality with dramatic lighting, wide shots, and epic feel' : ''}
          ${style === 'energetic' ? 'Fast-paced, dynamic movements, vibrant colors, upbeat music' : ''}
          ${style === 'professional' ? 'Corporate, polished, formal, trustworthy, clean presentation' : ''}
          ${emotionAssets ? `\n\nEmotional tone: ${detectedEmotion.emotion}\nRecommended pacing: ${emotionAssets.pacing}\nRecommended music style: ${emotionAssets.musicTracks.join(', ')}` : ''}`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    let script = scriptResponse.choices[0]?.message?.content || '';
    console.log('[AI API] Script generated successfully');
    
    // Step 3: Apply emotion-aware enhancements to script (if enabled)
    if (enableEmotionAware && detectedEmotion) {
      console.log('[AI API] Applying emotion-aware enhancements...');
      script = await generateEmotionAwareScript(script, detectedEmotion.emotion);
      console.log('[AI API] Emotion-aware enhancements applied');
    }
    
    // Step 4: Generate actual video — try Replicate AI first, then stock footage fallback
    console.log('[AI API] Step 4: Generating video with Replicate / stock footage...');
    let videoUrl: string;
    let videoProvider: string = 'fallback';
    
    try {
      // PRIMARY: Stock footage assembler (Pexels + FFmpeg + voiceover)
      // This produces professional InVideo-style results
      console.log('[AI API] Using stock footage assembler (primary pipeline)...');
      const assembledUrl = await generateVideoFromPrompt({
        prompt: script,
        style,
        duration,
        addOns: addOns || [],
      });
      
      videoUrl = assembledUrl;
      videoProvider = 'stock-assembler';
      console.log(`[AI API] Video assembled from stock footage: ${videoUrl}`);
    } catch (assemblerError) {
      console.error('[AI API] Stock assembler failed, trying Replicate fallback:', assemblerError);
      
      try {
        // FALLBACK: Replicate AI video generation
        const replicateResult = await generateVideoWithReplicate({
          prompt: script,
          style: style as 'modern' | 'cinematic' | 'energetic' | 'professional',
          duration,
        });
        
        videoUrl = replicateResult.videoUrl;
        videoProvider = replicateResult.provider;
        console.log(`[AI API] Video generated via ${replicateResult.provider}/${replicateResult.model}: ${videoUrl}`);
      } catch (replicateError) {
        console.error('[AI API] All video generation failed, using sample:', replicateError);
        videoUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${
          style === 'cinematic' ? 'ForBiggerBlazes.mp4' :
          style === 'energetic' ? 'ForBiggerEscapes.mp4' :
          style === 'modern' ? 'ForBiggerFun.mp4' :
          'ForBiggerJoyrides.mp4'
        }`;
      }
    }
    
    // Track analytics
    trackVideoGenerated(userId, {
      style,
      duration,
      provider: videoProvider,
      hasAddOns: addOns && addOns.length > 0,
      tokensUsed: scriptResponse.usage?.total_tokens || 0,
    });

    return NextResponse.json({
      success: true,
      data: {
        videoUrl,
        script,
        duration,
        style,
        tokensUsed: scriptResponse.usage?.total_tokens || 0,
        cost: (scriptResponse.usage?.total_tokens || 0) * 0.00003,
        isGenerated: !videoUrl.includes('commondatastorage.googleapis.com'),
        videoProvider,
        ...(enableEmotionAware && detectedEmotion ? {
          emotion: detectedEmotion.emotion,
          emotionConfidence: detectedEmotion.confidence,
          emotionAssets
        } : {})
      },
      message: videoUrl.includes('commondatastorage.googleapis.com') 
        ? 'Script generated successfully. Video generation failed, showing placeholder.'
        : '🎉 Real video generated successfully from your prompt!'
    });
  } catch (error) {
    console.error('[AI API] Video generation error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate video'
      }, 
      { status: 500 }
    );
  }
}

async function processAIGeneration(type: string, prompt: string, settings?: Record<string, any>) {
  try {
    switch (type) {
      case 'SCRIPT_WRITING':
        const scriptResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional video script writer. Create engaging, concise video scripts based on the user prompt. Include scene descriptions, dialogue, and visual cues.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        });
        return {
          result: scriptResponse.choices[0]?.message?.content || '',
          tokensUsed: scriptResponse.usage?.total_tokens || 0,
          cost: (scriptResponse.usage?.total_tokens || 0) * 0.00003 // $0.03 per 1K tokens for GPT-4
        };
      
      case 'STORYBOARD':
        const storyboardResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional storyboard artist. Create detailed storyboard descriptions with scene-by-scene breakdowns, camera angles, and visual elements.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.6
        });
        return {
          result: storyboardResponse.choices[0]?.message?.content || '',
          tokensUsed: storyboardResponse.usage?.total_tokens || 0,
          cost: (storyboardResponse.usage?.total_tokens || 0) * 0.00003
        };
      
      case 'VOICE_SYNTHESIS':
        const voiceResult = await synthesizeWithElevenLabs(prompt, settings?.voiceId);
        return {
          result: voiceResult.audioUrl,
          tokensUsed: 0,
          cost: voiceResult.cost
        };
      
      case 'IMAGE_GENERATION':
        const imageResponse = await openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: settings?.size || '1024x1024',
          quality: settings?.quality || 'standard'
        });
        return {
          result: imageResponse.data?.[0]?.url || '',
          tokensUsed: 0,
          cost: settings?.quality === 'hd' ? 0.08 : 0.04 // DALL-E-3 pricing
        };
      
      default:
        const generalResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant for video creation. Help users with their video generation requests.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        });
        return {
          result: generalResponse.choices[0]?.message?.content || '',
          tokensUsed: generalResponse.usage?.total_tokens || 0,
          cost: (generalResponse.usage?.total_tokens || 0) * 0.00003
        };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AI generation failed');
  }
}

async function handlePost(request: NextRequest) {
  // Get user session
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  const userId = session.user.id;

  const body = await request.json();
  
  // Handle generate_video action
  if (body.action === 'generate_video') {
    return await handleGenerateVideo(body, userId);
  }
  
  const { prompt, type, settings } = aiGenerationSchema.parse(body);

  // Create initial generation record
  const aiGeneration = await prisma.aIGeneration.create({
    data: {
      prompt,
      type,
      status: 'PROCESSING',
      userId,
    },
  });

  try {
    // Process with OpenAI/ElevenLabs
    const result = await processAIGeneration(type, prompt, settings);
    
    // Update with results
    const updatedGeneration = await prisma.aIGeneration.update({
      where: { id: aiGeneration.id },
      data: {
        result: result.result,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        status: 'COMPLETED'
      },
    });

    return NextResponse.json({ 
      id: updatedGeneration.id,
      status: 'completed',
      result: result.result,
      tokensUsed: result.tokensUsed,
      cost: result.cost
    });
  } catch (error) {
    // Update status to failed
    await prisma.aIGeneration.update({
      where: { id: aiGeneration.id },
      data: { status: 'FAILED' },
    });

    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'AI generation failed' }, 
      { status: 500 }
    );
  }
}

async function handleGet(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  const url = new URL(request.url);
  const generationId = url.searchParams.get('id');

  if (generationId) {
    const generation = await prisma.aIGeneration.findUnique({
      where: { id: generationId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!generation || generation.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(generation);
  }

  // List user's AI generations
  const generations = await prisma.aIGeneration.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json(generations);
}

export const POST = securityConfigs.authenticated(handlePost);
export const GET = securityConfigs.readOnly(handleGet);