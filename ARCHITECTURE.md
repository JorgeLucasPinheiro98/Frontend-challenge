# Arquitetura — Kurio NFT Marketplace

Este documento descreve os contratos efetivamente usados pelo app, a politica
de cache/sessao, a persistencia dos mocks, os eventos realtime e as limitacoes
da simulacao.

## Camadas

- `src/domain/types.ts`: tipos de transporte e dominio.
- `src/infrastructure/http/client.ts`: Axios, token Bearer, timeout e conversao
  dos erros HTTP.
- `src/infrastructure/mocks/handlers.ts`: handlers MSW REST e bridge WebSocket.
- `src/infrastructure/mocks/db.ts` e `fixtures.ts`: estado e dados iniciais dos
  mocks.
- `src/infrastructure/realtime/socket.ts`: cliente `socket.io-client`,
  atualizacao do cache e reconciliacao.
- `src/application/`: hooks TanStack Query para sessao, NFTs, carrinho e pedidos.
- `src/presentation/`: rotas, componentes e telas.

## Contratos REST simulados

Todas as chamadas da aplicacao usam o prefixo `/api` atraves do Axios.

| Metodo | Caminho | Uso |
| --- | --- | --- |
| `POST` | `/auth/register` | Criar conta; validacao por campo e conflito de email |
| `POST` | `/auth/login` | Iniciar sessao |
| `GET` | `/auth/session` | Recuperar sessao atual |
| `POST` | `/auth/logout` | Encerrar sessao |
| `GET` | `/nfts?q&collection&network&minPrice&maxPrice&tab&sort&page&limit` | Catalogo e facetas |
| `GET` | `/nfts/:id` | Detalhe |
| `GET` | `/favorites` | Favoritos do usuario autenticado |
| `POST` / `DELETE` | `/favorites/:nftId` | Adicionar/remover favorito |
| `GET` | `/cart?network=...` | Carrinho e cotacao atual |
| `POST` | `/cart/items` | Adicionar item |
| `PATCH` / `DELETE` | `/cart/items/:nftId` | Alterar quantidade/remover |
| `POST` / `DELETE` | `/cart/coupon` | Aplicar/remover cupom |
| `POST` | `/cart/acknowledge` | Aceitar a cotacao atualizada |
| `POST` | `/orders` | Criar ou recuperar pedido via `Idempotency-Key` |
| `GET` | `/orders` | Historico do usuario |
| `GET` | `/orders/:id` | Estado e recibo |
| `PATCH` | `/profile` | Atualizar dados/avatar |
| `PATCH` | `/profile/password` | Alterar senha |
| `POST` | `/wallets` | Cadastrar carteira |
| `PATCH` | `/wallets/:id` | Atualizar carteira |

Erros usam `{ code, message, fieldErrors? }`. Os codigos tipados incluem
`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
`OUT_OF_STOCK`, `PRICE_CHANGED`, `INVALID_COUPON`, `IDEMPOTENCY_CONFLICT` e
`SERVICE_UNAVAILABLE`.

Valores ETH sao strings decimais; calculos de subtotal, desconto, taxa e total
usam `src/lib/eth.ts`. Quantidades sao inteiros. A cotacao calculada no mock e
revalidada ao criar o pedido.

### Idempotencia de pedidos

O cliente envia a chave no header `Idempotency-Key` e inclui no corpo carteira,
rede, total esperado, nota e snapshot `{ nftId, quantity }` dos itens. O mock
calcula uma assinatura canonica desse conteudo. A mesma chave e mesmo conteudo
retornam o pedido ja existente mesmo depois de o carrinho ser limpo; a chave
reutilizada com conteudo diferente retorna `409 IDEMPOTENCY_CONFLICT`. Uma nova
tentativa tambem compara o snapshot com o carrinho atual antes de criar pedido.

O recibo guarda um snapshot de nomes, imagens, precos, quantidades e taxas; ele
nao depende do catalogo depois da compra. Hash e URL de explorador sao ficticios.

## Estado, sessao e cache

- O token de demonstracao fica em `localStorage`; o mock mantem sessoes com
  expiracao. `401` remove o token e redireciona para login preservando o caminho.
- Carrinhos de visitante e de usuario sao persistidos pelo banco MSW no
  `localStorage`; no login o carrinho visitante e mesclado no carrinho da conta.
- Favoritos, pedidos e sessao sao invalidados/removidos ao trocar usuario ou sair.
- Queries usam `staleTime` de 30 segundos, `gcTime` de 5 minutos e nao refazem
  consulta ao focar a janela. A sessao usa `staleTime` de 2 minutos.
- Queries tentam novamente ate duas vezes para falhas recuperaveis; respostas
  4xx nao sao repetidas. Mutations nao tem retry automatico para evitar repeticao
  de operacoes.
- Favoritar usa atualizacao otimista e restaura o snapshot do cache em erro.
- Ao confirmar pedido, o carrinho, os pedidos e os NFTs sao invalidados. Pedidos
  pendentes consultam o endpoint a cada segundo como fallback realtime.

## Mock Service Worker

O mock e ativado no bootstrap do app e permanece no build de demonstracao.
`localStorage` conserva o banco simulado entre refreshes. `POST /api/mock/reset`
recria usuarios, fixtures, cupons, favoritos, carrinhos, pedidos e sessoes; o
painel QA usa `POST /api/mock/scenario` para configurar os cenarios:

`default`, `empty`, `slow`, `network-error`, `session-expired`,
`price-change-checkout`, `out-of-stock-checkout`, `order-timeout-recovery` e
`payment-rejected`.

Credenciais ficticias: `lucas@kurio.art` e `marina@kurio.art`, ambas com
`Kurio@2026`. O hash das senhas e deterministico e nao criptografico; serve
somente para a simulacao e nao e adequado a producao.

## Socket.IO e reconciliacao

O cliente usa `socket.io-client` com o path `/socket.io/`. Os handlers MSW
constroem uma bridge usando `ws.link` e `@mswjs/socket.io-binding`; portanto, nao
existe um servidor Socket.IO de producao neste repositorio.

Eventos:

- `nft.updated`: `eventId`, `nftId`, `version`, `timestamp` e mudancas opcionais
  em preco/disponibilidade. Atualiza detalhes/listas em cache e invalida carrinho.
- `order.updated`: `eventId`, `orderId`, `userId`, `version`, `status` e dados
  opcionais da transacao. Eventos de outro usuario sao ignorados; estados
  terminais nao regridem.

O cliente descarta IDs duplicados e versoes antigas. Ao reconectar, invalida
catalogo, detalhe, carrinho e pedidos ativos para reconciliar com REST. Listeners
sao registrados e liberados junto com o ciclo de vida do layout.

### Limitacoes da simulacao

O transporte e um WebSocket interceptado pelo Service Worker, convertido para
eventos Socket.IO pelo binding. Ele nao modela autenticacao/rooms de um servidor
real e o broadcaster do mock opera no contexto dos clientes conectados ao worker
local. Para deploy com multiplas instancias ou usuarios reais, substitua a bridge
por um servidor Socket.IO e mantenha os mesmos contratos de evento. Pagamentos,
assinaturas, carteiras e transacoes blockchain nao sao reais.

## Interface, acessibilidade e assets

As telas usam Tailwind e os componentes disponiveis em `src/components/ui`.
Esqueletos preservam a estrutura dos dados e usam shimmer, desativado quando
`prefers-reduced-motion` esta ativo. A interface inclui skip link, foco visivel,
labels e feedback com regioes live.

As artes das fixtures sao SVGs gerados localmente para o cenario de demonstracao;
nao substituem os assets finais do Figma. As fontes Inter e Space Mono sao
solicitadas ao Google Fonts e possuem fallback generico, portanto em ambiente sem
internet o fallback do sistema e usado.

## Testes e auditoria

- `npm run test:e2e`: build, Playwright Chromium em 1440/768/390 px e relatorio
  HTML; traces/videos sao retidos em falhas.
- Baselines de screenshot sao guardadas em
  `e2e/resilience-and-visual.spec.ts-snapshots/`.
- `npm run lhci`: build e tres execucoes Lighthouse para inicio e detalhe nos
  perfis desktop e mobile; a agregacao usa a mediana.
- Os relatórios HTML/JSON locais sao gravados em `.lighthouseci/desktop/` e
  `.lighthouseci/mobile/`. Cada JSON registra LCP, CLS e TBT. Os limites sao
  Performance 90, Accessibility 95, Best Practices 95 e SEO 90.

