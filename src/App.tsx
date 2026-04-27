import { useAuth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/sidebar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { LoginPage } from "@/pages/login"
import { DashboardPage } from "@/pages/dashboard"
import { DrawingsPage } from "@/pages/drawings"
import { ReviewsPage } from "@/pages/reviews"
import { MaterialsPage } from "@/pages/materials"
import { PipelinePage } from "@/pages/pipeline"
import { ImagesPage } from "@/pages/images"
import { MilestonesPage } from "@/pages/milestones"
import { IssuesPage } from "@/pages/issues"
import { Bell, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/toast"
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom"

const pageTitleMap: Record<string, string> = {
  "/": "工作台",
  "/drawings": "图纸发布",
  "/reviews": "图审纪要",
  "/materials": "材料计划",
  "/pipeline": "三停检照片",
  "/images": "形象管理",
  "/milestones": "项目计划",
  "/issues": "问题协调",
}

function AppLayout() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const location = useLocation()

  function handleExport() {
    const headers = "序号,模块,数据项,状态,日期\n"
    const rows = "1,图纸发布,主装置区管道布置图,已发布,2025-03-15\n2,材料计划,MP-2025-001,已批准,2025-03-18\n"
    const csvContent = headers + rows
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `项目数据导出_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    addToast("数据导出成功", "success")
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-foreground md:text-base">
              {pageTitleMap[location.pathname] || "工作台"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              className="hidden sm:flex"
            >
              <Download className="w-4 h-4 mr-1.5" />
              导出
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => addToast("暂无新通知", "info")}
            >
              <Bell className="w-4 h-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-border">
              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user?.name[0]}
              </div>
              <span className="text-sm font-medium text-foreground">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}

function App() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/drawings" element={<DrawingsPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/milestones" element={<MilestonesPage />} />
        <Route path="/issues" element={<IssuesPage />} />
      </Route>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
