import * as authModule from '@/lib/auth'
import {
  authOptions,
  refreshAuthProviders,
  mapProviderIdToEnum,
  findOrCreateSsoUser,
  ensureAuthProvidersReady,
  __internal,
} from '@/lib/auth'

jest.mock('next/server', () => {
  class MockNextRequest {
    constructor(url: string, init: RequestInit = {}) {
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
    constructor(private payload: any, init: { status?: number } = {}) {
      this._payload = payload
      this.status = init.status || 200
    }

    async json() {
      return this._payload
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: {
      json(body: any, init?: { status?: number }) {
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

jest.mock('@/lib/sso', () => ({
  getActiveSsoConfigurations: jest.fn(),
  getGlobalSsoConfiguration: jest.fn(),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/sso/saml', () => ({
  validateSamlAssertion: jest.fn(),
}))

const { getActiveSsoConfigurations, getGlobalSsoConfiguration } = require('@/lib/sso')
const { prisma } = require('@/lib/prisma')
const { validateSamlAssertion } = require('@/lib/sso/saml')

describe('lib/auth SSO integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    getActiveSsoConfigurations.mockResolvedValue([])
    getGlobalSsoConfiguration.mockResolvedValue(null)
    await ensureAuthProvidersReady()
  })

  it('refreshes providers to include configured SSO providers', async () => {
    getActiveSsoConfigurations.mockResolvedValue([
      {
        id: 'okta',
        provider: 'OKTA',
        enabled: true,
        issuer: 'https://okta.example.com/oauth2/default',
        clientId: 'okta-client',
        clientSecret: 'secret',
        metadata: null,
        metadataUrl: null,
        tenantId: null,
        entityId: null,
        certificate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'saml',
        provider: 'SAML',
        enabled: true,
        metadata: { entryPoint: 'https://idp.example.com/sso', certificate: 'CERT' },
        metadataUrl: 'https://idp.example.com/metadata',
        issuer: 'https://idp.example.com/metadata',
        entityId: 'https://idp.example.com/metadata',
        clientId: null,
        clientSecret: null,
        tenantId: null,
        certificate: 'CERT',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    await refreshAuthProviders()
    await ensureAuthProvidersReady()

    const providerIds = authOptions.providers.map((provider: any) => provider.id)
    expect(providerIds).toContain('okta')
    expect(providerIds).toContain('saml')
    expect(providerIds).toContain('credentials')
  })

  it('maps provider IDs to enum values', () => {
    expect(mapProviderIdToEnum('okta')).toBe('OKTA')
    expect(mapProviderIdToEnum('azuread')).toBe('AZURE')
    expect(mapProviderIdToEnum('azure-ad')).toBe('AZURE')
    expect(mapProviderIdToEnum('saml')).toBe('SAML')
    expect(mapProviderIdToEnum('something-else')).toBeNull()
  })

  it('returns existing SSO user', async () => {
    const user = { id: 'user-1', email: 'user@example.com', role: 'USER' }
    prisma.user.findUnique.mockResolvedValue(user)

    const result = await findOrCreateSsoUser('user@example.com', 'OKTA', {})
    expect(result).toBe(user)
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('provisions new SSO user with default role', async () => {
    prisma.user.findUnique.mockResolvedValue(null)
    getGlobalSsoConfiguration.mockResolvedValue({
      organizationId: null,
      defaultRole: 'ADMIN',
    })
    const created = { id: 'new-user', email: 'new@example.com', role: 'ADMIN' }
    prisma.user.create.mockResolvedValue(created)

    const result = await findOrCreateSsoUser('new@example.com', 'SAML', { name: 'New User' })
    expect(result).toBe(created)
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'new@example.com',
          role: 'ADMIN',
        }),
      })
    )
  })

  it('handles NextAuth sign-in callback success and failure', async () => {
    const callback = authOptions.callbacks?.signIn!

    prisma.user.findUnique.mockResolvedValue({
      id: 'okta-user',
      email: 'okta@example.com',
      role: 'USER',
      organizationId: null,
    })

    const success = await callback({
      user: { email: 'okta@example.com' },
      account: { provider: 'okta' },
      profile: {},
    } as any)

    expect(success).toBe(true)

    prisma.user.findUnique.mockResolvedValue(null)
    getGlobalSsoConfiguration.mockResolvedValueOnce(null)

    const failure = await callback({
      user: { email: 'fail@example.com' },
      account: { provider: 'okta' },
      profile: {},
    } as any)

    expect(failure).toBe(false)
  })

  it('authorizes SAML assertions via credentials provider', async () => {
    const samlConfig = {
      id: 'saml',
      provider: 'SAML',
      enabled: true,
      metadata: { entryPoint: 'https://idp.example.com/sso', certificate: 'CERT' },
      metadataUrl: 'https://idp.example.com/metadata',
      issuer: 'https://idp.example.com/metadata',
      entityId: 'https://idp.example.com/metadata',
      clientId: null,
      clientSecret: null,
      tenantId: null,
      certificate: 'CERT',
      defaultRole: 'USER',
      organizationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const provider = __internal.createSamlCredentialsProvider(samlConfig as any) as any

    prisma.user.findUnique.mockResolvedValue(null)
    prisma.user.create.mockResolvedValue({
      id: 'saml-user',
      email: 'saml@example.com',
      role: 'USER',
    })
    getGlobalSsoConfiguration.mockImplementation(async (provider: string) => {
      if (provider === 'SAML') {
        return {
          defaultRole: 'USER',
          organizationId: null,
          enabled: true,
        }
      }
      return null
    })

    validateSamlAssertion.mockResolvedValue({
      email: 'saml@example.com',
      name: 'SAML User',
    })
    const authorized = await provider.options.authorize({ SAMLResponse: 'FAKE' })
    expect(authorized?.email).toBe('saml@example.com')

    validateSamlAssertion.mockResolvedValueOnce({ email: null })
    await expect(provider.options.authorize({ SAMLResponse: 'INVALID' })).rejects.toThrow(
      'INVALID_SAML_ASSERTION'
    )
  })
})
