import { supabase } from "@/lib/supabase"
import { snakeToCamel, camelToSnake } from "@/lib/case-utils"
import type { ProjectImage } from "@/lib/types"
import { uploadFile, deleteFile, getPublicUrl } from "./storage.service"

export async function fetchProjectImages(): Promise<ProjectImage[]> {
  const { data, error } = await supabase
    .from("project_images")
    .select("*")
    .order("upload_date", { ascending: false })
  if (error) throw new Error(`获取项目照片失败: ${error.message}`)
  return snakeToCamel<ProjectImage[]>(data || [])
}

export async function uploadProjectImage(
  file: File,
  metadata: { name: string; category: string; uploader: string; description: string }
): Promise<ProjectImage> {
  const datePrefix = new Date().toISOString().slice(0, 7)
  const filePath = `${datePrefix}/${Date.now()}_${file.name}`

  const { path, url } = await uploadFile("project-images", filePath, file)

  const row = {
    name: metadata.name,
    category: metadata.category,
    upload_date: new Date().toISOString().split("T")[0],
    uploader: metadata.uploader,
    file_path: path,
    url,
    description: metadata.description,
  }

  const { data, error } = await supabase
    .from("project_images")
    .insert(row)
    .select()
    .single()
  if (error) throw new Error(`保存照片信息失败: ${error.message}`)
  return snakeToCamel<ProjectImage>(data)
}

export async function deleteProjectImage(id: string, filePath: string): Promise<void> {
  await deleteFile("project-images", filePath)
  const { error } = await supabase.from("project_images").delete().eq("id", id)
  if (error) throw new Error(`删除照片失败: ${error.message}`)
}
