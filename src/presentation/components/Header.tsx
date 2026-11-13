import { useState } from "react"
import { Link, useNavigate, useRouterState, useSearch } from "@tanstack/react-router"
import {
  LogIn,
  Menu,
  Search,
  ShoppingCart,
  User as UserIcon,
  Wallet,
  X,
} from "lucide-react"
import { useSession } from "@/application/auth/use-auth"
import { useCart } from "@/application/cart/use-cart"
import { Button } from "@/components/ui/button"

export function Header() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const routeSearch = useSearch({ strict: false }) as { q?: string }
  const { data: user } = useSession()
  const { data: cart } = useCart()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(Boolean(routeSearch.q))

  const totalItems =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const term = String(formData.get("q") ?? "").trim()

    void navigate({
      to: "/",
      search: {
        q: term || undefined,
      },
    })
    setMobileMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-black backdrop-blur hidden md:block">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          search={{}}
          className="text-sm font-bold tracking-[0.2em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          KURIO
        </Link>

        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-8 text-xs md:flex"
        >
          <Link
            to="/"
            search={{}}
            className={`pb-1.5 transition-colors ${
              pathname === "/"
                ? "border-b-2 border-primary font-bold text-primary"
                : "text-foreground hover:text-primary"
            }`}
          >
            Início
          </Link>
          <a
            href="/#catalogo"
            className={`pb-1.5 transition-colors ${
              pathname.startsWith("/nfts") ||
              pathname === "/cart" ||
              pathname === "/checkout"
                ? "border-b-2 border-primary font-bold text-primary"
                : "text-foreground hover:text-primary"
            }`}
          >
            Mercado
          </a>
          <a
            href="/#catalogo"
            className="pb-1.5 text-foreground transition-colors hover:text-primary"
          >
            Criadores
          </a>
          <a
            href="/#diario-cunhagem"
            className="pb-1.5 text-foreground transition-colors hover:text-primary"
          >
            Aprenda
          </a>
        </nav>

        <div className="flex items-center gap-4">
          {searchOpen ? (
            <form
              key={`desktop-search-${routeSearch.q ?? ""}`}
              onSubmit={handleSearchSubmit}
              role="search"
              aria-label="Buscar NFTs no catálogo"
              className="hidden items-center gap-1.5 sm:flex"
            >
              <input
                name="q"
                type="search"
                autoFocus
                defaultValue={routeSearch.q ?? ""}
                placeholder="Buscar NFTs..."
                aria-label="Buscar NFTs"
                className="h-8 w-44 rounded-sm border border-input bg-[#17100B] px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Fechar busca"
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Abrir busca"
              className="hidden p-1.5 text-foreground transition-colors hover:text-primary sm:inline-flex"
            >
              <Search className="size-4" />
            </button>
          )}

          <Link
            to="/cart"
            aria-label={`Carrinho de compras com ${totalItems} item(ns)`}
            className="relative p-1.5 text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ShoppingCart className="size-4" />
            {totalItems > 0 && (
              <span className="absolute -right-1.5 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {totalItems}
              </span>
            )}
          </Link>

          {user ? (
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                to="/wallets"
                aria-label="Gerenciar carteiras"
                className="p-1.5 text-foreground transition-colors hover:text-primary"
              >
                <Wallet className="size-4" />
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 rounded-sm border border-border bg-card px-2.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="size-5 rounded-full object-cover"
                />
                <span className="max-w-[100px] truncate">{user.name}</span>
              </Link>
            </div>
          ) : (
            <Button
              asChild
              size="sm"
              className="hidden rounded-sm px-4 font-bold sm:inline-flex"
            >
              <Link to="/login" search={{ redirect: undefined }}>
                <LogIn className="size-3.5" />
                <span>Entrar</span>
              </Link>
            </Button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            className="flex size-9 items-center justify-center rounded-sm border border-border bg-card text-foreground md:hidden"
          >
            {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="space-y-4 border-t border-border bg-card px-4 py-4 text-xs md:hidden">
          <form
            key={`mobile-search-${routeSearch.q ?? ""}`}
            onSubmit={handleSearchSubmit}
            role="search"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                type="search"
                defaultValue={routeSearch.q ?? ""}
                placeholder="Buscar NFTs..."
                aria-label="Buscar NFTs"
                className="h-9 w-full rounded-sm border border-input bg-[#17100B] pl-9 pr-3 text-foreground"
              />
            </div>
          </form>

          <nav className="flex flex-col gap-2">
            <Link
              to="/"
              search={{}}
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-sm px-2 py-1.5 font-medium text-foreground hover:bg-muted"
            >
              Início
            </Link>
            <Link
              to="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-sm px-2 py-1.5 font-medium text-foreground hover:bg-muted"
            >
              Carrinho ({totalItems})
            </Link>
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 font-medium text-foreground hover:bg-muted"
                >
                  <UserIcon className="size-3.5" />
                  <span>Meu perfil ({user.name})</span>
                </Link>
                <Link
                  to="/wallets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 font-medium text-foreground hover:bg-muted"
                >
                  <Wallet className="size-3.5" />
                  <span>Minhas carteiras</span>
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                search={{ redirect: undefined }}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-sm bg-primary px-3 py-2 text-center font-bold text-primary-foreground"
              >
                Entrar
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}