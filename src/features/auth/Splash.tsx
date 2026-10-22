import type { ReactNode } from 'react'
import { Logo } from './Login'

/** Écran d’attente ou de message plein écran, aux couleurs de l’app. Sans titre, VoiceOver annonce « Chargement » (R-067). */
export function Splash({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <main role={title ? undefined : 'status'} aria-label={title ? undefined : 'Chargement'} className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-center">
      <Logo />
      {title && <h1 className="title-screen">{title}</h1>}
      {children && <div className="text-base leading-snug text-muted">{children}</div>}
    </main>
  )
}
