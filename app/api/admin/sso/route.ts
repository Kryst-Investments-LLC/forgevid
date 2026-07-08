import { NextRequest, NextResponse } from 'next/server'
import { refreshAuthProviders } from '@/lib/auth'
import {
  disableSsoConfiguration,
  getOrganizationSsoConfigurations,
  getStoredSsoConfiguration,
  upsertSsoConfiguration,
} from '@/lib/sso'
import { fetchSamlMetadata } from '@/lib/sso/metadata'
import { getFreshSessionUser, isAdminRole } from '@/lib/rbac'
import type { SSOConfiguration, SSOProvider, UserRole } from '@prisma/client'

async function requireAdminSession() {
  const sessionUser = await getFreshSessionUser()

  if (!sessionUser || !isAdminRole(sessionUser.role)) {
    return null
  }

  return sessionUser
}

export const GET = async (request: NextRequest) => {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const organizationId = request.nextUrl.searchParams.get('organizationId') ?? undefined

  const configurations = await getOrganizationSsoConfigurations(organizationId)

  return NextResponse.json({
    configurations: configurations.map(serializeConfigurationForClient),
  })
}

export const POST = async (request: NextRequest) => {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    organizationId,
    provider,
    enabled,
    defaultRole,
    metadata,
    metadataUrl,
    issuer,
    clientId,
    clientSecret,
    tenantId,
    entityId,
    certificate,
  } = body

  if (!provider) {
    return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
  }

  const providerEnum = provider as SSOProvider
  const existing = await getStoredSsoConfiguration(providerEnum, organizationId ?? null)

  let sanitizedClientSecret =
    typeof clientSecret === 'string' && clientSecret.trim().length > 0 ? clientSecret.trim() : undefined
  let sanitizedCertificate =
    typeof certificate === 'string' && certificate.trim().length > 0 ? certificate.trim() : undefined
  let sanitizedIssuer = typeof issuer === 'string' && issuer.trim().length > 0 ? issuer.trim() : existing?.issuer ?? null
  let sanitizedEntityId =
    typeof entityId === 'string' && entityId.trim().length > 0 ? entityId.trim() : existing?.entityId ?? null
  let resolvedMetadata = metadata ?? existing?.metadata ?? undefined

  if (providerEnum === 'SAML') {
    if (!metadataUrl && !(existing?.metadata as any)?.entryPoint) {
      return NextResponse.json(
        { error: 'SAML metadata URL is required to configure the identity provider.' },
        { status: 400 }
      )
    }

    if (metadataUrl) {
      try {
        const samlMetadata = await fetchSamlMetadata(metadataUrl)
        resolvedMetadata = {
          entryPoint: samlMetadata.entryPoint,
          logoutUrl: samlMetadata.logoutUrl,
          certificate: samlMetadata.certificate ?? sanitizedCertificate ?? (existing?.metadata as any)?.certificate,
          entityId: samlMetadata.entityId ?? sanitizedEntityId ?? (existing?.metadata as any)?.entityId,
        }
        sanitizedCertificate = samlMetadata.certificate ?? sanitizedCertificate ?? undefined
        sanitizedIssuer = sanitizedIssuer ?? samlMetadata.issuer ?? samlMetadata.entityId ?? null
        sanitizedEntityId = sanitizedEntityId ?? samlMetadata.entityId ?? null
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Unable to fetch or parse SAML metadata',
          },
          { status: 400 }
        )
      }
    }

    if (!resolvedMetadata?.entryPoint) {
      return NextResponse.json(
        { error: 'SAML configuration must include a valid Single Sign-On URL.' },
        { status: 400 }
      )
    }

    if (!sanitizedCertificate && !existing?.certificate && !resolvedMetadata?.certificate) {
      return NextResponse.json({ error: 'SAML configuration requires a signing certificate.' }, { status: 400 })
    }
  }

  if (providerEnum === 'OKTA') {
    if (!issuer || !clientId || (!sanitizedClientSecret && !existing?.clientSecret)) {
      return NextResponse.json(
        { error: 'Okta configuration requires issuer, clientId, and clientSecret.' },
        { status: 400 }
      )
    }
  }

  if (providerEnum === 'AZURE') {
    if (!tenantId || !clientId || (!sanitizedClientSecret && !existing?.clientSecret)) {
      return NextResponse.json(
        { error: 'Azure AD configuration requires tenantId, clientId, and clientSecret.' },
        { status: 400 }
      )
    }
  }

  const configuration = await upsertSsoConfiguration({
    organizationId,
    provider: providerEnum,
    enabled: Boolean(enabled),
    defaultRole: (defaultRole as UserRole) ?? 'USER',
    metadata: resolvedMetadata,
    metadataUrl,
    issuer: sanitizedIssuer ?? undefined,
    clientId,
    clientSecret: sanitizedClientSecret ?? undefined,
    tenantId,
    entityId: sanitizedEntityId ?? undefined,
    certificate: sanitizedCertificate ?? undefined,
  })

  await refreshAuthProviders()

  return NextResponse.json({ configuration: serializeConfigurationForClient(configuration) })
}

export const PUT = async (request: NextRequest) => {
  // PUT updates an existing SSO configuration — same logic as POST (upsert)
  return POST(request);
};

export const DELETE = async (request: NextRequest) => {
  const session = await requireAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)

  if (!body?.provider) {
    return NextResponse.json({ error: 'Provider is required' }, { status: 400 })
  }

  const providerEnum = body.provider as SSOProvider

  const disabled = await disableSsoConfiguration(providerEnum, body.organizationId ?? undefined)

  await refreshAuthProviders()

  return NextResponse.json({ configuration: serializeConfigurationForClient(disabled) })
}

function serializeConfigurationForClient(configuration: SSOConfiguration) {
  const plain = {
    ...configuration,
    metadata: configuration.metadata ? JSON.parse(JSON.stringify(configuration.metadata)) : undefined,
    hasClientSecret: Boolean(configuration.clientSecret),
    clientSecret: '',
  }

  if (plain.metadata && typeof plain.metadata === 'object') {
    ;(plain.metadata as Record<string, unknown>).certificate = undefined
  }

  return plain
}

