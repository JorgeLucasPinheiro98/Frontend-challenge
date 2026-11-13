interface SkeletonProps {
    className?: string
  }
  
  export function Skeleton({ className = "" }: SkeletonProps) {
    return (
      <div
        aria-hidden="true"
        className={`animate-pulse rounded-md bg-muted/70 ${className}`}
      />
    )
  }
  
  export function NFTCardSkeleton() {
    return (
      <div
        aria-hidden="true"
        className="flex flex-col rounded-xl border border-border bg-card p-3.5"
      >
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="mt-3.5 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3.5 w-1/3" />
        </div>
      </div>
    )
  }
  
  export function NFTDetailSkeleton() {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando detalhes do NFT"
        className="grid grid-cols-1 gap-8 lg:grid-cols-12"
      >
        <div className="lg:col-span-6">
          <Skeleton className="aspect-square w-full rounded-2xl" />
        </div>
        <div className="space-y-5 lg:col-span-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <Skeleton className="h-11 w-48" />
        </div>
      </div>
    )
  }
  
  export function CartSummarySkeleton() {
    return (
      <div
        aria-busy="true"
        aria-label="Carregando resumo da carteira"
        className="space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2.5 border-t border-border pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }