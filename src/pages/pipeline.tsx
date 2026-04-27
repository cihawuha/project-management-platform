import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/lib/toast"
import { Select } from "@/components/ui/select"
import { useAsyncData } from "@/hooks/use-async-data"
import * as pipelineService from "@/services/pipeline.service"
import type { PipelineInspection } from "@/lib/types"
import { CONSTRUCTION_UNITS } from "@/lib/types"
import {
  Wrench, Plus, Camera, User, ChevronDown, ChevronUp, ImageIcon, Upload, Loader2, RefreshCw,
} from "lucide-react"

const photoCategories = [
  { key: "preAssembly" as const, label: "组队前照片" },
  { key: "rootPass" as const, label: "打底前照片" },
  { key: "capPass" as const, label: "盖面照片" },
  { key: "weldingMaterial" as const, label: "焊材照片" },
  { key: "process" as const, label: "工序照片" },
]

export function PipelinePage() {
  const { data: fetched, loading, error, refetch } = useAsyncData(
    () => pipelineService.fetchInspections(),
    []
  )
  const [inspections, setInspections] = useState<PipelineInspection[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const [form, setForm] = useState({
    pipelineNo: "", weldNo: "", welderName: "", welderCertNo: "", constructionUnit: CONSTRUCTION_UNITS[0] as string,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetRef = useRef<{ inspId: string; category: keyof PipelineInspection["photos"] } | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    if (fetched) setInspections(fetched)
  }, [fetched])

  const statusMap = {
    completed: { label: "已完成", variant: "success" as const },
    in_progress: { label: "进行中", variant: "warning" as const },
    pending: { label: "待检查", variant: "secondary" as const },
  }

  async function handleAdd() {
    if (!form.pipelineNo.trim() || !form.weldNo.trim() || !form.welderName.trim()) {
      addToast("请填写管线号、焊口号和焊工信息", "error")
      return
    }
    setSaving(true)
    try {
      const ni = await pipelineService.createInspection({
        pipelineNo: form.pipelineNo,
        weldNo: form.weldNo,
        welderName: form.welderName,
        welderCertNo: form.welderCertNo,
        constructionUnit: form.constructionUnit,
        date: new Date().toISOString().split("T")[0],
        status: "pending",
      })
      setInspections((prev) => [ni, ...prev])
      setForm({ pipelineNo: "", weldNo: "", welderName: "", welderCertNo: "", constructionUnit: CONSTRUCTION_UNITS[0] })
      setShowAdd(false)
      addToast("三停检记录已创建", "success")
    } catch {
      addToast("创建失败，请重试", "error")
    } finally {
      setSaving(false)
    }
  }

  function triggerUpload(inspId: string, category: keyof PipelineInspection["photos"]) {
    uploadTargetRef.current = { inspId, category }
    fileInputRef.current?.click()
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const target = uploadTargetRef.current
    if (!file || !target) return

    const key = `${target.inspId}-${target.category}`
    setUploadingKey(key)
    try {
      const url = await pipelineService.uploadInspectionPhoto(
        target.inspId, target.category, file
      )
      setInspections((prev) =>
        prev.map((ins) => {
          if (ins.id !== target.inspId) return ins
          const newPhotos = { ...ins.photos }
          newPhotos[target.category] = [...newPhotos[target.category], url]
          const allFilled = Object.values(newPhotos).every((arr) => arr.length > 0)
          return { ...ins, photos: newPhotos, status: allFilled ? "completed" : "in_progress" }
        })
      )
      addToast("照片上传成功", "success")
    } catch {
      addToast("上传失败，请重试", "error")
    } finally {
      setUploadingKey(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  if (loading && inspections.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && inspections.length === 0) {
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
          <h1 className="text-2xl font-bold text-foreground">管道施工三停检照片</h1>
          <p className="text-sm text-muted-foreground mt-1">焊口照片上传与焊工信息管理</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-2" />
          新增记录
        </Button>
      </div>

      {showAdd && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="text-base">新增三停检记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">管线号</label>
                <Input
                  value={form.pipelineNo}
                  onChange={(e) => setForm({ ...form, pipelineNo: e.target.value })}
                  placeholder="例：PL-001-A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">焊口号</label>
                <Input
                  value={form.weldNo}
                  onChange={(e) => setForm({ ...form, weldNo: e.target.value })}
                  placeholder="例：W-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">焊工姓名</label>
                <Input
                  value={form.welderName}
                  onChange={(e) => setForm({ ...form, welderName: e.target.value })}
                  placeholder="焊工姓名"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">焊工证号</label>
                <Input
                  value={form.welderCertNo}
                  onChange={(e) => setForm({ ...form, welderCertNo: e.target.value })}
                  placeholder="焊工资质证书编号"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">施工单位</label>
                <Select
                  value={form.constructionUnit}
                  onChange={(e) => setForm({ ...form, constructionUnit: e.target.value })}
                  options={CONSTRUCTION_UNITS.map((u) => ({ value: u, label: u }))}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                创建
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {inspections.map((insp) => {
          const isExpanded = expandedId === insp.id
          const { label, variant } = statusMap[insp.status]
          const totalPhotos = Object.values(insp.photos).reduce((a, b) => a + b.length, 0)
          const totalCategories = Object.values(insp.photos).filter((arr) => arr.length > 0).length

          return (
            <Card key={insp.id} className="overflow-hidden">
              <div
                className="p-4 sm:p-5 cursor-pointer hover:bg-accent/30 transition-normal"
                onClick={() => setExpandedId(isExpanded ? null : insp.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">
                        {insp.pipelineNo} / {insp.weldNo}
                      </h3>
                      <Badge variant={variant}>{label}</Badge>
                      {insp.constructionUnit && (
                        <Badge variant="outline">{insp.constructionUnit}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        焊工: {insp.welderName}（{insp.welderCertNo}）
                      </span>
                      <span>日期: {insp.date}</span>
                      <span className="flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        {totalPhotos} 张照片 · {totalCategories}/5 类完成
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-secondary/30 p-4 sm:p-5 animate-fade-in space-y-4">
                  {photoCategories.map((cat) => {
                    const photos = insp.photos[cat.key]
                    const isUploading = uploadingKey === `${insp.id}-${cat.key}`
                    return (
                      <div key={cat.key}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-foreground">{cat.label}</h4>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isUploading}
                            onClick={(e) => {
                              e.stopPropagation()
                              triggerUpload(insp.id, cat.key)
                            }}
                          >
                            {isUploading ? (
                              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                            ) : (
                              <Upload className="w-3 h-3 mr-1.5" />
                            )}
                            {isUploading ? "上传中..." : "上传"}
                          </Button>
                        </div>
                        {photos.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                            {photos.map((url, i) => (
                              <div
                                key={i}
                                className="aspect-square rounded-lg overflow-hidden border border-border bg-card"
                              >
                                <img
                                  src={url}
                                  alt={`${cat.label} ${i + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 border border-dashed border-border rounded-lg text-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                            <p className="text-xs text-muted-foreground">暂无照片</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}

        {inspections.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无三停检记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
