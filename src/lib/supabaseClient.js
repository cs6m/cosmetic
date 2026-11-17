import { createClient } from "@supabase/supabase-js"

function readEnv(name) {
  return String(import.meta.env[name] || "").trim()
}

function isPlaceholder(value) {
  return /YOUR-|YOUR_ANON|YOUR-ANON|example\.supabase/i.test(value)
}

function classifyEnv() {
  const url = readEnv("VITE_SUPABASE_URL")
  const anonKey = readEnv("VITE_SUPABASE_ANON_KEY")
  if (!url && !anonKey) {
    return { url: "", anonKey: "", error: null, configured: false }
  }
  if (!url || !anonKey || isPlaceholder(url) || isPlaceholder(anonKey)) {
    return {
      url,
      anonKey,
      configured: false,
      error:
        "Supabase environment variables are missing or still placeholders. Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Browser storage will not be used as a stand-in.",
    }
  }
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("bad protocol")
  } catch {
    return { url, anonKey, configured: false, error: "VITE_SUPABASE_URL is not a valid http(s) URL. Browser storage will not be used as a stand-in." }
  }
  return { url, anonKey, error: null, configured: true }
}

const env = classifyEnv()

// Both variables must be real values. A partial or placeholder config is an error, not a
// silent switch back to the local demo. Only a completely unset pair keeps the offline demo.
export const supabaseConfigError = env.error
export const isSupabaseConfigured = env.configured
export const SUPABASE_URL = env.url
export const MEDIA_BUCKET = "media"
export const MEDIA_PUBLIC_PREFIX = env.configured ? `${env.url}/storage/v1/object/public/${MEDIA_BUCKET}/` : ""

if (supabaseConfigError) console.error(`[glowora] ${supabaseConfigError}`)

export const supabase = env.configured
  ? createClient(env.url, env.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 20 } },
    })
  : null

export function requireSupabase() {
  if (!supabase) {
    throw new Error(supabaseConfigError || "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.")
  }
  return supabase
}
