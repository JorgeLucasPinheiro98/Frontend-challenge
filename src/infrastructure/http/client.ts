import axios, { AxiosError } from "axios"
import type { APIError } from "@/domain/types"

const TOKEN_STORAGE_KEY = "kurio_auth_token"

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  } catch {
    // Ignora falha de storage em ambientes restritos
  }
}

export class HttpApiError extends Error {
  readonly status: number
  readonly code: APIError["code"]
  readonly fieldErrors?: Record<string, string>

  constructor(status: number, payload: APIError) {
    super(payload.message)
    this.name = "HttpApiError"
    this.status = status
    this.code = payload.code
    this.fieldErrors = payload.fieldErrors
  }
}

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 4000,
  headers: {
    "Content-Type": "application/json",
  },
})

apiClient.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<APIError>) => {
    if (error.code === "ERR_CANCELED") {
      return Promise.reject(error)
    }

    const status = error.response?.status ?? 0
    const url = error.config?.url ?? ""

    if (status === 401 && !url.includes("/auth/login")) {
      setStoredToken(null)
      window.dispatchEvent(new CustomEvent("kurio:session-expired"))
    }

    if (error.response?.data?.code) {
      return Promise.reject(new HttpApiError(status, error.response.data))
    }

    const isTimeout = error.code === "ECONNABORTED"
    return Promise.reject(
      new HttpApiError(status || 503, {
        code: "SERVICE_UNAVAILABLE",
        message: isTimeout
          ? "A requisição excedeu o tempo limite. Verificando estado..."
          : "Falha de comunicação com o servidor.",
      })
    )
  }
)