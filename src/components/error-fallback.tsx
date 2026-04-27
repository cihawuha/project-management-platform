import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"

export function ErrorFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">系统遇到错误</h1>
        <p className="text-sm text-muted-foreground mb-6">
          应用发生了意外错误，请尝试刷新页面。如果问题持续存在，请联系管理员。
        </p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新页面
        </Button>
      </div>
    </div>
  )
}
