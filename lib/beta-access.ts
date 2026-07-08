import { prisma } from './prisma'

function parseCsv(value?: string | null): string[] {
  return (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function isEnabled(value?: string | null): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase())
}

export function isBetaModeEnabled(): boolean {
  return isEnabled(process.env.BETA_MODE)
}

export function getAllowedBetaEmails(): string[] {
  return parseCsv(process.env.BETA_ALLOWED_EMAILS).map((email) => email.toLowerCase())
}

export function getBetaInviteCodes(): string[] {
  return parseCsv(process.env.BETA_INVITE_CODES)
}

export async function getStoredBetaAccessEntries() {
  return prisma.betaAccessEntry.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      inviteCode: true,
      note: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
      createdBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  })
}

async function getActiveStoredBetaAccessEntries() {
  return prisma.betaAccessEntry.findMany({
    where: { isActive: true },
    select: { email: true, inviteCode: true },
  })
}

export async function isBetaAccessAllowed({
  email,
  inviteCode,
}: {
  email?: string | null
  inviteCode?: string | null
}): Promise<{ allowed: boolean; reason: 'disabled' | 'email' | 'invite' | 'blocked' }> {
  if (!isBetaModeEnabled()) {
    return { allowed: true, reason: 'disabled' }
  }

  const storedEntries = await getActiveStoredBetaAccessEntries()
  const storedEmails = storedEntries
    .map((entry) => entry.email?.toLowerCase().trim())
    .filter(Boolean) as string[]
  const storedInviteCodes = storedEntries
    .map((entry) => entry.inviteCode?.trim())
    .filter(Boolean) as string[]

  const normalizedEmail = email?.toLowerCase().trim()
  if (normalizedEmail && (getAllowedBetaEmails().includes(normalizedEmail) || storedEmails.includes(normalizedEmail))) {
    return { allowed: true, reason: 'email' }
  }

  const normalizedInviteCode = inviteCode?.trim()
  if (normalizedInviteCode && (getBetaInviteCodes().includes(normalizedInviteCode) || storedInviteCodes.includes(normalizedInviteCode))) {
    return { allowed: true, reason: 'invite' }
  }

  return { allowed: false, reason: 'blocked' }
}
