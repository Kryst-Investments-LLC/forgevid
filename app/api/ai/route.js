import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { OpenAI } from 'openai';
import { generateVideoFromPrompt, cleanupOldVideos } from '@/lib/video-generator';
const aiGenerationSchema = z.object({
    prompt: z.string().min(1).max(2000),
    type: z.enum(['VIDEO_GENERATION', 'STORYBOARD', 'SCRIPT_WRITING', 'VOICE_SYNTHESIS', 'IMAGE_GENERATION']),
    settings: z.record(z.any()).optional(),
});
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});
async function synthesizeWithElevenLabs(text, voiceId = 'ErXwobaYiN019PkySvjV') {
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
    }
    catch (error) {
        console.error('ElevenLabs API error:', error);
        throw new Error('Voice synthesis failed');
    }
}
async function handleGenerateVideo(body, userId) {
    try {
        const { prompt, style, duration, addOns } = body;
        console.log('[AI API] Generating REAL video:', { prompt, style, duration, addOns });
        // Step 1: Generate video script using OpenAI
        console.log('[AI API] Step 1: Generating script with OpenAI...');
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
          ${style === 'professional' ? 'Corporate, polished, formal, trustworthy, clean presentation' : ''}`
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1500,
            temperature: 0.7
        });
        const script = scriptResponse.choices[0]?.message?.content || '';
        console.log('[AI API] Script generated successfully');
        // Step 2: Generate actual video from the SCRIPT using stock footage
        console.log('[AI API] Step 2: Generating actual video with scene-by-scene matching...');
        let videoUrl;
        try {
            // Clean up old videos first
            cleanupOldVideos();
            // Generate the video using the AI-generated SCRIPT (not the original prompt)
            // This allows scene-by-scene parsing and matching
            videoUrl = await generateVideoFromPrompt({
                prompt: script, // Use the generated script, not the original prompt
                style,
                duration,
                addOns
            });
            console.log('[AI API] Video generated successfully:', videoUrl);
        }
        catch (videoError) {
            console.error('[AI API] Video generation failed, using fallback:', videoError);
            // Fallback to placeholder if video generation fails
            videoUrl = `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/${style === 'cinematic' ? 'ForBiggerBlazes.mp4' :
                style === 'energetic' ? 'ForBiggerEscapes.mp4' :
                    style === 'modern' ? 'ForBiggerFun.mp4' :
                        'ForBiggerJoyrides.mp4'}`;
        }
        return NextResponse.json({
            success: true,
            data: {
                videoUrl,
                script,
                duration,
                style,
                tokensUsed: scriptResponse.usage?.total_tokens || 0,
                cost: (scriptResponse.usage?.total_tokens || 0) * 0.00003,
                isGenerated: !videoUrl.includes('commondatastorage.googleapis.com')
            },
            message: videoUrl.includes('commondatastorage.googleapis.com')
                ? 'Script generated successfully. Video generation failed, showing placeholder.'
                : '🎉 Real video generated successfully from your prompt!'
        });
    }
    catch (error) {
        console.error('[AI API] Video generation error:', error);
        return NextResponse.json({
            success: false,
            error: 'Failed to generate video',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function processAIGeneration(type, prompt, settings) {
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
    }
    catch (error) {
        console.error('OpenAI API error:', error);
        throw new Error('AI generation failed');
    }
}
async function handlePost(request) {
    // Development mode: Skip authentication
    console.log('[API] Development mode: Skipping authentication for AI');
    const userId = 'dev-user';
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
    }
    catch (error) {
        // Update status to failed
        await prisma.aIGeneration.update({
            where: { id: aiGeneration.id },
            data: { status: 'FAILED' },
        });
        console.error('AI generation error:', error);
        return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }
}
async function handleGet(request) {
    const session = await getServerSession();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id || session.user.email;
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
export const POST = handlePost;
export const GET = handleGet;
