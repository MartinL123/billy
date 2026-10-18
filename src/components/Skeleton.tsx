/** Un bloc gris qui scintille doucement, à la place d’un contenu qui charge (T-033). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />
}

/** Un écran qui charge : la forme de l’accueil (en-tête, une carte, des tuiles), sans rien de vide. */
export function SkeletonScreen() {
  return (
    <div role="status" aria-label="Chargement" className="mx-auto flex min-h-dvh max-w-[430px] flex-col gap-4 bg-bg px-5 pt-[calc(env(safe-area-inset-top)+24px)]">
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
      <Skeleton className="h-44 rounded-[26px]" />
      <Skeleton className="h-14" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[150px] rounded-[22px]" />
        <Skeleton className="h-[150px] rounded-[22px]" />
        <Skeleton className="h-[150px] rounded-[22px]" />
        <Skeleton className="h-[150px] rounded-[22px]" />
      </div>
    </div>
  )
}

/** Une liste qui charge : quelques lignes. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Chargement" className="flex flex-col gap-3 px-5">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  )
}
