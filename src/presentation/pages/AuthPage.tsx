import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { Eye, EyeOff, KeyRound, X } from "lucide-react"
import { useLogin, useRegister } from "@/application/auth/use-auth"
import { HttpApiError } from "@/infrastructure/http/client"
import { Button } from "@/components/ui/button"
import { notifyToast } from "@/lib/toast"

interface AuthPageProps {
  initialMode: "login" | "register"
}

export function AuthPage({ initialMode }: AuthPageProps) {
  const navigate = useNavigate()
  const search = useSearch({ strict: false }) as { redirect?: string }
  const redirectTarget = search.redirect || "/"

  const [mode, setMode] = useState<"login" | "register">(initialMode)
  const [showPassword, setShowPassword] = useState(false)

  // Campos Login
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)

  // Campos Cadastro
  const [regName, setRegName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regConfirmPassword, setRegConfirmPassword] = useState("")
  const [regErrors, setRegErrors] = useState<Record<string, string>>({})

  const loginMutation = useLogin()
  const registerMutation = useRegister()

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError(null)
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Preencha e-mail e senha para entrar.")
      return
    }
    loginMutation.mutate(
      { email: loginEmail.trim(), password: loginPassword },
      {
        onSuccess: ({ user }) => {
          notifyToast({
            type: "success",
            title: `Bem-vindo, ${user.name}!`,
            description: "Sessão autenticada e carrinho sincronizado.",
          })
          void navigate({ to: redirectTarget })
        },
        onError: (err) => {
          setLoginError(err.message)
        },
      }
    )
  }

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (regName.trim().length < 2) {
      nextErrors.name = "Informe seu nome de usuário ou exibição."
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      nextErrors.email = "Informe um e-mail válido."
    }
    if (regPassword.length < 6) {
      nextErrors.password = "A senha deve ter no mínimo 6 caracteres."
    }
    if (regPassword !== regConfirmPassword) {
      nextErrors.confirmPassword = "As senhas não coincidem."
    }

    if (Object.keys(nextErrors).length > 0) {
      setRegErrors(nextErrors)
      return
    }

    setRegErrors({})
    registerMutation.mutate(
      {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
      },
      {
        onSuccess: ({ user }) => {
          notifyToast({
            type: "success",
            title: "Conta criada com sucesso!",
            description: `Perfil ${user.name} ativado.`,
          })
          void navigate({ to: redirectTarget })
        },
        onError: (err) => {
          if (err instanceof HttpApiError && err.fieldErrors) {
            setRegErrors(err.fieldErrors)
          } else {
            setRegErrors({ form: err.message })
          }
        },
      }
    )
  }

  const handleSocialOutOfScope = (provider: string) => {
    notifyToast({
      type: "info",
      title: `Login com ${provider} fora do escopo`,
      description: "Utilize o formulário de e-mail e senha simulados.",
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#140E0A] md:bg-black/80 md:px-4 md:py-8 md:backdrop-blur-xs">
      <div
        role="dialog"
        aria-labelledby="auth-dialog-title"
        className="relative flex min-h-screen w-full flex-col justify-center bg-[#140E0A] px-6 py-10 md:min-h-0 md:max-w-[420px] md:rounded-sm md:border md:border-border md:bg-card md:p-8 md:shadow-2xl"
      >
        <Link
          to="/"
          search={{}}
          aria-label="Fechar autenticação"
          className="absolute right-5 top-5 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </Link>

        {/* Logotipo KURIO visível no mobile conforme Figma */}
        <p className="mb-8 text-center text-2xl font-bold tracking-[0.25em] text-foreground md:hidden">
          KURIO
        </p>

        {/* Título mobile dedicado */}
        <p className="mb-6 text-center text-base font-bold text-foreground md:hidden">
          {mode === "login" ? "Entrar" : "Criar perfil de colecionador"}
        </p>

        {/* Abas desktop Entrar | Criar conta */}
        <div
          role="tablist"
          className="hidden items-center justify-center gap-4 text-base font-bold md:flex"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            onClick={() => setMode("login")}
            className={
              mode === "login"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Entrar
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "register"}
            onClick={() => setMode("register")}
            className={
              mode === "register"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Criar conta
          </button>
        </div>

        <h1 id="auth-dialog-title" className="sr-only">
          {mode === "login" ? "Entrar na Kurio" : "Criar conta na Kurio"}
        </h1>

        {mode === "login" ? (
          <form
            onSubmit={handleLoginSubmit}
            noValidate
            className="space-y-4 text-xs md:mt-4"
          >
            <p className="hidden text-center leading-relaxed text-muted-foreground md:block">
              Entre para gerenciar sua carteira, coleção e perfil de
              colecionador.
            </p>

            {loginError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/15 p-3 text-red-300"
              >
                {loginError}
              </div>
            )}

            <div>
              <label htmlFor="login-email" className="sr-only">
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="contato@email.com"
                className="h-12 w-full rounded-xl border border-input bg-[#17100B] px-3.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:rounded-sm md:px-3"
              />
            </div>

            <div className="relative">
              <label htmlFor="login-password" className="sr-only">
                Senha
              </label>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Senha"
                className="h-12 w-full rounded-xl border border-input bg-[#17100B] px-3.5 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:rounded-sm md:px-3"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail("lucas@kurio.art")
                  setLoginPassword("Kurio@2026")
                }}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <KeyRound className="size-3" />
                <span>Usar conta demo (Lucas)</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  notifyToast({
                    type: "info",
                    title: "Recuperação ilustrativa",
                    description: "Use a senha padrão Kurio@2026.",
                  })
                }
                className="text-primary hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loginMutation.isPending}
              className="h-12 w-full rounded-full font-bold md:h-10 md:rounded-sm"
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={handleRegisterSubmit}
            noValidate
            className="space-y-3.5 text-xs md:mt-4"
          >
            <p className="hidden text-center leading-relaxed text-muted-foreground md:block">
              Crie seu perfil de colecionador e conecte uma carteira quando
              quiser.
            </p>

            {regErrors.form && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/15 p-3 text-red-300"
              >
                {regErrors.form}
              </div>
            )}

            <div>
              <label htmlFor="reg-name" className="sr-only">
                Nome de usuário
              </label>
              <input
                id="reg-name"
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Nome de usuário"
                aria-invalid={Boolean(regErrors.name)}
                className="h-12 w-full rounded-xl border border-input bg-[#17100B] px-3.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:rounded-sm md:px-3"
              />
              {regErrors.name && (
                <p role="alert" className="mt-1 text-[11px] text-red-400">
                  {regErrors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reg-email" className="sr-only">
                Digite seu e-mail
              </label>
              <input
                id="reg-email"
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                aria-invalid={Boolean(regErrors.email)}
                className="h-12 w-full rounded-xl border border-input bg-[#17100B] px-3.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:rounded-sm md:px-3"
              />
              {regErrors.email && (
                <p role="alert" className="mt-1 text-[11px] text-red-400">
                  {regErrors.email}
                </p>
              )}
            </div>

            <div className="relative">
              <label htmlFor="reg-password" className="sr-only">
                Senha
              </label>
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Senha"
                aria-invalid={Boolean(regErrors.password)}
                className="h-12 w-full rounded-xl border border-input bg-[#17100B] px-3.5 pr-10 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:rounded-sm md:px-3"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
              {regErrors.password && (
                <p role="alert" className="mt-1 text-[11px] text-red-400">
                  {regErrors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reg-confirm-password" className="sr-only">
                Confirmar senha
              </label>
              <input
                id="reg-confirm-password"
                type={showPassword ? "text" : "password"}
                value={regConfirmPassword}
                onChange={(e) => setRegConfirmPassword(e.target.value)}
                placeholder="Confirmar senha"
                aria-invalid={Boolean(regErrors.confirmPassword)}
                className="h-12 w-full rounded-xl border border-input bg-[#17100B] px-3.5 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-10 md:rounded-sm md:px-3"
              />
              {regErrors.confirmPassword && (
                <p role="alert" className="mt-1 text-[11px] text-red-400">
                  {regErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={registerMutation.isPending}
              className="h-12 w-full rounded-full font-bold md:h-10 md:rounded-sm"
            >
              {registerMutation.isPending ? "Criando conta..." : "Criar perfil"}
            </Button>
          </form>
        )}

        {/* Separador e botões sociais */}
        <div className="mt-6 space-y-2.5 border-t border-border pt-5 text-xs">
          <p className="text-center text-[11px] text-muted-foreground">
            Ou continue com
          </p>
          <button
            type="button"
            onClick={() => handleSocialOutOfScope("Google")}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-[#17100B] text-xs text-foreground transition-colors hover:border-primary/60 md:h-10 md:rounded-sm"
          >
            <span className="font-sans text-sm font-bold text-[#EA4335]">G</span>
            <span>Continuar com Google</span>
          </button>
          <button
            type="button"
            onClick={() => handleSocialOutOfScope("Facebook")}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-[#17100B] text-xs text-foreground transition-colors hover:border-primary/60 md:h-10 md:rounded-sm"
          >
            <span className="font-sans text-sm font-bold text-[#1877F2]">f</span>
            <span>Continuar com Facebook</span>
          </button>
        </div>

        {/* Alternador inferior no mobile conforme Figma */}
        <p className="mt-6 text-center text-xs text-muted-foreground md:hidden">
          {mode === "login" ? (
            <>
              Novo na Kurio?{" "}
              <button
                type="button"
                onClick={() => setMode("register")}
                className="font-bold text-foreground hover:text-primary"
              >
                Crie uma conta
              </button>
            </>
          ) : (
            <>
              Já tem uma conta?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="font-bold text-foreground hover:text-primary"
              >
                Entre
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export function LoginPage() {
  return <AuthPage initialMode="login" />
}

export function RegisterPage() {
  return <AuthPage initialMode="register" />
}