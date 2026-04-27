import { supabase } from "@/lib/supabase"
import { snakeToCamel, camelToSnake } from "@/lib/case-utils"
import type { Milestone } from "@/lib/types"

export async function fetchMilestones(): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from("milestones")
    .select("*")
    .order("start_date", { ascending: true })
  if (error) throw new Error(`获取里程碑失败: ${error.message}`)
  return snakeToCamel<Milestone[]>(data || [])
}

export async function createMilestone(
  milestone: Omit<Milestone, "id">
): Promise<Milestone> {
  const row = camelToSnake(milestone)
  delete row.id
  const { data, error } = await supabase
    .from("milestones")
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(`创建里程碑失败: ${error.message}`)
  return snakeToCamel<Milestone>(data)
}

export async function updateMilestone(
  id: string,
  updates: Partial<Milestone>
): Promise<Milestone> {
  const row = camelToSnake(updates)
  delete row.id
  const { data, error } = await supabase
    .from("milestones")
    .update(row)
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(`更新里程碑失败: ${error.message}`)
  return snakeToCamel<Milestone>(data)
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from("milestones").delete().eq("id", id)
  if (error) throw new Error(`删除里程碑失败: ${error.message}`)
}
