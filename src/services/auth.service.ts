import { supabase } from "@/lib/supabase"
import type { User } from "@/lib/types"

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`登录失败: ${error.message}`)

  const profile = await fetchProfile(data.user.id)
  return profile
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`退出失败: ${error.message}`)
}

export async function fetchProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()
  if (error) throw new Error(`获取用户信息失败: ${error.message}`)

  return {
    id: data.id,
    name: data.name,
    username: data.username,
    role: data.role,
    department: data.department,
    avatar: data.avatar,
  }
}
