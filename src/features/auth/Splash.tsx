import type { ReactNode } from 'react'
import { Logo } from './Login'

/** Écran d’attente ou de message plein écran, aux couleurs de l’app. */
export function Splash({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
      <Logo />
      {title && <h1 className="font-display text-[28px] font-bold tracking-[-0.5px]">{title}</h1>}
      {children && <div className="text-base leading-snug text-muted">{children}</div>}
    </main>
  )
}
