import { createClient } from '@supabase/supabase-js'

const normalizeEnv = (value: string | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  const withoutQuotes = trimmed.replace(/^['"]|['"]$/g, '').trim()
  return withoutQuotes || null
}

const supabaseProjectId = normalizeEnv(import.meta.env.VITE_SUPABASE_PROJECT_ID)
const supabasePublishableKey = normalizeEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
const supabaseUrl = supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : null

export const isSupabaseEnabled = Boolean(supabaseUrl && supabasePublishableKey)

const createSupabase = () => {
  if (!supabaseUrl || !supabasePublishableKey) {
    return null
  }

  return createClient(supabaseUrl, supabasePublishableKey)
}

export const supabase = createSupabase()
