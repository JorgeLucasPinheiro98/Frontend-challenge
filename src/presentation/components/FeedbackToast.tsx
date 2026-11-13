import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Info, Radio, X } from "lucide-react"
import type { NftUpdatedEvent } from "@/domain/types"
import {
  notifyToast,
  TOAST_EVENT_NAME,
  type ToastItem,
} from "@/lib/toast"

export function FeedbackToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>()

    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastItem>
      const toast = customEvent.detail
      if (!toast) return

      setToasts((prev) => [...prev.slice(-3), toast])

      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id))
        timers.delete(toast.id)
      }, toast.durationMs)

      timers.set(toast.id, timer)
    }

    const handleRealtimeNft = (event: Event) => {
      const custom = event as CustomEvent<NftUpdatedEvent>
      const { nftId, changes } = custom.detail
      const parts: string[] = []
      if (changes.priceEth) parts.push(`novo preço: ${changes.priceEth} ETH`)
      if (typeof changes.availableQuantity === "number") {
        parts.push(`disponibilidade: ${changes.availableQuantity} un.`)
      }
      if (parts.length > 0) {
        notifyToast({
          type: "realtime",
          title: `Atualização em tempo real (${nftId})`,
          description: parts.join(" • "),
        })
      }
    }

    window.addEventListener(TOAST_EVENT_NAME, handleToast)
    window.addEventListener("kurio:nft-updated", handleRealtimeNft)

    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, handleToast)
      window.removeEventListener("kurio:nft-updated", handleRealtimeNft)
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
    >
      {toasts.map((toast) => {
        const isError = toast.type === "error"
        const isSuccess = toast.type === "success"
        const isRealtime = toast.type === "realtime"

        return (
          <div
            key={toast.id}
            role={isError ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-3.5 text-xs shadow-xl transition-all ${
              isError
                ? "border-destructive/60"
                : isSuccess || isRealtime
                  ? "border-primary/60"
                  : "border-border"
            }`}
          >
            {isError ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
            ) : isSuccess ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : isRealtime ? (
              <Radio className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : (
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            )}

            <div className="min-w-0 flex-1">
              <p className="font-bold text-foreground">{toast.title}</p>
              {toast.description && (
                <p className="mt-1 leading-relaxed text-muted-foreground">
                  {toast.description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fechar notificação"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}