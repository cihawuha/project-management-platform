import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { useToast } from "@/lib/toast"
import { useAuth } from "@/lib/auth"
import { useAsyncData } from "@/hooks/use-async-data"
import * as issuesService from "@/services/issues.service"
import type { IssueRecord } from "@/lib/types"
import { CONSTRUCTION_UNITS } from "@/lib/types"
import {
  AlertTriangle,
  Plus,
  Search,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react"

export function IssuesPage() {
  const { data: fetched, loading, error, refetch } = useAsyncData(
    () => issuesService.fetchIssues(),
    []
  )
  const [issues, setIssues] = useState<IssueRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "设计协调",
    priority: "medium",
    responsible: "",
    constructionUnit: CONSTRUCTION_UNITS[0] as string,
  })
  const { addToast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (fetched) setIssues(fetched)
  }, [fetched])

  const filtered = issues.filter((issue) => {
    const matchSearch =
      issue.title.includes(searchQuery) || issue.description.includes(searchQuery)
    const matchStatus = filterStatus === "all" || issue.status === filterStatus
    return matchSearch && matchStatus
  })

  const priorityMap = {
    high: { label: "紧急", variant: "destructive" as const },
    medium: { label: "一般", variant: "warning" as const },
    low: { label: "低", variant: "secondary" as const },
  }

  const statusMap = {
    open: { label: "待处理", variant: "destructive" as const },
    in_progress: { label: "处理中", variant: "warning" as const },
    resolved: { label: "已解决", variant: "success" as const },
    closed: { label: "已关闭", variant: "secondary" as const },
  }

  async function handleAdd() {
    if (!form.title.trim() || !form.description.trim()) {
      addToast("请填写问题标题和描述", "error")
      return
    }
    setSaving(true)
    try {
      const ni = await issuesService.createIssue({
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority as IssueRecord["priority"],
        status: "open",
        responsible: form.responsible || "待分配",
        reporter: user?.name || "当前用户",
        createDate: new Date().toISOString().split("T")[0],
        constructionUnit: form.constructionUnit,
      })
      setIssues((prev) => [ni, ...prev])
      setForm({ title: "", description: "", category: "设计协调", priority: "medium", responsible: "", constructionUnit: CONSTRUCTION_UNITS[0] })
      setShowAdd(false)
      addToast("问题已记录", "success")
    } catch {
      addToast("创建失败，请重试", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleResolve(id: string) {
    setIssues((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: "resolved" as const, resolveDate: new Date().toISOString().split("T")[0] }
          : i
      )
    )
    try {
      await issuesService.resolveIssue(id)
      addToast("问题已标记为解决", "success")
    } catch {
      addToast("操作失败", "error")
      refetch()
    }
  }

  if (loading && issues.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && issues.length === 0) {
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

  const counts = {
    all: issues.length,
    open: issues.filter((i) => i.status === "open").length,
    in_progress: issues.filter((i) => i.status === "in_progress").length,
    resolved: issues.filter((i) => i.status === "resolved").length,
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">问题协调台账</h1>
          <p className="text-sm text-muted-foreground mt-1">项目问题记录、追踪与协调</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4 mr-2" />
          新增问题
        </Button>
      </div>

      {showAdd && (
        <Card className="animate-scale-in">
          <CardHeader>
            <CardTitle className="text-base">新增问题</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">问题标题</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="简要描述问题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">问题描述</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="详细描述问题情况..."
                rows={3}
              />
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">分类</label>
                <Select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  options={[
                    { value: "设计协调", label: "设计协调" },
                    { value: "材料供应", label: "材料供应" },
                    { value: "质量问题", label: "质量问题" },
                    { value: "现场协调", label: "现场协调" },
                    { value: "人员管理", label: "人员管理" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">优先级</label>
                <Select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  options={[
                    { value: "high", label: "紧急" },
                    { value: "medium", label: "一般" },
                    { value: "low", label: "低" },
                  ]}
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
                <label className="block text-sm font-medium text-foreground mb-1.5">责任人</label>
                <Input
                  value={form.responsible}
                  onChange={(e) => setForm({ ...form, responsible: e.target.value })}
                  placeholder="负责人姓名"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                提交
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {[
            { key: "all", label: "全部" },
            { key: "open", label: "待处理" },
            { key: "in_progress", label: "处理中" },
            { key: "resolved", label: "已解决" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-normal ${
                filterStatus === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
              <span className="ml-1 opacity-60">
                {counts[tab.key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索问题..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filtered.map((issue) => {
          const { label: priorityLabel, variant: priorityVariant } = priorityMap[issue.priority]
          const { label: statusLabel, variant: statusVariant } = statusMap[issue.status]

          return (
            <Card key={issue.id}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">{issue.title}</h3>
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                      <Badge variant={priorityVariant}>{priorityLabel}</Badge>
                      <Badge variant="outline">{issue.category}</Badge>
                      {issue.constructionUnit && (
                        <Badge variant="outline">{issue.constructionUnit}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{issue.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        负责人: {issue.responsible}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        创建: {issue.createDate}
                      </span>
                      {issue.resolveDate && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          解决: {issue.resolveDate}
                        </span>
                      )}
                      <span>报告人: {issue.reporter}</span>
                    </div>
                  </div>
                  {(issue.status === "open" || issue.status === "in_progress") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(issue.id)}
                      className="shrink-0"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1.5" />
                      解决
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">暂无匹配的问题记录</p>
          </div>
        )}
      </div>
    </div>
  )
}
