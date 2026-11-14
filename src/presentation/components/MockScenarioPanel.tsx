import { useState } from "react"
import { ChevronDown, ChevronUp, Radio, RotateCcw, Sliders } from "lucide-react"
import { notifyToast } from "@/lib/toast"
import type { NftUpdatedEvent } from "@/domain/types"

const SCENARIOS = [
  { id: "default", label: "Padrão (fluxo normal)" },
  { id: "slow", label: "Latência elevada (slow)" },
  { id: "empty", label: "Catálogo vazio (empty)" },
  { id: "network-error", label: "Falha de rede (503)" },
  { id: "session-expired", label: "Sessão expirada (401)" },
  { id: "price-change-checkout", label: "Alterar preço no checkout" },
  { id: "out-of-stock-checkout", label: "Esgotar estoque no checkout" },
  { id: "payment-rejected", label: "Recusar liquidação do pedido" },
  { id: "order-timeout-recovery", label: "Timeout + recuperação idempotente" },
] as const

export function MockScenarioPanel() {
  const [open, setOpen] = useState(false)
  const [activeScenario, setActiveScenario] = useState<string>("default")

  const handleSelectScenario = async (scenarioId: string) => {
    try {
      const response = await fetch("/api/mock/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenarioId }),
      })
      if (!response.ok) {
        throw new Error(`Falha ao ativar cenário (${response.status}).`)
      }
      setActiveScenario(scenarioId)
      notifyToast({
        type: "info",
        title: "Cenário QA atualizado",
        description: `Modo ativo: ${scenarioId}`,
      })
    } catch (error) {
      notifyToast({
        type: "error",
        title: "Não foi possível ativar o cenário",
        description:
          error instanceof Error ? error.message : "Falha de comunicação.",
      })
    }
  }

  const handleResetMocks = async () => {
    try {
      const response = await fetch("/api/mock/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "default" }),
      })
      if (!response.ok) {
        throw new Error(`Falha ao resetar mocks (${response.status}).`)
      }
      setActiveScenario("default")
      notifyToast({
        type: "success",
        title: "Estado restaurado",
        description: "Banco simulado resetado para o cenário padrão.",
      })
    } catch (error) {
      notifyToast({
        type: "error",
        title: "Não foi possível resetar os mocks",
        description:
          error instanceof Error ? error.message : "Falha de comunicação.",
      })
    }
  }

  const handleSimulateRealtimeTick = async () => {
    try {
      const response = await fetch("/api/mock/emit-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nftId: "nft-042",
          priceEth: "1.35",
        }),
      })
      if (!response.ok) {
        throw new Error(`Falha ao emitir atualização (${response.status}).`)
      }
      const data = (await response.json()) as {
        event?: NftUpdatedEvent
      }
      if (!data.event) {
        throw new Error("O mock não retornou o evento emitido.")
      }
    } catch (error) {
      notifyToast({
        type: "error",
        title: "Não foi possível emitir o evento",
        description:
          error instanceof Error ? error.message : "Falha de comunicação.",
      })
    }
  }

  return (
    <aside
      aria-label="Painel de simulação de cenários"
      className="fixed bottom-16 left-4 z-40 text-xs md:bottom-4"
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
              onClick={() => void handleSimulateRealtimeTick()}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 font-bold text-primary hover:bg-primary/20"
            >
              <Radio className="size-3.5" />
              <span>Emitir evento tempo real</span>
            </button>

            <button
              type="button"
              onClick={() => void handleResetMocks()}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" />
              <span>Resetar estado mock</span>
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