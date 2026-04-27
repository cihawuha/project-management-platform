import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/lib/toast"
import { useAuth } from "@/lib/auth"
import { useAsyncData } from "@/hooks/use-async-data"
import * as reviewsService from "@/services/reviews.service"
import type { ReviewMinute } from "@/lib/types"
import { ClipboardList, Plus, Clock, Users, FileText, Hammer, Loader2, RefreshCw } from "lucide-react"

export function ReviewsPage() {
  const { data: fetched, loading, error, refetch } = useAsyncData(
    () => reviewsService.fetchReviews(),
    []
  )
  const [reviews, setReviews] = useState<ReviewMinute[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ drawingName: "", content: "", workload: "", plan: "" })
  const { addToast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (fetched) setReviews(fetched)
  }, [fetched])

  const statusMap = {
    completed: { label: "已完成", variant: "success" as const },
    in_progress: { label: "进行中", variant: "warning" as const },
    pending: { label: "待确认", variant: "secondary" as const },
  }

  async function handleAdd() {
    if (!form.drawingName.trim() || !form.content.trim()) {
      addToast("请填写必要信息", "error")
      return
    }
    setSaving(true)
    try {
      const nr = await reviewsService.createReview({
        drawingId: "",
        drawingName: form.drawingName,
        date: new Date().toISOString().split("T")[0],
        participants: [user?.name || "当前用户"],
        content: form.content,
        workload: Number(form.workload) || 0,
        workloadUnit: "工时",
        constructionPlan: form.plan || "待排定",
        status: "pending",
      })
      setReviews((prev) => [nr, ...prev])
      setForm({ drawingName: "", content: "", workload: "", plan: "" })
      setShowAdd(false)
      addToast("会审纪要已添加", "success")
    } catch {
      addToast("创建失败，请重试", "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && reviews.length === 0) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">图纸会审纪要</h1>
          <p className="text-sm text-muted-foreground mt-1">图纸会审记录、工作量及施工计划管理</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-2" />
          新增纪要
        </Button>
      </div>

      {showAdd && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="text-base">新增会审纪要</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">关联图纸</label>
                <Input
                  value={form.drawingName}
                  onChange={(e) => setForm({ ...form, drawingName: e.target.value })}
                  placeholder="输入图纸名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">工作量（工时）</label>
                <Input
                  type="number"
                  value={form.workload}
                  onChange={(e) => setForm({ ...form, workload: e.target.value })}
                  placeholder="预估工时数"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">会审内容</label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="记录会审要点、意见及修改要求..."
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">施工计划</label>
              <Input
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                placeholder="施工计划安排"
              />
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

      <div className="space-y-4">
        {reviews.map((review) => {
          const { label, variant } = statusMap[review.status]
          return (
            <Card key={review.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{review.drawingName}</h3>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {review.date}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{review.content}</p>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                    <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">参会人员</p>
                      <p className="text-sm font-medium text-foreground">{review.participants.join("、")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                    <Hammer className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">工作量</p>
                      <p className="text-sm font-medium text-foreground">{review.workload} {review.workloadUnit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">施工计划</p>
                      <p className="text-sm font-medium text-foreground truncate">{review.constructionPlan}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {reviews.length === 0 && !loading && (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无会审纪要</p>
        </div>
      )}
    </div>
  )
}
