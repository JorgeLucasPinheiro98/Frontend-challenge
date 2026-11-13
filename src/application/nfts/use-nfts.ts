import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
  BlockchainNetwork,
  NFT,
  NFTCollection,
  PaginatedResponse,
} from "@/domain/types"
import { apiClient, getStoredToken } from "@/infrastructure/http/client"

export interface NFTCatalogParams {
  q?: string
  collection?: NFTCollection
  network?: BlockchainNetwork
  minPrice?: string
  maxPrice?: string
  tab?: "all" | "new" | "trending"
  sort?: "recent" | "price_asc" | "price_desc"
  page?: number
  limit?: number
}

export function useNFTs(params: NFTCatalogParams) {
  return useQuery({
    queryKey: ["nfts", params],
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<PaginatedResponse<NFT>>("/nfts", {
        params,
        signal,
      })
      return data
    },
    placeholderData: (previousData) => previousData,
  })
}

export function useNFTDetail(nftId: string) {
  return useQuery({
    queryKey: ["nft", nftId],
    enabled: Boolean(nftId),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<NFT>(`/nfts/${nftId}`, { signal })
      return data
    },
  })
}

export function useFavorites() {
  const token = getStoredToken()

  return useQuery({
    queryKey: ["favorites"],
    enabled: Boolean(token),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<string[]>("/favorites", { signal })
      return data
    },
  })
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      nftId,
      isCurrentlyFavorite,
    }: {
      nftId: string
      isCurrentlyFavorite: boolean
    }) => {
      if (isCurrentlyFavorite) {
        const { data } = await apiClient.delete<string[]>(`/favorites/${nftId}`)
        return data
      }
      const { data } = await apiClient.post<string[]>(`/favorites/${nftId}`)
      return data
    },
    // Atualização otimista com snapshot para rollback
    onMutate: async ({ nftId, isCurrentlyFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ["favorites"] })
      const previousFavorites =
        queryClient.getQueryData<string[]>(["favorites"]) ?? []

      const optimisticNext = isCurrentlyFavorite
        ? previousFavorites.filter((id) => id !== nftId)
        : Array.from(new Set([...previousFavorites, nftId]))

      queryClient.setQueryData<string[]>(["favorites"], optimisticNext)

      return { previousFavorites }
    },
    onError: (_error, _variables, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData<string[]>(
          ["favorites"],
          context.previousFavorites
        )
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}