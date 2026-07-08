import { SAML } from '@node-saml/node-saml'
import type { SSOConfiguration } from '@prisma/client'

const samlInstanceCache = new Map<string, SAML>()

function buildCallbackUrl() {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
  return new URL('/api/sso/saml/acs', baseUrl).toString()
}

function createSamlInstance(config: SSOConfiguration) {
  const cacheKey = `${config.id}:${config.updatedAt.getTime()}`
  const cached = samlInstanceCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const metadata = (config.metadata ?? {}) as Record<string, any>
  const entryPoint = metadata.entryPoint || config.metadataUrl

  if (!entryPoint) {
    throw new Error('SAML configuration is missing entryPoint/metadataUrl')
  }

  const saml = new SAML({
    entryPoint,
    issuer: config.issuer || metadata.issuer || buildCallbackUrl(),
    cert: config.certificate || metadata.certificate,
    privateCert: metadata.privateKey,
    callbackUrl: metadata.assertionConsumerServiceUrl || buildCallbackUrl(),
    logoutUrl: metadata.logoutUrl,
    audience: config.entityId || metadata.audience,
    identifierFormat: metadata.identifierFormat || null,
    disableRequestedAuthnContext: metadata.disableRequestedAuthnContext ?? false,
    wantAssertionsSigned: metadata.wantAssertionsSigned ?? true,
    wantAuthnResponseSigned: metadata.wantAuthnResponseSigned ?? true,
    acceptedClockSkewMs: metadata.acceptedClockSkewMs ?? 5000,
    signatureAlgorithm: metadata.signatureAlgorithm || 'sha256',
    digestAlgorithm: metadata.digestAlgorithm || 'sha256',
  })

  samlInstanceCache.clear()
  samlInstanceCache.set(cacheKey, saml)
  return saml
}

export async function generateSamlMetadata(config: SSOConfiguration) {
  const saml = createSamlInstance(config)
  return saml.generateServiceProviderMetadata(config.certificate || undefined, (config.metadata as any)?.privateKey)
}

export async function getSamlLoginUrl(config: SSOConfiguration, relayState?: string) {
  const saml = createSamlInstance(config)
  return saml.getAuthorizeUrlAsync({
    RelayState: relayState,
  })
}

export async function validateSamlAssertion(SAMLResponse: string, config: SSOConfiguration) {
  const saml = createSamlInstance(config)

  const { profile } = await saml.validatePostResponseAsync({
    body: {
      SAMLResponse,
    },
  })

  const profileData = profile as Record<string, any>

  const email =
    profileData.email ||
    profileData.mail ||
    profileData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
    profileData['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']

  return {
    email,
    name:
      profileData.displayName ||
      profileData.cn ||
      `${profileData.givenName || ''} ${profileData.sn || ''}`.trim() ||
      profileData.name,
    profile: profileData,
  }
}

