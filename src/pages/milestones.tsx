import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { useToast } from "@/lib/toast"
import { useAsyncData } from "@/hooks/use-async-data"
import * as milestonesService from "@/services/milestones.service"
import type { Milestone } from "@/lib/types"
import { CONSTRUCTION_UNITS } from "@/lib/types"
import { CalendarRange, Plus, Clock, Flag, Loader2, RefreshCw } from "lucide-react"

export function MilestonesPage() {
  const { data: fetched, loading, error, refetch } = useAsyncData(
    () => milestonesService.fetchMilestones(),
    []
  )
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", responsible: "", constructionUnit: CONSTRUCTION_UNITS[0] as string })
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    if (fetched) setMilestones(fetched)
  }, [fetched])

  const statusMap = {
    completed: { label: "已完成", variant: "success" as const, color: "bg-success" },
    in_progress: { label: "进行中", variant: "info" as const, color: "gradient-primary" },
    delayed: { label: "已延期", variant: "destructive" as const, color: "bg-destructive" },
    pending: { label: "未开始", variant: "secondary" as const, color: "bg-muted" },
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.startDate || !form.endDate) {
      addToast("请填写名称和日期", "error")
      return
    }
    setSaving(true)
    try {
      const nm = await milestonesService.createMilestone({
        name: form.name,
        startDate: form.startDate,
        endDate: form.endDate,
        progress: 0,
        status: "pending",
        responsible: form.responsible || "待分配",
        constructionUnit: form.constructionUnit,
      })
      setMilestones((prev) => [...prev, nm])
      setForm({ name: "", startDate: "", endDate: "", responsible: "", constructionUnit: CONSTRUCTION_UNITS[0] })
      setShowAdd(false)
      addToast("里程碑已添加", "success")
    } catch {
      addToast("添加失败，请重试", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateProgress(id: string, progress: number) {
    const newProgress = Math.min(100, Math.max(0, progress))
    const newStatus = newProgress === 100 ? "completed" : newProgress > 0 ? "in_progress" : undefined
    setMilestones((prev) =>
      prev.map((m) =>
        m.id !== id ? m : { ...m, progress: newProgress, status: newStatus || m.status }
      )
    )
    try {
      await milestonesService.updateMilestone(id, {
        progress: newProgress,
        ...(newStatus ? { status: newStatus as Milestone["status"] } : {}),
      })
    } catch {
      addToast("更新失败", "error")
      refetch()
    }
  }

  if (loading && milestones.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && milestones.length === 0) {
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

  const overallProgress = milestones.length
    ? Math.round(milestones.reduce((sum, m) => sum + m.progress, 0) / milestones.length)
    : 0

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">项目计划与里程碑</h1>
          <p className="text-sm text-muted-foreground mt-1">项目关键节点进度追踪</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-2" />
          添加里程碑
        </Button>
      </div>

      {showAdd && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="text-base">添加里程碑</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">节点名称</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="里程碑名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">负责人</label>
                <Input
                  value={form.responsible}
                  onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                  placeholder="负责人姓名"
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
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">开始日期</label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">结束日期</label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                保存
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">项目整体进度</h3>
            </div>
            <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
          </div>
          <div className="h-3 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-700"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span>{milestones.filter((m) => m.status === "completed").length} 已完成</span>
            <span>{milestones.filter((m) => m.status === "in_progress").length} 进行中</span>
            <span>{milestones.filter((m) => m.status === "pending").length} 未开始</span>
          </div>
        </CardContent>
      </Card>

      {/* Timeline View */}
      <div className="space-y-0">
        {milestones.map((ms, index) => {
          const { label, variant, color } = statusMap[ms.status]
          return (
            <div key={ms.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full ${color} shrink-0 mt-5 ring-4 ring-background`} />
                {index < milestones.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border" />
                )}
              </div>
              <Card className="flex-1 mb-4">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{ms.name}</h3>
                        <Badge variant={variant}>{label}</Badge>
                        {ms.constructionUnit && (
                          <Badge variant="outline">{ms.constructionUnit}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {ms.startDate} — {ms.endDate}
                        </span>
                        <span>负责人: {ms.responsible}</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-foreground shrink-0">{ms.progress}%</span>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          ms.progress === 100 ? "bg-success" : "gradient-primary"
                        }`}
                        style={{ width: `${ms.progress}%` }}
                      />
                    </div>
                    {ms.status !== "completed" && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateProgress(ms.id, ms.progress + 10)}
                        >
                          +10%
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateProgress(ms.id, 100)}
                        >
                          标记完成
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {milestones.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarRange className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无里程碑</p>
        </div>
      )}
    </div>
  )
}
