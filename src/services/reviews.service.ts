import { supabase } from "@/lib/supabase"
import { snakeToCamel, camelToSnake } from "@/lib/case-utils"
import type { ReviewMinute } from "@/lib/types"

export async function fetchReviews(): Promise<ReviewMinute[]> {
  const { data, error } = await supabase
    .from("review_minutes")
    .select("*")
    .order("date", { ascending: false })
  if (error) throw new Error(`获取图审纪要失败: ${error.message}`)
  return snakeToCamel<ReviewMinute[]>(data || [])
}

export async function createReview(
  review: Omit<ReviewMinute, "id">
): Promise<ReviewMinute> {
  const row = camelToSnake(review)
  delete row.id
  const { data, error } = await supabase
    .from("review_minutes")
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(`创建图审纪要失败: ${error.message}`)
  return snakeToCamel<ReviewMinute>(data)
}

export async function updateReview(
  id: string,
  updates: Partial<ReviewMinute>
): Promise<ReviewMinute> {
  const row = camelToSnake(updates)
  delete row.id
  const { data, error } = await supabase
    .from("review_minutes")
    .update(row)
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(`更新图审纪要失败: ${error.message}`)
  return snakeToCamel<ReviewMinute>(data)
}
