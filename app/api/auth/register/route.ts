import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { sendWelcomeEmail } from '@/lib/email'
import { trackSignUp, identifyUser } from '@/lib/posthog'
import { isBetaAccessAllowed } from '@/lib/beta-access'

// Enterprise-grade registration schema
const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z\s\-'.]+$/, 'Name contains invalid characters'),
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .transform(v => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  inviteCode: z.string().max(128, 'Invite code is too long').trim().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input with Zod
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.issues.map((issue) => issue.message)
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    const { name, email, password, inviteCode } = validation.data

    const betaAccess = await isBetaAccessAllowed({ email, inviteCode })
    if (!betaAccess.allowed) {
      return NextResponse.json(
        {
          error: 'Private beta access required. Use an invited email or valid invite code.',
        },
        { status: 403 }
      )
    }

    // Check if user already exists — use generic error to prevent enumeration
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Unable to create account. If this email is already registered, please sign in.' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'USER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    })

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name || 'Creator').catch((err) =>
      console.error('[Email] Welcome email failed:', err)
    );

    // Track signup analytics
    trackSignUp(user.id, 'email');
    identifyUser(user.id, { email: user.email, name: user.name || undefined, role: 'USER' });

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
