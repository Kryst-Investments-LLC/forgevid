jest.mock('next/server', () => {
  class MockNextRequest {
    url: string
    method: string
    headers: Map<string, string>
    nextUrl: URL
    private _body: string | null

    constructor(url: string, init: RequestInit = {}) {
      this.url = url
      this.method = init.method ?? 'GET'
      this.headers = new Map(Object.entries((init.headers as Record<string, string>) ?? {}))
      this.nextUrl = new URL(url)
      this._body = typeof init.body === 'string' ? init.body : init.body ? JSON.stringify(init.body) : null
    }

    async json() {
      if (!this._body) return null
      return JSON.parse(this._body)
    }
  }

  class MockNextResponse {
    status: number
    headers: Map<string, string>
    private _body: any

    constructor(body: any, init: { status?: number; headers?: Record<string, string> } = {}) {
      this._body = body
      this.status = init.status ?? 200
      this.headers = new Map(Object.entries(init.headers ?? {}))
    }

    static json(body: any, init: { status?: number; headers?: Record<string, string> } = {}) {
      return new MockNextResponse(body, init)
    }

    static redirect(url: string, init: { status?: number; headers?: Record<string, string> } = {}) {
      const response = new MockNextResponse(null, { ...init, status: init.status ?? 307 })
      response.headers.set('location', url)
      return response
    }

    async json() {
      return this._body
    }
  }

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  }
})

import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '@/app/api/admin/sso/route'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {},
  refreshAuthProviders: jest.fn(),
}))

jest.mock('@/lib/rbac', () => ({
  getFreshSessionUser: jest.fn(),
  isAdminRole: jest.fn((role: string) => role === 'ADMIN' || role === 'SUPER_ADMIN'),
}))

jest.mock('@/lib/sso', () => ({
  getOrganizationSsoConfigurations: jest.fn(),
  upsertSsoConfiguration: jest.fn(),
  disableSsoConfiguration: jest.fn(),
  getStoredSsoConfiguration: jest.fn(),
}))

jest.mock('@/lib/sso/metadata', () => ({
  fetchSamlMetadata: jest.fn(),
}))

import { getServerSession } from 'next-auth'
import { refreshAuthProviders } from '@/lib/auth'
import {
  getOrganizationSsoConfigurations,
  upsertSsoConfiguration,
  disableSsoConfiguration,
  getStoredSsoConfiguration,
} from '@/lib/sso'
import { fetchSamlMetadata } from '@/lib/sso/metadata'
import { getFreshSessionUser } from '@/lib/rbac'

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockedRefreshProviders = refreshAuthProviders as jest.MockedFunction<typeof refreshAuthProviders>
const mockedGetConfigs = getOrganizationSsoConfigurations as jest.MockedFunction<
  typeof getOrganizationSsoConfigurations
>
const mockedUpsert = upsertSsoConfiguration as jest.MockedFunction<typeof upsertSsoConfiguration>
const mockedDisable = disableSsoConfiguration as jest.MockedFunction<typeof disableSsoConfiguration>
const mockedGetStored = getStoredSsoConfiguration as jest.MockedFunction<typeof getStoredSsoConfiguration>
const mockedFetchMetadata = fetchSamlMetadata as jest.MockedFunction<typeof fetchSamlMetadata>
const mockedFreshSessionUser = getFreshSessionUser as jest.MockedFunction<typeof getFreshSessionUser>

const adminSession = {
  user: {
    id: 'admin',
    email: 'admin@example.com',
    role: 'ADMIN',
  },
}

describe('Admin SSO API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects unauthenticated requests', async () => {
    mockedGetServerSession.mockResolvedValue(null)
    mockedFreshSessionUser.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/admin/sso'))
    expect(response.status).toBe(403)
  })

  it('returns serialized SSO configurations', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession)
    mockedFreshSessionUser.mockResolvedValue(adminSession.user as any)
    mockedGetConfigs.mockResolvedValue([
      {
        id: 'cfg',
        provider: 'OKTA',
        enabled: true,
        clientSecret: 'super-secret',
        issuer: 'https://example.okta.com/oauth2/default',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as any)

    const response = await GET(new NextRequest('http://localhost/api/admin/sso'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.configurations).toHaveLength(1)
    expect(body.configurations[0]).toMatchObject({
      provider: 'OKTA',
      hasClientSecret: true,
      clientSecret: '',
    })
  })

  it('persists SAML configuration with metadata resolution', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession)
    mockedFreshSessionUser.mockResolvedValue(adminSession.user as any)
    mockedGetStored.mockResolvedValue(null)
    mockedFetchMetadata.mockResolvedValue({
      entryPoint: 'https://idp.example.com/sso',
      certificate: 'MIIFAKECERT',
      entityId: 'https://idp.example.com/meta',
      issuer: 'https://idp.example.com/meta',
    })
    mockedUpsert.mockImplementation(async (payload: any) => ({
      id: 'saml',
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const request = new NextRequest('http://localhost/api/admin/sso', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'SAML',
        enabled: true,
        metadataUrl: 'https://idp.example.com/metadata',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(mockedUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'SAML',
        metadata: expect.objectContaining({
          entryPoint: 'https://idp.example.com/sso',
          certificate: 'MIIFAKECERT',
        }),
        certificate: 'MIIFAKECERT',
      })
    )
    expect(mockedRefreshProviders).toHaveBeenCalled()
    const body = await response.json()
    expect(body.configuration).toMatchObject({
      provider: 'SAML',
      metadata: expect.objectContaining({ entryPoint: 'https://idp.example.com/sso' }),
    })
  })

  it('validates Okta configuration requirements', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession)
    mockedFreshSessionUser.mockResolvedValue(adminSession.user as any)
    mockedGetStored.mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/admin/sso', {
      method: 'POST',
      body: JSON.stringify({
        provider: 'OKTA',
        enabled: true,
        issuer: '',
        clientId: 'abc',
        clientSecret: '',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    expect(mockedUpsert).not.toHaveBeenCalled()
  })

  it('disables a configuration', async () => {
    mockedGetServerSession.mockResolvedValue(adminSession)
    mockedFreshSessionUser.mockResolvedValue(adminSession.user as any)
    mockedDisable.mockResolvedValue({
      id: 'okta',
      provider: 'OKTA',
      enabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const request = new NextRequest('http://localhost/api/admin/sso', {
      method: 'DELETE',
      body: JSON.stringify({ provider: 'OKTA' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await DELETE(request)
    expect(response.status).toBe(200)
    expect(mockedDisable).toHaveBeenCalledWith('OKTA', undefined)
    expect(mockedRefreshProviders).toHaveBeenCalled()
  })
})
