import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { BlockchainNetwork, User, Wallet, WalletProvider } from "@/domain/types"
import {
  apiClient,
  getStoredToken,
  setStoredToken,
} from "@/infrastructure/http/client"

export function useSession() {
  const token = getStoredToken()

  return useQuery({
    queryKey: ["session"],
    enabled: Boolean(token),
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get<{ user: User }>("/auth/session", {
        signal,
      })
      void import("@/infrastructure/realtime/socket").then(
        ({ setRealtimeUserId }) => setRealtimeUserId(data.user.id)
      )
      return data.user
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await apiClient.post<{ token: string; user: User }>(
        "/auth/login",
        payload
      )
      return data
    },
    onSuccess: ({ token, user }) => {
      setStoredToken(token)
      queryClient.removeQueries({ queryKey: ["favorites"] })
      queryClient.removeQueries({ queryKey: ["orders"] })
      queryClient.removeQueries({ queryKey: ["order"] })
      queryClient.setQueryData(["session"], user)
      void import("@/infrastructure/realtime/socket").then(
        ({ reconnectRealtimeForSession }) =>
          reconnectRealtimeForSession(user.id)
      )
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
      void queryClient.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      name: string
      email: string
      password: string
    }) => {
      const { data } = await apiClient.post<{ token: string; user: User }>(
        "/auth/register",
        payload
      )
      return data
    },
    onSuccess: ({ token, user }) => {
      setStoredToken(token)
      queryClient.setQueryData(["session"], user)
      void import("@/infrastructure/realtime/socket").then(
        ({ reconnectRealtimeForSession }) =>
          reconnectRealtimeForSession(user.id)
      )
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
      void queryClient.invalidateQueries({ queryKey: ["favorites"] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await apiClient.post("/auth/logout")
    },
    onSettled: () => {
      setStoredToken(null)
      queryClient.setQueryData(["session"], null)
      queryClient.removeQueries({ queryKey: ["favorites"] })
      queryClient.removeQueries({ queryKey: ["orders"] })
      queryClient.removeQueries({ queryKey: ["order"] })
      void import("@/infrastructure/realtime/socket").then(
        ({ reconnectRealtimeForSession }) => reconnectRealtimeForSession(null)
      )
      void queryClient.invalidateQueries({ queryKey: ["cart"] })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      name?: string
      username?: string
      ensName?: string
      email?: string
      avatarUrl?: string
    }) => {
      const { data } = await apiClient.patch<{ user: User }>(
        "/profile",
        payload
      )
      return data.user
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["session"], updatedUser)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (payload: {
      currentPassword: string
      newPassword: string
    }) => {
      await apiClient.patch("/profile/password", payload)
    },
  })
}

export function useAddWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      label: string
      provider: WalletProvider
      address: string
      network: BlockchainNetwork
      isPrimary?: boolean
    }) => {
      const { data } = await apiClient.post<Wallet[]>("/wallets", payload)
      return data
    },
    onSuccess: (wallets) => {
      queryClient.setQueryData<User | null>(["session"], (prev) =>
        prev ? { ...prev, wallets } : prev
      )
    },
  })
}

export function useUpdateWallet() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      walletId,
      ...payload
    }: {
      walletId: string
      label?: string
      provider?: WalletProvider
      address?: string
      network?: BlockchainNetwork
      isPrimary?: boolean
    }) => {
      const { data } = await apiClient.patch<Wallet[]>(
        `/wallets/${walletId}`,
        payload
      )
      return data
    },
    onSuccess: (wallets) => {
      queryClient.setQueryData<User | null>(["session"], (prev) =>
        prev ? { ...prev, wallets } : prev
      )
    },
  })
}