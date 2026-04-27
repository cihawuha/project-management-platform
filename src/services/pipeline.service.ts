import { supabase } from "@/lib/supabase"
import { snakeToCamel, camelToSnake } from "@/lib/case-utils"
import type { PipelineInspection } from "@/lib/types"
import { uploadFile } from "./storage.service"

const CATEGORY_MAP: Record<string, string> = {
  preAssembly: "pre_assembly",
  rootPass: "root_pass",
  capPass: "cap_pass",
  weldingMaterial: "welding_material",
  process: "process",
}

const CATEGORY_MAP_REVERSE: Record<string, string> = {
  pre_assembly: "preAssembly",
  root_pass: "rootPass",
  cap_pass: "capPass",
  welding_material: "weldingMaterial",
  process: "process",
}

function assemblePhotos(photoRows: any[]): PipelineInspection["photos"] {
  const photos: PipelineInspection["photos"] = {
    preAssembly: [],
    rootPass: [],
    capPass: [],
    weldingMaterial: [],
    process: [],
  }
  for (const row of photoRows) {
    const camelCat = CATEGORY_MAP_REVERSE[row.category]
    if (camelCat && camelCat in photos) {
      ;(photos as any)[camelCat].push(row.file_url)
    }
  }
  return photos
}

export async function fetchInspections(): Promise<PipelineInspection[]> {
  const { data, error } = await supabase
    .from("pipeline_inspections")
    .select("*, inspection_photos(*)")
    .order("date", { ascending: false })
  if (error) throw new Error(`获取管道检查记录失败: ${error.message}`)

  return (data || []).map((row: any) => {
    const photos = assemblePhotos(row.inspection_photos || [])
    const inspection = snakeToCamel<PipelineInspection>(row)
    ;(inspection as any).photos = photos
    delete (inspection as any).inspectionPhotos
    return inspection
  })
}

export async function createInspection(
  inspection: Omit<PipelineInspection, "id" | "photos">
): Promise<PipelineInspection> {
  const row: any = camelToSnake(inspection)
  delete row.id
  delete row.photos
  delete row.inspection_photos

  const { data, error } = await supabase
    .from("pipeline_inspections")
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(`创建检查记录失败: ${error.message}`)

  const result = snakeToCamel<PipelineInspection>(data)
  ;(result as any).photos = {
    preAssembly: [],
    rootPass: [],
    capPass: [],
    weldingMaterial: [],
    process: [],
  }
  return result
}

export async function uploadInspectionPhoto(
  inspectionId: string,
  category: keyof PipelineInspection["photos"],
  file: File
): Promise<string> {
  const dbCategory = CATEGORY_MAP[category] || category
  const filePath = `${inspectionId}/${dbCategory}/${Date.now()}_${file.name}`

  const { path, url } = await uploadFile("inspection-photos", filePath, file)

  const { error } = await supabase.from("inspection_photos").insert({
    inspection_id: inspectionId,
    category: dbCategory,
    file_path: path,
    file_url: url,
  })
  if (error) throw new Error(`保存照片记录失败: ${error.message}`)

  return url
}

export async function updateInspectionStatus(
  id: string,
  status: PipelineInspection["status"]
): Promise<void> {
  const { error } = await supabase
    .from("pipeline_inspections")
    .update({ status })
    .eq("id", id)
  if (error) throw new Error(`更新状态失败: ${error.message}`)
}
