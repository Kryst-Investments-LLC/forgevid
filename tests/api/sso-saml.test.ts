import { NextRequest } from 'next/server'
import { GET as metadataHandler } from '@/app/api/sso/saml/metadata/route'
import { GET as loginHandler } from '@/app/api/sso/saml/login/route'
import { POST as acsHandler } from '@/app/api/sso/saml/acs/route'

const mockGetGlobalSsoConfiguration = jest.fn()
const mockGetSsoConfiguration = jest.fn()
const mockGenerateSamlMetadata = jest.fn()
const mockGetSamlLoginUrl = jest.fn()

jest.mock('@/lib/sso', () => ({
  getGlobalSsoConfiguration: (...args: any[]) => mockGetGlobalSsoConfiguration(...args),
  getSsoConfiguration: (...args: any[]) => mockGetSsoConfiguration(...args),
}))

jest.mock('@/lib/sso/saml', () => ({
  generateSamlMetadata: (...args: any[]) => mockGenerateSamlMetadata(...args),
  getSamlLoginUrl: (...args: any[]) => mockGetSamlLoginUrl(...args),
}))

describe('SAML API routes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('metadata handler returns 404 when configuration missing', async () => {
    mockGetGlobalSsoConfiguration.mockResolvedValueOnce(null)

    const response = await metadataHandler()
    expect(response.status).toBe(404)
  })

  test('metadata handler returns XML metadata when configured', async () => {
    mockGetGlobalSsoConfiguration.mockResolvedValueOnce({ id: 'saml', enabled: true })
    mockGenerateSamlMetadata.mockResolvedValueOnce('<xml>metadata</xml>')

    const response = await metadataHandler()
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('<xml>metadata</xml>')
    expect(response.headers.get('Content-Type')).toBe('application/xml')
  })

  test('login handler redirects to IdP when configured', async () => {
    mockGetGlobalSsoConfiguration.mockResolvedValueOnce({ id: 'saml', enabled: true })
    mockGetSamlLoginUrl.mockResolvedValueOnce('https://idp.example.com/login')

    const request = new Request('http://localhost/api/sso/saml/login')
    const response = await loginHandler(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('https://idp.example.com/login')
  })

  test('login handler returns 404 when SAML disabled', async () => {
    mockGetGlobalSsoConfiguration.mockResolvedValueOnce(null)

    const request = new Request('http://localhost/api/sso/saml/login')
    const response = await loginHandler(request)

    expect(response.status).toBe(404)
  })

  test('ACS handler posts response to NextAuth callback', async () => {
    const body = new URLSearchParams({
      SAMLResponse: 'base64payload',
      RelayState: 'org_123',
    })

    const request = new NextRequest('http://localhost/api/sso/saml/acs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const response = await acsHandler(request)
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain('form id="saml-callback"')
    expect(html).toContain('SAMLResponse')
    expect(html).toContain('/api/auth/callback/saml')
  })
})

