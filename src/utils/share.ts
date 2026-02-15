const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64Url = (value: string): string => {
  const bytes = encoder.encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const fromBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4 || 4)) % 4)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))

  return decoder.decode(bytes)
}

export const encodePayload = <T>(payload: T): string => {
  return toBase64Url(JSON.stringify(payload))
}

export const decodePayload = <T>(encoded: string): T | null => {
  try {
    return JSON.parse(fromBase64Url(encoded)) as T
  } catch {
    return null
  }
}

export const copyText = async (value: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}
