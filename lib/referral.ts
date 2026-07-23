import { randomBytes } from 'crypto'
import { prisma } from './prisma'

/** Account credit (in cents) granted to the referrer when a referred user
 *  takes a paid subscription. $5 per converted referral. */
export const REFERRAL_REWARD_CENTS = 500

// Unambiguous alphabet (no 0/O/1/I) for human-readable share codes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode(len = 8): string {
  const bytes = randomBytes(len)
  let out = ''
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length]
  return out
}

/** Return the user's referral code, creating their account on first call. */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await prisma.referralAccount.findUnique({ where: { userId } })
  if (existing) return existing.code

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const created = await prisma.referralAccount.create({ data: { userId, code: randomCode() } })
      return created.code
    } catch {
      // Either a code collision or a race creating the same userId row — re-read
      // and, if the row now exists, use it; otherwise retry with a fresh code.
      const now = await prisma.referralAccount.findUnique({ where: { userId } })
      if (now) return now.code
    }
  }
  throw new Error('Could not allocate a referral code')
}
