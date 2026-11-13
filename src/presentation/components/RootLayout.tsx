import { useEffect } from "react"
import { Link, Outlet, useNavigate } from "@tanstack/react-router"
import { initRealtimeSync } from "@/infrastructure/realtime/socket"
import { queryClient } from "@/application/query-client"
import { Button } from "@/components/ui/button"
import { notifyToast } from "@/lib/toast"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { FeedbackToastContainer } from "./FeedbackToast"
import { MockScenarioPanel } from "./MockScenarioPanel"
import { MobileBottomNav } from "./MobileBottomNav"

export function RootLayout() {
  const navigate = useNavigate()

  useEffect(() => {
    const cleanup = initRealtimeSync(queryClient)
    return cleanup
  }, [])

  useEffect(() => {
    const handleSessionExpired = () => {
      queryClient.setQueryData(["session"], null)
      queryClient.removeQueries({ queryKey: ["favorites"] })
      queryClient.removeQueries({ queryKey: ["orders"] })
      notifyToast({
        type: "error",
        title: "Sessão expirada",
        description: "Faça login novamente para continuar sua operação.",
      })
      const currentPath = window.location.pathname + window.location.search
      void navigate({
        to: "/login",
        search: { redirect: currentPath },
      })
    }

    window.addEventListener("kurio:session-expired", handleSessionExpired)
    return () =>
      window.removeEventListener("kurio:session-expired", handleSessionExpired)
  }, [navigate])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-primary-foreground"
      >
        Pular para o conteúdo principal
      </a>
      <Header />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileBottomNav />
      <FeedbackToastContainer />
      <MockScenarioPanel />
    </div>
  )
}

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">
        Erro 404
      </p>
      <h1 className="mt-2 text-2xl font-bold text-foreground">
        Página não encontrada
      </h1>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        O endereço acessado não existe ou foi movido no marketplace Kurio.
      </p>
      <Button asChild className="mt-6 font-bold">
        <Link to="/" search={{}}>
          Voltar ao catálogo
        </Link>
      </Button>
    </div>
  )
}