import { NextResponse } from 'next/server'
import { getGlobalSsoConfiguration } from '@/lib/sso'
import { getSsoConfiguration } from '@/lib/sso'
import { getSamlLoginUrl } from '@/lib/sso/saml'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const organizationId = url.searchParams.get('organizationId') ?? undefined

  const config = organizationId
    ? await getSsoConfiguration('SAML', organizationId)
    : await getGlobalSsoConfiguration('SAML')

  if (!config || !config.enabled) {
    return NextResponse.json({ error: 'SAML provider not configured' }, { status: 404 })
  }

  try {
    const loginUrl = await getSamlLoginUrl(config, organizationId)
    return NextResponse.redirect(loginUrl)
  } catch (error) {
    console.error('SAML login error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SAML login URL' },
      { status: 500 }
    )
  }
}

