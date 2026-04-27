import { supabase } from "@/lib/supabase"
import { snakeToCamel, camelToSnake } from "@/lib/case-utils"
import type { Drawing, DrawingRecipient } from "@/lib/types"
import { uploadFile } from "./storage.service"

export async function fetchDrawings(): Promise<Drawing[]> {
  const { data, error } = await supabase
    .from("drawings")
    .select("*, drawing_recipients(*)")
    .order("upload_date", { ascending: false })
  if (error) throw new Error(`获取图纸失败: ${error.message}`)

  return (data || []).map((row: any) => {
    const recipients: DrawingRecipient[] = (row.drawing_recipients || []).map((r: any) =>
      snakeToCamel<DrawingRecipient>(r)
    )
    const drawing = snakeToCamel<Drawing>(row)
    ;(drawing as any).recipients = recipients
    delete (drawing as any).drawingRecipients
    return drawing
  })
}

export async function createDrawing(
  drawing: Omit<Drawing, "id" | "recipients">,
  file?: File
): Promise<Drawing> {
  let filePath: string | undefined
  let fileSize: string | undefined

  if (file) {
    const path = `${Date.now()}_${file.name}`
    const result = await uploadFile("drawings", path, file)
    filePath = result.path
    fileSize = `${(file.size / 1024 / 1024).toFixed(1)} MB`
  }

  const row: any = camelToSnake(drawing)
  delete row.id
  delete row.recipients
  if (filePath) row.file_path = filePath
  if (fileSize) row.file_size = fileSize

  const { data, error } = await supabase
    .from("drawings")
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(`创建图纸失败: ${error.message}`)

  const result = snakeToCamel<Drawing>(data)
  ;(result as any).recipients = []
  return result
}

export async function updateDrawing(
  id: string,
  updates: Partial<Drawing>
): Promise<Drawing> {
  const row = camelToSnake(updates)
  delete row.id
  delete row.recipients
  delete row.drawing_recipients
  const { data, error } = await supabase
    .from("drawings")
    .update(row)
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(`更新图纸失败: ${error.message}`)
  return snakeToCamel<Drawing>(data)
}

export async function deleteDrawing(id: string): Promise<void> {
  const { error } = await supabase.from("drawings").delete().eq("id", id)
  if (error) throw new Error(`删除图纸失败: ${error.message}`)
}
