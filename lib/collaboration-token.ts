import jwt from 'jsonwebtoken'
import { z } from 'zod'

const collaborationTokenSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  type: z.literal('collaboration'),
})

export type CollaborationTokenPayload = z.infer<typeof collaborationTokenSchema>

function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  return process.env.JWT_SECRET
}

export function signCollaborationToken(
  payload: Omit<CollaborationTokenPayload, 'type'>,
  expiresIn: string = '15m'
): string {
  return jwt.sign({ ...payload, type: 'collaboration' }, getJwtSecret(), {
    expiresIn,
    algorithm: 'HS256',
    issuer: 'forgevid',
    audience: 'forgevid-collaboration',
  })
}

export function verifyCollaborationToken(token: string): CollaborationTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'forgevid',
      audience: 'forgevid-collaboration',
    })
    const result = collaborationTokenSchema.safeParse(decoded)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
