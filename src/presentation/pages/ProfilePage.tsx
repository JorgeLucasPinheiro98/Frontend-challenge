import { useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { Eye, EyeOff } from "lucide-react"
import type { User } from "@/domain/types"
import {
  useChangePassword,
  useSession,
  useUpdateProfile,
} from "@/application/auth/use-auth"
import { useFavorites, useNFTs } from "@/application/nfts/use-nfts"
import { useOrders } from "@/application/orders/use-orders"
import { HttpApiError } from "@/infrastructure/http/client"
import { Button } from "@/components/ui/button"
import { AccountSidebar } from "../components/AccountSidebar"
import { notifyToast } from "@/lib/toast"

export function ProfilePage() {
  const { data: user } = useSession()
  if (!user) return null
  return <ProfileContent key={user.id} user={user} />
}

function ProfileContent({ user }: { user: User }) {
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const { data: favoriteIds = [] } = useFavorites()
  const catalogQuery = useNFTs({ limit: 24 })
  const { data: orders = [] } = useOrders()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [ensName, setEnsName] = useState(
    (user.ensName ?? "").replace(/\.eth$/, "")
  )
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl)
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {}
  )

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileErrors({})

    updateProfile.mutate(
      {
        name,
        username,
        email,
        ensName: ensName.trim() ? `${ensName.trim()}.eth` : "",
        avatarUrl,
      },
      {
        onSuccess: () => {
          notifyToast({
            type: "success",
            title: "Perfil atualizado",
            description: "Suas informações de colecionador foram salvas.",
          })
        },
        onError: (err) => {
          if (err instanceof HttpApiError && err.fieldErrors) {
            setProfileErrors(err.fieldErrors)
          } else {
            notifyToast({
              type: "error",
              title: "Erro ao salvar perfil",
              description: err.message,
            })
          }
        },
      }
    )
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}
    if (!currentPassword) {
      errors.currentPassword = "Informe sua senha atual."
    }
    if (newPassword.length < 6) {
      errors.newPassword = "A nova senha deve ter pelo menos 6 caracteres."
    }
    if (newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = "A confirmação da senha não confere."
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      return
    }

    setPasswordErrors({})
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setCurrentPassword("")
          setNewPassword("")
          setConfirmNewPassword("")
          notifyToast({
            type: "success",
            title: "Senha alterada",
            description: "Sua nova senha já está ativa.",
          })
        },
        onError: (err) => {
          if (err instanceof HttpApiError && err.fieldErrors) {
            setPasswordErrors(err.fieldErrors)
          } else {
            setPasswordErrors({ currentPassword: err.message })
          }
        },
      }
    )
  }

  const favoriteNfts =
    catalogQuery.data?.data.filter((n) => favoriteIds.includes(n.id)) ?? []

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <AccountSidebar activeSection="profile" />
        </div>

        <div className="space-y-10 lg:col-span-9">
          <form
            onSubmit={handleSaveProfile}
            noValidate
            className="space-y-6 rounded-xl border border-border bg-card/50 p-6 text-xs"
          >
            <h1 className="text-base font-bold text-foreground">
              Perfil do colecionador
            </h1>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="prof-name" className="block text-foreground">
                  Nome de exibição<span className="text-primary">*</span>
                </label>
                <input
                  id="prof-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(profileErrors.name)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {profileErrors.name && (
                  <p role="alert" className="mt-1 text-[11px] text-red-400">
                    {profileErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="prof-username" className="block text-foreground">
                  Nome de usuário<span className="text-primary">*</span>
                </label>
                <input
                  id="prof-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  aria-invalid={Boolean(profileErrors.username)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {profileErrors.username && (
                  <p role="alert" className="mt-1 text-[11px] text-red-400">
                    {profileErrors.username}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="prof-email" className="block text-foreground">
                  E-mail<span className="text-primary">*</span>
                </label>
                <input
                  id="prof-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(profileErrors.email)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {profileErrors.email && (
                  <p role="alert" className="mt-1 text-[11px] text-red-400">
                    {profileErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="prof-ens" className="block text-foreground">
                  Nome ENS
                </label>
                <div className="mt-1.5 flex">
                  <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-secondary px-3 text-muted-foreground">
                    .eth
                  </span>
                  <input
                    id="prof-ens"
                    type="text"
                    value={ensName}
                    onChange={(e) => setEnsName(e.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-r-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block text-foreground">
                  Carteira principal
                </label>
                <p className="mt-2 truncate rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-muted-foreground">
                  {user.wallets.find((w) => w.isPrimary)?.label ??
                    "Nenhuma carteira definida"}
                </p>
              </div>

              <div>
                <span className="block text-foreground">Avatar</span>
                <div className="mt-1.5 flex items-center gap-3">
                  <img
                    src={avatarUrl}
                    alt={`Avatar de ${name}`}
                    className="size-10 rounded-full border border-border object-cover"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="sr-only"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-bold"
                  >
                    Alterar
                  </Button>
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={updateProfile.isPending}
              className="font-bold"
            >
              {updateProfile.isPending ? "Salvando..." : "Salvar perfil"}
            </Button>
          </form>

          <form
            onSubmit={handleChangePassword}
            noValidate
            className="space-y-4 rounded-xl border border-border bg-card/50 p-6 text-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                Alterar senha
              </h2>
              <button
                type="button"
                onClick={() => setShowPasswords((p) => !p)}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                {showPasswords ? (
                  <>
                    <EyeOff className="size-3.5" /> Ocultar
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" /> Mostrar
                  </>
                )}
              </button>
            </div>

            <div className="max-w-md space-y-3.5">
              <div>
                <label htmlFor="pwd-current" className="block text-foreground">
                  Senha atual
                </label>
                <input
                  id="pwd-current"
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  aria-invalid={Boolean(passwordErrors.currentPassword)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground"
                />
                {passwordErrors.currentPassword && (
                  <p role="alert" className="mt-1 text-[11px] text-red-400">
                    {passwordErrors.currentPassword}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="pwd-new" className="block text-foreground">
                  Nova senha
                </label>
                <input
                  id="pwd-new"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  aria-invalid={Boolean(passwordErrors.newPassword)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground"
                />
                {passwordErrors.newPassword && (
                  <p role="alert" className="mt-1 text-[11px] text-red-400">
                    {passwordErrors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="pwd-confirm" className="block text-foreground">
                  Confirmar nova senha
                </label>
                <input
                  id="pwd-confirm"
                  type={showPasswords ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  aria-invalid={Boolean(passwordErrors.confirmNewPassword)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-foreground"
                />
                {passwordErrors.confirmNewPassword && (
                  <p role="alert" className="mt-1 text-[11px] text-red-400">
                    {passwordErrors.confirmNewPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={changePassword.isPending}
                className="font-bold"
              >
                {changePassword.isPending ? "Atualizando..." : "Salvar senha"}
              </Button>
            </div>
          </form>

          <section
            id="favoritos"
            className="rounded-xl border border-border bg-card/50 p-6 text-xs"
          >
            <h2 className="text-sm font-bold text-foreground">
              Lista de interesse ({favoriteNfts.length})
            </h2>
            {favoriteNfts.length === 0 ? (
              <p className="mt-2 text-muted-foreground">
                Você ainda não favoritou nenhum NFT.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {favoriteNfts.map((nft) => (
                  <Link
                    key={nft.id}
                    to="/nfts/$nftId"
                    params={{ nftId: nft.id }}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/50"
                  >
                    <img
                      src={nft.imageUrl}
                      alt={nft.title}
                      className="size-12 rounded object-cover"
                    />
                    <div>
                      <p className="font-bold text-foreground">{nft.title}</p>
                      <p className="text-primary">{nft.priceEth} ETH</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section
            id="pedidos"
            className="rounded-xl border border-border bg-card/50 p-6 text-xs"
          >
            <h2 className="text-sm font-bold text-foreground">
              Meus pedidos ({orders.length})
            </h2>
            {orders.length === 0 ? (
              <p className="mt-2 text-muted-foreground">
                Nenhuma compra registrada nesta conta.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {orders.map((ord) => (
                  <li
                    key={ord.id}
                    className="flex flex-wrap items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <p className="font-bold text-foreground">{ord.id}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ord.items.length} item(ns) • {ord.totalPaidEth} ETH •{" "}
                        <span className="uppercase text-primary">
                          {ord.status}
                        </span>
                      </p>
                    </div>
                    <Button asChild size="xs" variant="outline">
                      <Link
                        to="/orders/$orderId"
                        params={{ orderId: ord.id }}
                      >
                        Ver recibo
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}