import { useEffect, useRef } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { BlockchainNetwork, Order } from "@/domain/types"
import { apiClient, getStoredToken } from "@/infrastructure/http/client"

export function useOrders() {
  const token = getStoredToken()

  return useQuery({
    queryKey: ["orders"],
    enabled: Boolean(token),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Order[]>("/orders", { signal })
      return data
    },
  })
}

export function useOrderDetail(orderId: string) {
  const queryClient = useQueryClient()
  const syncedConfirmedRef = useRef<string | null>(null)

  const query = useQuery({
    queryKey: ["order", orderId],
    enabled: Boolean(orderId),
    retry: (failureCount, error) => {
      if (
        error &&
        "status" in error &&
        (error.status === 404 || error.status === 401)
      ) {
        return false
      }
      return failureCount < 2
    },
    queryFn: async ({ signal }) => {
      const token = getStoredToken()
      if (!token) {
        throw Object.assign(new Error("Sessão não encontrada."), {
          status: 401,
        })
      }
      const { data } = await apiClient.get<Order>(`/orders/${orderId}`, {
        signal,
      })
      return data
    },
    // Polling de segurança apenas enquanto o pedido estiver pendente
    refetchInterval: (q) =>
      q.state.data?.status === "pending" ? 1000 : false,
  })

  // Assim que o pedido confirmar (via polling ou Socket.IO), sincroniza estoque e carrinho
  useEffect(() => {
    const order = query.data
    if (
      order?.status === "confirmed" &&
      syncedConfirmedRef.current !== order.id
    ) {
      syncedConfirmedRef.current = order.id
      void queryClient.invalidateQueries({ queryKey: ["nfts"] })
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
      void queryClient.invalidateQueries({ queryKey: ["orders"] })
    }
  }, [query.data, queryClient])

  return query
}

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      idempotencyKey,
      walletId,
      network,
      expectedTotalEth,
      collectorNote,
      cartItems,
    }: {
      idempotencyKey: string
      walletId: string
      network: BlockchainNetwork
      expectedTotalEth: string
      collectorNote?: string
      cartItems: Array<{ nftId: string; quantity: number }>
    }) => {
      const { data } = await apiClient.post<Order>(
        "/orders",
        { walletId, network, expectedTotalEth, collectorNote, cartItems },
        {
          headers: {
            "Idempotency-Key": idempotencyKey,
          },
        }
      )
      return data
    },
    onSuccess: (order) => {
      queryClient.setQueryData<Order>(["order", order.id], order)
      void queryClient.invalidateQueries({ queryKey: ["orders"] })
      void queryClient.invalidateQueries({ queryKey: ["nfts"] })
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}