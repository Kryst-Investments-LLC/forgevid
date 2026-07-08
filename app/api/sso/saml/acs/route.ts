import { NextRequest, NextResponse } from 'next/server'

function htmlEscape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const samlResponse = formData.get('SAMLResponse')?.toString()
  const relayState = formData.get('RelayState')?.toString()

  if (!samlResponse) {
    return NextResponse.json({ error: 'SAMLResponse missing' }, { status: 400 })
  }

  const callbackUrl = new URL('/api/auth/callback/saml', request.nextUrl.origin)

  const body = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>SAML Response</title>
  </head>
  <body>
    <form id="saml-callback" method="post" action="${callbackUrl.toString()}">
      <input type="hidden" name="SAMLResponse" value="${htmlEscape(samlResponse)}" />
      ${relayState ? `<input type="hidden" name="RelayState" value="${htmlEscape(relayState)}" />` : ''}
    </form>
    <script>document.getElementById('saml-callback').submit();</script>
  </body>
</html>`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; form-action 'self'",
    },
  })
}

