import { createClient } from '@supabase/supabase-js'

const normalizeEnv = (value: string | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  const withoutQuotes = trimmed.replace(/^['"]|['"]$/g, '').trim()
  return withoutQuotes || null
}

const legacySupabaseUrl = normalizeEnv(import.meta.env.VITE_SUPABASE_URL)
const legacyAnonKey = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)
const envSupabaseProjectId = normalizeEnv(import.meta.env.VITE_SUPABASE_PROJECT_ID)
const envSupabasePublishableKey = normalizeEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

const projectIdFromUrl = (value: string | null): string | null => {
  if (!value) return null

  try {
    const hostname = new URL(value).hostname
    const firstPart = hostname.split('.')[0]
    return firstPart || null
  } catch {
    return null
  }
}

const supabaseProjectId = envSupabaseProjectId ?? projectIdFromUrl(legacySupabaseUrl)
const supabasePublishableKey = envSupabasePublishableKey ?? legacyAnonKey
const supabaseUrl =
  legacySupabaseUrl ?? (supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : null)

export const isSupabaseEnabled = Boolean(supabaseUrl && supabasePublishableKey)

const createSupabase = () => {
  if (!supabaseUrl || !supabasePublishableKey) {
    return null
  }

  return createClient(supabaseUrl, supabasePublishableKey)
}

export const supabase = createSupabase()
