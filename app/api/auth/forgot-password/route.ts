import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import { createResetToken, appBaseUrl, RESET_TTL_MS } from '@/lib/password-reset';

/**
 * POST /api/auth/forgot-password — start a reset.
 *
 * Enumeration-safe: the response is identical whether or not the email exists.
 * When it does exist, we store a hashed, one-hour token and email the raw one as
 * a link. Users authenticated only through SSO/OAuth (no password) are skipped —
 * there is nothing to reset — but the response still looks the same.
 */

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email('Invalid email').max(255).transform((v) => v.toLowerCase().trim()),
});

const GENERIC = {
  message: 'If an account exists for that email, we have sent a reset link.',
};

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    const { email } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, password: true },
    });

    // Only credentials users (those with a password) can reset. Everyone else
    // gets the same generic response so existence never leaks.
    if (user && user.password) {
      const { raw, hash } = createResetToken();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetTokenHash: hash,
          resetTokenExpiry: new Date(Date.now() + RESET_TTL_MS),
        },
      });

      const resetUrl = `${appBaseUrl()}/auth/reset-password?token=${raw}&email=${encodeURIComponent(email)}`;
      // Non-blocking: never let SMTP latency/failure change the response shape.
      sendPasswordResetEmail(user.email, user.name || 'there', resetUrl).catch((err) =>
        console.error('[Email] Password reset email failed:', err),
      );
    }

    return NextResponse.json(GENERIC, { status: 200 });
  } catch (error) {
    console.error('[forgot-password] error:', error);
    // Still generic — do not reveal server-side failures per-email.
    return NextResponse.json(GENERIC, { status: 200 });
  }
}
