import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import OpenAI from 'openai';
import { ElevenLabsClient } from 'elevenlabs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/middleware/rate-limit';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
// Configure Cloudinary - only if environment variables are available
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}
// Initialize AI services - only if API keys are available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
}) : null;
const elevenLabs = process.env.ELEVENLABS_API_KEY ? new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
}) : null;
// Service availability checks
function requireOpenAI() {
    if (!openai) {
        throw new Error('OpenAI service not configured');
    }
    return openai;
}
function requireElevenLabs() {
    if (!elevenLabs) {
        throw new Error('ElevenLabs service not configured');
    }
    return elevenLabs;
}
// Validation schemas
const uploadSchema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    transcript: z.string().optional(),
});
const processVideoSchema = z.object({
    videoId: z.string().cuid(),
    action: z.enum(['transcribe', 'summarize', 'generate_voiceover', 'auto_edit']),
    options: z.record(z.any()).optional(),
});
// Upload video endpoint
export async function POST(req) {
    try {
        // Check authentication
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Rate limiting based on user tier
        const userTier = session.user.role === 'ADMIN' ? 'enterprise' : 'free';
        const rateLimitResult = await rateLimit(req);
        if (!rateLimitResult.success) {
            return NextResponse.json({
                error: 'Rate limit exceeded',
                limit: rateLimitResult.limit,
                reset: rateLimitResult.reset,
                remaining: rateLimitResult.remaining
            }, { status: 429 });
        }
        const formData = await req.formData();
        const file = formData.get('file');
        const title = formData.get('title');
        const description = formData.get('description');
        if (!file || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        // Validate input
        const validation = uploadSchema.safeParse({ title, description });
        if (!validation.success) {
            return NextResponse.json({
                error: 'Invalid input',
                details: validation.error.issues
            }, { status: 400 });
        }
        // Upload to Cloudinary
        console.log('📤 Uploading video to Cloudinary...');
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                resource_type: 'video',
                folder: 'forgevid/videos',
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' },
                    { width: 1920, height: 1080, crop: 'limit' }
                ]
            }, (error, result) => {
                if (error)
                    reject(error);
                else
                    resolve(result);
            });
            // Convert file to buffer and upload
            file.arrayBuffer().then(buffer => {
                stream.end(Buffer.from(buffer));
            });
        });
        const videoUrl = uploadResult.secure_url;
        const thumbnailUrl = uploadResult.secure_url.replace('.mp4', '.jpg');
        // Generate transcript with OpenAI Whisper
        console.log('🎤 Generating transcript...');
        let transcript = '';
        try {
            const transcription = await requireOpenAI().audio.transcriptions.create({
                file: file,
                model: 'whisper-1',
                response_format: 'text'
            });
            transcript = transcription;
        }
        catch (error) {
            console.warn('Transcription failed:', error);
        }
        // Generate summary with OpenAI GPT-4
        console.log('📝 Generating summary...');
        let summary = '';
        try {
            const summaryResponse = await requireOpenAI().chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: `Summarize this video transcript in 2-3 sentences: ${transcript}`
                    }
                ],
                max_tokens: 150
            });
            summary = summaryResponse.choices[0].message.content || '';
        }
        catch (error) {
            console.warn('Summary generation failed:', error);
        }
        // Save to database
        console.log('💾 Saving to database...');
        const video = await prisma.video.create({
            data: {
                title: validation.data.title,
                description: validation.data.description,
                fileUrl: videoUrl,
                thumbnail: thumbnailUrl,
                transcript,
                summary,
                userId: session.user.id,
                organizationId: session.user.organizationId,
                status: 'COMPLETED',
                duration: uploadResult.duration,
                fileSize: BigInt(file.size),
                resolution: '1080p',
                format: 'mp4',
                metadata: JSON.stringify({
                    cloudinaryId: uploadResult.public_id,
                    originalName: file.name,
                    mimeType: file.type,
                    uploadTimestamp: new Date().toISOString()
                })
            },
        });
        // Log usage
        await prisma.usageRecord.create({
            data: {
                action: 'video_uploaded',
                userId: session.user.id,
                metadata: JSON.stringify({
                    videoId: video.id,
                    fileSize: file.size,
                    duration: uploadResult.duration
                }),
                cost: 0.01 // Estimated cost
            }
        });
        return NextResponse.json({
            success: true,
            video: {
                id: video.id,
                title: video.title,
                url: video.fileUrl,
                thumbnail: video.thumbnail,
                transcript: video.transcript,
                summary: video.summary,
                duration: video.duration,
                createdAt: video.createdAt
            }
        });
    }
    catch (error) {
        console.error('Video upload error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
// Process video endpoint (transcribe, summarize, etc.)
export async function PUT(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await req.json();
        const validation = processVideoSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: 'Invalid input',
                details: validation.error.issues
            }, { status: 400 });
        }
        const { videoId, action, options } = validation.data;
        // Get video from database
        const video = await prisma.video.findFirst({
            where: {
                id: videoId,
                userId: session.user.id
            }
        });
        if (!video) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }
        let result = {};
        switch (action) {
            case 'transcribe':
                if (!video.transcript) {
                    const transcription = await openai.audio.transcriptions.create({
                        file: video.fileUrl,
                        model: 'whisper-1'
                    });
                    result = { transcript: transcription };
                }
                else {
                    result = { transcript: video.transcript };
                }
                break;
            case 'summarize':
                const summaryResponse = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: `Summarize this video: ${video.transcript || 'No transcript available'}`
                        }
                    ]
                });
                result = { summary: summaryResponse.choices[0].message.content };
                break;
            case 'generate_voiceover':
                const voiceoverResponse = await elevenLabs.textToSpeech.convert(options?.voiceId || 'default', {
                    text: video.summary || video.transcript || 'No content available',
                    model_id: 'eleven_multilingual_v2'
                });
                result = { voiceoverUrl: voiceoverResponse };
                break;
            case 'auto_edit':
                // AI-powered editing suggestions
                const editSuggestions = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'user',
                            content: `Analyze this video transcript and suggest editing improvements: ${video.transcript}`
                        }
                    ]
                });
                result = { suggestions: editSuggestions.choices[0].message.content };
                break;
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        // Update video with results
        await prisma.video.update({
            where: { id: videoId },
            data: {
                transcript: action === 'transcribe' ? result.transcript : video.transcript,
                summary: action === 'summarize' ? result.summary : video.summary,
                metadata: JSON.stringify({
                    ...JSON.parse(video.metadata || '{}'),
                    [`${action}_result`]: result,
                    [`${action}_timestamp`]: new Date().toISOString()
                })
            }
        });
        return NextResponse.json({ success: true, result });
    }
    catch (error) {
        console.error('Video processing error:', error);
        return NextResponse.json({
            error: 'Processing failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
// Get user's videos
export async function GET(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status');
        const where = {
            userId: session.user.id,
            ...(status && { status: status })
        };
        const [videos, total] = await Promise.all([
            prisma.video.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    thumbnail: true,
                    duration: true,
                    fileSize: true,
                    createdAt: true,
                    updatedAt: true
                }
            }),
            prisma.video.count({ where })
        ]);
        return NextResponse.json({
            videos: videos.map(video => ({
                ...video,
                fileSize: video.fileSize ? Number(video.fileSize) : null
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Get videos error:', error);
        return NextResponse.json({
            error: 'Failed to fetch videos'
        }, { status: 500 });
    }
}
