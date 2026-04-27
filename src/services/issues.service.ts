import { supabase } from "@/lib/supabase"
import { snakeToCamel, camelToSnake } from "@/lib/case-utils"
import type { IssueRecord } from "@/lib/types"
import { createLocalService } from "./local-store"

const local = createLocalService<IssueRecord>("local_issues")

export async function fetchIssues(): Promise<IssueRecord[]> {
  if (local.isLocal) return local.fetchAll()
  const { data, error } = await supabase
    .from("issues")
    .select("*")
    .order("create_date", { ascending: false })
  if (error) throw new Error(`获取问题列表失败: ${error.message}`)
  return snakeToCamel<IssueRecord[]>(data || [])
}

export async function createIssue(
  issue: Omit<IssueRecord, "id">
): Promise<IssueRecord> {
  if (local.isLocal) return local.create(issue)
  const row = camelToSnake(issue)
  delete row.id
  delete row.resolve_date
  const { data, error } = await supabase
    .from("issues")
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(`创建问题失败: ${error.message}`)
  return snakeToCamel<IssueRecord>(data)
}

export async function updateIssue(
  id: string,
  updates: Partial<IssueRecord>
): Promise<IssueRecord> {
  if (local.isLocal) return local.update(id, updates)
  const row = camelToSnake(updates)
  delete row.id
  const { data, error } = await supabase
    .from("issues")
    .update(row)
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(`更新问题失败: ${error.message}`)
  return snakeToCamel<IssueRecord>(data)
}

export async function resolveIssue(id: string): Promise<IssueRecord> {
  return updateIssue(id, {
    status: "resolved",
    resolveDate: new Date().toISOString().split("T")[0],
  } as Partial<IssueRecord>)
}
