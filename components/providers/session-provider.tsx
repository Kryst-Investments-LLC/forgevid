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
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
