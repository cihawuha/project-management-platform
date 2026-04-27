import { useState, useEffect, useRef, useCallback } from "react"
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
import { CONSTRUCTION_UNITS, DRAWING_SPECIALTIES } from "@/lib/types"
import type { DrawingSpecialty } from "@/lib/types"
import {
  Search, Upload, Eye, ChevronDown, ChevronUp, FileText, Download, RefreshCw, Loader2, FileSpreadsheet, Pencil, Trash2, Check, X,
} from "lucide-react"

/** 根据文件名关键字自动识别专业分类 */
function guessSpecialty(fileName: string): DrawingSpecialty {
  const lower = fileName.toLowerCase()
  const rules: [RegExp, DrawingSpecialty][] = [
    [/电气|elec|配电|照明|弱电|强电|防雷|接地/, "电气"],
    [/管道|给排水|暖通|通风|空调|hvac|消防水/, "管道"],
    [/钢[结構构]|钢构|steel/, "钢结构"],
    [/安装|设备|机电|消防|install/, "安装"],
    [/土建|建筑|结构|基础|混凝|civil|arch|struct|桩基|地基|模板|砌体/, "土建"],
  ]
  for (const [re, specialty] of rules) {
    if (re.test(lower)) return specialty
  }
  return "土建"
}

/** 从文件名解析图纸名称和编号 */
function parseFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "")
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
  return {
    code: codeParts.join("-") || "",
    name: nameParts.join("") || baseName,
  }
}

interface BatchFileItem {
  file: File
  name: string
  code: string
  specialty: string
  status: "pending" | "uploading" | "done" | "error"
}

export function DrawingsPage() {
  const { data: fetched, loading, error, refetch } = useAsyncData(
    () => drawingsService.fetchDrawings(),
    []
  )
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [batchFiles, setBatchFiles] = useState<BatchFileItem[]>([])
  const [batchUnit, setBatchUnit] = useState<string>(CONSTRUCTION_UNITS[0])
  const [saving, setSaving] = useState(false)
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: "", code: "", constructionUnit: "", specialty: "" })
  const [previewDrawing, setPreviewDrawing] = useState<Drawing | null>(null)
  const [filterSpecialty, setFilterSpecialty] = useState<string>("全部")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (fetched) setDrawings(fetched)
  }, [fetched])

  const filtered = drawings.filter(
    (d) =>
      (filterSpecialty === "全部" || d.specialty === filterSpecialty) &&
      (d.name.includes(searchQuery) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  /** 将选中的文件加入批量列表，自动解析名称/编号/专业 */
  const addFilesToBatch = useCallback((files: File[]) => {
    const validExts = [".pdf", ".dwg", ".dxf", ".png", ".jpg", ".jpeg"]
    const validFiles = files.filter((f) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase()
      return validExts.includes(ext)
    })
    if (validFiles.length === 0) {
      addToast("请选择支持的文件格式（PDF/DWG/DXF/图片）", "error")
      return
    }
    const items: BatchFileItem[] = validFiles.map((file) => {
      const parsed = parseFileName(file.name)
      return {
        file,
        name: parsed.name,
        code: parsed.code,
        specialty: guessSpecialty(file.name),
        status: "pending" as const,
      }
    })
    setBatchFiles((prev) => [...prev, ...items])
    if (!showUpload) setShowUpload(true)
  }, [addToast, showUpload])

  /** 批量上传所有文件 */
  async function handleBatchUpload() {
    const pending = batchFiles.filter((f) => f.status === "pending")
    if (pending.length === 0) {
      addToast("没有待上传的图纸", "error")
      return
    }
    setSaving(true)
    setBatchProgress({ current: 0, total: pending.length })
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < batchFiles.length; i++) {
      const item = batchFiles[i]
      if (item.status !== "pending") continue
      setBatchFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "uploading" } : f))
      setBatchProgress((prev) => ({ ...prev, current: prev.current + 1 }))
      try {
        const nd = await drawingsService.createDrawing(
          {
            name: item.name,
            code: item.code,
            version: "Rev.A",
            uploadDate: new Date().toISOString().split("T")[0],
            uploader: user?.name || "当前用户",
            status: "draft",
            fileSize: `${(item.file.size / 1024 / 1024).toFixed(1)} MB`,
            hasChange: false,
            constructionUnit: batchUnit,
            specialty: item.specialty,
          },
          item.file
        )
        setDrawings((prev) => [nd, ...prev])
        setBatchFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "done" } : f))
        successCount++
      } catch {
        setBatchFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: "error" } : f))
        failCount++
      }
    }

    setSaving(false)
    setBatchProgress({ current: 0, total: 0 })
    if (successCount > 0) addToast(`成功上传 ${successCount} 份图纸`, "success")
    if (failCount > 0) addToast(`${failCount} 份图纸上传失败`, "error")
    // 清除已完成的项
    setBatchFiles((prev) => prev.filter((f) => f.status !== "done"))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFilesToBatch(Array.from(e.dataTransfer.files))
  }, [addFilesToBatch])

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
    setEditForm({ name: drawing.name, code: drawing.code, constructionUnit: drawing.constructionUnit || CONSTRUCTION_UNITS[0], specialty: drawing.specialty || DRAWING_SPECIALTIES[0] })
    setExpandedId(drawing.id)
  }

  async function handleSaveEdit(id: string) {
    if (!editForm.name.trim() || !editForm.code.trim()) {
      addToast("名称和编号不能为空", "error")
      return
    }
    try {
      await drawingsService.updateDrawing(id, { name: editForm.name, code: editForm.code, constructionUnit: editForm.constructionUnit, specialty: editForm.specialty } as Partial<Drawing>)
      setDrawings((prev) => prev.map((d) => d.id === id ? { ...d, name: editForm.name, code: editForm.code, constructionUnit: editForm.constructionUnit as any, specialty: editForm.specialty as any } : d))
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
    const header = "序号,图纸编号,图纸名称,版本,状态,专业,施工单位,上传人,上传日期,文件大小\n"
    const rows = filtered.map((d, i) => {
      const status = statusMap[d.status]?.label || d.status
      const unit = d.constructionUnit || ""
      const sp = d.specialty || ""
      return `${i + 1},${d.code},${d.name},${d.version},${status},${sp},${unit},${d.uploader},${d.uploadDate},${d.fileSize}`
    }).join("\n")
    const blob = new Blob(["\ufeff" + header + rows], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `图纸目录_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    addToast("图纸目录导出成功", "success")
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
        accept=".pdf,.dwg,.dxf,.png,.jpg,.jpeg"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files
          if (files && files.length > 0) {
            addFilesToBatch(Array.from(files))
          }
          if (fileInputRef.current) fileInputRef.current.value = ""
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">图纸发布管理</h1>
          <p className="text-sm text-muted-foreground mt-1">管理项目图纸的上传、分发与查阅状态（支持批量上传自动分类）</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCatalog}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            导出图纸目录
          </Button>
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="w-4 h-4 mr-2" />
            批量上传
          </Button>
        </div>
      </div>

      {showUpload && (
        <Card className="animate-scale-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">批量上传图纸</CardTitle>
              {batchFiles.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  共 {batchFiles.length} 份图纸，{batchFiles.filter((f) => f.status === "pending").length} 份待上传
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 拖拽区 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:bg-accent/30"
              }`}
              onClick={() => !saving && fileInputRef.current?.click()}
            >
              {saving ? (
                <div className="space-y-3">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    正在上传第 {batchProgress.current} / {batchProgress.total} 份...
                  </p>
                  <div className="w-full max-w-xs mx-auto bg-secondary rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">点击或拖拽文件到此处，支持同时选择多份图纸</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">支持 PDF、DWG、DXF、图片格式 · 自动识别名称编号及专业分类</p>
                </div>
              )}
            </div>

            {/* 统一施工单位 */}
            {batchFiles.length > 0 && !saving && (
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                <label className="text-sm font-medium text-foreground whitespace-nowrap">统一施工单位:</label>
                <Select
                  value={batchUnit}
                  onChange={(e) => setBatchUnit(e.target.value)}
                  options={CONSTRUCTION_UNITS.map((u) => ({ value: u, label: u }))}
                />
              </div>
            )}

            {/* 批量文件列表 */}
            {batchFiles.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-secondary/50 px-4 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                  <div className="col-span-1">状态</div>
                  <div className="col-span-3">文件名</div>
                  <div className="col-span-3">图纸名称</div>
                  <div className="col-span-2">图纸编号</div>
                  <div className="col-span-2">专业分类</div>
                  <div className="col-span-1">操作</div>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {batchFiles.map((item, idx) => (
                    <div key={idx} className={`px-4 py-2 grid grid-cols-12 gap-2 items-center text-sm ${
                      item.status === "done" ? "bg-green-50 dark:bg-green-950/20" :
                      item.status === "error" ? "bg-red-50 dark:bg-red-950/20" :
                      item.status === "uploading" ? "bg-blue-50 dark:bg-blue-950/20" : ""
                    }`}>
                      <div className="col-span-1">
                        {item.status === "pending" && <span className="w-2 h-2 rounded-full bg-muted-foreground inline-block" />}
                        {item.status === "uploading" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                        {item.status === "done" && <Check className="w-4 h-4 text-green-600" />}
                        {item.status === "error" && <X className="w-4 h-4 text-destructive" />}
                      </div>
                      <div className="col-span-3 truncate text-xs text-muted-foreground" title={item.file.name}>
                        {item.file.name}
                        <span className="ml-1 text-[10px]">({(item.file.size / 1024 / 1024).toFixed(1)}MB)</span>
                      </div>
                      <div className="col-span-3">
                        {item.status === "pending" ? (
                          <Input
                            value={item.name}
                            onChange={(e) => setBatchFiles((prev) => prev.map((f, i) => i === idx ? { ...f, name: e.target.value } : f))}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-xs">{item.name}</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        {item.status === "pending" ? (
                          <Input
                            value={item.code}
                            onChange={(e) => setBatchFiles((prev) => prev.map((f, i) => i === idx ? { ...f, code: e.target.value } : f))}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-xs">{item.code}</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        {item.status === "pending" ? (
                          <select
                            value={item.specialty}
                            onChange={(e) => setBatchFiles((prev) => prev.map((f, i) => i === idx ? { ...f, specialty: e.target.value } : f))}
                            className="w-full h-7 text-xs border rounded px-1 bg-background text-foreground"
                          >
                            {DRAWING_SPECIALTIES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="info" className="text-[10px]">{item.specialty}</Badge>
                        )}
                      </div>
                      <div className="col-span-1">
                        {item.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setBatchFiles((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button onClick={handleBatchUpload} disabled={saving || batchFiles.filter((f) => f.status === "pending").length === 0}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {saving ? `上传中 ${batchProgress.current}/${batchProgress.total}` : `确认上传 (${batchFiles.filter((f) => f.status === "pending").length})`}
              </Button>
              <Button variant="outline" onClick={() => { setShowUpload(false); setBatchFiles([]) }}>取消</Button>
              {batchFiles.length > 0 && !saving && (
                <Button variant="ghost" className="text-destructive" onClick={() => setBatchFiles([])}>
                  清空列表
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索图纸名称或编号..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["全部", ...DRAWING_SPECIALTIES].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSpecialty(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-normal ${
                filterSpecialty === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent/50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
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
                      {drawing.specialty && (
                        <Badge variant="info">{drawing.specialty}</Badge>
                      )}
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
                    {drawing.fileUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); setPreviewDrawing(drawing) }}
                        title="预览"
                      >
                        <Eye className="w-4 h-4" />
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
                      <div className="grid sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">图纸名称</label>
                          <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">图纸编号</label>
                          <Input value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">专业</label>
                          <Select
                            value={editForm.specialty}
                            onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                            options={DRAWING_SPECIALTIES.map((s) => ({ value: s, label: s }))}
                          />
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

      {/* 预览弹窗 */}
      {previewDrawing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setPreviewDrawing(null)}>
          <div className="bg-card rounded-lg shadow-xl w-[90vw] h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{previewDrawing.name}</h3>
                <p className="text-xs text-muted-foreground">编号: {previewDrawing.code}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPreviewDrawing(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              {previewDrawing.fileUrl?.startsWith("data:application/pdf") || previewDrawing.fileUrl?.endsWith(".pdf") ? (
                <iframe src={previewDrawing.fileUrl} className="w-full h-full border-0" title="图纸预览" />
              ) : previewDrawing.fileUrl?.startsWith("data:image") ? (
                <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
                  <img src={previewDrawing.fileUrl} alt={previewDrawing.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">该文件格式暂不支持在线预览</p>
                    <p className="text-xs mt-1">支持 PDF 和图片格式的在线预览</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
