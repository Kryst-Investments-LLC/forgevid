import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { llm as openai, llmModel } from '@/lib/ai/llm'

// Uses the OpenAI SDK — must run on the Node runtime, not Edge.
export const runtime = 'nodejs'

interface EmotionInsights {
  overallTone: string
  emotions: { name: string; intensity: number }[]
  beats: { moment: string; emotion: string; note: string }[]
  suggestions: string[]
}

const SYSTEM_PROMPT =
  'You are a script emotion analyst for video creators. Analyze the emotional tone and pacing of the ' +
  'given video script or narration. Respond with ONLY a JSON object shaped like ' +
  '{"overallTone":"...","emotions":[{"name":"Joy","intensity":72}],' +
  '"beats":[{"moment":"Opening line","emotion":"Curiosity","note":"Hooks with a question"}],' +
  '"suggestions":["..."]}. "intensity" is an integer 0-100. Include 3-6 emotions ordered by intensity, ' +
  'highest first. Include 2-6 beats in the order they occur in the script, each tied to a real line or ' +
  'moment from the text — do not invent moments that are not in the script. Include 2-4 concise, ' +
  'actionable suggestions for the creator (pacing, music, delivery, visuals). Output no markdown and no ' +
  'commentary outside the JSON.'

/** Turn a raw video script into a real emotion breakdown via an LLM call (no fabricated numbers). */
async function generateEmotionInsights(script: string): Promise<EmotionInsights> {
  const completion = await openai.chat.completions.create({
    model: llmModel(),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Script:\n${script}` },
    ],
    max_tokens: 900,
    temperature: 0.6,
  })

  return parseEmotionInsights(completion.choices[0]?.message?.content || '')
}

/** Tolerantly parse the model's reply (it may wrap JSON in ``` fences or prose). */
function parseEmotionInsights(raw: string): EmotionInsights {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  const jsonText = first !== -1 && last > first ? cleaned.slice(first, last + 1) : cleaned

  let parsed: any
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('The model returned an unparseable emotion breakdown. Please try again.')
  }

  const overallTone = String(parsed?.overallTone ?? '').trim()

  const rawEmotions = Array.isArray(parsed?.emotions) ? parsed.emotions : []
  const emotions = rawEmotions
    .map((e: any) => ({
      name: String(e?.name ?? '').trim(),
      intensity: Math.max(0, Math.min(100, Math.round(Number(e?.intensity) || 0))),
    }))
    .filter((e: { name: string }) => e.name.length > 0)

  const rawBeats = Array.isArray(parsed?.beats) ? parsed.beats : []
  const beats = rawBeats
    .map((b: any) => ({
      moment: String(b?.moment ?? '').trim(),
      emotion: String(b?.emotion ?? '').trim(),
      note: String(b?.note ?? '').trim(),
    }))
    .filter((b: { moment: string }) => b.moment.length > 0)

  const rawSuggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions : []
  const suggestions = rawSuggestions
    .map((s: any) => String(s ?? '').trim())
    .filter((s: string) => s.length > 0)

  if (!overallTone || emotions.length === 0) {
    throw new Error('The model returned no usable emotion breakdown. Please try again.')
  }

  return { overallTone, emotions, beats, suggestions }
}

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
    return NextResponse.json({ error: 'Please paste a script of at least 10 characters.' }, { status: 400 })
  }
  if (script.length > 8000) {
    return NextResponse.json({ error: 'Script is too long (8000 characters max).' }, { status: 400 })
  }

  try {
    const insights = await generateEmotionInsights(script)
    return NextResponse.json({ insights })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to analyze script.'
    console.error('[ai/insights] analysis failed:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
