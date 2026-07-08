import { authenticator } from 'otplib'
import crypto from 'crypto'

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'ForgeVid'

export interface GeneratedMfaSecret {
  secret: string
  otpauthUrl: string
}

export function generateMfaSecret(email: string): GeneratedMfaSecret {
  const secret = authenticator.generateSecret()
  const otpauthUrl = authenticator.keyuri(email, APP_NAME, secret)

  return {
    secret,
    otpauthUrl,
  }
}

export function verifyMfaToken(secret: string, token: string): boolean {
  if (!secret || !token) {
    return false
  }

  return authenticator.verify({ secret, token })
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const segment = () => crypto.randomBytes(3).toString('hex').slice(0, 4)
    return `${segment()}-${segment()}`.toUpperCase()
  })
}

