import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { llm as openai, llmModel } from '@/lib/ai/llm';
import { trackAIChatMessage } from '@/lib/posthog';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are ForgeVid's AI video creation assistant. Your job is to help users iteratively describe and refine their video idea through conversation.

Guidelines:
- Ask clarifying questions about: target audience, tone/mood, duration, visual style, key messages, call-to-action
- Suggest improvements to make their video more engaging
- When the user's idea is clear enough, generate a structured video brief in JSON format wrapped in \`\`\`json blocks
- The JSON brief should include: title, description, style (modern/cinematic/energetic/professional), duration (seconds), scenes (array with description, duration, visualElements), addOns (subtitles/music/voiceover/effects)
- Keep responses concise and actionable
- If the user says "generate" or "create it" or similar, produce the final JSON brief

Example final brief:
\`\`\`json
{
  "ready": true,
  "title": "Eco Running Shoes Ad",
  "description": "A 60-second modern advertisement...",
  "style": "modern",
  "duration": 60,
  "scenes": [
    {"description": "Sunrise over mountain trail", "duration": 15, "visualElements": ["nature", "sunrise", "runner"]},
    {"description": "Close-up of shoe features", "duration": 20, "visualElements": ["product", "details"]},
    {"description": "Athletes group running", "duration": 15, "visualElements": ["team", "energy"]},
    {"description": "Brand logo and CTA", "duration": 10, "visualElements": ["branding", "text"]}
  ],
  "addOns": ["subtitles", "music"]
}
\`\`\``;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, conversationId } = body as {
      messages: ChatMessage[];
      conversationId?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Validate message content length
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content || lastMessage.content.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 chars)' }, { status: 400 });
    }

    // Build OpenAI messages
    const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.slice(-20).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 5000),
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: llmModel(),
      messages: openaiMessages,
      max_tokens: 1500,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Check if reply contains a ready video brief
    let videoBrief = null;
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.ready) {
          videoBrief = parsed;
        }
      } catch {
        // Not valid JSON, ignore
      }
    }

    // Track token usage
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Track analytics
    trackAIChatMessage(session.user.id, {
      messageCount: messages.length,
      hasBrief: !!videoBrief,
      tokensUsed,
    });

    // Log the AI interaction
    await prisma.aIGeneration.create({
      data: {
        prompt: lastMessage.content,
        type: 'SCRIPT_WRITING',
        status: 'COMPLETED',
        result: reply,
        tokensUsed,
        cost: tokensUsed * 0.00003,
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      reply,
      videoBrief,
      tokensUsed,
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}
