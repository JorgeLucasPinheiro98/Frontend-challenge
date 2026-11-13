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
  const token = getStoredToken()

  return useQuery({
    queryKey: ["order", orderId],
    enabled: Boolean(token && orderId),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<Order>(`/orders/${orderId}`, {
        signal,
      })
      return data
    },
    // Polling de segurança apenas enquanto o pedido estiver pendente
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 2000 : false,
  })
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
    }: {
      idempotencyKey: string
      walletId: string
      network: BlockchainNetwork
      expectedTotalEth: string
      collectorNote?: string
    }) => {
      const { data } = await apiClient.post<Order>(
        "/orders",
        { walletId, network, expectedTotalEth, collectorNote },
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
    },
  })
}