import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateAdHooks } from '@/lib/ai/openai'
import { getAdPlatform } from '@/lib/ad-platforms'

export const runtime = 'nodejs'

// POST { brief, platform, count } -> scroll-stopping ad hooks + CTAs + angles.
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

  const brief = typeof body.brief === 'string' ? body.brief.trim() : ''
  if (brief.length < 10 || brief.length > 4000) {
    return NextResponse.json({ error: 'Describe your product or offer in 10–4000 characters.' }, { status: 400 })
  }

  const platform = getAdPlatform(typeof body.platform === 'string' ? body.platform : undefined)

  let count = Number(body.count)
  if (!Number.isFinite(count) || count < 3) count = 6
  if (count > 12) count = 12

  try {
    const result = await generateAdHooks(brief, platform.label, Math.floor(count))
    return NextResponse.json({ ...result, platform: platform.key })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate hooks.'
    console.error('[ad-studio/hooks]', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
