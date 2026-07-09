const CSRF_COOKIE_NAME = process.env.NODE_ENV === 'production' ? '__Host-csrf' : 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${CSRF_COOKIE_NAME}=`))

  if (!cookie) {
    return null
  }

  return decodeURIComponent(cookie.slice(CSRF_COOKIE_NAME.length + 1))
}

export function withCsrfHeaders(headers?: HeadersInit): Headers {
  const nextHeaders = new Headers(headers)
  const token = getCsrfToken()

  if (token) {
    nextHeaders.set(CSRF_HEADER_NAME, token)
  }

  return nextHeaders
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Wrap window.fetch once so every same-origin, state-changing request carries
 * the CSRF header automatically.
 *
 * Without this, every component would have to remember withCsrfHeaders on each
 * POST/PATCH/DELETE — and several (the Generate button, the scene editor's
 * swap/save/chat) did NOT, so the CSRF middleware answered them with 403 in a
 * real browser even though they worked from curl. Centralizing it makes the
 * whole client correct-by-default; an explicit x-csrf-token is left untouched.
 *
 * Idempotent, and a no-op on the server.
 */
export function installCsrfFetch(): void {
  if (typeof window === 'undefined') return
  const w = window as typeof window & { __forgevidCsrfFetch?: boolean }
  if (w.__forgevidCsrfFetch) return
  w.__forgevidCsrfFetch = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
    if (SAFE_METHODS.has(method)) return originalFetch(input, init)

    // Only touch same-origin requests; never leak the token cross-origin.
    let sameOrigin = true
    try {
      const url =
        typeof input === 'string'
          ? new URL(input, window.location.origin)
          : input instanceof URL
            ? input
            : new URL((input as Request).url, window.location.origin)
      sameOrigin = url.origin === window.location.origin
    } catch {
      sameOrigin = true // a relative string that failed to parse is same-origin
    }
    if (!sameOrigin) return originalFetch(input, init)

    const token = getCsrfToken()
    if (!token) return originalFetch(input, init)

    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined))
    if (!headers.has(CSRF_HEADER_NAME)) headers.set(CSRF_HEADER_NAME, token)

    return originalFetch(input, { ...init, headers })
  }
}