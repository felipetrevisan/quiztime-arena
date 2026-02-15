import { createClient } from '@supabase/supabase-js'

const supabaseProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID?.trim()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
const supabaseUrl = supabaseProjectId ? `https://${supabaseProjectId}.supabase.co` : null

export const isSupabaseEnabled = Boolean(supabaseUrl && supabasePublishableKey)

const createSupabase = () => {
  if (!supabaseUrl || !supabasePublishableKey) {
    return null
  }

  return createClient(supabaseUrl, supabasePublishableKey)
}

export const supabase = createSupabase()
