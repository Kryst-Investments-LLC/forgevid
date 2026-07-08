import { NextResponse } from 'next/server'
import { getGlobalSsoConfiguration } from '@/lib/sso'
import { generateSamlMetadata } from '@/lib/sso/saml'

// Reads SSO config from the DB — must not be prerendered at build time.
export const dynamic = 'force-dynamic'

export async function GET() {
  const config = await getGlobalSsoConfiguration('SAML')

  if (!config || !config.enabled) {
    return NextResponse.json({ error: 'SAML provider not configured' }, { status: 404 })
  }

  try {
    const metadata = await generateSamlMetadata(config)
    return new NextResponse(metadata, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
      },
    })
  } catch (error) {
    console.error('SAML metadata error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SAML metadata' },
      { status: 500 }
    )
  }
}

