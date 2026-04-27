import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/lib/toast"
import { useAuth } from "@/lib/auth"
import { useAsyncData } from "@/hooks/use-async-data"
import * as imagesService from "@/services/images.service"
import type { ProjectImage } from "@/lib/types"
import { ImageIcon, Upload, Search, Grid3X3, List, Trash2, Loader2, RefreshCw } from "lucide-react"

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
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ni = await imagesService.uploadProjectImage(file, {
        name: file.name.replace(/\.[^.]+$/, ""),
        category: "施工现场",
        uploader: user?.name || "当前用户",
        description: "项目照片",
      })
      setImages((prev) => [ni, ...prev])
      addToast("照片上传成功", "success")
    } catch {
      addToast("上传失败，请重试", "error")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

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
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">项目形象管理</h1>
          <p className="text-sm text-muted-foreground mt-1">项目照片的上传、分类与管理</p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {uploading ? "上传中..." : "上传照片"}
        </Button>
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
              <div className="aspect-[4/3] relative overflow-hidden">
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
                    onClick={() => handleDelete(img.id)}
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
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
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
    </div>
  )
}
