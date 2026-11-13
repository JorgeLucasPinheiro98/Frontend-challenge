import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { BlockchainNetwork, CartQuote } from "@/domain/types"
import { apiClient } from "@/infrastructure/http/client"

export function useCart(network: BlockchainNetwork = "Ethereum") {
  return useQuery({
    queryKey: ["cart", network],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<CartQuote>("/cart", {
        params: { network },
        signal,
      })
      return data
    },
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { nftId: string; quantity?: number }) => {
      const { data } = await apiClient.post<CartQuote>("/cart/items", payload)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      nftId,
      quantity,
    }: {
      nftId: string
      quantity: number
    }) => {
      const { data } = await apiClient.patch<CartQuote>(
        `/cart/items/${nftId}`,
        { quantity }
      )
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nftId: string) => {
      const { data } = await apiClient.delete<CartQuote>(`/cart/items/${nftId}`)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useApplyCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (code: string) => {
      const { data } = await apiClient.post<CartQuote>("/cart/coupon", {
        code,
      })
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useRemoveCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.delete<CartQuote>("/cart/coupon")
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useAcknowledgeCartChanges() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<CartQuote>("/cart/acknowledge")
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}