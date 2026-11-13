export type BlockchainNetwork = "Ethereum" | "Polygon" | "Solana"
export type WalletProvider = "MetaMask" | "WalletConnect" | "Coinbase Wallet"

export type NFTCollection =
  | "Arte digital"
  | "Fotografia"
  | "Música"
  | "Arte 3D"
  | "Colecionáveis"
  | "Generativa"
  | "Jogos"
  | "Assinaturas"
  | "Utilidade"

export interface Wallet {
  id: string
  label: string
  provider: WalletProvider
  address: string
  network: BlockchainNetwork
  isPrimary: boolean
}

export interface User {
  id: string
  name: string
  username: string
  ensName?: string
  email: string
  avatarUrl: string
  wallets: Wallet[]
}

export interface NFT {
  id: string
  title: string
  description: string
  creator: string
  priceEth: string
  originalPriceEth?: string
  imageUrl: string
  gallery: string[]
  editionLabel: string
  availableQuantity: number
  isLimitedEdition: boolean
  isFeatured: boolean
  isTrending: boolean
  network: BlockchainNetwork
  collection: NFTCollection
  createdAt: string
  version: number
}

export interface CartItem {
  nftId: string
  quantity: number
  snapshotPriceEth: string
  snapshotAvailableQuantity: number
}

export interface CartQuoteItem {
  nftId: string
  quantity: number
  nft: NFT
  unitPriceEth: string
  itemTotalEth: string
  priceChanged: boolean
  stockExceeded: boolean
}

export interface CartQuote {
  items: CartQuoteItem[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalEth: string
  couponCode?: string
  requiresReconfirmation: boolean
}

export type OrderStatus = "pending" | "confirmed" | "rejected"

export interface OrderSnapshotItem {
  nftId: string
  title: string
  imageUrl: string
  editionLabel: string
  unitPriceEth: string
  quantity: number
  totalEth: string
}

export interface Order {
  id: string
  idempotencyKey: string
  userId: string
  walletAddress: string
  walletProvider: WalletProvider
  network: BlockchainNetwork
  collectorNote?: string
  items: OrderSnapshotItem[]
  subtotalEth: string
  discountEth: string
  networkFeeEth: string
  totalPaidEth: string
  status: OrderStatus
  transactionHash?: string
  explorerUrl?: string
  rejectionReason?: string
  createdAt: string
  version: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  facets: {
    collections: Record<NFTCollection, number>
    networks: Record<BlockchainNetwork, number>
    minPriceEth: string
    maxPriceEth: string
  }
}

export interface APIError {
  code:
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "NOT_FOUND"
    | "CONFLICT"
    | "OUT_OF_STOCK"
    | "PRICE_CHANGED"
    | "INVALID_COUPON"
    | "IDEMPOTENCY_CONFLICT"
    | "SERVICE_UNAVAILABLE"
  message: string
  fieldErrors?: Record<string, string>
}

export interface NftUpdatedEvent {
  eventId: string
  nftId: string
  version: number
  timestamp: string
  changes: {
    priceEth?: string
    availableQuantity?: number
  }
}

export interface OrderUpdatedEvent {
  eventId: string
  orderId: string
  userId: string
  status: OrderStatus
  transactionHash?: string
  explorerUrl?: string
  rejectionReason?: string
  version: number
  timestamp: string
}

export interface CatalogSearchParams {
  q?: string
  collection?: NFTCollection
  network?: BlockchainNetwork
  minPrice?: string
  maxPrice?: string
  tab?: "all" | "new" | "trending"
  sort?: "recent" | "price_asc" | "price_desc"
  page?: number
}