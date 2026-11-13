import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { notifyToast } from "@/lib/toast"

export function Footer() {
  const [newsletterEmail, setNewsletterEmail] = useState("")

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsletterEmail.trim() || !newsletterEmail.includes("@")) {
      notifyToast({
        type: "error",
        title: "E-mail inválido",
        description: "Informe um endereço válido para receber novidades.",
      })
      return
    }
    setNewsletterEmail("")
    notifyToast({
      type: "success",
      title: "Inscrição confirmada",
      description: "Você receberá alertas dos próximos lançamentos gênesis.",
    })
  }

  return (
    <footer className="mx-auto mt-20 max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-sm bg-card text-xs text-muted-foreground">
        {/* Faixa 1: 3 Pilares + Newsletter */}
        <div className="grid grid-cols-1 divide-y divide-border p-8 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
          <div className="pb-6 lg:col-span-3 lg:pb-0 lg:pr-6">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              W
            </div>
            <h3 className="mt-4 text-xs font-bold text-foreground">
              Segurança da carteira
            </h3>
            <p className="mt-2 leading-relaxed">
              Proteja sua carteira e colecione arte digital verificada com
              confiança.
            </p>
          </div>

          <div className="py-6 lg:col-span-3 lg:px-6 lg:py-0">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              C
            </div>
            <h3 className="mt-4 text-xs font-bold text-foreground">
              Criadores em destaque
            </h3>
            <p className="mt-2 leading-relaxed">
              Conheça artistas, estúdios e comunidades que moldam a cultura
              digital na rede.
            </p>
          </div>

          <div className="py-6 lg:col-span-3 lg:px-6 lg:py-0">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              D
            </div>
            <h3 className="mt-4 text-xs font-bold text-foreground">
              Alertas de lançamentos
            </h3>
            <p className="mt-2 leading-relaxed">
              Receba calendários de cunhagem, novidades de listas de acesso e
              análises do mercado.
            </p>
          </div>

          <div className="pt-6 lg:col-span-3 lg:pl-6 lg:pt-0">
            <h3 className="text-xs font-bold text-foreground">
              Antecipe-se ao próximo lançamento
            </h3>
            <form onSubmit={handleNewsletter} className="mt-3 flex">
              <label htmlFor="footer-newsletter" className="sr-only">
                Digite seu e-mail
              </label>
              <input
                id="footer-newsletter"
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="digite seu e-mail..."
                className="h-9 min-w-0 flex-1 rounded-l-sm border border-r-0 border-border bg-[#2D1E14] px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 rounded-l-none rounded-r-sm px-4 font-bold"
              >
                Enviar
              </Button>
            </form>
            <p className="mt-3 text-[11px] leading-relaxed">
              Receba lançamentos selecionados, histórias de criadores e
              novidades do mercado.
            </p>
          </div>
        </div>

        {/* Faixa 2: Barra de Contato */}
        <div className="grid grid-cols-1 gap-4 bg-[#2D1E14] px-8 py-4 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
          <span className="font-bold tracking-widest text-foreground">
            KURIO
          </span>
          <span className="text-foreground/90">
            Feito para colecionadores, criadores e cultura
          </span>
          <span className="text-foreground/90">contato@email.com</span>
          <span className="text-foreground/90 lg:text-right">
            +55 11 4002 8922
          </span>
        </div>

        {/* Faixa 3: Links + Redes Sociais + Carteiras Compatíveis */}
        <div className="grid grid-cols-1 gap-8 p-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2.5">
            <p className="font-bold text-foreground">Meu perfil</p>
            <ul className="space-y-2">
              <li>
                <Link to="/profile" className="hover:text-foreground">
                  Meu perfil
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-foreground">
                  Minha coleção
                </Link>
              </li>
              <li>
                <a href="/profile#pedidos" className="hover:text-foreground">
                  Atividade
                </a>
              </li>
              <li>
                <Link to="/wallets" className="hover:text-foreground">
                  Estúdio do criador
                </Link>
              </li>
              <li>
                <a href="/profile#favoritos" className="hover:text-foreground">
                  Lista de interesse
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="font-bold text-foreground">Central de ajuda</p>
            <ul className="space-y-2">
              <li>
                <a href="/#diario-cunhagem" className="hover:text-foreground">
                  Central de ajuda
                </a>
              </li>
              <li>
                <a href="/#diario-cunhagem" className="hover:text-foreground">
                  Como comprar NFTs
                </a>
              </li>
              <li>
                <Link to="/wallets" className="hover:text-foreground">
                  Carteira e segurança
                </Link>
              </li>
              <li>
                <a href="/#catalogo" className="hover:text-foreground">
                  Política do mercado
                </a>
              </li>
              <li>
                <a href="/#catalogo" className="hover:text-foreground">
                  Denunciar item
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-2.5">
            <p className="font-bold text-foreground">Coleções</p>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  search={{ collection: "Arte digital" }}
                  className="hover:text-foreground"
                >
                  Arte digital
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  search={{ collection: "Fotografia" }}
                  className="hover:text-foreground"
                >
                  Fotografia
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  search={{ collection: "Música" }}
                  className="hover:text-foreground"
                >
                  Música
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  search={{ collection: "Arte 3D" }}
                  className="hover:text-foreground"
                >
                  Arte 3D
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  search={{ collection: "Utilidade" }}
                  className="hover:text-foreground"
                >
                  Utilidade
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <p className="font-bold text-foreground">Redes sociais</p>
              <div className="mt-2.5 flex items-center gap-2">
                {["f", "ig", "tw", "in", "yt"].map((net) => (
                  <span
                    key={net}
                    className="flex size-7 items-center justify-center rounded-sm border border-primary/40 text-[11px] font-bold text-primary"
                  >
                    {net}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="font-bold text-foreground">Carteiras compatíveis</p>
              <div className="mt-2.5 inline-block rounded-sm border border-primary/30 bg-[#2D1E14] px-2.5 py-1.5 text-[9px] font-bold tracking-wider text-primary">
                METAMASK • WALLETCONNECT • COINBASE
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}