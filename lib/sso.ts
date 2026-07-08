import { prisma } from './prisma'
import type { SSOProvider, UserRole } from '@prisma/client'

export interface SSOConfigInput {
  organizationId?: string
  provider: SSOProvider
  enabled: boolean
  defaultRole?: UserRole
  metadata?: Record<string, any>
  metadataUrl?: string | null
  issuer?: string | null
  clientId?: string | null
  clientSecret?: string | null
  tenantId?: string | null
  entityId?: string | null
  certificate?: string | null
}

export async function getActiveSsoConfigurations() {
  return prisma.sSOConfiguration.findMany({
    where: { enabled: true },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getSsoConfiguration(provider: SSOProvider, organizationId?: string) {
  return prisma.sSOConfiguration.findFirst({
    where: {
      provider,
      enabled: true,
      OR: [
        { organizationId: organizationId ?? undefined },
        { organizationId: null },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getGlobalSsoConfiguration(provider: SSOProvider) {
  return prisma.sSOConfiguration.findFirst({
    where: {
      provider,
      enabled: true,
      organizationId: null,
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function getOrganizationSsoConfigurations(organizationId?: string) {
  return prisma.sSOConfiguration.findMany({
    where: {
      OR: [
        { organizationId: organizationId ?? undefined },
        { organizationId: null },
      ],
    },
    orderBy: { provider: 'asc' },
  })
}

export async function getStoredSsoConfiguration(provider: SSOProvider, organizationId?: string | null) {
  return prisma.sSOConfiguration.findUnique({
    where: {
      provider_organizationId: {
        provider,
        organizationId: organizationId ?? null,
      },
    },
  })
}

export async function upsertSsoConfiguration(input: SSOConfigInput) {
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
  } = input

  return prisma.sSOConfiguration.upsert({
    where: {
      provider_organizationId: {
        provider,
        organizationId: organizationId ?? null,
      },
    },
    update: {
      enabled,
      defaultRole,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      metadataUrl,
      issuer,
      clientId,
      clientSecret,
      tenantId,
      entityId,
      certificate,
    },
    create: {
      organizationId,
      provider,
      enabled,
      defaultRole,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      metadataUrl,
      issuer,
      clientId,
      clientSecret,
      tenantId,
      entityId,
      certificate,
    },
  })
}

export async function disableSsoConfiguration(provider: SSOProvider, organizationId?: string) {
  return prisma.sSOConfiguration.update({
    where: {
      provider_organizationId: {
        provider,
        organizationId: organizationId ?? null,
      },
    },
    data: {
      enabled: false,
    },
  })
}

