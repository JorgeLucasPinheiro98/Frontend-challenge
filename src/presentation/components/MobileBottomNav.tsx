import { Link, useRouterState } from "@tanstack/react-router"
import {
  Heart,
  Home,
  ShoppingCart,
  User as UserIcon,
  Wallet,
} from "lucide-react"
import { useCart } from "@/application/cart/use-cart"

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { data: cart } = useCart()

  // Oculta a barra inferior nas telas imersivas (Login, Registo, Detalhes, Carrinho e Checkout)
  const hiddenRoutes = ["/login", "/register", "/cart", "/checkout"]
  if (
    hiddenRoutes.includes(pathname) ||
    pathname.startsWith("/nfts/") ||
    pathname.startsWith("/orders/")
  ) {
    return null
  }

  const totalItems =
    cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  return (
    <nav
      aria-label="Navegação inferior mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[#211710]/95 px-6 pb-4 pt-2.5 backdrop-blur md:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-between">
        <Link
          to="/"
          search={{}}
          aria-label="Início"
          className={`flex flex-col items-center p-2 transition-colors ${
            pathname === "/" ? "text-primary" : "text-foreground/80"
          }`}
        >
          <Home className="size-5" />
        </Link>

        <a
          href="/profile#favoritos"
          aria-label="Lista de interesse"
          className="flex flex-col items-center p-2 text-foreground/80 transition-colors hover:text-primary"
        >
          <Heart className="size-5" />
        </a>

        {/* Botão Central Flutuante de Carteira */}
        <Link
          to="/wallets"
          aria-label="Carteiras"
          className="-mt-8 flex size-14 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Wallet className="size-6" />
        </Link>

        <Link
          to="/cart"
          aria-label={`Carrinho (${totalItems})`}
          className="relative flex flex-col items-center p-2 text-foreground/80 transition-colors hover:text-primary"
        >
          <ShoppingCart className="size-5" />
          {totalItems > 0 && (
            <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {totalItems}
            </span>
          )}
        </Link>

        <Link
          to="/profile"
          aria-label="Meu perfil"
          className={`flex flex-col items-center p-2 transition-colors ${
            pathname === "/profile" ? "text-primary" : "text-foreground/80"
          }`}
        >
          <UserIcon className="size-5" />
        </Link>
      </div>
    </nav>
  )
}