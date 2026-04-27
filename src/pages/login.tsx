import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { HardHat, Eye, EyeOff, Loader2 } from "lucide-react"

export function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { addToast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!email.trim()) {
      setError("请输入邮箱")
      return
    }
    if (!password.trim()) {
      setError("请输入密码")
      return
    }
    setIsLoading(true)
    try {
      const success = await login(email.trim(), password)
      if (success) {
        addToast("登录成功", "success")
      } else {
        setError("邮箱或密码错误")
      }
    } catch {
      setError("网络连接失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left: Hero Image (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero-construction.png"
            alt="工程项目管理"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 gradient-primary opacity-80" />
        </div>
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h1 className="text-4xl font-bold text-primary-foreground mb-4 leading-tight">
            工程项目<br />智慧管理平台
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-md">
            图纸发布、施工管理、材料计划、质量检查 — 全流程数字化管理
          </p>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl gradient-primary shadow-primary-glow">
              <HardHat className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">宁夏特纤项目技术管理系统</h2>
              <p className="text-xs text-muted-foreground">V1.0测试</p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-2xl font-semibold text-foreground">欢迎登录</h3>
            <p className="text-sm text-muted-foreground mt-1">请输入您的账号信息</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">邮箱</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                autoFocus
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">密码</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="pr-10"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-normal"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive animate-fade-in">{error}</p>
            )}

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                "登 录"
              )}
            </Button>
          </form>


        </div>
      </div>
    </div>
  )
}
