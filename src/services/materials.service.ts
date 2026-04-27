import { supabase } from "@/lib/supabase"
import { snakeToCamel, camelToSnake } from "@/lib/case-utils"
import type { MaterialPlan, MaterialItem } from "@/lib/types"

export async function fetchMaterialPlans(): Promise<MaterialPlan[]> {
  const { data, error } = await supabase
    .from("material_plans")
    .select("*, material_items(*)")
    .order("submit_date", { ascending: false })
  if (error) throw new Error(`获取材料计划失败: ${error.message}`)

  return (data || []).map((row: any) => {
    const materials: MaterialItem[] = (row.material_items || []).map((m: any) =>
      snakeToCamel<MaterialItem>(m)
    )
    const plan = snakeToCamel<MaterialPlan>(row)
    ;(plan as any).materials = materials
    delete (plan as any).materialItems
    return plan
  })
}

export async function createMaterialPlan(
  plan: Omit<MaterialPlan, "id">,
  materials: MaterialItem[]
): Promise<MaterialPlan> {
  const row: any = camelToSnake(plan)
  delete row.id
  delete row.materials
  delete row.material_items

  const { data, error } = await supabase
    .from("material_plans")
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(`创建材料计划失败: ${error.message}`)

  if (materials.length > 0) {
    const items = materials.map((m) => ({
      ...camelToSnake(m),
      material_plan_id: data.id,
    }))
    items.forEach((item) => delete item.id)
    const { error: itemError } = await supabase.from("material_items").insert(items)
    if (itemError) throw new Error(`创建材料明细失败: ${itemError.message}`)
  }

  const result = snakeToCamel<MaterialPlan>(data)
  ;(result as any).materials = materials
  return result
}

export async function updateMaterialPlan(
  id: string,
  updates: Partial<MaterialPlan>
): Promise<MaterialPlan> {
  const row = camelToSnake(updates)
  delete row.id
  delete row.materials
  delete row.material_items
  const { data, error } = await supabase
    .from("material_plans")
    .update(row)
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(`更新材料计划失败: ${error.message}`)
  return snakeToCamel<MaterialPlan>(data)
}
