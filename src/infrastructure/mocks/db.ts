import type {
    CartItem,
    NFT,
    NftUpdatedEvent,
    Order,
    OrderUpdatedEvent,
  } from "@/domain/types"
  import {
    INITIAL_COUPONS,
    INITIAL_NFTS,
    INITIAL_USERS,
    type CouponRecord,
    type StoredUser,
  } from "./fixtures"
  
  export type MockScenario =
    | "default"
    | "empty"
    | "slow"
    | "network-error"
    | "session-expired"
    | "price-change-checkout"
    | "out-of-stock-checkout"
    | "order-timeout-recovery"
    | "payment-rejected"
  
  interface SessionRecord {
    token: string
    userId: string
    expiresAt: number
  }
  
  interface IdempotencyRecord {
    payloadSignature: string
    orderId: string
  }
  
  interface MockDatabaseState {
    users: StoredUser[]
    sessions: Record<string, SessionRecord>
    nfts: NFT[]
    favoritesByUser: Record<string, string[]>
    cartsByOwner: Record<string, { items: CartItem[]; couponCode?: string }>
    orders: Order[]
    idempotency: Record<string, IdempotencyRecord>
    coupons: Record<string, CouponRecord>
    scenario: MockScenario
    latencyMs: number
  }
  
  const STORAGE_KEY = "kurio_msw_db_v1"
  
  type SocketBroadcaster = {
    emitNftUpdated: (event: NftUpdatedEvent) => void
    emitOrderUpdated: (event: OrderUpdatedEvent) => void
  }
  
  let broadcaster: SocketBroadcaster | null = null
  
  export function registerSocketBroadcaster(instance: SocketBroadcaster) {
    broadcaster = instance
  }
  
  function createInitialState(): MockDatabaseState {
    return {
      users: structuredClone(INITIAL_USERS),
      sessions: {},
      nfts: structuredClone(INITIAL_NFTS),
      favoritesByUser: {
        "usr-01": ["nft-042", "nft-552"],
        "usr-02": ["nft-009"],
      },
      cartsByOwner: {
        guest: { items: [] },
        "usr-01": { items: [] },
        "usr-02": { items: [] },
      },
      orders: [],
      idempotency: {},
      coupons: structuredClone(INITIAL_COUPONS),
      scenario: "default",
      latencyMs: 180,
    }
  }
  
  function loadState(): MockDatabaseState {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        const initial = createInitialState()
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
        return initial
      }
      return JSON.parse(raw) as MockDatabaseState
    } catch {
      return createInitialState()
    }
  }
  
  let state: MockDatabaseState = loadState()
  
  export function getDb(): MockDatabaseState {
    return state
  }
  
  export function saveDb() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Fallback em memória caso localStorage esteja indisponível
    }
  }
  
  export function resetDb(scenario: MockScenario = "default", latencyMs = 180) {
    state = createInitialState()
    state.scenario = scenario
    state.latencyMs = latencyMs
    saveDb()
    return state
  }
  
  export function setMockScenario(scenario: MockScenario, latencyMs?: number) {
    state.scenario = scenario
    if (typeof latencyMs === "number") {
      state.latencyMs = latencyMs
    }
    saveDb()
  }
  
  export function mutateNftAndBroadcast(
    nftId: string,
    changes: { priceEth?: string; availableQuantity?: number }
  ): NftUpdatedEvent | null {
    const nft = state.nfts.find((item) => item.id === nftId)
    if (!nft) return null
  
    if (typeof changes.priceEth === "string") {
      nft.priceEth = changes.priceEth
    }
    if (typeof changes.availableQuantity === "number") {
      nft.availableQuantity = Math.max(0, changes.availableQuantity)
    }
    nft.version += 1
    saveDb()
  
    const event: NftUpdatedEvent = {
      eventId: crypto.randomUUID(),
      nftId: nft.id,
      version: nft.version,
      timestamp: new Date().toISOString(),
      changes,
    }
  
    broadcaster?.emitNftUpdated(event)
    return event
  }
  
  export function mutateOrderAndBroadcast(
    orderId: string,
    updates: Partial<
      Pick<Order, "status" | "transactionHash" | "explorerUrl" | "rejectionReason">
    >
  ): OrderUpdatedEvent | null {
    const order = state.orders.find((item) => item.id === orderId)
    if (!order) return null
  
    if (order.status === "confirmed" || order.status === "rejected") {
      return null // Estados terminais não sofrem regressão
    }
  
    Object.assign(order, updates)
    order.version += 1
    saveDb()
  
    const event: OrderUpdatedEvent = {
      eventId: crypto.randomUUID(),
      orderId: order.id,
      userId: order.userId,
      status: order.status,
      transactionHash: order.transactionHash,
      explorerUrl: order.explorerUrl,
      rejectionReason: order.rejectionReason,
      version: order.version,
      timestamp: new Date().toISOString(),
    }
  
    broadcaster?.emitOrderUpdated(event)
    return event
  }
  
  declare global {
    interface Window {
      __KURIO_MOCK__?: {
        getState: () => MockDatabaseState
        reset: (scenario?: MockScenario, latencyMs?: number) => MockDatabaseState
        setScenario: (scenario: MockScenario, latencyMs?: number) => void
        updateNft: typeof mutateNftAndBroadcast
        updateOrder: typeof mutateOrderAndBroadcast
        emitRawNftEvent: (event: NftUpdatedEvent) => void
        emitRawOrderEvent: (event: OrderUpdatedEvent) => void
      }
    }
  }
  
  if (typeof window !== "undefined") {
    window.__KURIO_MOCK__ = {
      getState: getDb,
      reset: resetDb,
      setScenario: setMockScenario,
      updateNft: mutateNftAndBroadcast,
      updateOrder: mutateOrderAndBroadcast,
      emitRawNftEvent: (event) => broadcaster?.emitNftUpdated(event),
      emitRawOrderEvent: (event) => broadcaster?.emitOrderUpdated(event),
    }
  }