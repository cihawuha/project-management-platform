import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/lib/toast"
import { useAuth } from "@/lib/auth"
import { useAsyncData } from "@/hooks/use-async-data"
import * as imagesService from "@/services/images.service"
import type { ProjectImage } from "@/lib/types"
import { CONSTRUCTION_UNITS } from "@/lib/types"
import {
  ImageIcon, Upload, Search, Grid3X3, List, Trash2, Loader2, RefreshCw, X, CheckCircle2, AlertCircle,
} from "lucide-react"

const IMAGE_CATEGORIES = ["施工现场", "质量检查", "安全文明", "竣工验收", "其他"] as const

export function ImagesPage() {
  const { data: fetched, loading, error, refetch } = useAsyncData(
    () => imagesService.fetchProjectImages(),
    []
  )
  const [images, setImages] = useState<ProjectImage[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedCategory, setSelectedCategory] = useState("全部")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)
  const [previewImg, setPreviewImg] = useState<ProjectImage | null>(null)
  const [uploadCategory, setUploadCategory] = useState<string>("施工现场")
  const [uploadUnit, setUploadUnit] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (fetched) setImages(fetched)
  }, [fetched])

  const categories = ["全部", ...Array.from(new Set(images.map((img) => img.category)))]

  const filtered = images.filter((img) => {
    const matchSearch = img.name.includes(searchQuery) || img.description.includes(searchQuery)
    const matchCategory = selectedCategory === "全部" || img.category === selectedCategory
    return matchSearch && matchCategory
  })

  const uploadFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"))
    if (imageFiles.length === 0) {
      addToast("请选择图片文件", "error")
      return
    }
    setUploading(true)
    setUploadProgress({ current: 0, total: imageFiles.length })
    let successCount = 0
    let failCount = 0
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i]
      setUploadProgress({ current: i + 1, total: imageFiles.length })
      try {
        const ni = await imagesService.uploadProjectImage(file, {
          name: file.name.replace(/\.[^.]+$/, ""),
          category: uploadCategory,
          uploader: user?.name || "当前用户",
          description: "项目照片",
          ...(uploadUnit ? { constructionUnit: uploadUnit } : {}),
        } as any)
        setImages((prev) => [ni, ...prev])
        successCount++
      } catch {
        failCount++
      }
    }
    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    if (fileInputRef.current) fileInputRef.current.value = ""
    if (successCount > 0) addToast(`成功上传 ${successCount} 张照片`, "success")
    if (failCount > 0) addToast(`${failCount} 张照片上传失败`, "error")
  }, [addToast, uploadCategory, uploadUnit, user])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    await uploadFiles(Array.from(files))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) await uploadFiles(files)
  }, [uploadFiles])

  async function handleDelete(id: string) {
    const img = images.find((i) => i.id === id)
    setImages((prev) => prev.filter((i) => i.id !== id))
    try {
      await imagesService.deleteProjectImage(id, (img as any)?.filePath || "")
      addToast("照片已删除", "info")
    } catch {
      addToast("删除失败", "error")
      refetch()
    }
  }

  if (loading && images.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && images.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-destructive mb-3">{error}</p>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" />
          重试
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">项目形象管理</h1>
          <p className="text-sm text-muted-foreground mt-1">项目照片的上传、分类与管理（支持多图上传）</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {uploading
            ? `上传中 ${uploadProgress.current}/${uploadProgress.total}`
            : "上传照片"}
        </Button>
      </div>

      {/* Upload options + Drag area */}
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              正在上传第 {uploadProgress.current} / {uploadProgress.total} 张...
            </p>
            <div className="w-full max-w-xs mx-auto bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              点击或拖拽图片到此处上传，支持同时选择多张
            </p>
            <p className="text-xs text-muted-foreground/60">支持 JPG、PNG、GIF 等图片格式</p>
          </div>
        )}

        {/* Upload options row */}
        {!uploading && (
          <div className="flex items-center justify-center gap-4 mt-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">分类:</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background text-foreground"
              >
                {IMAGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground whitespace-nowrap">施工单位:</label>
              <select
                value={uploadUnit}
                onChange={(e) => setUploadUnit(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background text-foreground"
              >
                <option value="">不指定</option>
                {CONSTRUCTION_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索照片..."
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-normal ${
                selectedCategory === cat
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Images Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((img) => (
            <Card key={img.id} className="overflow-hidden group">
              <div
                className="aspect-[4/3] relative overflow-hidden cursor-pointer"
                onClick={() => setPreviewImg(img)}
              >
                <img
                  src={img.url}
                  alt={img.name}
                  className="w-full h-full object-cover transition-normal group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-normal flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); handleDelete(img.id) }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium text-foreground truncate">{img.name}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">{img.category}</Badge>
                  {img.constructionUnit && (
                    <Badge variant="outline" className="text-[10px]">{img.constructionUnit}</Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground ml-auto">{img.uploadDate}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((img) => (
            <Card key={img.id} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div
                  className="w-16 h-16 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                  onClick={() => setPreviewImg(img)}
                >
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{img.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{img.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">{img.category}</Badge>
                    {img.constructionUnit && (
                      <Badge variant="outline" className="text-[10px]">{img.constructionUnit}</Badge>
                    )}
                    <span>{img.uploader}</span>
                    <span>{img.uploadDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(img.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无照片</p>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <Button
              size="icon"
              variant="ghost"
              className="absolute -top-10 right-0 text-white hover:bg-white/20"
              onClick={() => setPreviewImg(null)}
            >
              <X className="w-5 h-5" />
            </Button>
            <img
              src={previewImg.url}
              alt={previewImg.name}
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
            <div className="mt-2 text-center">
              <p className="text-white text-sm font-medium">{previewImg.name}</p>
              <p className="text-white/60 text-xs mt-1">
                {previewImg.category} · {previewImg.uploader} · {previewImg.uploadDate}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
