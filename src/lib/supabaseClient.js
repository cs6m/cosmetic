import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// When the two environment variables are missing the app keeps working exactly as before,
// on browser storage only (handy for local demos). With them set, Supabase is the source of truth.
export const isSupabaseConfigured = Boolean(url && anonKey)
export const SUPABASE_URL = url || ""
export const MEDIA_BUCKET = "media"
export const MEDIA_PUBLIC_PREFIX = url ? `${url}/storage/v1/object/public/${MEDIA_BUCKET}/` : ""

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  : null
