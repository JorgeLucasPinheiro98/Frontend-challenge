export type ToastType = "success" | "error" | "info" | "warning" | "realtime"

export interface ToastInput {
  type?: ToastType
  title: string
  description?: string
  durationMs?: number
}

export interface ToastItem {
  id: string
  type: ToastType
  title: string
  description?: string
  durationMs: number
}

export const TOAST_EVENT_NAME = "kurio:feedback-toast"

export function notifyToast(input: ToastInput): void {
  if (typeof window === "undefined") return
  const detail: ToastItem = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: input.type ?? "info",
    title: input.title,
    description: input.description,
    durationMs: input.durationMs ?? 4500,
  }
  window.dispatchEvent(new CustomEvent<ToastItem>(TOAST_EVENT_NAME, { detail }))
}