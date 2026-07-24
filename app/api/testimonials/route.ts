import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  testimonial: z.string().trim().min(20).max(2000),
  businessName: z.string().trim().max(200).optional(),
  allowPublicUse: z.boolean(),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Provide at least 20 characters and a consent choice.' }, { status: 400 })

  await prisma.usageRecord.create({
    data: {
      userId: session.user.id,
      action: 'testimonial_submitted',
      resourceType: 'customer_feedback',
      quantity: 1,
      metadata: JSON.stringify({
        testimonial: parsed.data.testimonial,
        businessName: parsed.data.businessName || null,
        allowPublicUse: parsed.data.allowPublicUse,
        consentedAt: new Date().toISOString(),
      }),
    },
  })
  return NextResponse.json({ success: true })
}
