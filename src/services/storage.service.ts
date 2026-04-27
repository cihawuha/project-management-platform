import { supabase } from "@/lib/supabase"

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ path: string; url: string }> {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  })
  if (error) throw new Error(`上传失败: ${error.message}`)

  const url = getPublicUrl(bucket, data.path)
  return { path: data.path, url }
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw new Error(`删除失败: ${error.message}`)
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
