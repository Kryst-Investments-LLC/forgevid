import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '@/app/api/auth/mfa/route'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { generateMfaSecret, verifyMfaToken, generateBackupCodes } from '@/lib/mfa'

jest.mock('next/server', () => {
  class MockNextRequest {
    constructor(url, init = {}) {
      this.url = url
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this._body = init.body ? init.body.toString() : null
    }

    async json() {
      if (!this._body) return null
      return JSON.parse(this._body)
    }
  }

  class MockNextResponse {
    constructor(body, init = {}) {
      this._body = body
      this.status = init?.status ?? 200
    }

    async json() {
      return this._body
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json(body, init) {
        return new MockNextResponse(body, init)
      },
    },
  }
})

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: jest.fn(() => ({})),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/mfa', () => ({
  generateMfaSecret: jest.fn(),
  verifyMfaToken: jest.fn(),
  generateBackupCodes: jest.fn(),
}))

const mockedSession = { user: { id: 'user_1', email: 'user@example.com' } }

describe('MFA API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mockedSession)
    ;(generateMfaSecret as jest.Mock).mockReturnValue({
      secret: 'TESTSECRET',
      otpauthUrl: 'otpauth://totp/ForgeVid:user@example.com?secret=TESTSECRET&issuer=ForgeVid',
    })
    ;(generateBackupCodes as jest.Mock).mockReturnValue(['AAAA-BBBB'])
  })

  it('returns MFA status for authenticated users', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ mfaEnabled: true, mfaSecret: 'SECRET' })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ mfaEnabled: true, hasSecret: true })
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      select: { mfaEnabled: true, mfaSecret: true },
    })
  })

  it('generates new MFA secret', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      mfaEnabled: false,
      mfaSecret: null,
      password: null,
      metadata: null,
    })
    ;(prisma.user.update as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/mfa', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.secret).toBe('TESTSECRET')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { mfaSecret: 'TESTSECRET', mfaEnabled: false },
    })
  })

  it('allows regenerating a pending MFA secret before MFA is enabled', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      mfaEnabled: false,
      mfaSecret: 'PENDINGSECRET',
      password: null,
      metadata: null,
    })
    ;(prisma.user.update as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/mfa', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.secret).toBe('TESTSECRET')
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: expect.objectContaining({
        mfaSecret: 'TESTSECRET',
        mfaEnabled: false,
        metadata: expect.any(String),
      }),
    })
  })

  it('requires step-up auth to reset an enabled MFA configuration', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      mfaEnabled: true,
      mfaSecret: 'TESTSECRET',
      password: null,
      metadata: null,
    })

    const request = new NextRequest('http://localhost:3000/api/auth/mfa', {
      method: 'POST',
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('verifies MFA token and enables MFA', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ mfaSecret: 'TESTSECRET', metadata: null })
    ;(verifyMfaToken as jest.Mock).mockReturnValue(true)

    const request = new NextRequest('http://localhost:3000/api/auth/mfa', {
      method: 'PUT',
      body: JSON.stringify({ token: '123456' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.backupCodes).toEqual(['AAAA-BBBB'])
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: expect.objectContaining({
        mfaEnabled: true,
        metadata: expect.any(String),
      }),
    })
  })

  it('rejects invalid MFA codes', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ mfaSecret: 'TESTSECRET', metadata: null })
    ;(verifyMfaToken as jest.Mock).mockReturnValue(false)

    const request = new NextRequest('http://localhost:3000/api/auth/mfa', {
      method: 'PUT',
      body: JSON.stringify({ token: '000000' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PUT(request)
    expect(response.status).toBe(400)
  })

  it('requires step-up auth to disable MFA', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      mfaEnabled: true,
      mfaSecret: 'TESTSECRET',
      password: null,
      metadata: null,
    })

    const request = new NextRequest('http://localhost:3000/api/auth/mfa', {
      method: 'DELETE',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)

    expect(response.status).toBe(403)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('disables MFA with a current authenticator code', async () => {
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      mfaEnabled: true,
      mfaSecret: 'TESTSECRET',
      password: null,
      metadata: JSON.stringify({ mfaBackupCodes: ['stored-hash'] }),
    })
    ;(verifyMfaToken as jest.Mock).mockReturnValue(true)
    ;(prisma.user.update as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/mfa', {
      method: 'DELETE',
      body: JSON.stringify({ token: '123456' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: expect.objectContaining({
        mfaEnabled: false,
        mfaSecret: null,
        metadata: expect.any(String),
      }),
    })
  })
})

