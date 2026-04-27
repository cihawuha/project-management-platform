import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new Proxy({} as SupabaseClient, {
      get(_, prop) {
        if (prop === "auth") {
          return {
            signInWithPassword: () => Promise.resolve({ data: null, error: { message: "Supabase 未配置" } }),
            signOut: () => Promise.resolve({ error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          }
        }
        if (prop === "from") {
          return () => ({
            select: () => ({ order: () => ({ data: [], error: null }), eq: () => ({ single: () => ({ data: null, error: { message: "Supabase 未配置" } }), data: [], error: null }), data: [], error: null }),
            insert: () => ({ select: () => ({ single: () => ({ data: null, error: { message: "Supabase 未配置" } }) }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: { message: "Supabase 未配置" } }) }) }) }),
            delete: () => ({ eq: () => ({ error: null }) }),
          })
        }
        if (prop === "storage") {
          return { from: () => ({ upload: () => Promise.resolve({ data: null, error: { message: "Supabase 未配置" } }) }) }
        }
        return () => {}
      },
    }))
