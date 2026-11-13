import { io, type Socket } from "socket.io-client"
import type { QueryClient } from "@tanstack/react-query"
import type {
  NFT,
  NftUpdatedEvent,
  Order,
  OrderUpdatedEvent,
  PaginatedResponse,
} from "@/domain/types"

let socketInstance: Socket | null = null
let activeUserId: string | null = null
let hasConnectedOnce = false

const seenEventIds = new Set<string>()
const entityVersions = new Map<string, number>()

export function setRealtimeUserId(userId: string | null) {
  if (activeUserId !== userId) {
    activeUserId = userId
    seenEventIds.clear()
    entityVersions.clear()
  }
}

export function initRealtimeSync(queryClient: QueryClient): () => void {
  if (socketInstance) {
    return () => {}
  }

  // Em preview/produção sem servidor Socket.IO real, evita tentativas infinitas de WebSocket
  const isPreviewWithoutBackend =
    typeof window !== "undefined" &&
    window.location.port === "4173" &&
    import.meta.env.VITE_ENABLE_SOCKET !== "true"

  if (isPreviewWithoutBackend) {
    return () => {}
  }

  const socket = io("/", {
    path: "/socket.io/",
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 2,
    reconnectionDelay: 500,
    reconnectionDelayMax: 2000,
  })

  socketInstance = socket

  socket.on("connect_error", () => {
    // Se não houver servidor WS ativo após as tentativas iniciais, encerra silenciosamente
    if (!hasConnectedOnce && socket.io.reconnectionAttempts() <= 2) {
      socket.disconnect()
    }
  })

  socket.on("connect", () => {
    if (hasConnectedOnce) {
      // Reconcilia recursos ativos com a API REST após reconexão
      void queryClient.invalidateQueries({ queryKey: ["nfts"] })
      void queryClient.invalidateQueries({ queryKey: ["nft"] })
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
      void queryClient.invalidateQueries({ queryKey: ["orders"] })
      void queryClient.invalidateQueries({ queryKey: ["order"] })
    }
    hasConnectedOnce = true
  })

  socket.on("nft.updated", (event: NftUpdatedEvent) => {
    if (!event?.eventId || !event?.nftId) return
    if (seenEventIds.has(event.eventId)) return

    const versionKey = `nft:${event.nftId}`
    const currentVersion = entityVersions.get(versionKey) ?? 0
    if (event.version <= currentVersion) return

    seenEventIds.add(event.eventId)
    entityVersions.set(versionKey, event.version)

    // Atualiza detalhe do NFT no cache
    queryClient.setQueryData<NFT>(["nft", event.nftId], (prev) => {
      if (!prev || prev.version >= event.version) return prev
      return {
        ...prev,
        ...event.changes,
        version: event.version,
      }
    })

    // Atualiza listas paginadas no cache
    queryClient.setQueriesData<PaginatedResponse<NFT>>(
      { queryKey: ["nfts"] },
      (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          data: prev.data.map((item) =>
            item.id === event.nftId && item.version < event.version
              ? { ...item, ...event.changes, version: event.version }
              : item
          ),
        }
      }
    )

    // Recalcula carrinho/cotação e dispara aviso acessível
    void queryClient.invalidateQueries({ queryKey: ["cart"] })
    window.dispatchEvent(
      new CustomEvent("kurio:nft-updated", { detail: event })
    )
  })

  socket.on("order.updated", (event: OrderUpdatedEvent) => {
    if (!event?.eventId || !event?.orderId) return
    if (!activeUserId || event.userId !== activeUserId) return
    if (seenEventIds.has(event.eventId)) return

    const versionKey = `order:${event.orderId}`
    const currentVersion = entityVersions.get(versionKey) ?? 0
    if (event.version <= currentVersion) return

    seenEventIds.add(event.eventId)
    entityVersions.set(versionKey, event.version)

    const applyUpdate = (prev: Order): Order => {
      if (prev.status === "confirmed" || prev.status === "rejected") {
        return prev
      }
      return {
        ...prev,
        status: event.status,
        transactionHash: event.transactionHash ?? prev.transactionHash,
        explorerUrl: event.explorerUrl ?? prev.explorerUrl,
        rejectionReason: event.rejectionReason ?? prev.rejectionReason,
        version: event.version,
      }
    }

    queryClient.setQueryData<Order>(["order", event.orderId], (prev) =>
      prev ? applyUpdate(prev) : prev
    )

    queryClient.setQueryData<Order[]>(["orders"], (prev) =>
      prev
        ? prev.map((order) =>
            order.id === event.orderId ? applyUpdate(order) : order
          )
        : prev
    )

    if (event.status === "confirmed") {
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
      void queryClient.invalidateQueries({ queryKey: ["nfts"] })
      void queryClient.invalidateQueries({ queryKey: ["nft"] })
    }
  })

  return () => {
    socket.disconnect()
    socketInstance = null
    hasConnectedOnce = false
  }
}

export function reconnectRealtimeForSession(userId: string | null) {
  setRealtimeUserId(userId)
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance.connect()
  }
}