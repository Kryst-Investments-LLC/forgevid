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