import { delay, http, HttpResponse, ws } from "msw"
import { toSocketIo } from "@mswjs/socket.io-binding"
import type {
  APIError,
  BlockchainNetwork,
  CartItem,
  CartQuote,
  CartQuoteItem,
  NFT,
  NFTCollection,
  Order,
  OrderSnapshotItem,
  PaginatedResponse,
  User,
  Wallet,
  WalletProvider,
} from "@/domain/types"
import {
  addEth,
  compareEth,
  mulEthInt,
  calcPercentageEth,
  subEth,
} from "@/lib/eth"
import {
  getDb,
  mutateNftAndBroadcast,
  mutateOrderAndBroadcast,
  registerSocketBroadcaster,
  resetDb,
  saveDb,
  setMockScenario,
  type MockScenario,
} from "./db"
import { hashMockPassword, type StoredUser } from "./fixtures"

const NETWORK_FEES: Record<BlockchainNetwork, string> = {
  Ethereum: "0.015",
  Polygon: "0.002",
  Solana: "0.001",
}

const ALL_COLLECTIONS: NFTCollection[] = [
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

const ALL_NETWORKS: BlockchainNetwork[] = ["Ethereum", "Polygon", "Solana"]

const ALL_PROVIDERS: WalletProvider[] = ["MetaMask", "WalletConnect", "Coinbase Wallet"]

// ==========================================
// Bridge Socket.IO com MSW
// ==========================================

type SocketIoClientProxy = ReturnType<typeof toSocketIo>["client"]
const connectedSocketClients = new Set<SocketIoClientProxy>()

registerSocketBroadcaster({
  emitNftUpdated: (event) => {
    connectedSocketClients.forEach((client) => {
      client.emit("nft.updated", event)
    })
  },
  emitOrderUpdated: (event) => {
    connectedSocketClients.forEach((client) => {
      client.emit("order.updated", event)
    })
  },
})

const socketLink = ws.link(/\/socket\.io\//)

const socketHandler = socketLink.addEventListener("connection", (connection) => {
  const io = toSocketIo(connection)
  connectedSocketClients.add(io.client)

  connection.client.addEventListener("close", () => {
    connectedSocketClients.delete(io.client)
  })
})

// ==========================================
// Helpers de Autenticação, Erro e Cotação
// ==========================================

function apiError(
  status: number,
  code: APIError["code"],
  message: string,
  fieldErrors?: Record<string, string>
) {
  return HttpResponse.json<APIError>({ code, message, fieldErrors }, { status })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function json(data: unknown, status = 200): HttpResponse<any> {
  return HttpResponse.json(data as never, { status })
}

function sanitizeUser(user: StoredUser): User {
  const safeUser: User = {
    id: user.id,
    name: user.name,
    username: user.username,
    ensName: user.ensName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    wallets: user.wallets,
  }
  return safeUser
}

async function applyNetworkConditions() {
  const db = getDb()
  if (db.scenario === "network-error") {
    await delay(150)
    throw new Error("Simulated network failure")
  }
  const wait = db.scenario === "slow" ? Math.max(db.latencyMs, 1400) : db.latencyMs
  if (wait > 0) {
    await delay(wait)
  }
}

function getAuthenticatedUser(request: Request): StoredUser | null {
  const db = getDb()
  const authHeader = request.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7).trim()
  const session = db.sessions[token]
  if (!session) return null

  if (db.scenario === "session-expired" || session.expiresAt < Date.now()) {
    delete db.sessions[token]
    saveDb()
    return null
  }

  return db.users.find((u) => u.id === session.userId) ?? null
}

function getCartOwnerKey(user: StoredUser | null): string {
  return user ? user.id : "guest"
}

function ensureCart(ownerKey: string) {
  const db = getDb()
  if (!db.cartsByOwner[ownerKey]) {
    db.cartsByOwner[ownerKey] = { items: [] }
  }
  return db.cartsByOwner[ownerKey]
}

function mergeGuestCartIntoUser(userId: string) {
  const db = getDb()
  const guestCart = ensureCart("guest")
  if (guestCart.items.length === 0 && !guestCart.couponCode) return

  const userCart = ensureCart(userId)

  for (const guestItem of guestCart.items) {
    const nft = db.nfts.find((n) => n.id === guestItem.nftId)
    if (!nft || nft.availableQuantity === 0) continue

    const existing = userCart.items.find((i) => i.nftId === guestItem.nftId)
    if (existing) {
      existing.quantity = Math.min(
        nft.availableQuantity,
        existing.quantity + guestItem.quantity
      )
      existing.snapshotPriceEth = nft.priceEth
      existing.snapshotAvailableQuantity = nft.availableQuantity
    } else {
      userCart.items.push({
        nftId: nft.id,
        quantity: Math.min(nft.availableQuantity, guestItem.quantity),
        snapshotPriceEth: nft.priceEth,
        snapshotAvailableQuantity: nft.availableQuantity,
      })
    }
  }

  if (guestCart.couponCode && !userCart.couponCode) {
    userCart.couponCode = guestCart.couponCode
  }

  db.cartsByOwner.guest = { items: [] }
  saveDb()
}

function buildCartQuote(
  ownerKey: string,
  selectedNetwork: BlockchainNetwork = "Ethereum"
): CartQuote {
  const db = getDb()
  const cart = ensureCart(ownerKey)

  let subtotalEth = "0.00"
  let requiresReconfirmation = false

  const quoteItems: CartQuoteItem[] = cart.items
    .map((item) => {
      const nft = db.nfts.find((n) => n.id === item.nftId)
      if (!nft) return null

      const priceChanged = item.snapshotPriceEth !== nft.priceEth
      const stockExceeded =
        item.quantity > nft.availableQuantity || nft.availableQuantity === 0

      if (priceChanged || stockExceeded) {
        requiresReconfirmation = true
      }

      const itemTotalEth = mulEthInt(nft.priceEth, item.quantity)
      subtotalEth = addEth(subtotalEth, itemTotalEth)

      return {
        nftId: nft.id,
        quantity: item.quantity,
        nft,
        unitPriceEth: nft.priceEth,
        itemTotalEth,
        priceChanged,
        stockExceeded,
      }
    })
    .filter((entry): entry is CartQuoteItem => entry !== null)

  let discountEth = "0.00"
  let activeCoupon: string | undefined

  if (cart.couponCode) {
    const coupon = db.coupons[cart.couponCode.toUpperCase()]
    if (coupon && !coupon.isExpired && quoteItems.length > 0) {
      discountEth = calcPercentageEth(subtotalEth, coupon.discountPercent)
      activeCoupon = coupon.code
    }
  }

  const networkFeeEth =
    quoteItems.length > 0 ? NETWORK_FEES[selectedNetwork] : "0.00"
  const afterDiscount = subEth(subtotalEth, discountEth)
  const totalEth = addEth(afterDiscount, networkFeeEth)

  return {
    items: quoteItems,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth,
    couponCode: activeCoupon,
    requiresReconfirmation,
  }
}

// ==========================================
// Handlers REST
// ==========================================

export const handlers = [
  socketHandler,

  // --- Controle de Cenários (para demonstração e Playwright) ---
  http.post("/api/mock/reset", async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      scenario?: MockScenario
      latencyMs?: number
    }
    resetDb(body.scenario ?? "default", body.latencyMs ?? 180)
    return json({ ok: true })
  }),

  http.post("/api/mock/scenario", async ({ request }) => {
    const body = (await request.json()) as {
      scenario: MockScenario
      latencyMs?: number
    }
    setMockScenario(body.scenario, body.latencyMs)
    return json({ ok: true })
  }),

  // --- Sessão e Conta ---
  http.post("/api/auth/register", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha de conexão com o servidor.")
    }

    const body = (await request.json()) as {
      name?: string
      email?: string
      password?: string
    }

    const fieldErrors: Record<string, string> = {}
    if (!body.name || body.name.trim().length < 2) {
      fieldErrors.name = "Informe seu nome completo."
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      fieldErrors.email = "Informe um e-mail válido."
    }
    if (!body.password || body.password.length < 6) {
      fieldErrors.password = "A senha deve ter pelo menos 6 caracteres."
    }

    if (Object.keys(fieldErrors).length > 0) {
      return apiError(422, "VALIDATION_ERROR", "Verifique os campos destacados.", fieldErrors)
    }

    const db = getDb()
    const normalizedEmail = body.email!.trim().toLowerCase()
    if (db.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return apiError(409, "CONFLICT", "Este e-mail já está cadastrado.", {
        email: "E-mail já utilizado por outra conta.",
      })
    }

    const generatedUsername = normalizedEmail
      .split("@")[0]
      .replace(/[^a-z0-9_]/g, "_")

    const newUser: StoredUser = {
      id: `usr-${crypto.randomUUID().slice(0, 8)}`,
      name: body.name!.trim(),
      username: generatedUsername,
      ensName: `${generatedUsername}.eth`,
      email: normalizedEmail,
      passwordHash: hashMockPassword(body.password!),
      avatarUrl: INITIAL_AVATAR_FALLBACK(body.name!.trim()),
      wallets: [
        {
          id: `wal-${crypto.randomUUID().slice(0, 8)}`,
          label: "Carteira Principal",
          provider: "MetaMask",
          address: `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 40)}`,
          network: "Ethereum",
          isPrimary: true,
        },
      ],
    }

    db.users.push(newUser)
    db.favoritesByUser[newUser.id] = []
    db.cartsByOwner[newUser.id] = { items: [] }

    const token = `tok_${crypto.randomUUID()}`
    db.sessions[token] = {
      token,
      userId: newUser.id,
      expiresAt: Date.now() + 1000 * 60 * 60 * 2,
    }

    mergeGuestCartIntoUser(newUser.id)
    saveDb()

    return json({ token, user: sanitizeUser(newUser) }, 201)
  }),

  http.post("/api/auth/login", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha de conexão com o servidor.")
    }

    const body = (await request.json()) as { email?: string; password?: string }
    if (!body.email || !body.password) {
      return apiError(422, "VALIDATION_ERROR", "Preencha e-mail e senha.")
    }

    const db = getDb()
    const user = db.users.find(
      (u) => u.email.toLowerCase() === body.email!.trim().toLowerCase()
    )

    if (!user || user.passwordHash !== hashMockPassword(body.password)) {
      return apiError(401, "UNAUTHORIZED", "E-mail ou senha inválidos.")
    }

    if (db.scenario === "session-expired") {
      db.scenario = "default"
    }

    const token = `tok_${crypto.randomUUID()}`
    db.sessions[token] = {
      token,
      userId: user.id,
      expiresAt: Date.now() + 1000 * 60 * 60 * 2,
    }

    mergeGuestCartIntoUser(user.id)
    saveDb()

    return json({
      token,
      user: sanitizeUser(user),
    })
  }),

  http.get("/api/auth/session", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Servidor indisponível.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Sessão inválida ou expirada.")
    }

    return json({ user: sanitizeUser(user) })
  }),

  http.post("/api/auth/logout", async ({ request }) => {
    const db = getDb()
    const authHeader = request.headers.get("Authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim()
      delete db.sessions[token]
      saveDb()
    }
    return json({ ok: true })
  }),

  // --- Catálogo e Detalhe de NFTs ---
  http.get("/api/nfts", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Não foi possível carregar o catálogo.")
    }

    const db = getDb()
    const url = new URL(request.url)

    const q = (url.searchParams.get("q") ?? "").trim().toLowerCase()
    const collection = url.searchParams.get("collection") as NFTCollection | null
    const network = url.searchParams.get("network") as BlockchainNetwork | null
    const minPrice = url.searchParams.get("minPrice")
    const maxPrice = url.searchParams.get("maxPrice")
    const tab = url.searchParams.get("tab") ?? "all"
    const sort = url.searchParams.get("sort") ?? "recent"
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"))
    const limit = Math.max(1, Math.min(24, Number(url.searchParams.get("limit") ?? "6")))

    const baseList = db.scenario === "empty" ? [] : [...db.nfts]

    const collectionsCount = Object.fromEntries(
      ALL_COLLECTIONS.map((c) => [c, 0])
    ) as Record<NFTCollection, number>
    const networksCount = Object.fromEntries(
      ALL_NETWORKS.map((n) => [n, 0])
    ) as Record<BlockchainNetwork, number>

    for (const item of baseList) {
      collectionsCount[item.collection] = (collectionsCount[item.collection] ?? 0) + 1
      networksCount[item.network] = (networksCount[item.network] ?? 0) + 1
    }

    const filtered = baseList.filter((nft) => {
      if (q) {
        const matchesQuery =
          nft.title.toLowerCase().includes(q) ||
          nft.creator.toLowerCase().includes(q) ||
          nft.collection.toLowerCase().includes(q)
        if (!matchesQuery) return false
      }
      if (collection && nft.collection !== collection) return false
      if (network && nft.network !== network) return false
      if (tab === "trending" && !nft.isTrending) return false
      if (tab === "new" && !nft.isLimitedEdition) return false
      if (minPrice && compareEth(nft.priceEth, minPrice) < 0) return false
      if (maxPrice && compareEth(nft.priceEth, maxPrice) > 0) return false
      return true
    })

    if (sort === "price_asc") {
      filtered.sort((a, b) => compareEth(a.priceEth, b.priceEth))
    } else if (sort === "price_desc") {
      filtered.sort((a, b) => compareEth(b.priceEth, a.priceEth))
    } else {
      filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    }

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const startIndex = (safePage - 1) * limit
    const paginated = filtered.slice(startIndex, startIndex + limit)

    const payload: PaginatedResponse<NFT> = {
      data: paginated,
      total,
      page: safePage,
      limit,
      totalPages,
      facets: {
        collections: collectionsCount,
        networks: networksCount,
        minPriceEth: "0.02",
        maxPriceEth: "12.30",
      },
    }

    return json(payload)
  }),

  http.get("/api/nfts/:id", async ({ params }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Erro ao carregar detalhes do NFT.")
    }

    const db = getDb()
    const nft = db.nfts.find((item) => item.id === params.id)
    if (!nft) {
      return apiError(404, "NOT_FOUND", "NFT não encontrado no catálogo.")
    }

    return json(nft)
  }),

  // --- Favoritos ---
  http.get("/api/favorites", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Erro ao carregar favoritos.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Autenticação necessária.")
    }

    const db = getDb()
    return json(db.favoritesByUser[user.id] ?? [])
  }),

  http.post("/api/favorites/:nftId", async ({ request, params }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao favoritar NFT.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Faça login para salvar favoritos.")
    }

    const db = getDb()
    const nftId = String(params.nftId)
    if (!db.nfts.some((n) => n.id === nftId)) {
      return apiError(404, "NOT_FOUND", "NFT inexistente.")
    }

    const current = new Set(db.favoritesByUser[user.id] ?? [])
    current.add(nftId)
    db.favoritesByUser[user.id] = Array.from(current)
    saveDb()

    return json(db.favoritesByUser[user.id])
  }),

  http.delete("/api/favorites/:nftId", async ({ request, params }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao remover favorito.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Autenticação necessária.")
    }

    const db = getDb()
    const nftId = String(params.nftId)
    db.favoritesByUser[user.id] = (db.favoritesByUser[user.id] ?? []).filter(
      (id) => id !== nftId
    )
    saveDb()

    return json(db.favoritesByUser[user.id])
  }),

  // --- Carrinho e Cotação ---
  http.get("/api/cart", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao carregar carrinho.")
    }

    const url = new URL(request.url)
    const network = (url.searchParams.get("network") as BlockchainNetwork) || "Ethereum"
    const user = getAuthenticatedUser(request)
    const quote = buildCartQuote(getCartOwnerKey(user), network)

    return json(quote)
  }),

  http.post("/api/cart/items", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao adicionar item ao carrinho.")
    }

    const body = (await request.json()) as { nftId: string; quantity?: number }
    const quantityToAdd = Math.max(1, Math.floor(body.quantity ?? 1))

    const db = getDb()
    const nft = db.nfts.find((n) => n.id === body.nftId)
    if (!nft) {
      return apiError(404, "NOT_FOUND", "NFT não encontrado.")
    }
    if (nft.availableQuantity === 0) {
      return apiError(409, "OUT_OF_STOCK", "Esta edição está esgotada.")
    }

    const user = getAuthenticatedUser(request)
    const ownerKey = getCartOwnerKey(user)
    const cart = ensureCart(ownerKey)

    const existing = cart.items.find((i) => i.nftId === nft.id)
    const nextQty = (existing?.quantity ?? 0) + quantityToAdd

    if (nextQty > nft.availableQuantity) {
      return apiError(
        409,
        "OUT_OF_STOCK",
        `Limite disponível para este NFT é de ${nft.availableQuantity} unidade(s).`
      )
    }

    if (existing) {
      existing.quantity = nextQty
      existing.snapshotPriceEth = nft.priceEth
      existing.snapshotAvailableQuantity = nft.availableQuantity
    } else {
      cart.items.push({
        nftId: nft.id,
        quantity: quantityToAdd,
        snapshotPriceEth: nft.priceEth,
        snapshotAvailableQuantity: nft.availableQuantity,
      })
    }

    saveDb()
    return json(buildCartQuote(ownerKey))
  }),

  http.patch("/api/cart/items/:nftId", async ({ request, params }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao atualizar quantidade.")
    }

    const body = (await request.json()) as { quantity: number }
    const quantity = Math.floor(body.quantity)

    const db = getDb()
    const nftId = String(params.nftId)
    const nft = db.nfts.find((n) => n.id === nftId)
    if (!nft) {
      return apiError(404, "NOT_FOUND", "NFT não encontrado.")
    }

    const user = getAuthenticatedUser(request)
    const ownerKey = getCartOwnerKey(user)
    const cart = ensureCart(ownerKey)

    if (quantity <= 0) {
      cart.items = cart.items.filter((i) => i.nftId !== nftId)
      saveDb()
      return json(buildCartQuote(ownerKey))
    }

    if (quantity > nft.availableQuantity) {
      return apiError(
        409,
        "OUT_OF_STOCK",
        `Apenas ${nft.availableQuantity} unidade(s) disponível(is).`
      )
    }

    const item = cart.items.find((i) => i.nftId === nftId)
    if (!item) {
      return apiError(404, "NOT_FOUND", "Item não está no carrinho.")
    }

    item.quantity = quantity
    item.snapshotPriceEth = nft.priceEth
    item.snapshotAvailableQuantity = nft.availableQuantity
    saveDb()

    return json(buildCartQuote(ownerKey))
  }),

  http.delete("/api/cart/items/:nftId", async ({ request, params }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao remover item.")
    }

    const user = getAuthenticatedUser(request)
    const ownerKey = getCartOwnerKey(user)
    const cart = ensureCart(ownerKey)

    cart.items = cart.items.filter((i) => i.nftId !== String(params.nftId))
    saveDb()

    return json(buildCartQuote(ownerKey))
  }),

  http.post("/api/cart/coupon", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Erro ao validar cupom.")
    }

    const body = (await request.json()) as { code?: string }
    const normalized = (body.code ?? "").trim().toUpperCase()
    if (!normalized) {
      return apiError(422, "VALIDATION_ERROR", "Informe um código de cupom.")
    }

    const db = getDb()
    const coupon = db.coupons[normalized]
    if (!coupon) {
      return apiError(400, "INVALID_COUPON", "Cupom inválido ou inexistente.")
    }
    if (coupon.isExpired) {
      return apiError(400, "INVALID_COUPON", "Este cupom está expirado.")
    }

    const user = getAuthenticatedUser(request)
    const ownerKey = getCartOwnerKey(user)
    const cart = ensureCart(ownerKey)
    cart.couponCode = coupon.code
    saveDb()

    return json(buildCartQuote(ownerKey))
  }),

  http.delete("/api/cart/coupon", async ({ request }) => {
    const user = getAuthenticatedUser(request)
    const ownerKey = getCartOwnerKey(user)
    const cart = ensureCart(ownerKey)
    cart.couponCode = undefined
    saveDb()

    return json(buildCartQuote(ownerKey))
  }),

  // Aceita as mudanças de preço/estoque recebidas durante o carrinho/checkout
  http.post("/api/cart/acknowledge", async ({ request }) => {
    const db = getDb()
    const user = getAuthenticatedUser(request)
    const ownerKey = getCartOwnerKey(user)
    const cart = ensureCart(ownerKey)

    cart.items = cart.items
      .map((item) => {
        const nft = db.nfts.find((n) => n.id === item.nftId)
        if (!nft || nft.availableQuantity === 0) return null
        return {
          ...item,
          quantity: Math.min(item.quantity, nft.availableQuantity),
          snapshotPriceEth: nft.priceEth,
          snapshotAvailableQuantity: nft.availableQuantity,
        }
      })
      .filter((i): i is CartItem => i !== null)

    saveDb()
    return json(buildCartQuote(ownerKey))
  }),

  // --- Pedidos e Checkout Idempotente ---
  http.post("/api/orders", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha de rede ao enviar pedido.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Sua sessão expirou. Entre novamente para concluir.")
    }

    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim()
    if (!idempotencyKey) {
      return apiError(422, "VALIDATION_ERROR", "Chave de idempotência obrigatória.")
    }

    const body = (await request.json()) as {
      walletId: string
      network: BlockchainNetwork
      expectedTotalEth: string
      collectorNote?: string
    }

    const db = getDb()
    const wallet = user.wallets.find((w) => w.id === body.walletId)
    if (!wallet) {
      return apiError(422, "VALIDATION_ERROR", "Selecione uma carteira válida.")
    }

    const cart = ensureCart(user.id)
    const payloadSignature = JSON.stringify({
      userId: user.id,
      walletAddress: wallet.address,
      network: body.network,
      items: cart.items.map((i) => ({ nftId: i.nftId, quantity: i.quantity })),
      expectedTotalEth: body.expectedTotalEth,
    })

    const existingIdempotency = db.idempotency[idempotencyKey]
    if (existingIdempotency) {
      if (existingIdempotency.payloadSignature !== payloadSignature) {
        return apiError(
          409,
          "IDEMPOTENCY_CONFLICT",
          "Conflito de idempotência: chave reutilizada com dados diferentes."
        )
      }
      const existingOrder = db.orders.find((o) => o.id === existingIdempotency.orderId)
      if (existingOrder) {
        return json(existingOrder, 200)
      }
    }

    if (db.scenario === "price-change-checkout" && cart.items[0]) {
      const targetNft = db.nfts.find((n) => n.id === cart.items[0].nftId)
      if (targetNft) {
        mutateNftAndBroadcast(targetNft.id, {
          priceEth: addEth(targetNft.priceEth, "0.25"),
        })
      }
      db.scenario = "default"
    }

    if (db.scenario === "out-of-stock-checkout" && cart.items[0]) {
      mutateNftAndBroadcast(cart.items[0].nftId, { availableQuantity: 0 })
      db.scenario = "default"
    }

    const currentQuote = buildCartQuote(user.id, body.network)
    if (currentQuote.items.length === 0) {
      return apiError(422, "VALIDATION_ERROR", "Seu carrinho está vazio.")
    }

    if (currentQuote.items.some((i) => i.stockExceeded)) {
      return apiError(
        409,
        "OUT_OF_STOCK",
        "A disponibilidade de um ou mais itens mudou. Revise seu carrinho."
      )
    }

    if (
      currentQuote.requiresReconfirmation ||
      currentQuote.totalEth !== body.expectedTotalEth
    ) {
      return apiError(
        409,
        "PRICE_CHANGED",
        "Os valores ou taxas da cotação foram atualizados. Confirme o novo total para prosseguir."
      )
    }

    const snapshotItems: OrderSnapshotItem[] = currentQuote.items.map((item) => ({
      nftId: item.nftId,
      title: item.nft.title,
      imageUrl: item.nft.imageUrl,
      editionLabel: item.nft.editionLabel,
      unitPriceEth: item.unitPriceEth,
      quantity: item.quantity,
      totalEth: item.itemTotalEth,
    }))

    const order: Order = {
      id: `ORD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      idempotencyKey,
      userId: user.id,
      walletAddress: wallet.address,
      walletProvider: wallet.provider,
      network: body.network,
      collectorNote: body.collectorNote?.trim() || undefined,
      items: snapshotItems,
      subtotalEth: currentQuote.subtotalEth,
      discountEth: currentQuote.discountEth,
      networkFeeEth: currentQuote.networkFeeEth,
      totalPaidEth: currentQuote.totalEth,
      status: "pending",
      createdAt: new Date().toISOString(),
      version: 1,
    }

    db.orders.unshift(order)
    db.idempotency[idempotencyKey] = {
      payloadSignature,
      orderId: order.id,
    }
    saveDb()

    const isRejectedScenario = db.scenario === "payment-rejected"
    setTimeout(() => {
      const latestDb = getDb()
      if (isRejectedScenario) {
        mutateOrderAndBroadcast(order.id, {
          status: "rejected",
          rejectionReason: "Transação recusada pelo nó da rede selecionada.",
        })
        return
      }

      for (const purchased of order.items) {
        const nft = latestDb.nfts.find((n) => n.id === purchased.nftId)
        if (nft) {
          mutateNftAndBroadcast(nft.id, {
            availableQuantity: Math.max(0, nft.availableQuantity - purchased.quantity),
          })
        }
      }

      const userCart = ensureCart(order.userId)
      userCart.items = userCart.items
        .map((cartItem) => {
          const bought = order.items.find((o) => o.nftId === cartItem.nftId)
          if (!bought) return cartItem
          const remaining = cartItem.quantity - bought.quantity
          return remaining > 0 ? { ...cartItem, quantity: remaining } : null
        })
        .filter((entry): entry is CartItem => entry !== null)
      userCart.couponCode = undefined
      saveDb()

      const txHash = `0x${crypto.randomUUID().replace(/-/g, "")}${crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 32)}`

      mutateOrderAndBroadcast(order.id, {
        status: "confirmed",
        transactionHash: txHash,
        explorerUrl: `https://etherscan.io/tx/${txHash}`,
      })
    }, 1100)

    if (db.scenario === "order-timeout-recovery") {
      db.scenario = "default"
      saveDb()
      await delay(5000)
    }

    return json(order, 201)
  }),

  http.get("/api/orders", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Erro ao carregar histórico de pedidos.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Autenticação necessária.")
    }

    const db = getDb()
    const userOrders = db.orders.filter((o) => o.userId === user.id)
    return json(userOrders)
  }),

  http.get("/api/orders/:id", async ({ request, params }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Erro ao consultar pedido.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Autenticação necessária.")
    }

    const db = getDb()
    const order = db.orders.find(
      (o) => o.id === String(params.id) && o.userId === user.id
    )
    if (!order) {
      return apiError(404, "NOT_FOUND", "Pedido não encontrado.")
    }

    return json(order)
  }),

  // --- Perfil e Carteiras ---
  http.patch("/api/profile", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao atualizar perfil.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Sessão inválida.")
    }

    const body = (await request.json()) as {
      name?: string
      username?: string
      ensName?: string
      email?: string
      avatarUrl?: string
    }

    const fieldErrors: Record<string, string> = {}
    if (body.name !== undefined && body.name.trim().length < 2) {
      fieldErrors.name = "O nome de exibição deve ter pelo menos 2 caracteres."
    }
    if (
      body.username !== undefined &&
      !/^[a-zA-Z0-9_]{3,24}$/.test(body.username.trim())
    ) {
      fieldErrors.username =
        "Use entre 3 e 24 caracteres (letras, números ou _)."
    }
    if (
      body.email !== undefined &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
    ) {
      fieldErrors.email = "Formato de e-mail inválido."
    }
    if (Object.keys(fieldErrors).length > 0) {
      return apiError(422, "VALIDATION_ERROR", "Corrija os campos do perfil.", fieldErrors)
    }

    const db = getDb()
    if (body.email) {
      const normalized = body.email.trim().toLowerCase()
      const duplicate = db.users.some(
        (u) => u.id !== user.id && u.email.toLowerCase() === normalized
      )
      if (duplicate) {
        return apiError(409, "CONFLICT", "E-mail já em uso por outra conta.", {
          email: "E-mail indisponível.",
        })
      }
      user.email = normalized
    }

    if (body.username) {
      const normalizedUser = body.username.trim().toLowerCase()
      const duplicateUsername = db.users.some(
        (u) => u.id !== user.id && u.username.toLowerCase() === normalizedUser
      )
      if (duplicateUsername) {
        return apiError(409, "CONFLICT", "Nome de usuário já está em uso.", {
          username: "Nome de usuário indisponível.",
        })
      }
      user.username = normalizedUser
    }

    if (body.name) user.name = body.name.trim()
    if (body.ensName !== undefined) {
      user.ensName = body.ensName.trim() || undefined
    }
    if (body.avatarUrl !== undefined) {
      user.avatarUrl =
        body.avatarUrl.trim() || INITIAL_AVATAR_FALLBACK(user.name)
    }

    saveDb()
    return json({ user: sanitizeUser(user) })
  }),

  http.patch("/api/profile/password", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao alterar senha.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Sessão inválida.")
    }

    const body = (await request.json()) as {
      currentPassword?: string
      newPassword?: string
    }

    if (!body.currentPassword || user.passwordHash !== hashMockPassword(body.currentPassword)) {
      return apiError(422, "VALIDATION_ERROR", "Senha atual incorreta.", {
        currentPassword: "A senha atual não confere.",
      })
    }

    if (!body.newPassword || body.newPassword.length < 6) {
      return apiError(422, "VALIDATION_ERROR", "Nova senha muito curta.", {
        newPassword: "A nova senha deve ter no mínimo 6 caracteres.",
      })
    }

    user.passwordHash = hashMockPassword(body.newPassword)
    saveDb()

    return json({ ok: true })
  }),

  http.post("/api/wallets", async ({ request }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao cadastrar carteira.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Sessão inválida.")
    }

    const body = (await request.json()) as {
      label?: string
      provider?: WalletProvider
      address?: string
      network?: BlockchainNetwork
      isPrimary?: boolean
    }

    const fieldErrors: Record<string, string> = {}
    if (!body.label || body.label.trim().length < 2) {
      fieldErrors.label = "Informe um apelido para a carteira."
    }
    if (!body.provider || !ALL_PROVIDERS.includes(body.provider)) {
      fieldErrors.provider = "Selecione um provedor de carteira válido."
    }
    if (!body.address || body.address.trim().length < 16) {
      fieldErrors.address = "Endereço de carteira inválido."
    }
    if (!body.network || !ALL_NETWORKS.includes(body.network)) {
      fieldErrors.network = "Selecione uma rede suportada."
    }

    if (Object.keys(fieldErrors).length > 0) {
      return apiError(422, "VALIDATION_ERROR", "Dados da carteira inválidos.", fieldErrors)
    }

    const shouldBePrimary = Boolean(body.isPrimary) || user.wallets.length === 0
    if (shouldBePrimary) {
      user.wallets.forEach((w) => {
        w.isPrimary = false
      })
    }

    const newWallet: Wallet = {
      id: `wal-${crypto.randomUUID().slice(0, 8)}`,
      label: body.label!.trim(),
      provider: body.provider!,
      address: body.address!.trim(),
      network: body.network!,
      isPrimary: shouldBePrimary,
    }

    user.wallets.push(newWallet)
    saveDb()

    return json(user.wallets, 201)
  }),

  http.patch("/api/wallets/:id", async ({ request, params }) => {
    try {
      await applyNetworkConditions()
    } catch {
      return apiError(503, "SERVICE_UNAVAILABLE", "Falha ao atualizar carteira.")
    }

    const user = getAuthenticatedUser(request)
    if (!user) {
      return apiError(401, "UNAUTHORIZED", "Sessão inválida.")
    }

    const wallet = user.wallets.find((w) => w.id === String(params.id))
    if (!wallet) {
      return apiError(404, "NOT_FOUND", "Carteira não encontrada.")
    }

    const body = (await request.json()) as Partial<Omit<Wallet, "id">>

    if (body.label !== undefined) {
      if (body.label.trim().length < 2) {
        return apiError(422, "VALIDATION_ERROR", "Apelido inválido.", {
          label: "Mínimo de 2 caracteres.",
        })
      }
      wallet.label = body.label.trim()
    }

    if (body.provider && ALL_PROVIDERS.includes(body.provider)) {
      wallet.provider = body.provider
    }

    if (body.address !== undefined) {
      if (body.address.trim().length < 16) {
        return apiError(422, "VALIDATION_ERROR", "Endereço inválido.", {
          address: "Endereço muito curto.",
        })
      }
      wallet.address = body.address.trim()
    }

    if (body.network && ALL_NETWORKS.includes(body.network)) {
      wallet.network = body.network
    }

    if (body.isPrimary) {
      user.wallets.forEach((w) => {
        w.isPrimary = w.id === wallet.id
      })
    }

    saveDb()
    return json(user.wallets)
  }),
]

function INITIAL_AVATAR_FALLBACK(name: string): string {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "K")
    .join("")
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#d9823b"/>
    <text x="100" y="116" font-family="monospace" font-size="64" font-weight="bold" fill="#14100d" text-anchor="middle">${initials}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}