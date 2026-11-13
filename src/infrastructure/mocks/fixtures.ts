import type { NFT, User } from "@/domain/types"

function createArtworkSvg(
  bgStart: string,
  bgEnd: string,
  accent: string,
  code: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgStart}"/>
        <stop offset="100%" stop-color="${bgEnd}"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#g)"/>
    <circle cx="300" cy="240" r="125" fill="${accent}" opacity="0.92"/>
    <rect x="165" y="390" width="270" height="170" rx="85" fill="${accent}" opacity="0.85"/>
    <circle cx="255" cy="225" r="24" fill="#14100d"/>
    <circle cx="345" cy="225" r="24" fill="#14100d"/>
    <rect x="235" y="213" width="40" height="24" rx="6" fill="none" stroke="#f5efe8" stroke-width="5"/>
    <rect x="325" y="213" width="40" height="24" rx="6" fill="none" stroke="#f5efe8" stroke-width="5"/>
    <line x1="275" y1="225" x2="325" y2="225" stroke="#f5efe8" stroke-width="5"/>
    <text x="300" y="545" font-family="monospace" font-size="22" font-weight="bold" fill="#14100d" text-anchor="middle">${code}</text>
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function hashMockPassword(plain: string): string {
  let hash = 0
  for (let i = 0; i < plain.length; i++) {
    hash = (hash << 5) - hash + plain.charCodeAt(i)
    hash |= 0
  }
  return `kurio_hash_${Math.abs(hash).toString(16)}`
}

export interface StoredUser extends User {
  passwordHash: string
}

export const INITIAL_USERS: StoredUser[] = [
  {
    id: "usr-01",
    name: "Lucas Andrade",
    username: "lucas_andrade",
    ensName: "lucas.eth",
    email: "lucas@kurio.art",
    passwordHash: hashMockPassword("Kurio@2026"),
    avatarUrl: createArtworkSvg("#d9c8a9", "#8c7a5b", "#1f7a4c", "LA"),
    wallets: [
      {
        id: "wal-01",
        label: "MetaMask Principal",
        provider: "MetaMask",
        address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        network: "Ethereum",
        isPrimary: true,
      },
      {
        id: "wal-02",
        label: "Cofre Coinbase",
        provider: "Coinbase Wallet",
        address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        network: "Polygon",
        isPrimary: false,
      },
    ],
  },
  {
    id: "usr-02",
    name: "Marina Costa",
    username: "marina_costa",
    ensName: "marina.eth",
    email: "marina@kurio.art",
    passwordHash: hashMockPassword("Kurio@2026"),
    avatarUrl: createArtworkSvg("#b8c9c3", "#647a73", "#5d4e8c", "MC"),
    wallets: [
      {
        id: "wal-03",
        label: "Coinbase Vault",
        provider: "Coinbase Wallet",
        address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        network: "Ethereum",
        isPrimary: true,
      },
    ],
  },
]

export interface CouponRecord {
  code: string
  discountPercent: number
  isExpired: boolean
}

export const INITIAL_COUPONS: Record<string, CouponRecord> = {
  KURIO10: { code: "KURIO10", discountPercent: 10, isExpired: false },
  GENESIS20: { code: "GENESIS20", discountPercent: 20, isExpired: false },
  EXPIRADO50: { code: "EXPIRADO50", discountPercent: 50, isExpired: true },
}

export const INITIAL_NFTS: NFT[] = [
  {
    id: "nft-042",
    title: "Emerald Ape #042",
    description:
      "Edição gênesis com jaqueta varsity esmeralda e amuleto dourado verificados on-chain.",
    creator: "Kurio Studio",
    priceEth: "1.19",
    imageUrl: createArtworkSvg("#dcd7c0", "#a69f84", "#1b6b43", "#042"),
    gallery: [
      createArtworkSvg("#dcd7c0", "#a69f84", "#1b6b43", "#042"),
      createArtworkSvg("#1b6b43", "#113d27", "#d9823b", "#042-ALT"),
    ],
    editionLabel: "Edição Gênesis • 1 de 5",
    availableQuantity: 4,
    isLimitedEdition: true,
    isFeatured: true,
    isTrending: true,
    network: "Ethereum",
    collection: "Arte digital",
    createdAt: "2026-11-10T14:00:00.000Z",
    version: 1,
  },
  {
    id: "nft-009",
    title: "Sage Nomad #009",
    description:
      "Explorador minimalista em paleta sálvia e lavanda da série Nômades Digitais.",
    creator: "Atelier Vértice",
    priceEth: "1.69",
    imageUrl: createArtworkSvg("#d5dcc8", "#95a388", "#5a4d7a", "#009"),
    gallery: [createArtworkSvg("#d5dcc8", "#95a388", "#5a4d7a", "#009")],
    editionLabel: "Edição Limitada • 1 de 10",
    availableQuantity: 6,
    isLimitedEdition: true,
    isFeatured: false,
    isTrending: true,
    network: "Ethereum",
    collection: "Arte 3D",
    createdAt: "2026-11-09T18:30:00.000Z",
    version: 1,
  },
  {
    id: "nft-552",
    title: "Neon Vessel #552",
    description:
      "Escultura digital monocromática com alfaiataria marfim e contraste petróleo.",
    creator: "Kuro Labs",
    priceEth: "1.99",
    originalPriceEth: "2.29",
    imageUrl: createArtworkSvg("#c9d6cf", "#7e968b", "#2c3539", "#552"),
    gallery: [createArtworkSvg("#c9d6cf", "#7e968b", "#2c3539", "#552")],
    editionLabel: "Edição Especial • 1 de 3",
    availableQuantity: 2,
    isLimitedEdition: true,
    isFeatured: true,
    isTrending: true,
    network: "Polygon",
    collection: "Colecionáveis",
    createdAt: "2026-11-08T10:15:00.000Z",
    version: 1,
  },
  {
    id: "nft-118",
    title: "Cosmic Bloom #118",
    description:
      "Composição atmosférica com iluminação difusa e textura procedural.",
    creator: "Atelier Vértice",
    priceEth: "1.29",
    imageUrl: createArtworkSvg("#d4d9c5", "#8a997d", "#4f4670", "#118"),
    gallery: [createArtworkSvg("#d4d9c5", "#8a997d", "#4f4670", "#118")],
    editionLabel: "Edição Aberta • 12 disponíveis",
    availableQuantity: 12,
    isLimitedEdition: false,
    isFeatured: false,
    isTrending: false,
    network: "Solana",
    collection: "Generativa",
    createdAt: "2026-11-07T09:00:00.000Z",
    version: 1,
  },
  {
    id: "nft-314",
    title: "Violet Nomad #314",
    description:
      "Estudo cromático em violeta profundo com acabamento fosco de alta resolução.",
    creator: "Kurio Studio",
    priceEth: "1.39",
    imageUrl: createArtworkSvg("#cfd4c2", "#879178", "#65548f", "#314"),
    gallery: [createArtworkSvg("#cfd4c2", "#879178", "#65548f", "#314")],
    editionLabel: "Edição Limitada • 1 de 8",
    availableQuantity: 5,
    isLimitedEdition: true,
    isFeatured: false,
    isTrending: true,
    network: "Ethereum",
    collection: "Arte 3D",
    createdAt: "2026-11-06T16:45:00.000Z",
    version: 1,
  },
  {
    id: "nft-088",
    title: "Ivory Baron #088",
    description:
      "Retrato clássico digitalizado com traços arquitetônicos e brilho metálico sutil.",
    creator: "Kuro Labs",
    priceEth: "1.79",
    imageUrl: createArtworkSvg("#c5d1ca", "#768a80", "#383e42", "#088"),
    gallery: [createArtworkSvg("#c5d1ca", "#768a80", "#383e42", "#088")],
    editionLabel: "Edição Limitada • 1 de 4",
    availableQuantity: 1,
    isLimitedEdition: true,
    isFeatured: false,
    isTrending: false,
    network: "Ethereum",
    collection: "Arte digital",
    createdAt: "2026-11-05T11:20:00.000Z",
    version: 1,
  },
  {
    id: "nft-201",
    title: "Solaris Pulse #201",
    description:
      "Peça audiovisual generativa sincronizada com harmônicos analógicos.",
    creator: "Synth Collective",
    priceEth: "0.85",
    imageUrl: createArtworkSvg("#e0c9a6", "#b88a4d", "#8c3b1b", "#201"),
    gallery: [createArtworkSvg("#e0c9a6", "#b88a4d", "#8c3b1b", "#201")],
    editionLabel: "Edição Padrão • 15 disponíveis",
    availableQuantity: 15,
    isLimitedEdition: false,
    isFeatured: false,
    isTrending: true,
    network: "Polygon",
    collection: "Música",
    createdAt: "2026-11-04T20:00:00.000Z",
    version: 1,
  },
  {
    id: "nft-275",
    title: "Monolith Frame #275",
    description:
      "Fotografia conceitual de arquitetura brutalista capturada em médio formato.",
    creator: "Clara Mendes",
    priceEth: "0.64",
    imageUrl: createArtworkSvg("#cfc7bc", "#857b6e", "#2b2623", "#275"),
    gallery: [createArtworkSvg("#cfc7bc", "#857b6e", "#2b2623", "#275")],
    editionLabel: "Edição Numerada • 1 de 20",
    availableQuantity: 9,
    isLimitedEdition: false,
    isFeatured: false,
    isTrending: false,
    network: "Solana",
    collection: "Fotografia",
    createdAt: "2026-11-03T13:10:00.000Z",
    version: 1,
  },
  {
    id: "nft-410",
    title: "Aether Pass #410",
    description:
      "Passe vitalício para drops privados, exposições físicas e curadoria antecipada.",
    creator: "Kurio DAO",
    priceEth: "2.45",
    imageUrl: createArtworkSvg("#d9b48f", "#9e6b3b", "#1f1814", "#410"),
    gallery: [createArtworkSvg("#d9b48f", "#9e6b3b", "#1f1814", "#410")],
    editionLabel: "Assinatura VIP • 1 de 5",
    availableQuantity: 3,
    isLimitedEdition: true,
    isFeatured: false,
    isTrending: true,
    network: "Ethereum",
    collection: "Assinaturas",
    createdAt: "2026-11-02T08:00:00.000Z",
    version: 1,
  },
  {
    id: "nft-512",
    title: "Chrono Relic #512",
    description:
      "Artefato interativo utilizável como chave de acesso em mundos virtuais parceiros.",
    creator: "Forge Guild",
    priceEth: "1.12",
    imageUrl: createArtworkSvg("#c2cfc9", "#6c857a", "#9c5a25", "#512"),
    gallery: [createArtworkSvg("#c2cfc9", "#6c857a", "#9c5a25", "#512")],
    editionLabel: "Item de Jogo • 7 disponíveis",
    availableQuantity: 7,
    isLimitedEdition: false,
    isFeatured: false,
    isTrending: false,
    network: "Polygon",
    collection: "Jogos",
    createdAt: "2026-11-01T17:40:00.000Z",
    version: 1,
  },
  {
    id: "nft-603",
    title: "Vault Key #603",
    description:
      "Token utilitário com desconto automático de taxas de rede no ecossistema Kurio.",
    creator: "Kurio DAO",
    priceEth: "0.95",
    imageUrl: createArtworkSvg("#d6c5b3", "#8f7861", "#473629", "#603"),
    gallery: [createArtworkSvg("#d6c5b3", "#8f7861", "#473629", "#603")],
    editionLabel: "Utilidade • 10 disponíveis",
    availableQuantity: 10,
    isLimitedEdition: false,
    isFeatured: false,
    isTrending: false,
    network: "Solana",
    collection: "Utilidade",
    createdAt: "2026-10-30T12:00:00.000Z",
    version: 1,
  },
  {
    id: "nft-777",
    title: "Amber Sentinel #777",
    description:
      "Guardião em âmbar esculpido com shaders volumétricos e assinatura criptográfica.",
    creator: "Kurio Studio",
    priceEth: "3.10",
    imageUrl: createArtworkSvg("#e3c193", "#b57c38", "#291d15", "#777"),
    gallery: [createArtworkSvg("#e3c193", "#b57c38", "#291d15", "#777")],
    editionLabel: "Edição Rara • 1 de 2",
    availableQuantity: 2,
    isLimitedEdition: true,
    isFeatured: true,
    isTrending: true,
    network: "Ethereum",
    collection: "Colecionáveis",
    createdAt: "2026-10-29T15:00:00.000Z",
    version: 1,
  },
]