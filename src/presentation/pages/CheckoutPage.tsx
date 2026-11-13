import { useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MoreVertical,
  RefreshCw,
  ShieldAlert,
  Wallet as WalletIcon,
  WifiOff,
} from "lucide-react"
import type { BlockchainNetwork, User, WalletProvider } from "@/domain/types"
import { useSession } from "@/application/auth/use-auth"
import {
  useAcknowledgeCartChanges,
  useApplyCoupon,
  useCart,
} from "@/application/cart/use-cart"
import { useCreateOrder, useOrders } from "@/application/orders/use-orders"
import { HttpApiError } from "@/infrastructure/http/client"
import { Button } from "@/components/ui/button"
import { CartSummarySkeleton } from "../components/Skeleton"
import { notifyToast } from "@/lib/toast"

const NETWORKS: BlockchainNetwork[] = ["Ethereum", "Polygon", "Solana"]
const PROVIDERS: WalletProvider[] = [
  "WalletConnect",
  "MetaMask",
  "Coinbase Wallet",
]

type WalletConnectionState = "connected" | "disconnected" | "rejected"

export function CheckoutPage() {
  const { data: user, isLoading } = useSession()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CartSummarySkeleton />
      </div>
    )
  }

  if (!user) return null

  return <CheckoutContent key={user.id} user={user} />
}

function CheckoutContent({ user }: { user: User }) {
  const navigate = useNavigate()
  const { data: orders = [] } = useOrders()

  const primaryWallet = useMemo(
    () => user.wallets.find((w) => w.isPrimary) ?? user.wallets[0],
    [user]
  )

  const [selectedWalletId, setSelectedWalletId] = useState<string>(
    primaryWallet?.id ?? ""
  )
  const [selectedNetwork, setSelectedNetwork] = useState<BlockchainNetwork>(
    primaryWallet?.network ?? "Ethereum"
  )
  const [selectedProvider, setSelectedProvider] = useState<WalletProvider>(
    primaryWallet?.provider ?? "MetaMask"
  )

  const [displayName, setDisplayName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [ensName, setEnsName] = useState(
    (user.ensName ?? "").replace(/\.eth$/, "")
  )
  const [referralCode, setReferralCode] = useState("")
  const [collectorNote, setCollectorNote] = useState("")
  const [useSecondaryWallet, setUseSecondaryWallet] = useState(false)

  const [walletStatus, setWalletStatus] =
    useState<WalletConnectionState>("connected")
  const [couponOpen, setCouponOpen] = useState(false)
  const [couponInput, setCouponInput] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [timeoutPendingRecovery, setTimeoutPendingRecovery] = useState(false)

  const submitLockRef = useRef(false)
  const idempotencyKeyRef = useRef<string | null>(null)

  const getOrCreateIdempotencyKey = () => {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = crypto.randomUUID()
    }
    return idempotencyKeyRef.current
  }

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current = crypto.randomUUID()
    setTimeoutPendingRecovery(false)
  }

  const cartQuery = useCart(selectedNetwork)
  const applyCoupon = useApplyCoupon()
  const acknowledgeChanges = useAcknowledgeCartChanges()
  const createOrder = useCreateOrder()

  const activeWallet = useMemo(
    () => user.wallets.find((w) => w.id === selectedWalletId) ?? primaryWallet,
    [user, selectedWalletId, primaryWallet]
  )

  const handleSelectWallet = (walletId: string) => {
    setSelectedWalletId(walletId)
    const found = user.wallets.find((w) => w.id === walletId)
    if (found) {
      setSelectedNetwork(found.network)
      setSelectedProvider(found.provider)
    }
    resetIdempotencyKey()
  }

  const validateCheckoutForm = (): boolean => {
    const errors: Record<string, string> = {}
    if (!displayName.trim()) {
      errors.displayName = "Nome de exibição é obrigatório."
    }
    if (!username.trim()) {
      errors.username = "Nome de usuário é obrigatório."
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Informe um e-mail válido."
    }
    if (!activeWallet) {
      errors.wallet = "Cadastre ou selecione uma carteira válida."
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleConfirmPurchase = (e: React.FormEvent) => {
    e.preventDefault()

    if (submitLockRef.current || createOrder.isPending) {
      return
    }

    const quote = cartQuery.data
    if (!quote || quote.items.length === 0) {
      notifyToast({
        type: "error",
        title: "Carrinho vazio",
        description: "Adicione pelo menos um NFT antes de finalizar.",
      })
      return
    }

    if (quote.requiresReconfirmation) {
      notifyToast({
        type: "error",
        title: "Cotação alterada",
        description:
          "Confirme os novos preços ou disponibilidades antes de enviar o pedido.",
      })
      return
    }

    if (!validateCheckoutForm() || !activeWallet) {
      return
    }

    if (walletStatus === "disconnected") {
      notifyToast({
        type: "error",
        title: "Carteira desconectada",
        description: "Conecte sua carteira antes de assinar a transação.",
      })
      return
    }

    if (walletStatus === "rejected") {
      notifyToast({
        type: "error",
        title: "Assinatura recusada na carteira",
        description:
          "A carteira simulada recusou a solicitação. Altere o estado da carteira para conectada e tente novamente.",
      })
      return
    }

    submitLockRef.current = true
    setTimeoutPendingRecovery(false)

    createOrder.mutate(
      {
        idempotencyKey: getOrCreateIdempotencyKey(),
        walletId: activeWallet.id,
        network: selectedNetwork,
        expectedTotalEth: quote.totalEth,
        collectorNote,
      },
      {
        onSuccess: (order) => {
          submitLockRef.current = false
          void navigate({
            to: "/orders/$orderId",
            params: { orderId: order.id },
          })
        },
        onError: (err) => {
          submitLockRef.current = false
          if (err instanceof HttpApiError) {
            if (err.code === "PRICE_CHANGED" || err.code === "OUT_OF_STOCK") {
              void cartQuery.refetch()
              notifyToast({
                type: "error",
                title: "Cotação atualizada",
                description: err.message,
              })
              return
            }
            if (
              err.code === "SERVICE_UNAVAILABLE" &&
              err.message.includes("tempo limite")
            ) {
              setTimeoutPendingRecovery(true)
              notifyToast({
                type: "info",
                title: "Tempo limite atingido",
                description:
                  "Clique em 'Recuperar / Reenviar pedido' para consultar a mesma chave de idempotência sem duplicar a compra.",
              })
              return
            }
          }
          notifyToast({
            type: "error",
            title: "Falha ao enviar pedido",
            description: err.message,
          })
        },
      }
    )
  }

  const latestPendingOrder = orders.find((o) => o.status === "pending")
  const quote = cartQuery.data

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 md:py-8 lg:px-8">
      {/* Cabeçalho Mobile (< Pagamento com carteira) */}
      <div className="relative mb-6 flex items-center justify-center md:hidden">
        <Link
          to="/cart"
          aria-label="Voltar ao carrinho"
          className="absolute left-0 flex size-10 items-center justify-center rounded-full bg-card text-primary"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <p className="text-base font-bold text-foreground">
          Pagamento com carteira
        </p>
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
        <Link to="/cart" className="hover:text-foreground">
          Carrinho
        </Link>{" "}
        / <span className="text-foreground">Pagamento</span>
      </nav>

      {latestPendingOrder && (
        <div
          role="status"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary bg-primary/10 p-4 text-xs"
        >
          <div>
            <p className="font-bold text-foreground">
              Você possui um pedido em processamento ({latestPendingOrder.id})
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Acompanhe a liquidação em tempo real sem criar uma nova compra.
            </p>
          </div>
          <Button asChild size="sm" className="font-bold">
            <Link
              to="/orders/$orderId"
              params={{ orderId: latestPendingOrder.id }}
            >
              Acompanhar pedido
            </Link>
          </Button>
        </div>
      )}

      {quote?.requiresReconfirmation && (
        <div
          role="alert"
          className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary bg-primary/15 p-4 text-xs"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-bold text-foreground">
                Alteração detectada na cotação antes do envio
              </p>
              <p className="mt-1 text-muted-foreground">
                O preço ou a disponibilidade de um item mudou. Confirme os
                novos valores para habilitar o envio.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              acknowledgeChanges.mutate(undefined, {
                onSuccess: () => resetIdempotencyKey(),
              })
            }}
            className="font-bold"
          >
            Aceitar novos valores
          </Button>
        </div>
      )}

      <form
        onSubmit={handleConfirmPurchase}
        noValidate
        className="grid grid-cols-1 gap-8 lg:grid-cols-12"
      >
        {/* Seção Mobile de Seleção de Carteira Conectada (conforme Captura 4) */}
        <div className="space-y-3 text-xs md:hidden">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground">Carteira conectada</span>
            <Link to="/wallets" className="font-bold text-primary">
              Trocar carteira
            </Link>
          </div>

          <div className="space-y-2.5">
            {user.wallets.map((w) => {
              const isSelected = w.id === activeWallet?.id
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleSelectWallet(w.id)}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left"
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`flex size-4 items-center justify-center rounded-full border ${
                        isSelected ? "border-primary" : "border-primary/40"
                      }`}
                    >
                      {isSelected && (
                        <span className="size-2 rounded-full bg-primary" />
                      )}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{w.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {w.address.slice(0, 6)}...{w.address.slice(-4)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Rede {w.network}
                      </p>
                    </div>
                  </div>
                  <MoreVertical className="size-4 text-primary" />
                </button>
              )
            })}
          </div>
        </div>

        {/* Coluna Esquerda Desktop (Formulário do Colecionador) */}
        <div className="hidden space-y-6 md:block lg:col-span-7">
          <h1 className="text-base font-bold text-foreground">
            Perfil do colecionador
          </h1>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
            <div>
              <label htmlFor="chk-display-name" className="block text-foreground">
                Nome de exibição<span className="text-primary">*</span>
              </label>
              <input
                id="chk-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                aria-invalid={Boolean(formErrors.displayName)}
                className="mt-1.5 h-10 w-full rounded-sm border border-input bg-[#17100B] px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {formErrors.displayName && (
                <p role="alert" className="mt-1 text-[11px] text-red-400">
                  {formErrors.displayName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="chk-username" className="block text-foreground">
                Nome de usuário<span className="text-primary">*</span>
              </label>
              <input
                id="chk-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={Boolean(formErrors.username)}
                className="mt-1.5 h-10 w-full rounded-sm border border-input bg-[#17100B] px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {formErrors.username && (
                <p role="alert" className="mt-1 text-[11px] text-red-400">
                  {formErrors.username}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="chk-network" className="block text-foreground">
                Rede<span className="text-primary">*</span>
              </label>
              <select
                id="chk-network"
                value={selectedNetwork}
                onChange={(e) => {
                  setSelectedNetwork(e.target.value as BlockchainNetwork)
                  resetIdempotencyKey()
                }}
                className="mt-1.5 h-10 w-full rounded-sm border border-input bg-[#17100B] px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {NETWORKS.map((net) => (
                  <option key={net} value={net}>
                    {net}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="chk-wallet-select"
                className="block text-foreground"
              >
                Carteira cadastrada<span className="text-primary">*</span>
              </label>
              <select
                id="chk-wallet-select"
                value={activeWallet?.id ?? ""}
                onChange={(e) => handleSelectWallet(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-sm border border-input bg-[#17100B] px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {user.wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.label} ({w.network}) {w.isPrimary ? "• Principal" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="chk-wallet-address"
                className="block text-foreground"
              >
                Endereço da carteira<span className="text-primary">*</span>
              </label>
              <input
                id="chk-wallet-address"
                type="text"
                readOnly
                value={activeWallet?.address ?? ""}
                placeholder="Endereço 0x da carteira"
                className="mt-1.5 h-10 w-full rounded-sm border border-input bg-secondary/40 px-3 text-muted-foreground"
              />
            </div>

            <div>
              <label htmlFor="chk-referral" className="block text-foreground">
                Código de indicação
              </label>
              <input
                id="chk-referral"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="Opcional"
                className="mt-1.5 h-10 w-full rounded-sm border border-input bg-[#17100B] px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label htmlFor="chk-email" className="block text-foreground">
                E-mail<span className="text-primary">*</span>
              </label>
              <input
                id="chk-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(formErrors.email)}
                className="mt-1.5 h-10 w-full rounded-sm border border-input bg-[#17100B] px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {formErrors.email && (
                <p role="alert" className="mt-1 text-[11px] text-red-400">
                  {formErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="chk-ens" className="block text-foreground">
                Nome ENS
              </label>
              <div className="mt-1.5 flex">
                <span className="inline-flex items-center rounded-l-sm border border-r-0 border-input bg-secondary px-3 text-muted-foreground">
                  .eth
                </span>
                <input
                  id="chk-ens"
                  type="text"
                  value={ensName}
                  onChange={(e) => setEnsName(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-r-sm border border-input bg-[#17100B] px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-sm border border-border bg-card/50 px-4 py-3 text-xs">
            <label
              htmlFor="chk-alt-wallet"
              className="flex cursor-pointer items-center gap-2.5"
            >
              <input
                id="chk-alt-wallet"
                type="checkbox"
                checked={useSecondaryWallet}
                onChange={(e) => {
                  setUseSecondaryWallet(e.target.checked)
                  if (e.target.checked && user.wallets.length > 1) {
                    const secondary = user.wallets.find((w) => !w.isPrimary)
                    if (secondary) handleSelectWallet(secondary.id)
                  } else if (!e.target.checked && primaryWallet) {
                    handleSelectWallet(primaryWallet.id)
                  }
                }}
                className="size-4 accent-primary"
              />
              <span>Usar carteira secundária cadastrada?</span>
            </label>
            <Link to="/wallets" className="text-primary hover:underline">
              Gerenciar carteiras
            </Link>
          </div>

          <div className="text-xs">
            <label htmlFor="chk-note" className="block text-foreground">
              Observação do colecionador (opcional)
            </label>
            <textarea
              id="chk-note"
              rows={3}
              value={collectorNote}
              onChange={(e) => setCollectorNote(e.target.value)}
              placeholder="Instruções ou notas sobre este pedido..."
              className="mt-1.5 w-full rounded-sm border border-input bg-[#17100B] p-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Coluna Direita (Provedores de Carteira e Resumo) */}
        <div className="lg:col-span-5">
          {cartQuery.isLoading ? (
            <CartSummarySkeleton />
          ) : (
            <div className="text-xs md:rounded-sm md:border md:border-border md:bg-card md:p-6">
              <div className="hidden items-center justify-between border-b border-border pb-3 md:flex">
                <h2 className="text-sm font-bold text-foreground">Seus NFTs</h2>
                <span className="text-muted-foreground">Subtotal</span>
              </div>

              {!quote || quote.items.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Nenhum item selecionado para compra.
                  </p>
                  <Button asChild size="sm" className="mt-4">
                    <Link to="/" search={{}}>
                      Voltar ao catálogo
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  {/* Lista Seus NFTs (Desktop) */}
                  <ul className="hidden space-y-2.5 pt-3 md:block">
                    {quote.items.map((item) => (
                      <li
                        key={item.nftId}
                        className="flex items-center justify-between gap-3 rounded-sm bg-[#241911] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={item.nft.imageUrl}
                            alt={item.nft.title}
                            className="size-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="font-bold text-foreground">
                              {item.nft.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              ID do token: #{item.nftId.replace("nft-", "")} (x
                              {item.quantity})
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-primary">
                          {item.itemTotalEth} ETH
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Cupom (Desktop) */}
                  <div className="mt-3 hidden border-t border-border pt-3 md:block">
                    {couponOpen ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Código do cupom"
                          aria-label="Código promocional"
                          className="h-8 flex-1 rounded-sm border border-input bg-[#17100B] px-2.5 text-xs"
                        />
                        <Button
                          type="button"
                          size="xs"
                          onClick={() => {
                            if (!couponInput.trim()) return
                            applyCoupon.mutate(couponInput.trim(), {
                              onSuccess: () => {
                                setCouponOpen(false)
                                setCouponInput("")
                                resetIdempotencyKey()
                              },
                              onError: (err) =>
                                notifyToast({
                                  type: "error",
                                  title: "Cupom inválido",
                                  description: err.message,
                                }),
                            })
                          }}
                        >
                          Aplicar
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCouponOpen(true)}
                        className="text-primary hover:underline"
                      >
                        Tem um código promocional? Aplique aqui
                      </button>
                    )}
                  </div>

                  {/* Resumo de Valores (Desktop) */}
                  <dl className="mt-4 hidden space-y-2.5 border-t border-border pt-4 md:block">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd className="font-bold text-foreground">
                        {quote.subtotalEth} ETH
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Desconto do lançamento
                      </dt>
                      <dd className="text-foreground">
                        (-) {quote.discountEth} ETH
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        Taxa de rede ({selectedNetwork})
                      </dt>
                      <dd className="font-bold text-foreground">
                        {quote.networkFeeEth} ETH
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-border pt-3 text-sm font-bold">
                      <dt className="text-foreground">Total</dt>
                      <dd className="text-primary">{quote.totalEth} ETH</dd>
                    </div>
                  </dl>

                  {/* Carteira e rede (Mobile e Desktop) */}
                  <div className="space-y-3 md:mt-6 md:border-t md:border-border md:pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-foreground">
                        Carteira e rede
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          walletStatus === "connected"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : walletStatus === "rejected"
                              ? "bg-red-500/15 text-red-400"
                              : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {walletStatus === "connected" ? (
                          <>
                            <CheckCircle2 className="size-3" /> Conectada
                          </>
                        ) : walletStatus === "rejected" ? (
                          <>
                            <ShieldAlert className="size-3" /> Recusada
                          </>
                        ) : (
                          <>
                            <WifiOff className="size-3" /> Desconectada
                          </>
                        )}
                      </span>
                    </div>

                    <div
                      role="radiogroup"
                      aria-label="Provedor de carteira"
                      className="space-y-2.5"
                    >
                      {PROVIDERS.map((provider) => {
                        const active = selectedProvider === provider
                        return (
                          <button
                            key={provider}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => {
                              setSelectedProvider(provider)
                              resetIdempotencyKey()
                            }}
                            className={`flex w-full items-center justify-between rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:rounded-sm md:bg-[#17100B] md:px-3.5 md:py-2.5 ${
                              active
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground md:border-border"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex size-8 items-center justify-center rounded-full border border-primary/30 text-xs font-bold text-primary">
                                {provider === "Coinbase Wallet" ? (
                                  <WalletIcon className="size-3.5" />
                                ) : (
                                  provider[0]
                                )}
                              </span>
                              <span className="font-bold text-foreground">
                                {provider}
                              </span>
                            </div>
                            <span
                              className={`flex size-4 items-center justify-center rounded-full border ${
                                active ? "border-primary" : "border-primary/40"
                              }`}
                            >
                              {active && (
                                <span className="size-2 rounded-full bg-primary" />
                              )}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setWalletStatus("connected")}
                        className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                      >
                        Simular Conectada
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalletStatus("disconnected")}
                        className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                      >
                        Simular Desconexão
                      </button>
                      <button
                        type="button"
                        onClick={() => setWalletStatus("rejected")}
                        className="rounded border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
                      >
                        Simular Recusa
                      </button>
                    </div>
                  </div>

                  {/* Total alinhado à direita no mobile conforme Captura 4 */}
                  <div className="mt-6 flex items-center justify-end gap-4 text-sm font-bold md:hidden">
                    <span className="text-foreground">Total:</span>
                    <span className="text-primary">{quote.totalEth} ETH</span>
                  </div>

                  {timeoutPendingRecovery && (
                    <div
                      role="alert"
                      className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] text-amber-200"
                    >
                      O envio anterior sofreu timeout. Clique abaixo para
                      recuperar o pedido com a mesma chave de idempotência.
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                      createOrder.isPending || quote.requiresReconfirmation
                    }
                    className="mt-6 h-12 w-full rounded-full font-bold md:h-10 md:rounded-sm"
                  >
                    {createOrder.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Processando pedido...</span>
                      </>
                    ) : timeoutPendingRecovery ? (
                      <>
                        <RefreshCw className="size-4" />
                        <span>Recuperar / Reenviar pedido</span>
                      </>
                    ) : (
                      <span>Confirmar compra</span>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  )
}