import { supabase } from "@/lib/supabase"
import { snakeToCamel } from "@/lib/case-utils"
import type { ProjectImage } from "@/lib/types"
import { uploadFile, deleteFile } from "./storage.service"
import { createLocalService } from "./local-store"

const local = createLocalService<ProjectImage>("local_images")

export async function fetchProjectImages(): Promise<ProjectImage[]> {
  if (local.isLocal) return local.fetchAll()
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
  if (local.isLocal) {
    const url = URL.createObjectURL(file)
    return local.create({
      name: metadata.name,
      category: metadata.category,
      uploadDate: new Date().toISOString().split("T")[0],
      uploader: metadata.uploader,
      url,
      description: metadata.description,
    } as any)
  }

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
  if (local.isLocal) return local.remove(id)
  await deleteFile("project-images", filePath)
  const { error } = await supabase.from("project_images").delete().eq("id", id)
  if (error) throw new Error(`删除照片失败: ${error.message}`)
}
