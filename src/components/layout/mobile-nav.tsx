import {
  LayoutDashboard,
  FileText,
  Package,
  Wrench,
  MoreHorizontal,
  ClipboardList,
  ImageIcon,
  CalendarRange,
  AlertTriangle,
} from "lucide-react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

const primaryNav = [
  { path: "/", label: "工作台", icon: LayoutDashboard },
  { path: "/drawings", label: "图纸", icon: FileText },
  { path: "/materials", label: "材料", icon: Package },
  { path: "/pipeline", label: "三停检", icon: Wrench },
  { path: "more", label: "更多", icon: MoreHorizontal },
]

const moreNav = [
  { path: "/reviews", label: "图审纪要", icon: ClipboardList },
  { path: "/images", label: "形象管理", icon: ImageIcon },
  { path: "/milestones", label: "项目计划", icon: CalendarRange },
  { path: "/issues", label: "问题协调", icon: AlertTriangle },
]

export function MobileNav() {
  const [showMore, setShowMore] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      {/* More menu overlay */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" />
          <div className="absolute bottom-16 left-0 right-0 bg-card border-t border-border rounded-t-2xl p-4 animate-fade-in">
            <div className="grid grid-cols-4 gap-3">
              {moreNav.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(item.path)
                      setShowMore(false)
                    }}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-normal ${
                      isActive ? "bg-primary-50 text-primary" : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {primaryNav.map((item) => {
            const Icon = item.icon
            const isMore = item.path === "more"
            const isActive = isMore ? showMore : location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => {
                  if (isMore) {
                    setShowMore(!showMore)
                  } else {
                    setShowMore(false)
                    navigate(item.path)
                  }
                }}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-normal ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
