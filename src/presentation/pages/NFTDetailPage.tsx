import { useState } from "react"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import {
  ChevronLeft,
  Heart,
  Minus,
  Plus,
  RefreshCw,
  Share2,
  ShoppingCart,
  Star,
} from "lucide-react"
import {
  useFavorites,
  useNFTDetail,
  useNFTs,
  useToggleFavorite,
} from "@/application/nfts/use-nfts"
import { useAddToCart } from "@/application/cart/use-cart"
import { useSession } from "@/application/auth/use-auth"
import { Button } from "@/components/ui/button"
import { NFTDetailSkeleton } from "../components/Skeleton"
import { notifyToast } from "@/lib/toast"

const EDITION_TIERS = ["1/1", "1/10", "1/50", "ABERTA"] as const

export function NFTDetailPage() {
  const { nftId } = useParams({ from: "/nfts/$nftId" })
  const navigate = useNavigate()

  const { data: user } = useSession()
  const nftQuery = useNFTDetail(nftId)
  const relatedQuery = useNFTs({ limit: 5 })
  const { data: favorites = [] } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()

  const [selectedImageIdx, setSelectedImageIdx] = useState(0)
  const [selectedEdition, setSelectedEdition] = useState<string>("1/50")
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details")

  if (nftQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <NFTDetailSkeleton />
      </div>
    )
  }

  if (nftQuery.isError || !nftQuery.data) {
    const isNotFound =
      nftQuery.error && "status" in nftQuery.error && nftQuery.error.status === 404

    return (
      <div
        role="alert"
        className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-24 text-center"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          {isNotFound ? "NFT não encontrado" : "Falha ao carregar"}
        </p>
        <h1 className="mt-2 text-xl font-bold text-foreground">
          {isNotFound
            ? "Esta obra não existe ou foi removida"
            : "Não foi possível carregar os detalhes deste NFT"}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground">
          {nftQuery.error?.message}
        </p>
        <div className="mt-6 flex gap-3">
          {!isNotFound && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void nftQuery.refetch()}
            >
              <RefreshCw className="size-4" />
              <span>Tentar novamente</span>
            </Button>
          )}
          <Button asChild className="font-bold">
            <Link to="/" search={{}}>
              Explorar catálogo
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const nft = nftQuery.data
  const gallery = nft.gallery.length > 0 ? nft.gallery : [nft.imageUrl]
  const activeImage = gallery[selectedImageIdx] ?? nft.imageUrl
  const isFav = favorites.includes(nft.id)
  const maxAvailable = nft.availableQuantity
  const clampedQuantity = Math.min(quantity, Math.max(1, maxAvailable))
  const isOutOfStock = maxAvailable === 0

  const handleBuy = () => {
    if (isOutOfStock) return
    addToCart.mutate(
      { nftId: nft.id, quantity: clampedQuantity },
      {
        onSuccess: () => {
          notifyToast({
            type: "success",
            title: "NFT adicionado ao carrinho",
            description: `${nft.title} (x${clampedQuantity})`,
          })
          void navigate({ to: "/cart" })
        },
        onError: (err) => {
          notifyToast({
            type: "error",
            title: "Não foi possível adicionar",
            description: err.message,
          })
        },
      }
    )
  }

  const handleAddOnly = () => {
    if (isOutOfStock) return
    addToCart.mutate(
      { nftId: nft.id, quantity: clampedQuantity },
      {
        onSuccess: () => {
          notifyToast({
            type: "success",
            title: "Adicionado ao carrinho",
            description: `${nft.title} (x${clampedQuantity})`,
          })
        },
        onError: (err) => {
          notifyToast({
            type: "error",
            title: "Limite atingido",
            description: err.message,
          })
        },
      }
    )
  }

  const handleToggleFavorite = () => {
    if (!user) {
      void navigate({
        to: "/login",
        search: { redirect: `/nfts/${nft.id}` },
      })
      return
    }
    toggleFavorite.mutate(
      { nftId: nft.id, isCurrentlyFavorite: isFav },
      {
        onError: (err) => {
          notifyToast({
            type: "error",
            title: "Erro ao favoritar",
            description: err.message,
          })
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-36 pt-4 sm:px-6 md:py-8 lg:px-8">
      {/* Barra superior mobile (< Voltar e ♡ Favoritar) */}
      <div className="mb-4 flex items-center justify-between md:hidden">
        <Link
          to="/"
          search={{}}
          aria-label="Voltar ao catálogo"
          className="flex size-10 items-center justify-center rounded-full bg-card text-primary"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={isFav ? "Remover dos favoritos" : "Favoritar"}
          aria-pressed={isFav}
          className="flex size-10 items-center justify-center rounded-full bg-card text-primary"
        >
          <Heart className={`size-5 ${isFav ? "fill-primary" : ""}`} />
        </button>
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
        / <span className="text-foreground">{nft.title}</span>
      </nav>

      {/* Bloco Principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col-reverse gap-4 sm:flex-row lg:col-span-6">
          <div className="hidden gap-3 sm:flex sm:flex-col">
            {gallery.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImageIdx(idx)}
                aria-label={`Visualizar imagem ${idx + 1} de ${nft.title}`}
                aria-pressed={selectedImageIdx === idx}
                className={`size-16 overflow-hidden rounded-lg border-2 transition-all sm:size-20 ${
                  selectedImageIdx === idx
                    ? "border-primary"
                    : "border-border opacity-70 hover:opacity-100"
                }`}
              >
                <img src={img} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>

          <div className="relative flex-1 overflow-hidden rounded-3xl bg-card md:rounded-2xl md:border md:border-border">
            <img
              src={activeImage}
              alt={nft.title}
              width={600}
              height={600}
              className="aspect-square w-full object-cover"
            />
          </div>
        </div>

        {/* Informações e Compra */}
        <div className="space-y-5 lg:col-span-6 lg:space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-xl font-bold text-foreground sm:text-3xl">
                {nft.title}
              </h1>
              {/* Badge de nota mobile (★ 4.8 (19)) */}
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 px-2.5 py-1 text-xs text-foreground md:hidden">
                <Star className="size-3.5 fill-primary text-primary" />
                <strong>4.8</strong>
                <span className="text-muted-foreground">(19)</span>
              </span>
            </div>

            <div className="mt-2 hidden flex-wrap items-center justify-between gap-4 md:flex">
              <p className="text-xl font-bold text-primary">
                {nft.priceEth} ETH
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="flex text-primary" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-primary" />
                  ))}
                </div>
                <span>19 avaliações de colecionadores</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4 text-xs">
            <h2 className="hidden font-bold text-foreground md:block">
              Sobre este NFT:
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              {nft.description}
            </p>
          </div>

          {/* Seletor de Edição */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-foreground">Edição:</p>
            <div className="flex flex-wrap gap-2">
              {EDITION_TIERS.map((tier) => {
                const isSelected = selectedEdition === tier
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setSelectedEdition(tier)}
                    aria-pressed={isSelected}
                    className={`rounded-full border px-3.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isSelected
                        ? "border-primary bg-primary/15 font-bold text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tier}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quantidade + Botão Comprar + Favoritar (Desktop) */}
          <div className="hidden flex-wrap items-center gap-4 pt-2 md:flex">
            <div
              role="group"
              aria-label="Quantidade de edições"
              className="flex items-center gap-3"
            >
              <button
                type="button"
                disabled={isOutOfStock || clampedQuantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Diminuir quantidade"
                className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Minus className="size-3.5" />
              </button>
              <span
                aria-live="polite"
                className="min-w-[1.5rem] text-center text-sm font-bold"
              >
                {isOutOfStock ? 0 : clampedQuantity}
              </span>
              <button
                type="button"
                disabled={isOutOfStock || clampedQuantity >= maxAvailable}
                onClick={() =>
                  setQuantity((q) => Math.min(maxAvailable, q + 1))
                }
                aria-label="Aumentar quantidade"
                className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5" />
              </button>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={isOutOfStock || addToCart.isPending}
              onClick={handleBuy}
              className="min-w-[160px] font-bold tracking-wider"
            >
              {isOutOfStock ? "ESGOTADO" : "COMPRAR"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              aria-pressed={isFav}
              onClick={handleToggleFavorite}
            >
              <Heart
                className={`size-4 ${isFav ? "fill-primary text-primary" : ""}`}
              />
              <span>{isFav ? "Favoritado" : "Favoritar"}</span>
            </Button>
          </div>

          <p className="hidden text-xs text-muted-foreground md:block">
            Disponibilidade atual:{" "}
            <strong className="text-foreground">
              {maxAvailable} unidade(s)
            </strong>
          </p>

          {/* Metadados do Token */}
          <dl className="space-y-2 border-t border-border pt-4 text-xs">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">ID do token:</dt>
              <dd className="font-bold text-foreground">
                #{nft.id.replace("nft-", "")}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Coleção:</dt>
              <dd className="text-foreground">{nft.collection}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Rede:</dt>
              <dd className="text-foreground">{nft.network}</dd>
            </div>
            <div className="hidden items-center gap-2 pt-1 md:flex">
              <dt className="text-muted-foreground">Compartilhar este NFT:</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(window.location.href)
                    notifyToast({
                      type: "info",
                      title: "Link copiado",
                      description:
                        "URL do NFT copiada para a área de transferência.",
                    })
                  }}
                  aria-label="Copiar link do NFT"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Share2 className="size-3.5" />
                  <span>Copiar link</span>
                </button>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Dock Inferior Fixo Mobile (conforme Captura 2) */}
      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-border bg-[#211710] px-6 py-4 shadow-2xl md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Qtd.</span>
            <button
              type="button"
              disabled={isOutOfStock || clampedQuantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuir quantidade mobile"
              className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-[1rem] text-center text-sm font-bold text-foreground">
              {isOutOfStock ? 0 : clampedQuantity}
            </span>
            <button
              type="button"
              disabled={isOutOfStock || clampedQuantity >= maxAvailable}
              onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
              aria-label="Aumentar quantidade mobile"
              className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>

          <p className="text-base font-bold text-primary">{nft.priceEth} ETH</p>
        </div>

        <div className="mt-3.5 flex items-center gap-3">
          <Button
            type="button"
            disabled={isOutOfStock || addToCart.isPending}
            onClick={handleBuy}
            className="h-12 flex-1 rounded-full font-bold"
          >
            {isOutOfStock ? "Esgotado" : "Comprar NFT"}
          </Button>
          <button
            type="button"
            disabled={isOutOfStock || addToCart.isPending}
            onClick={handleAddOnly}
            aria-label="Adicionar ao carrinho"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#2C1F16] text-primary"
          >
            <ShoppingCart className="size-5" />
          </button>
        </div>
      </div>

      {/* Abas de Detalhes e Avaliações (Desktop) */}
      <section className="mt-14 hidden md:block">
        <div
          role="tablist"
          className="flex gap-8 border-b border-border pb-3 text-xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "details"}
            onClick={() => setActiveTab("details")}
            className={`pb-2 font-bold ${
              activeTab === "details"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Detalhes do NFT
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "reviews"}
            onClick={() => setActiveTab("reviews")}
            className={`pb-2 font-bold ${
              activeTab === "reviews"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Avaliações de colecionadores (19)
          </button>
        </div>

        {activeTab === "details" ? (
          <div className="mt-6 space-y-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              {nft.title} é uma obra digital {selectedEdition} finalizada à mão
              da coleção {nft.collection}. Cada atributo fica armazenado nos
              metadados do token e verificado na rede {nft.network}.
            </p>
            <div>
              <p className="font-bold text-foreground">Rede:</p>
              <p>
                Cunhado na {nft.network} com procedência imutável e metadados
                armazenados no IPFS.
              </p>
            </div>
            <div>
              <p className="font-bold text-foreground">Contrato:</p>
              <p>
                0x7A42...19E8 • Contrato inteligente ERC-721 verificado. Direitos
                autorais do criador: 5% nas vendas secundárias.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3 text-xs text-muted-foreground">
            <p className="font-bold text-foreground">
              4.9 de 5 estrelas baseado em 19 colecionadores verificados
            </p>
            <p>
              “Arte impecável e transferência instantânea após confirmação
              on-chain.” — @colecionador_eth
            </p>
          </div>
        )}
      </section>

      {/* Vitrine Relacionada (Desktop) */}
      <section className="mt-16 hidden md:block">
        <h2 className="mb-6 text-sm font-bold text-foreground">
          Outros NFTs da coleção
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {relatedQuery.data?.data
            .filter((item) => item.id !== nft.id)
            .slice(0, 5)
            .map((related) => (
              <Link
                key={related.id}
                to="/nfts/$nftId"
                params={{ nftId: related.id }}
                className="group rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
              >
                <img
                  src={related.imageUrl}
                  alt={related.title}
                  className="aspect-square w-full rounded-lg object-cover"
                />
                <p className="mt-2.5 truncate text-xs font-bold text-foreground group-hover:text-primary">
                  {related.title}
                </p>
                <p className="mt-0.5 text-xs font-bold text-primary">
                  {related.priceEth} ETH
                </p>
              </Link>
            ))}
        </div>
      </section>
    </div>
  )
}