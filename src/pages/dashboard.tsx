import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText, ClipboardList, Package, Wrench, AlertTriangle,
  CalendarRange, TrendingUp, Users, Loader2, RefreshCw,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAsyncData } from "@/hooks/use-async-data"
import * as drawingsService from "@/services/drawings.service"
import * as issuesService from "@/services/issues.service"
import * as milestonesService from "@/services/milestones.service"
import * as materialsService from "@/services/materials.service"
import type { Drawing, IssueRecord, Milestone, MaterialPlan } from "@/lib/types"

interface DashboardData {
  drawings: Drawing[]
  issues: IssueRecord[]
  milestones: Milestone[]
  materials: MaterialPlan[]
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [drawings, issues, milestones, materials] = await Promise.all([
    drawingsService.fetchDrawings(),
    issuesService.fetchIssues(),
    milestonesService.fetchMilestones(),
    materialsService.fetchMaterialPlans(),
  ])
  return { drawings, issues, milestones, materials }
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useAsyncData(fetchDashboardData, [])

  const drawings = data?.drawings || []
  const issues = data?.issues || []
  const milestones = data?.milestones || []
  const materials = data?.materials || []

  const publishedDrawings = drawings.filter((d) => d.status === "published").length
  const openIssues = issues.filter((i) => i.status === "open" || i.status === "in_progress").length
  const activeMilestones = milestones.filter((m) => m.status === "in_progress").length
  const pendingMaterials = materials.filter((m) => m.status === "pending" || m.status === "submitted").length

  const statCards = [
    { label: "已发布图纸", value: publishedDrawings, total: drawings.length, icon: FileText, page: "/drawings", color: "text-primary" },
    { label: "待处理问题", value: openIssues, total: issues.length, icon: AlertTriangle, page: "/issues", color: "text-warning" },
    { label: "进行中里程碑", value: activeMilestones, total: milestones.length, icon: CalendarRange, page: "/milestones", color: "text-success" },
    { label: "材料计划", value: pendingMaterials, total: materials.length, icon: Package, page: "/materials", color: "text-info" },
  ]

  const recentDrawings = drawings.slice(0, 3)
  const urgentIssues = issues.filter((i) => i.priority === "high").slice(0, 3)

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && !data) {
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">工作台</h1>
        <p className="text-sm text-muted-foreground mt-1">项目概览与快速导航</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="cursor-pointer hover:shadow-card-hover transition-normal"
              onClick={() => navigate(stat.page)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.total} 总计</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { path: "/drawings", label: "图纸发布", icon: FileText },
          { path: "/reviews", label: "图审纪要", icon: ClipboardList },
          { path: "/pipeline", label: "三停检照片", icon: Wrench },
          { path: "/images", label: "形象管理", icon: Users },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent/50 hover:shadow-card transition-normal text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Drawings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">最近图纸</CardTitle>
              <button
                onClick={() => navigate("/drawings")}
                className="text-xs text-primary hover:underline font-medium"
              >
                查看全部
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDrawings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">暂无图纸</p>
              )}
              {recentDrawings.map((drawing) => (
                <div
                  key={drawing.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{drawing.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {drawing.code} · {drawing.version} · {drawing.uploadDate}
                    </p>
                  </div>
                  <Badge
                    variant={
                      drawing.status === "published" ? "success" :
                      drawing.status === "reviewing" ? "warning" : "secondary"
                    }
                  >
                    {drawing.status === "published" ? "已发布" :
                     drawing.status === "reviewing" ? "审核中" : "草稿"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Urgent Issues */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-destructive" />
                紧急问题
              </CardTitle>
              <button
                onClick={() => navigate("/issues")}
                className="text-xs text-primary hover:underline font-medium"
              >
                查看全部
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {urgentIssues.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">暂无紧急问题</p>
              )}
              {urgentIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{issue.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {issue.category} · 负责人: {issue.responsible}
                    </p>
                  </div>
                  <Badge variant={issue.status === "open" ? "destructive" : "warning"}>
                    {issue.status === "open" ? "待处理" : "处理中"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Milestones Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">里程碑进度</CardTitle>
            <button
              onClick={() => navigate("/milestones")}
              className="text-xs text-primary hover:underline font-medium"
            >
              查看全部
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {milestones.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">暂无里程碑</p>
            )}
            {milestones.slice(0, 4).map((ms) => (
              <div key={ms.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{ms.name}</span>
                  <span className="text-xs text-muted-foreground">{ms.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ms.progress === 100
                        ? "bg-success"
                        : ms.status === "delayed"
                        ? "bg-destructive"
                        : "gradient-primary"
                    }`}
                    style={{ width: `${ms.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ms.startDate} — {ms.endDate} · {ms.responsible}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
