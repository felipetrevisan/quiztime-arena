import type { Session } from '@supabase/supabase-js'

const normalizeAlias = (value: string): string => value.trim().toLowerCase()

export const getSessionAliases = (session: Session | null): string[] => {
  if (!session) {
    return []
  }

  const metadata = session.user.user_metadata as Record<string, unknown> | undefined
  const values = [session.user.email, metadata?.name, metadata?.full_name, metadata?.user_name]

  const aliases = values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => normalizeAlias(value))
    .filter(Boolean)

  return [...new Set(aliases)]
}
