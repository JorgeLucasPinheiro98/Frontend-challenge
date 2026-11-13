import { Link, useParams } from "@tanstack/react-router"
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  MailCheck,
  X,
  XCircle,
} from "lucide-react"
import { useOrderDetail } from "@/application/orders/use-orders"
import { Button } from "@/components/ui/button"
import { Skeleton } from "../components/Skeleton"
import { notifyToast } from "@/lib/toast"

export function OrderConfirmationPage() {
  const { orderId } = useParams({ from: "/orders/$orderId" })
  const orderQuery = useOrderDetail(orderId)

  if (orderQuery.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Skeleton className="h-[460px] w-full rounded-2xl" />
      </div>
    )
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-lg px-4 py-20 text-center text-xs"
      >
        <h1 className="text-base font-bold text-foreground">
          Pedido não encontrado
        </h1>
        <p className="mt-2 text-muted-foreground">
          Não foi possível localizar o recibo solicitado.
        </p>
        <Button asChild className="mt-6 font-bold">
          <Link to="/" search={{}}>
            Voltar ao início
          </Link>
        </Button>
      </div>
    )
  }

  const order = orderQuery.data
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(order.createdAt))

  const shortTx = order.transactionHash
    ? `${order.transactionHash.slice(0, 6)}...${order.transactionHash.slice(-4)}`
    : "Aguardando hash"

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="relative overflow-hidden rounded-2xl border-b-4 border-primary bg-card p-6 shadow-2xl sm:p-8">
        <Link
          to="/"
          search={{}}
          aria-label="Fechar recibo e voltar ao catálogo"
          className="absolute right-5 top-5 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" />
        </Link>

        {/* Cabeçalho de Estado */}
        {order.status === "pending" && (
          <div role="status" className="py-6 text-center">
            <Loader2 className="mx-auto size-12 animate-spin text-primary" />
            <h1 className="mt-4 text-lg font-bold text-foreground">
              Confirmando transação na rede {order.network}...
            </h1>
            <p className="mt-2 text-xs text-muted-foreground">
              Pedido <strong>{order.id}</strong> registrado. Aguardando
              confirmação em tempo real.
            </p>
          </div>
        )}

        {order.status === "rejected" && (
          <div role="alert" className="py-6 text-center">
            <XCircle className="mx-auto size-12 text-red-400" />
            <h1 className="mt-4 text-lg font-bold text-foreground">
              Pagamento recusado pela rede
            </h1>
            <p className="mt-2 text-xs text-red-300">
              {order.rejectionReason ??
                "Não foi possível liquidar a transação. Seus itens permanecem salvos no carrinho."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild className="font-bold">
                <Link to="/checkout">Tentar novamente no checkout</Link>
              </Button>
            </div>
          </div>
        )}

        {order.status === "confirmed" && (
          <div role="status" className="py-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary">
              <MailCheck className="size-8" />
            </div>
            <p className="mt-2 text-[10px] font-bold tracking-widest text-primary">
              THANK YOU
            </p>
            <h1 className="mt-2 text-base font-bold text-foreground sm:text-lg">
              Seus NFTs agora estão na sua carteira
            </h1>
          </div>
        )}

        {/* Faixa de Metadados da Transação */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-y border-primary/40 py-4 text-xs sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-bold text-primary">
              ID da transação
            </p>
            <p className="mt-1 font-mono text-foreground">{shortTx}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-primary">Data</p>
            <p className="mt-1 text-foreground">{formattedDate}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-primary">Total</p>
            <p className="mt-1 font-bold text-foreground">
              {order.totalPaidEth} ETH
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-primary">Carteira</p>
            <p className="mt-1 text-foreground">{order.walletProvider}</p>
          </div>
        </div>

        {/* Snapshot Imutável dos Itens */}
        <div className="mt-6 text-xs">
          <h2 className="font-bold text-foreground">Detalhes da transação</h2>
          <div className="mt-3 flex justify-between border-b border-border pb-2 text-[11px] text-muted-foreground">
            <span>NFTs</span>
            <span>Edições / Subtotal</span>
          </div>

          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li
                key={item.nftId}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="size-12 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-bold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      ID do token: #{item.nftId.replace("nft-", "")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-muted-foreground">
                    (x {item.quantity})
                  </span>
                  <span className="font-bold text-primary">
                    {item.totalEth} ETH
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-border pt-4">
            {order.discountEth !== "0.00" && (
              <div className="flex justify-between text-muted-foreground">
                <dt>Desconto aplicado</dt>
                <dd>(-) {order.discountEth} ETH</dd>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <dt>Taxa de rede ({order.network})</dt>
              <dd>{order.networkFeeEth} ETH</dd>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <dt className="text-foreground">Total</dt>
              <dd className="text-primary">{order.totalPaidEth} ETH</dd>
            </div>
          </dl>
        </div>

        {order.status === "confirmed" && (
          <div className="mt-6 border-t border-border pt-6 text-center text-xs">
            <p className="mx-auto max-w-md leading-relaxed text-muted-foreground">
              Transação confirmada na {order.network}. A propriedade foi
              transferida para sua carteira conectada ({order.walletAddress.slice(0, 6)}...
              {order.walletAddress.slice(-4)}) e registrada na rede.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button
                type="button"
                onClick={() =>
                  notifyToast({
                    type: "info",
                    title: "Explorador simulado",
                    description: `Hash ${order.transactionHash} verificado na ${order.network}.`,
                  })
                }
                className="font-bold"
              >
                <CheckCircle2 className="size-4" />
                <span>Ver no Etherscan</span>
                <ExternalLink className="size-3.5" />
              </Button>
              <Button asChild variant="outline">
                <Link to="/" search={{}}>
                  Continuar explorando
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}