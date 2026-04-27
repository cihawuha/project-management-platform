import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/lib/toast"
import { useAsyncData } from "@/hooks/use-async-data"
import * as materialsService from "@/services/materials.service"
import type { MaterialPlan } from "@/lib/types"
import {
  Package, Plus, RefreshCw, FileSymlink, Search, ChevronDown, ChevronUp, Loader2,
} from "lucide-react"

export function MaterialsPage() {
  const { data: fetched, loading, error, refetch } = useAsyncData(
    () => materialsService.fetchMaterialPlans(),
    []
  )
  const [plans, setPlans] = useState<MaterialPlan[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    if (fetched) setPlans(fetched)
  }, [fetched])

  const filtered = plans.filter(
    (p) =>
      p.planNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.drawingName.includes(searchQuery)
  )

  const statusMap = {
    approved: { label: "已批准", variant: "success" as const },
    submitted: { label: "已提交", variant: "info" as const },
    rejected: { label: "已退回", variant: "destructive" as const },
    pending: { label: "待提交", variant: "secondary" as const },
  }

  async function handleApprove(id: string) {
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "approved" as const } : p))
    )
    try {
      await materialsService.updateMaterialPlan(id, { status: "approved" })
      addToast("材料计划已批准", "success")
    } catch {
      addToast("操作失败", "error")
      refetch()
    }
  }

  if (loading && plans.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && plans.length === 0) {
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
          <h1 className="text-2xl font-bold text-foreground">材料计划提报</h1>
          <p className="text-sm text-muted-foreground mt-1">材料计划状态、图纸升版变更及联络单追踪</p>
        </div>
        <Button onClick={() => addToast("新增材料计划功能（示例操作）", "info")}>
          <Plus className="w-4 h-4 mr-2" />
          新增计划
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "总计划数", value: plans.length, variant: "outline" as const },
          { label: "已批准", value: plans.filter((p) => p.status === "approved").length, variant: "success" as const },
          { label: "已提交", value: plans.filter((p) => p.status === "submitted").length, variant: "info" as const },
          { label: "有变更", value: plans.filter((p) => p.hasChange).length, variant: "warning" as const },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-lg border border-border bg-card text-center">
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <Badge variant={s.variant} className="mt-1">{s.label}</Badge>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索计划号或图纸名称..."
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((plan) => {
          const isExpanded = expandedId === plan.id
          const { label: statusLabel, variant: statusVariant } = statusMap[plan.status]

          return (
            <Card key={plan.id} className="overflow-hidden">
              <div
                className="p-4 sm:p-5 cursor-pointer hover:bg-accent/30 transition-normal"
                onClick={() => setExpandedId(isExpanded ? null : plan.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{plan.planNo}</h3>
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                      {plan.constructionUnit && (
                        <Badge variant="outline">{plan.constructionUnit}</Badge>
                      )}
                      {plan.hasVersionUpgrade && (
                        <Badge variant="info"><RefreshCw className="w-3 h-3 mr-1" />图纸升版</Badge>
                      )}
                      {plan.hasChange && <Badge variant="warning">变更</Badge>}
                    </div>
                    <p className="text-sm text-foreground/80 mt-1">{plan.drawingName}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>图纸版本: {plan.drawingVersion}</span>
                      <span>提交人: {plan.submitter}</span>
                      <span>日期: {plan.submitDate}</span>
                      {plan.contactNo && (
                        <span className="flex items-center gap-1">
                          <FileSymlink className="w-3 h-3" />
                          联络单: {plan.contactNo}
                        </span>
                      )}
                      {plan.changeWorkload && <span>变更工作量: {plan.changeWorkload} 工时</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {plan.status === "submitted" && (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleApprove(plan.id) }}
                      >
                        批准
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border bg-secondary/30 p-4 sm:p-5 animate-fade-in">
                  <h4 className="text-sm font-semibold text-foreground mb-3">材料清单</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">材料名称</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">规格型号</th>
                          <th className="text-right py-2 px-3 text-muted-foreground font-medium">数量</th>
                          <th className="text-left py-2 px-3 text-muted-foreground font-medium">单位</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.materials.map((mat, i) => (
                          <tr key={i} className="border-b border-border/50 last:border-0">
                            <td className="py-2 px-3 text-foreground">{mat.name}</td>
                            <td className="py-2 px-3 text-foreground/80">{mat.specification}</td>
                            <td className="py-2 px-3 text-right font-medium text-foreground">{mat.quantity}</td>
                            <td className="py-2 px-3 text-foreground/80">{mat.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">未找到匹配的材料计划</p>
          </div>
        )}
      </div>
    </div>
  )
}
