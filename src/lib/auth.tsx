import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react"
import type { User, UserRole } from "./types"
import { signIn, signOut, fetchProfile } from "@/services/auth.service"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const profileFetchedRef = useRef(false)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem("local_user")
      if (stored) {
        try { setUser(JSON.parse(stored)) } catch { /* ignore */ }
      }
      setIsLoading(false)
      return
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id)
          setUser(profile)
        } catch {
          setUser(null)
        }
      }
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user && !profileFetchedRef.current) {
          profileFetchedRef.current = true
          try {
            const profile = await fetchProfile(session.user.id)
            setUser(profile)
          } catch {
            setUser(null)
          }
        } else if (event === "SIGNED_OUT") {
          profileFetchedRef.current = false
          setUser(null)
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Token refreshed, user stays the same
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      profileFetchedRef.current = true
      const profile = await signIn(email, password)
      setUser(profile)
      return true
    } catch {
      profileFetchedRef.current = false
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await signOut()
    } catch {
      // Force local cleanup even if signOut fails
    }
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (roles: UserRole[]) => {
      if (!user) return false
      return roles.includes(user.role)
    },
    [user]
  )

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
