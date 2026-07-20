import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { hashResetToken, timingSafeEqualHex } from '@/lib/password-reset';

/**
 * POST /api/auth/reset-password — complete a reset.
 *
 * Validates the emailed token against the stored hash (constant-time) and its
 * expiry, enforces the same password policy as registration, then sets the new
 * password and clears the token so it is strictly single-use.
 */

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email('Invalid email').max(255).transform((v) => v.toLowerCase().trim()),
  token: z.string().min(10).max(200),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const INVALID = { error: 'This reset link is invalid or has expired. Request a new one.' };

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      const details = parsed.error?.issues.map((i) => i.message);
      return NextResponse.json({ error: 'Validation failed', details }, { status: 400 });
    }
    const { email, token, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, resetTokenHash: true, resetTokenExpiry: true },
    });

    const providedHash = hashResetToken(token);
    const valid =
      user &&
      user.resetTokenHash &&
      user.resetTokenExpiry &&
      user.resetTokenExpiry.getTime() > Date.now() &&
      timingSafeEqualHex(user.resetTokenHash, providedHash);

    if (!valid) {
      return NextResponse.json(INVALID, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user!.id },
      data: {
        password: hashedPassword,
        // Single-use: burn the token so the same link cannot reset twice.
        resetTokenHash: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ message: 'Your password has been reset. You can now sign in.' });
  } catch (error) {
    console.error('[reset-password] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
