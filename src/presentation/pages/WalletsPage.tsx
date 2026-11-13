import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  Check,
  ChevronLeft,
  Edit2,
  Plus,
  Wallet as WalletIcon,
} from "lucide-react"
import type {
  BlockchainNetwork,
  Wallet,
  WalletProvider,
} from "@/domain/types"
import {
  useAddWallet,
  useSession,
  useUpdateWallet,
} from "@/application/auth/use-auth"
import { HttpApiError } from "@/infrastructure/http/client"
import { Button } from "@/components/ui/button"
import { AccountSidebar } from "../components/AccountSidebar"
import { notifyToast } from "@/lib/toast"

const NETWORKS: BlockchainNetwork[] = ["Ethereum", "Polygon", "Solana"]
const PROVIDERS: WalletProvider[] = [
  "MetaMask",
  "Coinbase Wallet",
  "WalletConnect",
]

export function WalletsPage() {
  const { data: user } = useSession()
  const addWallet = useAddWallet()
  const updateWallet = useUpdateWallet()

  const [editingWalletId, setEditingWalletId] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [provider, setProvider] = useState<WalletProvider>("MetaMask")
  const [address, setAddress] = useState("")
  const [network, setNetwork] = useState<BlockchainNetwork>("Ethereum")
  const [isPrimary, setIsPrimary] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const resetForm = () => {
    setEditingWalletId(null)
    setLabel("")
    setProvider("MetaMask")
    setAddress("")
    setNetwork("Ethereum")
    setIsPrimary(false)
    setErrors({})
  }

  const startEdit = (wallet: Wallet) => {
    setEditingWalletId(wallet.id)
    setLabel(wallet.label)
    setProvider(wallet.provider)
    setAddress(wallet.address)
    setNetwork(wallet.network)
    setIsPrimary(wallet.isPrimary)
    setErrors({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (label.trim().length < 2) {
      nextErrors.label = "Informe um apelido com pelo menos 2 caracteres."
    }
    if (address.trim().length < 16) {
      nextErrors.address =
        "Informe um endereço de carteira válido (mín. 16 caracteres)."
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})

    if (editingWalletId) {
      updateWallet.mutate(
        {
          walletId: editingWalletId,
          label: label.trim(),
          provider,
          address: address.trim(),
          network,
          isPrimary,
        },
        {
          onSuccess: () => {
            notifyToast({
              type: "success",
              title: "Carteira atualizada",
              description: `${label.trim()} salva com sucesso.`,
            })
            resetForm()
          },
          onError: (err) => {
            if (err instanceof HttpApiError && err.fieldErrors) {
              setErrors(err.fieldErrors)
            } else {
              notifyToast({
                type: "error",
                title: "Erro ao atualizar carteira",
                description: err.message,
              })
            }
          },
        }
      )
    } else {
      addWallet.mutate(
        {
          label: label.trim(),
          provider,
          address: address.trim(),
          network,
          isPrimary,
        },
        {
          onSuccess: () => {
            notifyToast({
              type: "success",
              title: "Carteira cadastrada",
              description: `${label.trim()} adicionada à sua conta.`,
            })
            resetForm()
          },
          onError: (err) => {
            if (err instanceof HttpApiError && err.fieldErrors) {
              setErrors(err.fieldErrors)
            } else {
              notifyToast({
                type: "error",
                title: "Erro ao cadastrar carteira",
                description: err.message,
              })
            }
          },
        }
      )
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 md:py-8 lg:px-8">
      {/* Cabeçalho Mobile */}
      <div className="relative mb-6 flex items-center justify-center md:hidden">
        <Link
          to="/profile"
          aria-label="Voltar ao perfil"
          className="absolute left-0 flex size-10 items-center justify-center rounded-full bg-card text-primary"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <span className="text-base font-bold text-foreground">
          Minhas carteiras
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <AccountSidebar activeSection="wallets" />
        </div>

        <div className="space-y-8 lg:col-span-9">
          {/* Carteiras Cadastradas */}
          <section className="text-xs">
            <h1 className="text-base font-bold text-foreground">
              Carteiras conectadas e cadastradas
            </h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie suas carteiras principal e secundária para receber NFTs e
              assinar compras.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              {user?.wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className={`flex flex-col justify-between rounded-2xl border p-4 md:rounded-sm ${
                    wallet.isPrimary
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <WalletIcon className="size-4 text-primary" />
                        <span>{wallet.label}</span>
                      </div>
                      {wallet.isPrimary ? (
                        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                          Principal
                        </span>
                      ) : (
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] text-muted-foreground">
                          Secundária
                        </span>
                      )}
                    </div>

                    <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">
                      {wallet.address}
                    </p>
                    <p className="mt-2 text-[11px] text-foreground">
                      {wallet.provider} • Rede <strong>{wallet.network}</strong>
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => startEdit(wallet)}
                      className="rounded-full md:rounded-sm"
                    >
                      <Edit2 className="size-3" />
                      <span>Editar</span>
                    </Button>
                    {!wallet.isPrimary && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() =>
                          updateWallet.mutate({
                            walletId: wallet.id,
                            isPrimary: true,
                          })
                        }
                        className="rounded-full md:rounded-sm"
                      >
                        <Check className="size-3" />
                        <span>Definir como principal</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Formulário Cadastro / Edição */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4 rounded-2xl bg-card/60 p-5 text-xs md:rounded-none md:border-t md:border-border md:bg-transparent md:px-0 md:pt-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                {editingWalletId
                  ? "Editar carteira"
                  : "Adicionar nova carteira"}
              </h2>
              {editingWalletId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-primary hover:underline"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wal-label" className="block text-foreground">
                  Apelido da carteira<span className="text-primary">*</span>
                </label>
                <input
                  id="wal-label"
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Carteira Secundária"
                  aria-invalid={Boolean(errors.label)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-[#17100B] px-3 text-foreground md:h-10 md:rounded-sm"
                />
                {errors.label && (
                  <p role="alert" className="mt-1 text-[11px] text-red-400">
                    {errors.label}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="wal-provider" className="block text-foreground">
                  Provedor<span className="text-primary">*</span>
                </label>
                <select
                  id="wal-provider"
                  value={provider}
                  onChange={(e) =>
                    setProvider(e.target.value as WalletProvider)
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-[#17100B] px-3 text-foreground md:h-10 md:rounded-sm"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="wal-address" className="block text-foreground">
                  Endereço 0x<span className="text-primary">*</span>
                </label>
                <input
                  id="wal-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="0x..."
                  aria-invalid={Boolean(errors.address)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-[#17100B] px-3 text-foreground md:h-10 md:rounded-sm"
                />
                {errors.address && (
                  <p role="alert" className="mt-1 text-[11px] text-red-400">
                    {errors.address}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="wal-network" className="block text-foreground">
                  Rede<span className="text-primary">*</span>
                </label>
                <select
                  id="wal-network"
                  value={network}
                  onChange={(e) =>
                    setNetwork(e.target.value as BlockchainNetwork)
                  }
                  className="mt-1.5 h-11 w-full rounded-xl border border-input bg-[#17100B] px-3 text-foreground md:h-10 md:rounded-sm"
                >
                  {NETWORKS.map((net) => (
                    <option key={net} value={net}>
                      {net}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="size-4 accent-primary"
              />
              <span>Definir como carteira principal</span>
            </label>

            <Button
              type="submit"
              disabled={addWallet.isPending || updateWallet.isPending}
              className="h-11 w-full rounded-full font-bold sm:w-auto md:h-10 md:rounded-sm"
            >
              <Plus className="size-4" />
              <span>
                {editingWalletId ? "Salvar alterações" : "Cadastrar carteira"}
              </span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}