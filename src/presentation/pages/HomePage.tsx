import { useState } from "react"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Heart,
  RefreshCw,
  Search,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react"
import type {
  BlockchainNetwork,
  CatalogSearchParams,
  NFT,
  NFTCollection,
} from "@/domain/types"
import {
  useFavorites,
  useNFTs,
  useToggleFavorite,
} from "@/application/nfts/use-nfts"
import { useAddToCart } from "@/application/cart/use-cart"
import { useSession } from "@/application/auth/use-auth"
import { Button } from "@/components/ui/button"
import { NFTCardSkeleton } from "../components/Skeleton"
import { notifyToast } from "@/lib/toast"

const COLLECTIONS: NFTCollection[] = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
]

const NETWORKS: BlockchainNetwork[] = ["Ethereum", "Polygon", "Solana"]

const JOURNAL_POSTS = [
  {
    date: "12 de setembro",
    readTime: "Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    summary: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    nftId: "nft-552",
  },
  {
    date: "13 de setembro",
    readTime: "Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    summary: "Conheça criadores que moldam a cultura digital.",
    nftId: "nft-042",
  },
  {
    date: "15 de setembro",
    readTime: "Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    summary: "Entenda raridade, procedência, direitos autorais e utilidade.",
    nftId: "nft-009",
  },
  {
    date: "15 de setembro",
    readTime: "Leitura de 2 min",
    title: "Como proteger sua carteira",
    summary: "Proteja sua carteira, seus ativos e sua identidade.",
    nftId: "nft-777",
  },
]

export function HomePage() {
  const search = useSearch({ from: "/" })
  const navigate = useNavigate({ from: "/" })

  const { data: user } = useSession()
  const { data: favorites = [] } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()

  const [priceDraft, setPriceDraft] = useState<{ min?: string; max?: string }>(
    {}
  )
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const minPriceInput = priceDraft.min ?? search.minPrice ?? "0.02"
  const maxPriceInput = priceDraft.max ?? search.maxPrice ?? "12.30"

  const catalogQuery = useNFTs({
    q: search.q,
    collection: search.collection,
    network: search.network,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    tab: search.tab ?? "all",
    sort: search.sort ?? "recent",
    page: search.page ?? 1,
    limit: 9,
  })

  const updateSearch = (patch: Partial<CatalogSearchParams>, resetPage = true) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
        page: resetPage ? 1 : (patch.page ?? search.page),
      }),
    })
  }

  const handleMobileSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const term = String(formData.get("q") ?? "").trim()
    updateSearch({ q: term || undefined })
  }

  const handleApplyPriceFilter = (e: React.FormEvent) => {
    e.preventDefault()
    const nextMin = minPriceInput.trim() || undefined
    const nextMax = maxPriceInput.trim() || undefined
    setPriceDraft({})
    updateSearch({
      minPrice: nextMin,
      maxPrice: nextMax,
    })
    setMobileFiltersOpen(false)
  }

  const handleClearFilters = () => {
    setPriceDraft({})
    void navigate({ search: {} })
  }

  const handleFavoriteClick = (nft: NFT) => {
    if (!user) {
      void navigate({
        to: "/login",
        search: { redirect: window.location.pathname + window.location.search },
      })
      return
    }
    const isCurrentlyFavorite = favorites.includes(nft.id)
    toggleFavorite.mutate(
      { nftId: nft.id, isCurrentlyFavorite },
      {
        onError: (err) => {
          notifyToast({
            type: "error",
            title: "Não foi possível atualizar favorito",
            description: err.message,
          })
        },
      }
    )
  }

  const handleQuickAddCart = (nft: NFT) => {
    addToCart.mutate(
      { nftId: nft.id, quantity: 1 },
      {
        onSuccess: () => {
          notifyToast({
            type: "success",
            title: "Adicionado ao carrinho",
            description: `${nft.title} (${nft.priceEth} ETH)`,
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

  const featuredNft = catalogQuery.data?.data[0]
  const secondaryHeroNft = catalogQuery.data?.data[1]
  const currentPage = search.page ?? 1
  const totalPages = catalogQuery.data?.totalPages ?? 1

  const renderFiltersSidebar = () => (
    <aside
      aria-label="Filtros do catálogo"
      className="space-y-8 rounded-2xl bg-card p-5 md:rounded-none"
    >
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Coleções</h2>
          {(search.collection ||
            search.network ||
            search.q ||
            search.minPrice ||
            search.maxPrice) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] text-primary hover:underline"
            >
              Limpar
            </button>
          )}
        </div>
        <ul className="mt-4 space-y-2.5 text-xs">
          {COLLECTIONS.map((col) => {
            const active = search.collection === col
            const count = catalogQuery.data?.facets.collections[col] ?? 0
            return (
              <li key={col}>
                <button
                  type="button"
                  onClick={() => {
                    updateSearch({ collection: active ? undefined : col })
                    setMobileFiltersOpen(false)
                  }}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-primary/15 font-bold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{col}</span>
                  <span>({count})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <form
        onSubmit={handleApplyPriceFilter}
        className="border-t border-border pt-6"
      >
        <h2 className="text-sm font-bold text-foreground">Faixa de preço</h2>

        <div className="relative mt-4 flex items-center py-2">
          <div className="h-1.5 w-full rounded-full bg-secondary">
            <div className="mx-auto h-1.5 w-3/4 rounded-full bg-primary" />
          </div>
          <span className="absolute left-[12%] size-3.5 rounded-full border-2 border-background bg-primary shadow" />
          <span className="absolute right-[12%] size-3.5 rounded-full border-2 border-background bg-primary shadow" />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="filter-min-price"
              className="text-[10px] text-muted-foreground"
            >
              Mín (ETH)
            </label>
            <input
              id="filter-min-price"
              type="text"
              inputMode="decimal"
              value={minPriceInput}
              onChange={(e) =>
                setPriceDraft((prev) => ({ ...prev, min: e.target.value }))
              }
              className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label
              htmlFor="filter-max-price"
              className="text-[10px] text-muted-foreground"
            >
              Máx (ETH)
            </label>
            <input
              id="filter-max-price"
              type="text"
              inputMode="decimal"
              value={maxPriceInput}
              onChange={(e) =>
                setPriceDraft((prev) => ({ ...prev, max: e.target.value }))
              }
              className="mt-1 h-8 w-full rounded border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-muted-foreground">
          Preço: {minPriceInput || "0.02"} - {maxPriceInput || "12.30"} ETH
        </p>
        <Button type="submit" size="sm" className="mt-3 w-full font-bold">
          Aplicar
        </Button>
      </form>

      <div className="border-t border-border pt-6">
        <h2 className="text-sm font-bold text-foreground">Rede</h2>
        <ul className="mt-4 space-y-2.5 text-xs">
          {NETWORKS.map((net) => {
            const active = search.network === net
            const count = catalogQuery.data?.facets.networks[net] ?? 0
            return (
              <li key={net}>
                <button
                  type="button"
                  onClick={() => {
                    updateSearch({ network: active ? undefined : net })
                    setMobileFiltersOpen(false)
                  }}
                  aria-pressed={active}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-primary/15 font-bold text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{net}</span>
                  <span>({count})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-t border-border pt-6">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          NFT EM DESTAQUE
        </p>
        <p className="mt-1 text-sm font-bold text-foreground">
          OFERTA LIMITADA
        </p>
        <Link
          to="/nfts/$nftId"
          params={{ nftId: "nft-042" }}
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <span>Conferir edição</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </aside>
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 md:py-8 lg:px-8">
      {/* Barra de Busca + Botão de Filtros Mobile (conforme Captura 1) */}
      <div className="mb-5 flex items-center gap-3 md:hidden">
        <form
          key={`mobile-home-search-${search.q ?? ""}`}
          onSubmit={handleMobileSearchSubmit}
          role="search"
          className="relative flex-1"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            type="search"
            defaultValue={search.q ?? ""}
            placeholder="Explorar coleções"
            aria-label="Explorar coleções"
            className="h-12 w-full rounded-2xl bg-card pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((prev) => !prev)}
          aria-expanded={mobileFiltersOpen}
          aria-label="Abrir filtros"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow"
        >
          <SlidersHorizontal className="size-5" />
        </button>
      </div>

      {/* Card Hero Mobile Compacto (conforme Captura 1) */}
      <section className="mb-6 rounded-2xl bg-card p-5 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">
              Bem-vindo à Kurio
            </p>
            <h2 className="text-base font-bold leading-snug text-foreground">
              SEJA DONO DA CULTURA DIGITAL
            </h2>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Descubra NFTs selecionados de criadores do mundo todo.
            </p>
            <a
              href="#catalogo"
              className="inline-flex items-center gap-1 pt-1 text-xs font-bold text-primary"
            >
              <span>EXPLORAR</span>
              <ArrowRight className="size-3.5" />
            </a>
          </div>

          <div className="relative shrink-0">
            <Link
              to="/nfts/$nftId"
              params={{ nftId: featuredNft?.id ?? "nft-042" }}
              className="block size-28 overflow-hidden rounded-2xl bg-secondary"
            >
              <img
                src={featuredNft?.imageUrl ?? ""}
                alt={featuredNft?.title ?? "Destaque Kurio"}
                className="size-full object-cover"
              />
            </Link>
            {secondaryHeroNft && (
              <Link
                to="/nfts/$nftId"
                params={{ nftId: secondaryHeroNft.id }}
                className="absolute -bottom-2 -left-4 size-12 overflow-hidden rounded-xl border-2 border-card bg-secondary shadow-md"
              >
                <img
                  src={secondaryHeroNft.imageUrl}
                  alt={secondaryHeroNft.title}
                  className="size-full object-cover"
                />
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-1.5" aria-hidden="true">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="size-1.5 rounded-full bg-primary/40" />
          <span className="size-1.5 rounded-full bg-primary/40" />
        </div>
      </section>

      {/* Hero Banner Desktop */}
      <section className="hidden grid-cols-1 items-center gap-10 pb-14 md:grid lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-6">
          <p className="text-xs text-muted-foreground">Bem-vindo à Kurio</p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            SEJA DONO DO FUTURO DA ARTE DIGITAL
          </h1>
          <p className="max-w-lg text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="font-bold tracking-wider">
              <a href="#catalogo">EXPLORAR</a>
            </Button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: featuredNft?.id ?? "nft-042" }}
            className="group block overflow-hidden rounded-2xl border border-border bg-card p-3 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={
                featuredNft?.imageUrl ??
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='600' height='600' fill='%231e1915'/></svg>"
              }
              alt={featuredNft?.title ?? "Emerald Ape #042 em destaque"}
              width={600}
              height={600}
              className="aspect-square max-h-[440px] w-full rounded-xl object-cover"
            />
          </Link>
        </div>
      </section>

      {/* Seção Principal do Catálogo */}
      <section id="catalogo" className="scroll-mt-20">
        {mobileFiltersOpen && (
          <div className="mb-6 lg:hidden">{renderFiltersSidebar()}</div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="hidden lg:col-span-3 lg:block">
            {renderFiltersSidebar()}
          </div>

          <div className="lg:col-span-9">
            {/* Barra superior de abas e ordenação */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 md:border-b md:border-border md:pb-3">
              <div
                role="tablist"
                aria-label="Categorias de destaque"
                className="flex w-full items-center justify-between gap-3 overflow-x-auto text-xs md:w-auto md:justify-start md:gap-6"
              >
                {[
                  { id: "all", label: "Todos os NFTs" },
                  { id: "new", label: "Novos lançamentos" },
                  { id: "trending", label: "Em alta" },
                ].map((tabItem) => {
                  const isActive = (search.tab ?? "all") === tabItem.id
                  return (
                    <button
                      key={tabItem.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() =>
                        updateSearch({
                          tab: tabItem.id as CatalogSearchParams["tab"],
                        })
                      }
                      className={`shrink-0 pb-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isActive
                          ? "border-b-2 border-primary font-bold text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tabItem.label}
                    </button>
                  )
                })}
              </div>

              <div className="hidden items-center gap-2 text-xs md:flex">
                <label htmlFor="catalog-sort" className="text-muted-foreground">
                  Ordenar por:
                </label>
                <select
                  id="catalog-sort"
                  value={search.sort ?? "recent"}
                  onChange={(e) =>
                    updateSearch({
                      sort: e.target.value as CatalogSearchParams["sort"],
                    })
                  }
                  className="h-8 rounded border border-input bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="recent">Listados recentemente</option>
                  <option value="price_asc">Menor preço (ETH)</option>
                  <option value="price_desc">Maior preço (ETH)</option>
                </select>
              </div>
            </div>

            {/* Estados de carregamento, erro, vazio e grid */}
            {catalogQuery.isLoading ? (
              <div
                aria-busy="true"
                aria-label="Carregando catálogo de NFTs"
                className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3"
              >
                {Array.from({ length: 6 }).map((_, idx) => (
                  <NFTCardSkeleton key={idx} />
                ))}
              </div>
            ) : catalogQuery.isError ? (
              <div
                role="alert"
                className="flex flex-col items-center justify-center rounded-xl border border-destructive/40 bg-card p-12 text-center"
              >
                <p className="text-sm font-bold text-foreground">
                  Erro ao carregar o catálogo
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {catalogQuery.error.message}
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void catalogQuery.refetch()}
                  className="mt-4 font-bold"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Tentar novamente</span>
                </Button>
              </div>
            ) : catalogQuery.data?.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
                <p className="text-sm font-bold text-foreground">
                  Nenhum NFT encontrado
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Ajuste os filtros aplicados ou limpe a busca para explorar o
                  acervo completo.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-4"
                >
                  Limpar filtros
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 xl:grid-cols-3">
                  {catalogQuery.data?.data.map((nft, index) => {
                    const isFav = favorites.includes(nft.id)
                    return (
                      <article key={nft.id} className="group flex flex-col">
                        <div className="relative overflow-hidden rounded-2xl bg-card md:rounded-lg">
                          {nft.isLimitedEdition && (
                            <span className="absolute left-2.5 top-2.5 z-10 rounded-sm bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                              RARO
                            </span>
                          )}

                          {/* Ícone circular de favorito visível no canto superior direito no mobile */}
                          <button
                            type="button"
                            onClick={() => handleFavoriteClick(nft)}
                            aria-label={
                              isFav
                                ? `Remover ${nft.title} dos favoritos`
                                : `Favoritar ${nft.title}`
                            }
                            aria-pressed={isFav}
                            className="absolute right-2.5 top-2.5 z-10 flex size-7 items-center justify-center rounded-full bg-card/85 text-primary backdrop-blur md:hidden"
                          >
                            <Heart
                              className={`size-3.5 ${isFav ? "fill-primary" : ""}`}
                            />
                          </button>

                          <Link
                            to="/nfts/$nftId"
                            params={{ nftId: nft.id }}
                            className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <img
                              src={nft.imageUrl}
                              alt={nft.title}
                              width={400}
                              height={400}
                              loading={index === 0 ? "eager" : "lazy"}
                              fetchPriority={index === 0 ? "high" : "auto"}
                              className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </Link>

                          {/* Barra de ações flutuante no hover desktop */}
                          <div className="absolute bottom-2.5 left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-sm border border-border bg-card/95 p-1 opacity-0 shadow-lg backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100 md:flex">
                            <button
                              type="button"
                              disabled={nft.availableQuantity === 0}
                              onClick={() => handleQuickAddCart(nft)}
                              aria-label={`Adicionar ${nft.title} ao carrinho`}
                              className="rounded-sm p-1.5 text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                            >
                              <ShoppingCart className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFavoriteClick(nft)}
                              aria-label={
                                isFav
                                  ? `Remover ${nft.title} dos favoritos`
                                  : `Favoritar ${nft.title}`
                              }
                              aria-pressed={isFav}
                              className={`rounded-sm p-1.5 hover:bg-muted ${
                                isFav ? "text-primary" : "text-foreground"
                              }`}
                            >
                              <Heart
                                className={`size-3.5 ${isFav ? "fill-primary" : ""}`}
                              />
                            </button>
                            <Link
                              to="/nfts/$nftId"
                              params={{ nftId: nft.id }}
                              aria-label={`Ver detalhes de ${nft.title}`}
                              className="rounded-sm p-1.5 text-foreground hover:bg-muted"
                            >
                              <Search className="size-3.5" />
                            </Link>
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-start justify-between gap-2">
                          <div>
                            <Link
                              to="/nfts/$nftId"
                              params={{ nftId: nft.id }}
                              className="block text-xs font-bold text-foreground hover:text-primary"
                            >
                              {nft.title}
                            </Link>
                            <div className="mt-0.5 flex items-center gap-2 text-xs">
                              <span className="font-bold text-primary">
                                {nft.priceEth} ETH
                              </span>
                              {nft.originalPriceEth && (
                                <span className="text-muted-foreground line-through">
                                  {nft.originalPriceEth} ETH
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {nft.availableQuantity > 0
                              ? `${nft.availableQuantity} un.`
                              : "Esgotado"}
                          </span>
                        </div>
                      </article>
                    )
                  })}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <nav
                    aria-label="Paginação do catálogo"
                    className="mt-8 flex items-center justify-center gap-2 md:justify-end"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={currentPage <= 1}
                      aria-label="Página anterior"
                      onClick={() =>
                        updateSearch({ page: currentPage - 1 }, false)
                      }
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const pageNumber = idx + 1
                      const active = pageNumber === currentPage
                      return (
                        <Button
                          key={pageNumber}
                          type="button"
                          size="icon-sm"
                          variant={active ? "default" : "outline"}
                          aria-current={active ? "page" : undefined}
                          onClick={() =>
                            updateSearch({ page: pageNumber }, false)
                          }
                        >
                          {pageNumber}
                        </Button>
                      )
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={currentPage >= totalPages}
                      aria-label="Próxima página"
                      onClick={() =>
                        updateSearch({ page: currentPage + 1 }, false)
                      }
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Banners Promocionais (Desktop) */}
      <section className="mt-20 hidden grid-cols-1 gap-6 md:grid md:grid-cols-2">
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row">
          <img
            src={catalogQuery.data?.data[0]?.imageUrl ?? ""}
            alt="Lançamentos gênesis"
            className="size-36 shrink-0 rounded-xl bg-secondary object-cover"
          />
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="text-base font-bold text-foreground">
              Lançamentos gênesis de edição limitada
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Colecione edições escassas diretamente dos criadores antes da
              revelação pública.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => updateSearch({ tab: "new" })}
              className="font-bold"
            >
              Explorar →
            </Button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row">
          <img
            src={
              catalogQuery.data?.data[1]?.imageUrl ??
              catalogQuery.data?.data[0]?.imageUrl ??
              ""
            }
            alt="Arte digital selecionada"
            className="size-36 shrink-0 rounded-xl bg-secondary object-cover"
          />
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="text-base font-bold text-foreground">
              Arte digital selecionada e muito mais
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Explore novos artistas, coleções verificadas e obras digitais que
              definem a cultura.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => updateSearch({ collection: "Arte digital" })}
              className="font-bold"
            >
              Explorar →
            </Button>
          </div>
        </div>
      </section>

      {/* Diário da Cunhagem (Desktop) */}
      <section
        id="diario-cunhagem"
        className="mt-20 hidden scroll-mt-20 md:block"
      >
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            Diário da Cunhagem
          </h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Histórias, guias e insights para colecionadores sobre o universo da
            propriedade digital.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {JOURNAL_POSTS.map((post, idx) => (
            <article
              key={post.title}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-4"
            >
              <div>
                <img
                  src={
                    catalogQuery.data?.data[
                      idx % (catalogQuery.data?.data.length || 1)
                    ]?.imageUrl ?? ""
                  }
                  alt={post.title}
                  className="aspect-square w-full rounded-lg bg-secondary object-cover"
                />
                <p className="mt-3 text-[11px] text-muted-foreground">
                  {post.date} | {post.readTime}
                </p>
                <h3 className="mt-2 text-sm font-bold text-foreground">
                  {post.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {post.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  notifyToast({
                    type: "info",
                    title: "Artigo editorial",
                    description:
                      "Conteúdo do Diário da Cunhagem é ilustrativo nesta entrega.",
                  })
                }
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <span>Ler mais →</span>
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}