import { XMLParser } from 'fast-xml-parser'

export interface SamlMetadataInfo {
  entryPoint: string
  logoutUrl?: string
  certificate?: string
  entityId?: string
  issuer?: string
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
})

function normalizeCertificate(certificate?: string | null) {
  if (!certificate) return undefined
  return certificate.replace(/[\s\r\n]+/g, '').trim()
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export async function fetchSamlMetadata(metadataUrl: string): Promise<SamlMetadataInfo> {
  // SSRF protection: block private/internal IP ranges and non-HTTPS URLs
  try {
    const parsedUrl = new URL(metadataUrl);
    if (parsedUrl.protocol !== 'https:') {
      throw new Error('Metadata URL must use HTTPS');
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^\[/,
      /^::1$/,
      /^fd[0-9a-f]{2}:/i,
      /^fe80:/i,
      /\.internal$/,
      /\.local$/,
    ];
    if (blockedPatterns.some((p) => p.test(hostname))) {
      throw new Error('Metadata URL points to a blocked address range');
    }
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error('Invalid metadata URL');
    }
    throw e;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(metadataUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Metadata request failed with status ${response.status}`);
    }

    const xml = await response.text();
  const parsed = xmlParser.parse(xml)

  const entityDescriptor =
    parsed?.EntityDescriptor ??
    parsed?.EntityDescriptors?.EntityDescriptor ??
    parsed?.EntitiesDescriptor?.EntityDescriptor

  if (!entityDescriptor) {
    throw new Error('Unable to parse EntityDescriptor from SAML metadata')
  }

  const entityId = entityDescriptor['@_entityID']

  const idpDescriptor =
    entityDescriptor.IDPSSODescriptor ??
    entityDescriptor.IDPSSODescriptors ??
    entityDescriptor.SPSSODescriptor // fallback in case metadata uses SP descriptor

  if (!idpDescriptor) {
    throw new Error('SAML metadata is missing IDPSSODescriptor')
  }

  const singleSignOnServices = ensureArray(idpDescriptor.SingleSignOnService)
  const redirectService =
    singleSignOnServices.find((service) =>
      typeof service?.['@_Binding'] === 'string'
        ? service['@_Binding'].includes('HTTP-Redirect')
        : false
    ) ?? singleSignOnServices[0]

  const entryPoint = redirectService?.['@_Location']

  if (!entryPoint) {
    throw new Error('SAML metadata does not include a SingleSignOnService location')
  }

  const logoutService = ensureArray(idpDescriptor.SingleLogoutService).find((service) =>
    typeof service?.['@_Binding'] === 'string'
      ? service['@_Binding'].includes('HTTP-Redirect')
      : false
  )

  const keyDescriptors = ensureArray(idpDescriptor.KeyDescriptor)
  const signingKey = keyDescriptors.find((descriptor) => {
    const use = descriptor?.['@_use']
    return !use || use.toLowerCase() === 'signing'
  })

  const certificate =
    signingKey?.KeyInfo?.X509Data?.X509Certificate ??
    signingKey?.KeyInfo?.X509Data?.X509Certificates?.X509Certificate

  return {
    entryPoint,
    logoutUrl: logoutService?.['@_Location'],
    certificate: normalizeCertificate(certificate),
    entityId: entityId || idpDescriptor?.Issuer || idpDescriptor?.entityId,
    issuer: entityDescriptor?.ID ?? entityId,
  }
  } finally {
    clearTimeout(timeout);
  }
}

