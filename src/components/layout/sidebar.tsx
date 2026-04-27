import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth"
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Package,
  Wrench,
  ImageIcon,
  CalendarRange,
  AlertTriangle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HardHat,
} from "lucide-react"

const navItems = [
  { path: "/", label: "工作台", icon: LayoutDashboard },
  { path: "/drawings", label: "图纸发布", icon: FileText },
  { path: "/reviews", label: "图审纪要", icon: ClipboardList },
  { path: "/materials", label: "材料计划", icon: Package },
  { path: "/pipeline", label: "三停检照片", icon: Wrench },
  { path: "/images", label: "形象管理", icon: ImageIcon },
  { path: "/milestones", label: "项目计划", icon: CalendarRange },
  { path: "/issues", label: "问题协调", icon: AlertTriangle },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <aside
      className={`hidden md:flex flex-col gradient-sidebar border-r border-sidebar-border transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg gradient-primary shrink-0">
          <HardHat className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-sidebar-foreground font-bold text-base tracking-tight whitespace-nowrap">
            宁夏特纤
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-normal ${
                isActive
                  ? "bg-sidebar-accent text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
              title={item.label}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User & Collapse */}
      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0">
              {user.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{user.department}</p>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-normal"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>退出</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-normal"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </aside>
  )
}
