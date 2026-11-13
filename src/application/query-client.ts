import { QueryClient } from "@tanstack/react-query"
import { HttpApiError } from "@/infrastructure/http/client"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s antes de revalidar em segundo plano
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof HttpApiError) {
          // Não repete erros definitivos de cliente (400, 401, 404, 409, 422)
          if (error.status >= 400 && error.status < 500) {
            return false
          }
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})