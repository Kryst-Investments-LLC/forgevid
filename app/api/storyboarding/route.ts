import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateStoryboardScenes } from '@/lib/ai/openai'

// Uses the OpenAI SDK — must run on the Node runtime, not Edge.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const script = typeof body.script === 'string' ? body.script.trim() : ''
  if (script.length < 10) {
    return NextResponse.json({ error: 'Please enter a script of at least 10 characters.' }, { status: 400 })
  }
  if (script.length > 8000) {
    return NextResponse.json({ error: 'Script is too long (8000 characters max).' }, { status: 400 })
  }

  try {
    const scenes = await generateStoryboardScenes(script)
    return NextResponse.json({
      storyboard: {
        scenes: scenes.map((s, i) => ({ id: i + 1, ...s })),
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate storyboard.'
    console.error('[storyboarding] generation failed:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
