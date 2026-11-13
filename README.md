# Kurio — Curated Digital Art & NFT Marketplace

Plataforma web de curadoria, negociação e liquidação on-chain de arte digital e colecionáveis verificados, construída com **React**, **TypeScript**, **TanStack Router**, **TanStack Query**, **MSW (Mock Service Worker)** e **Socket.IO** (simulado em tempo real).

---

## Funcionalidades Principais

- **Vitrine & Catálogo Reativo:** Busca textual, filtros por coleção (`Arte digital`, `Arte 3D`, `Colecionáveis`, `Fotografia`, `Música`, `Generativa`, `Jogos`, `Assinaturas`, `Utilidade`), rede blockchain (`Ethereum`, `Polygon`, `Solana`), faixa de preço em ETH, abas editoriais (`Todos`, `Novos lançamentos`, `Em alta`), ordenação e paginação sincronizadas na URL via TanStack Router.
- **Autenticação & Mesclagem de Carrinho:** Fluxo completo de login/cadastro com persistência de carrinho de visitante (`guest`) e mesclagem automática ao autenticar, preservando o destino original (`redirect`).
- **Carrinho & Cotação Dinâmica:** Cálculo em tempo real de subtotal, taxas de rede por blockchain, aplicação de cupons promocionais (`KURIO10`, `GENESIS20`) e validação de disponibilidade de estoque.
- **Checkout Idempotente & Resiliência:**
  - Envio protegido por `Idempotency-Key` para evitar cobranças duplicadas.
  - Detecção de variação de cotação (`price-change-checkout`) com bloqueio preventivo e exigência de reconfirmação explícita do usuário.
  - Painel de QA integrado para injeção de cenários de falha/latência em tempo real.
- **Atualizações em Tempo Real (Socket.IO / BroadcastChannel):** Transição automática de status de pedido (`pending` → `confirmed`) com geração de hash de transação on-chain e sincronização de estoque entre clientes.
- **Perfil & Gestão de Carteiras Web3:** Cadastro de múltiplas carteiras (`MetaMask`, `Coinbase Wallet`, etc.), seleção de carteira principal e histórico de aquisições.

---

## Stack Tecnológica

- **Core:** React 19, TypeScript 5, Vite
- **Roteamento & Estado Assíncrono:** TanStack Router, TanStack Query
- **Estilização & UI:** Tailwind CSS, Lucide Icons, componentes acessíveis com suporte a navegação por teclado e ARIA
- **API Mocking & Tempo Real:** Mock Service Worker (MSW) + barramento de eventos em tempo real
- **Qualidade & Testes:** Playwright (E2E), Lighthouse CI (Performance, Acessibilidade, Boas Práticas e SEO)

---

## Como Executar Localmente

### Pré-requisitos

- Node.js 20+
- npm 10+

### Instalação e Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev