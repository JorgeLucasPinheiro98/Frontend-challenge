import { Link, useNavigate } from "@tanstack/react-router"
import {
  Download,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Receipt,
  TrendingUp,
  User as UserIcon,
} from "lucide-react"
import { useLogout } from "@/application/auth/use-auth"
import { notifyToast } from "@/lib/toast"

interface AccountSidebarProps {
  activeSection: "profile" | "wallets"
}

export function AccountSidebar({ activeSection }: AccountSidebarProps) {
  const navigate = useNavigate()
  const logout = useLogout()

  const handleOutOfScope = (label: string) => {
    notifyToast({
      type: "info",
      title: `${label} fora do escopo`,
      description: "Esta seção auxiliar não faz parte do escopo funcional.",
    })
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        notifyToast({
          type: "info",
          title: "Sessão encerrada",
          description: "Dados privados limpos com sucesso.",
        })
        void navigate({ to: "/" })
      },
    })
  }

  return (
    <aside
      aria-label="Menu da conta do colecionador"
      className="rounded-sm bg-card p-5 text-xs"
    >
      <p className="mb-4 px-3 text-sm font-bold text-foreground">Meu perfil</p>
      <nav className="flex flex-row gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        <Link
          to="/profile"
          className={`flex shrink-0 items-center gap-2.5 px-3 py-2.5 transition-colors ${
            activeSection === "profile"
              ? "border-l-2 border-primary font-bold text-primary"
              : "text-foreground/80 hover:text-primary"
          }`}
        >
          <UserIcon className="size-4 text-primary" />
          <span>Dados do perfil</span>
        </Link>

        <Link
          to="/wallets"
          className={`flex shrink-0 items-center gap-2.5 px-3 py-2.5 transition-colors ${
            activeSection === "wallets"
              ? "border-l-2 border-primary font-bold text-primary"
              : "text-foreground/80 hover:text-primary"
          }`}
        >
          <MapPin className="size-4 text-primary" />
          <span>Carteiras</span>
        </Link>

        <Link
          to="/profile"
          hash="pedidos"
          className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Receipt className="size-4" />
          <span>Meus pedidos</span>
        </Link>

        <Link
          to="/profile"
          hash="favoritos"
          className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Heart className="size-4" />
          <span>Lista de interesse</span>
        </Link>

        <button
          type="button"
          onClick={() => handleOutOfScope("Ofertas")}
          className="hidden items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
        >
          <TrendingUp className="size-4" />
          <span>Ofertas</span>
        </button>

        <button
          type="button"
          onClick={() => handleOutOfScope("Arquivos baixados")}
          className="hidden items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
        >
          <Download className="size-4" />
          <span>Arquivos baixados</span>
        </button>

        <button
          type="button"
          onClick={() => handleOutOfScope("Suporte")}
          className="hidden items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-muted-foreground hover:bg-muted hover:text-foreground lg:flex"
        >
          <HelpCircle className="size-4" />
          <span>Suporte</span>
        </button>

        <div className="hidden border-t border-border pt-2 lg:block">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-primary hover:bg-muted"
          >
            <LogOut className="size-4" />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </aside>
  )
}