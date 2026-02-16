const VERCEL_CANONICAL_URL = 'https://quiztime-arena.vercel.app'

const normalizeBaseUrl = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  try {
    const parsed = new URL(trimmed)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return null
  }
}

const isLocalHost = (host: string): boolean => {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:')
  )
}

export const getPublicAppBaseUrl = (): string => {
  const envBase = normalizeBaseUrl(import.meta.env.VITE_PUBLIC_APP_URL ?? '')
  if (envBase) {
    return envBase
  }

  if (typeof window !== 'undefined') {
    const currentOrigin = window.location.origin

    try {
      const host = window.location.host.toLowerCase()
      if (isLocalHost(host)) {
        return currentOrigin
      }

      if (host.endsWith('.vercel.app')) {
        return VERCEL_CANONICAL_URL
      }
    } catch {
      return currentOrigin
    }

    return currentOrigin
  }

  return VERCEL_CANONICAL_URL
}

export const buildPublicAppUrl = (pathAndQuery = '/'): string => {
  const base = getPublicAppBaseUrl()
  const normalizedPath = pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`
  return `${base}${normalizedPath}`
}
