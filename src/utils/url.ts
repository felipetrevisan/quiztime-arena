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

export const getPublicAppBaseUrl = (): string => {
  const envBase = normalizeBaseUrl(import.meta.env.VITE_PUBLIC_APP_URL ?? '')
  if (envBase) {
    return envBase
  }

  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  return ''
}
