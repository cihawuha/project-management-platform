import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import type { User } from "@/lib/types"

const LOCAL_USER: User = {
  id: "local-admin",
  name: "管理员",
  username: "nxtx",
  role: "admin",
  department: "项目管理部",
}

export async function signIn(email: string, password: string): Promise<User> {
  if (!isSupabaseConfigured) {
    if (email === "nxtx" && password === "123456") {
      localStorage.setItem("local_user", JSON.stringify(LOCAL_USER))
      return LOCAL_USER
    }
    throw new Error("账号或密码错误")
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`登录失败: ${error.message}`)

  const profile = await fetchProfile(data.user.id)
  return profile
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) {
    localStorage.removeItem("local_user")
    return
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`退出失败: ${error.message}`)
}

export async function fetchProfile(userId: string): Promise<User> {
  if (!isSupabaseConfigured) {
    const stored = localStorage.getItem("local_user")
    if (stored) return JSON.parse(stored)
    throw new Error("未登录")
  }

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
