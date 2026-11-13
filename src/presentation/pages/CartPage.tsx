import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  ChevronLeft,
  Minus,
  Plus,
  Trash2,
} from "lucide-react"
import {
  useAcknowledgeCartChanges,
  useApplyCoupon,
  useCart,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartItem,
} from "@/application/cart/use-cart"
import { useNFTs } from "@/application/nfts/use-nfts"
import { useSession } from "@/application/auth/use-auth"
import { Button } from "@/components/ui/button"
import { CartSummarySkeleton, Skeleton } from "../components/Skeleton"
import { notifyToast } from "@/lib/toast"

export function CartPage() {
  const navigate = useNavigate()
  const { data: user } = useSession()
  const cartQuery = useCart("Ethereum")
  const suggestionsQuery = useNFTs({ limit: 5 })

  const updateItem = useUpdateCartItem()
  const removeItem = useRemoveCartItem()
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()
  const acknowledgeChanges = useAcknowledgeCartChanges()

  const [couponInput, setCouponInput] = useState("")
  const [couponError, setCouponError] = useState<string | null>(null)

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault()
    setCouponError(null)
    if (!couponInput.trim()) {
      setCouponError("Digite um código promocional.")
      return
    }
    applyCoupon.mutate(couponInput.trim(), {
      onSuccess: () => {
        setCouponInput("")
        notifyToast({
          type: "success",
          title: "Cupom aplicado",
          description: "Desconto recalculado no resumo da carteira.",
        })
      },
      onError: (err) => {
        setCouponError(err.message)
      },
    })
  }

  const handleProceedToCheckout = () => {
    if (cartQuery.data?.requiresReconfirmation) {
      notifyToast({
        type: "error",
        title: "Cotação desatualizada",
        description:
          "Aceite a atualização de preço ou disponibilidade antes de prosseguir.",
      })
      return
    }
    if (!user) {
      void navigate({
        to: "/login",
        search: { redirect: "/checkout" },
      })
      return
    }
    void navigate({ to: "/checkout" })
  }

  const quote = cartQuery.data

  return (
    <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6 md:py-8 lg:px-8">
      {/* Cabeçalho Mobile (< Carrinho de NFTs) */}
      <div className="relative mb-6 flex items-center justify-center md:hidden">
        <Link
          to="/"
          search={{}}
          aria-label="Voltar"
          className="absolute left-0 flex size-10 items-center justify-center rounded-full bg-card text-primary"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-base font-bold text-foreground">Carrinho de NFTs</h1>
      </div>

      {/* Breadcrumb Desktop */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 hidden text-xs text-muted-foreground md:block"
      >
        <Link to="/" search={{}} className="hover:text-foreground">
          Início
        </Link>{" "}
        /{" "}
        <Link to="/" search={{}} className="hover:text-foreground">
          Mercado
        </Link>{" "}
        / <span className="text-foreground">Carrinho</span>
      </nav>

      {/* Banner de alteração em tempo real */}
      {quote?.requiresReconfirmation && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary bg-primary/10 p-4 text-xs"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-bold text-foreground">
                Preço ou disponibilidade atualizados em tempo real
              </p>
              <p className="mt-1 text-muted-foreground">
                Um ou mais itens do seu carrinho sofreram alteração no mercado.
                Revise os novos valores antes de finalizar.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => acknowledgeChanges.mutate()}
            className="font-bold"
          >
            Confirmar novos valores
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Lista de Itens */}
        <div className="lg:col-span-8">
          {cartQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : !quote || quote.items.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center">
              <p className="text-base font-bold text-foreground">
                Seu carrinho está vazio
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Explore as coleções verificadas da Kurio para adicionar obras
                digitais.
              </p>
              <Button asChild className="mt-6 rounded-full font-bold md:rounded-sm">
                <Link to="/" search={{}}>
                  Explorar catálogo
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Cards Horizontais Mobile (conforme Captura 3) */}
              <div className="space-y-3 md:hidden">
                {quote.items.map((item) => (
                  <div
                    key={item.nftId}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <img
                        src={item.nft.imageUrl}
                        alt={item.nft.title}
                        className="size-16 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0">
                        <Link
                          to="/nfts/$nftId"
                          params={{ nftId: item.nftId }}
                          className="block truncate text-xs font-bold text-foreground"
                        >
                          {item.nft.title}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Edição: 1/50
                        </p>
                        <p className="mt-1 text-xs font-bold text-primary">
                          {item.itemTotalEth} ETH
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          updateItem.mutate({
                            nftId: item.nftId,
                            quantity: item.quantity - 1,
                          })
                        }
                        aria-label={`Diminuir mobile ${item.nft.title}`}
                        className="flex size-6 items-center justify-center rounded-full bg-[#2C1F16] text-primary"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="min-w-[1rem] text-center font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.nft.availableQuantity}
                        onClick={() =>
                          updateItem.mutate({
                            nftId: item.nftId,
                            quantity: item.quantity + 1,
                          })
                        }
                        aria-label={`Aumentar mobile ${item.nft.title}`}
                        className="flex size-6 items-center justify-center rounded-full bg-[#2C1F16] text-foreground disabled:opacity-40"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tabela Desktop */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3.5 font-bold">NFTs</th>
                      <th className="px-4 py-3.5 font-bold">Preço</th>
                      <th className="px-4 py-3.5 font-bold">Edições</th>
                      <th className="px-4 py-3.5 font-bold">Total</th>
                      <th className="px-4 py-3.5 text-right">
                        <span className="sr-only">Remover</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quote.items.map((item) => (
                      <tr key={item.nftId} className="bg-card">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={item.nft.imageUrl}
                              alt={item.nft.title}
                              className="size-14 shrink-0 rounded-lg object-cover"
                            />
                            <div>
                              <Link
                                to="/nfts/$nftId"
                                params={{ nftId: item.nftId }}
                                className="font-bold text-foreground hover:text-primary"
                              >
                                {item.nft.title}
                              </Link>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                ID do token: #{item.nftId.replace("nft-", "")}
                              </p>
                              {item.priceChanged && (
                                <span className="mt-1 inline-block rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                                  Preço atualizado
                                </span>
                              )}
                              {item.stockExceeded && (
                                <span className="mt-1 inline-block rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                                  Disponível: {item.nft.availableQuantity} un.
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-foreground">
                          {item.unitPriceEth} ETH
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateItem.mutate({
                                  nftId: item.nftId,
                                  quantity: item.quantity - 1,
                                })
                              }
                              aria-label={`Diminuir quantidade de ${item.nft.title}`}
                              className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="min-w-[1.25rem] text-center font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={
                                item.quantity >= item.nft.availableQuantity
                              }
                              onClick={() =>
                                updateItem.mutate(
                                  {
                                    nftId: item.nftId,
                                    quantity: item.quantity + 1,
                                  },
                                  {
                                    onError: (err) =>
                                      notifyToast({
                                        type: "error",
                                        title: "Limite de estoque",
                                        description: err.message,
                                      }),
                                  }
                                )
                              }
                              aria-label={`Aumentar quantidade de ${item.nft.title}`}
                              className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-bold text-primary">
                          {item.itemTotalEth} ETH
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => removeItem.mutate(item.nftId)}
                            aria-label={`Remover ${item.nft.title} do carrinho`}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Resumo da Carteira */}
        <div className="lg:col-span-4">
          {cartQuery.isLoading ? (
            <CartSummarySkeleton />
          ) : (
            <aside
              aria-label="Resumo da carteira"
              className="rounded-3xl bg-[#211710] p-6 text-xs md:rounded-sm md:border md:border-border md:bg-card"
            >
              <h2 className="hidden text-sm font-bold text-foreground md:block">
                Resumo da carteira
              </h2>

              {/* Cupom promocional (embutido no mobile, lado a lado no desktop) */}
              <form onSubmit={handleApplyCoupon} className="md:mt-4">
                <label
                  htmlFor="cart-coupon-input"
                  className="sr-only md:not-sr-only md:block md:text-muted-foreground"
                >
                  Código promocional
                </label>
                <div className="relative flex items-center md:mt-1.5 md:gap-2">
                  <input
                    id="cart-coupon-input"
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Digite o código promocional..."
                    aria-invalid={Boolean(couponError)}
                    aria-describedby={
                      couponError ? "cart-coupon-error" : undefined
                    }
                    className="h-12 w-full rounded-full border border-input bg-[#17100B] pl-4 pr-24 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:flex-1 md:rounded-sm md:px-3"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={applyCoupon.isPending}
                    className="absolute right-1.5 h-9 rounded-full px-5 font-bold md:static md:rounded-sm md:px-3"
                  >
                    Aplicar
                  </Button>
                </div>
                {couponError && (
                  <p
                    id="cart-coupon-error"
                    role="alert"
                    className="mt-1.5 text-[11px] text-red-400"
                  >
                    {couponError}
                  </p>
                )}
                {quote?.couponCode && (
                  <div className="mt-2 flex items-center justify-between rounded bg-primary/15 px-2.5 py-1.5 text-[11px] text-primary">
                    <span>
                      Cupom ativo: <strong>{quote.couponCode}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCoupon.mutate()}
                      className="underline hover:text-foreground"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </form>

              {/* Totais */}
              <dl className="mt-6 space-y-3 md:border-t md:border-border md:pt-4">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-bold text-foreground">
                    {quote?.subtotalEth ?? "0.00"} ETH
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Desconto do lançamento
                  </dt>
                  <dd className="text-foreground">
                    (-) {quote?.discountEth ?? "0.00"} ETH
                  </dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="text-muted-foreground">Taxa de rede</dt>
                  <dd className="text-right">
                    <span className="block font-bold text-foreground">
                      {quote?.networkFeeEth ?? "0.00"} ETH
                    </span>
                    <span className="text-[10px] text-primary">
                      Taxa estimada
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between pt-3 text-sm font-bold md:border-t md:border-border">
                  <dt className="text-foreground">Total</dt>
                  <dd className="text-primary">
                    {quote?.totalEth ?? "0.00"} ETH
                  </dd>
                </div>
              </dl>

              <Button
                type="button"
                size="lg"
                disabled={!quote || quote.items.length === 0}
                onClick={handleProceedToCheckout}
                className="mt-6 h-12 w-full rounded-full font-bold md:h-10 md:rounded-sm"
              >
                Conectar e finalizar
              </Button>

              <div className="mt-3 hidden text-center md:block">
                <Link
                  to="/"
                  search={{}}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Continuar explorando
                </Link>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Colecionadores também viram (Desktop) */}
      <section className="mt-16 hidden md:block">
        <h2 className="mb-6 text-sm font-bold text-foreground">
          Colecionadores também viram
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {suggestionsQuery.data?.data.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              to="/nfts/$nftId"
              params={{ nftId: item.id }}
              className="group transition-colors"
            >
              <img
                src={item.imageUrl}
                alt={item.title}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <p className="mt-2.5 truncate text-xs font-bold text-foreground group-hover:text-primary">
                {item.title}
              </p>
              <p className="mt-0.5 text-xs font-bold text-primary">
                {item.priceEth} ETH
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}