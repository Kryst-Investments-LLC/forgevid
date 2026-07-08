import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { allowsCustomBranding, getUserPlan, requiresWatermark } from '@/lib/plan';
import { isValidHexColor } from '@/lib/brand-kit';

/**
 * Brand kit: logo, caption colour/typeface, intro/outro.
 *
 * GET  /api/brand-kit — current kit + whether the plan may use it
 * PUT  /api/brand-kit — upsert (paid plans only)
 *
 * The renderer re-resolves branding from the plan at render time, so a stored
 * kit on a downgraded account is simply ignored rather than silently applied.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const plan = await getUserPlan(session.user.id);
  const brandKit = await prisma.brandKit.findUnique({ where: { userId: session.user.id } });

  return NextResponse.json({
    brandKit,
    plan,
    canCustomize: allowsCustomBranding(plan),
    watermarked: requiresWatermark(plan),
  });
}

const brandKitSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  logoOpacity: z.number().min(0).max(1).optional(),
  logoPosition: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).optional(),
  // Validated again here: this value is interpolated into an ffmpeg filtergraph.
  primaryColor: z
    .string()
    .refine(isValidHexColor, 'primaryColor must be #RGB or #RRGGBB')
    .nullable()
    .optional(),
  fontFamily: z.string().max(500).nullable().optional(),
  introUrl: z.string().url().nullable().optional(),
  outroUrl: z.string().url().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const plan = await getUserPlan(session.user.id);
  if (!allowsCustomBranding(plan)) {
    return NextResponse.json(
      { error: 'Custom branding requires a paid plan', plan, upgradeRequired: true },
      { status: 403 },
    );
  }

  const parsed = brandKitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const brandKit = await prisma.brandKit.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...parsed.data },
      update: parsed.data,
    });
    return NextResponse.json({ brandKit });
  } catch (error) {
    console.error('[brand-kit] upsert failed');
    return NextResponse.json({ error: 'Failed to save brand kit' }, { status: 500 });
  }
}
