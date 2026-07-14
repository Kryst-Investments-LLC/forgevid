import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/report — anyone can report a video / generated content for abuse.
 *
 * Public (no auth): a person who received a shared video must be able to report
 * it. Stored in content_reports for review, takedown, and preservation.
 */
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  videoId: z.string().max(120).optional(),
  reason: z.string().min(3).max(120),
  details: z.string().max(2000).optional(),
  reporterEmail: z.string().email().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid report', details: parsed.error.issues }, { status: 400 });
  }
  try {
    await prisma.contentReport.create({
      data: { ...parsed.data, source: 'user', status: 'open' },
    });
    return NextResponse.json({ ok: true, message: 'Thank you — your report has been received and will be reviewed.' });
  } catch (error) {
    console.error('[report] failed:', error);
    return NextResponse.json({ error: 'Could not submit the report. Please try again.' }, { status: 500 });
  }
}
