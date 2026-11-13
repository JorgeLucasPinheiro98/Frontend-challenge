import { useState } from "react"
import { ChevronDown, ChevronUp, Radio, Sliders } from "lucide-react"
import type { NftUpdatedEvent } from "@/domain/types"
import { notifyToast } from "@/lib/toast"

const SCENARIOS = [
  { id: "default", label: "Padrão (fluxo normal)" },
  { id: "price-change-checkout", label: "Alterar preço no checkout" },
  { id: "out-of-stock-checkout", label: "Esgotar estoque no checkout" },
  { id: "payment-rejected", label: "Recusar liquidação do pedido" },
  { id: "order-timeout-recovery", label: "Simular timeout + idempotência" },
] as const

export function MockScenarioPanel() {
  const [open, setOpen] = useState(false)
  const [activeScenario, setActiveScenario] = useState<string>("default")

  const handleSelectScenario = async (scenarioId: string) => {
    setActiveScenario(scenarioId)
    try {
      await fetch("/api/mock/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarioId }),
      })
    } catch {
      // Fallback silencioso caso o endpoint auxiliar não esteja registrado
    }
    notifyToast({
      type: "info",
      title: "Cenário QA atualizado",
      description: `Modo ativo: ${scenarioId}`,
    })
  }

  const handleSimulateRealtimeTick = () => {
    const eventDetail: NftUpdatedEvent = {
      eventId: crypto.randomUUID(),
      nftId: "nft-042",
      version: Date.now(),
      timestamp: new Date().toISOString(),
      changes: {
        priceEth: "1.35",
      },
    }
    window.dispatchEvent(
      new CustomEvent<NftUpdatedEvent>("kurio:nft-updated", {
        detail: eventDetail,
      })
    )
  }

  return (
    <aside
      aria-label="Painel de simulação de cenários"
      className="fixed bottom-4 left-4 z-40 text-xs"
    >
      {open ? (
        <div className="w-72 rounded-xl border border-border bg-card p-3.5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <Sliders className="size-3.5 text-primary" />
              <span>Simulador QA</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Minimizar painel de simulação"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <label
              htmlFor="qa-scenario-select"
              className="block text-[11px] text-muted-foreground"
            >
              Cenário de rede/API:
            </label>
            <select
              id="qa-scenario-select"
              value={activeScenario}
              onChange={(e) => void handleSelectScenario(e.target.value)}
              className="h-8 w-full rounded border border-input bg-background px-2 text-xs text-foreground"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSimulateRealtimeTick}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-bold text-primary hover:bg-primary/20"
            >
              <Radio className="size-3.5" />
              <span>Emitir evento tempo real</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-lg backdrop-blur hover:border-primary/50 hover:text-foreground"
        >
          <Sliders className="size-3 text-primary" />
          <span>QA</span>
          <ChevronUp className="size-3" />
        </button>
      )}
    </aside>
  )
}