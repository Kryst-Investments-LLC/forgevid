'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode, useEffect } from 'react'
import { installCsrfFetch } from '@/lib/csrf-client'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Make every client mutation carry the CSRF header by default, so no call
  // site can forget it and get a 403 from the middleware.
  useEffect(() => {
    installCsrfFetch()
    // Client-side Sentry, loaded only when a public DSN is configured so the
    // bundle stays lean and local/dev is unaffected.
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    if (dsn) {
      import('@sentry/nextjs')
        .then((Sentry) => Sentry.init({ dsn, tracesSampleRate: 0.1 }))
        .catch(() => {})
    }
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
