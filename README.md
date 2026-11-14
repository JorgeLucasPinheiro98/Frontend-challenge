# Kurio — Marketplace de NFTs

Aplicacao React/TypeScript para descoberta de NFTs, carrinho, checkout simulado,
contas de colecionador e eventos em tempo real. A aplicacao usa MSW no navegador;
nao depende de backend privado. Blockchain, carteiras e pagamentos sao simulados.

Repositorio: https://github.com/JorgeLucasPinheiro98/Frontend-challenge  
Demo publica: configure o deploy e substitua esta linha pela URL publicada. O
deploy nao e validado por este repositorio.

## Requisitos

- Node.js 20.11 ou superior
- npm 10 ou superior

## Setup local

```bash
npm ci
npx playwright install chromium
npm run dev
```

O Vite inicia o app em `http://localhost:5173`. Os mocks e o Socket.IO simulado
ficam habilitados por padrao, inclusive no build de demonstracao.

Variaveis opcionais:

```env
VITE_ENABLE_MOCKS=true
VITE_ENABLE_SOCKET=true
```

Defina `VITE_ENABLE_MOCKS=false` para desativar os handlers MSW. Sem um backend
compativel, a aplicacao nao tera dados. Defina `VITE_ENABLE_SOCKET=false` para
desativar o cliente de tempo real.

## Telas

- `/`: catalogo, busca, filtros combinaveis, ordenacao, paginacao e favoritos.
- `/nfts/:id`: detalhe, disponibilidade, edicoes e compra.
- `/cart`: quantidades, cupons e cotacao.
- `/checkout`: dados do colecionador, carteira, rede e envio idempotente.
- `/orders/:id`: estado e recibo simulado do pedido.
- `/login` e `/register`: sessao e cadastro.
- `/profile` e `/wallets`: dados do colecionador e carteiras.

## Contas de demonstracao

As duas contas usam a senha ficticia `Kurio@2026`:

| E-mail | Colecionador |
| --- | --- |
| `lucas@kurio.art` | Lucas Andrade |
| `marina@kurio.art` | Marina Costa |

Nao reutilize estas credenciais fora do ambiente simulado. As senhas do banco
mock nao sao armazenadas em texto puro; o hash usado e somente demonstrativo e
nao deve ser usado para autenticacao real.

## Cenarios de mock

Abra o painel `QA` no canto inferior da tela. Ele pode ativar lentidao, catalogo
vazio, falha de rede, sessao expirada, alteracao de preco/estoque, pagamento
recusado e timeout recuperavel. `Resetar estado mock` restaura dados, usuarios,
carrinhos, pedidos e cupons para o estado padrao.

O endpoint de demonstracao `POST /api/mock/emit-nft` altera o NFT no banco mock e
publica `nft.updated` pelo canal Socket.IO. O painel nao injeta eventos
diretamente na interface. Consulte [`ARCHITECTURE.md`](./ARCHITECTURE.md) para
contratos, estados e limites do transporte simulado.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Desenvolvimento com mocks |
| `npm run build` | Verificacao TypeScript e build de producao |
| `npm run preview` | Servir `dist` localmente |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Build e suite Playwright |
| `npm run test:e2e:ui` | Build e Playwright UI |
| `npx playwright show-report` | Abrir relatorio HTML da ultima suite |
| `npm run lhci:desktop` | Lighthouse desktop; requer build previo |
| `npm run lhci:mobile` | Lighthouse mobile; requer build previo |
| `npm run lhci` | Build e auditorias desktop/mobile |
| `npm run audit:lighthouse` | Alias para as duas auditorias Lighthouse |

Playwright roda a suite completa em Chromium desktop (1440 px) e os fluxos de
resiliencia, conta e responsividade em tablet (768 px) e mobile (390 px). Os
testes geram traces e videos em falhas e
executam regressao visual com baselines em
[`e2e/resilience-and-visual.spec.ts-snapshots/`](./e2e/resilience-and-visual.spec.ts-snapshots/).
Atualize baselines intencionalmente com `npm run test:e2e -- --update-snapshots`
e revise as imagens antes de inclui-las.

Lighthouse coleta inicio e detalhe tres vezes por perfil; os limites sao
Performance 90, Accessibility 95, Best Practices 95 e SEO 90. Os relatórios
HTML/JSON ficam em `.lighthouseci/desktop/` e `.lighthouseci/mobile/`. Os JSON
incluem LCP, CLS e TBT. Registre tambem versoes do Node, npm, Chromium e
Lighthouse, sistema operacional e condicoes da execucao ao reportar resultados.

## Deploy

O projeto inclui `vercel.json` para servir as rotas SPA e o worker MSW. Para
publicar, conecte o repositorio a Vercel ou execute `vercel --prod` com uma conta
autorizada; entao confirme que mocks, refresh de rotas e Socket.IO funcionam na
URL final. Nao ha credenciais de deploy neste projeto.

