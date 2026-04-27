import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useToast } from "@/lib/toast"
import { useAuth } from "@/lib/auth"
import { useAsyncData } from "@/hooks/use-async-data"
import * as drawingsService from "@/services/drawings.service"
import type { Drawing } from "@/lib/types"
import { CONSTRUCTION_UNITS } from "@/lib/types"
import {
  Search, Upload, Eye, ChevronDown, ChevronUp, FileText, Download, RefreshCw, Loader2, FileSpreadsheet, Pencil, Trash2, Check, X,
} from "lucide-react"

export function DrawingsPage() {
  const { data: fetched, loading, error, refetch } = useAsyncData(
    () => drawingsService.fetchDrawings(),
    []
  )
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [newDrawing, setNewDrawing] = useState({ name: "", code: "", constructionUnit: CONSTRUCTION_UNITS[0] as string })
  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", code: "", constructionUnit: "" })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (fetched) setDrawings(fetched)
  }, [fetched])

  const filtered = drawings.filter(
    (d) =>
      d.name.includes(searchQuery) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  async function handleUpload() {
    if (!newDrawing.name.trim() || !newDrawing.code.trim()) {
      addToast("请填写图纸名称和编号", "error")
      return
    }
    setSaving(true)
    try {
      const nd = await drawingsService.createDrawing(
        {
          name: newDrawing.name,
          code: newDrawing.code,
          version: "Rev.A",
          uploadDate: new Date().toISOString().split("T")[0],
          uploader: user?.name || "当前用户",
          status: "draft",
          fileSize: selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : "0 MB",
          hasChange: false,
          constructionUnit: newDrawing.constructionUnit,
        },
        selectedFile || undefined
      )
      setDrawings((prev) => [nd, ...prev])
      setNewDrawing({ name: "", code: "", constructionUnit: CONSTRUCTION_UNITS[0] })
      setSelectedFile(null)
      setShowUpload(false)
      addToast("图纸上传成功", "success")
    } catch {
      addToast("上传失败，请重试", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish(id: string) {
    setDrawings((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "published" as const } : d))
    )
    try {
      await drawingsService.updateDrawing(id, { status: "published" })
      addToast("图纸已发布", "success")
    } catch {
      addToast("发布失败", "error")
      refetch()
    }
  }

  function startEdit(drawing: Drawing) {
    setEditingId(drawing.id)
    setEditForm({ name: drawing.name, code: drawing.code, constructionUnit: drawing.constructionUnit || CONSTRUCTION_UNITS[0] })
    setExpandedId(drawing.id)
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim() || !editForm.code.trim()) {
      addToast("名称和编号不能为空", "error")
      return
    }
    try {
      await drawingsService.updateDrawing(id, { name: editForm.name, code: editForm.code, constructionUnit: editForm.constructionUnit } as Partial<Drawing>)
      setDrawings((prev) => prev.map((d) => d.id === id ? { ...d, name: editForm.name, code: editForm.code, constructionUnit: editForm.constructionUnit as any } : d))
      setEditingId(null)
      addToast("图纸信息已更新", "success")
    } catch {
      addToast("更新失败", "error")
    }
  }

  async function handleDelete(id: string) {
    try {
      await drawingsService.deleteDrawing(id)
      setDrawings((prev) => prev.filter((d) => d.id !== id))
      addToast("图纸已删除", "success")
    } catch {
      addToast("删除失败", "error")
    }
  }

  function handleExportCatalog() {
    if (filtered.length === 0) {
      addToast("暂无图纸数据可导出", "error")
      return
    }
    const header = "序号,图纸编号,图纸名称,版本,状态,施工单位,上传人,上传日期,文件大小\n"
    const rows = filtered.map((d, i) => {
      const status = statusMap[d.status]?.label || d.status
      const unit = d.constructionUnit || ""
      return `${i + 1},${d.code},${d.name},${d.version},${status},${unit},${d.uploader},${d.uploadDate},${d.fileSize}`
    }).join("\n")
    const blob = new Blob(["\ufeff" + header + rows], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `图纸目录_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    addToast("图纸目录导出成功", "success")
  }

  function handleFileSelect(file: File) {
    setSelectedFile(file)
    const baseName = file.name.replace(/\.[^.]+$/, "")
    const parts = baseName.split(/[_\-\s]+/)
    const codeParts: string[] = []
    const nameParts: string[] = []
    for (const p of parts) {
      if (/[A-Za-z]/.test(p) && /[0-9]/.test(p)) {
        codeParts.push(p)
      } else {
        nameParts.push(p)
      }
    }
    const autoCode = codeParts.join("-") || ""
    const autoName = nameParts.join("") || baseName
    setNewDrawing((prev) => ({
      ...prev,
      name: autoName,
      code: autoCode,
    }))
  }

  const statusMap = {
    published: { label: "已发布", variant: "success" as const },
    reviewing: { label: "审核中", variant: "warning" as const },
    draft: { label: "草稿", variant: "secondary" as const },
  }

  const recipientStatusMap = {
    viewed: { label: "已查阅", variant: "success" as const },
    received: { label: "已接收", variant: "info" as const },
    pending: { label: "待接收", variant: "secondary" as const },
  }

  if (loading && drawings.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && drawings.length === 0) {
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
        accept=".pdf,.dwg,.dxf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileSelect(file)
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">图纸发布管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理项目图纸的上传、分发与查阅状态</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCatalog}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            导出图纸目录
          </Button>
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="w-4 h-4 mr-2" />
            上传图纸
          </Button>
        </div>
      </div>

      {showUpload && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="text-base">上传新图纸</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="p-6 border-2 border-dashed border-border rounded-lg text-center cursor-pointer hover:bg-accent/30 transition-normal"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              {selectedFile ? (
                <p className="text-sm text-foreground font-medium">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">点击选择文件上传（自动识别图纸名称及编号）</p>
                  <p className="text-xs text-muted-foreground mt-1">支持 PDF、DWG、DXF 格式</p>
                </>
              )}
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">图纸名称</label>
                <Input
                  value={newDrawing.name}
                  onChange={(e) => setNewDrawing({ ...newDrawing, name: e.target.value })}
                  placeholder="选择文件后自动识别"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">图纸编号</label>
                <Input
                  value={newDrawing.code}
                  onChange={(e) => setNewDrawing({ ...newDrawing, code: e.target.value })}
                  placeholder="选择文件后自动识别"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">施工单位</label>
                <Select
                  value={newDrawing.constructionUnit}
                  onChange={(e) => setNewDrawing({ ...newDrawing, constructionUnit: e.target.value })}
                  options={CONSTRUCTION_UNITS.map((u) => ({ value: u, label: u }))}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button onClick={handleUpload} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                确认上传
              </Button>
              <Button variant="outline" onClick={() => setShowUpload(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索图纸名称或编号..."
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((drawing) => {
          const isExpanded = expandedId === drawing.id
          const { label: statusLabel, variant: statusVariant } = statusMap[drawing.status]
          const viewedCount = drawing.recipients.filter((r) => r.status === "viewed").length

          return (
            <Card key={drawing.id} className="overflow-hidden">
              <div
                className="p-4 sm:p-5 cursor-pointer hover:bg-accent/30 transition-normal"
                onClick={() => setExpandedId(isExpanded ? null : drawing.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{drawing.name}</h3>
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                      {drawing.constructionUnit && (
                        <Badge variant="outline">{drawing.constructionUnit}</Badge>
                      )}
                      {drawing.hasChange && (
                        <Badge variant="warning">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          变更 {drawing.changeVersion}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span>编号: {drawing.code}</span>
                      <span>版本: {drawing.version}</span>
                      <span>大小: {drawing.fileSize}</span>
                      <span>上传: {drawing.uploadDate}</span>
                      {drawing.recipients.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {viewedCount}/{drawing.recipients.length} 已查阅
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {drawing.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handlePublish(drawing.id) }}
                      >
                        发布
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); startEdit(drawing) }}
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); if (confirm("确定删除此图纸？")) handleDelete(drawing.id) }}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); addToast("图纸下载中...", "info") }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-secondary/30 p-4 sm:p-5 animate-fade-in">
                  {editingId === drawing.id ? (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">编辑图纸信息</h4>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">图纸名称</label>
                          <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">图纸编号</label>
                          <Input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">施工单位</label>
                          <Select
                            value={editForm.constructionUnit}
                            onChange={(e) => setEditForm({ ...editForm, constructionUnit: e.target.value })}
                            options={CONSTRUCTION_UNITS.map((u) => ({ value: u, label: u }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" onClick={() => handleSaveEdit(drawing.id)}>
                          <Check className="w-4 h-4 mr-1" />
                          保存
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          <X className="w-4 h-4 mr-1" />
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-3">接收人状态</h4>
                      {drawing.recipients.length === 0 ? (
                        <p className="text-sm text-muted-foreground">暂无接收人，请先发布图纸</p>
                      ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {drawing.recipients.map((r) => {
                            const { label, variant } = recipientStatusMap[r.status]
                            return (
                              <div key={r.userId} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                                <div>
                                  <p className="text-sm font-medium text-foreground">{r.userName}</p>
                                  <p className="text-xs text-muted-foreground">{r.department}</p>
                                  {r.viewedAt && <p className="text-xs text-muted-foreground mt-0.5">查阅: {r.viewedAt}</p>}
                                </div>
                                <Badge variant={variant}>{label}</Badge>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">未找到匹配的图纸</p>
          </div>
        )}
      </div>
    </div>
  )
}
