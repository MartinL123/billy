import type { ReactNode } from 'react'
import { ChevronLeftIcon } from '../../components/Icons'
import { useBack } from '../../lib/useBack'

/** Un écran de détail de Santé : « ‹ Santé », un titre, le contenu. */
export function SubScreen({ title, children, titleInContent = false }: { title: string; children: ReactNode; /** Le contenu a déjà son titre visible : celui de l’écran reste pour les lecteurs d’écran. */ titleInContent?: boolean }) {
  const back = useBack('/sante')
  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          Santé
        </button>
      </header>
      <main className="flex flex-col gap-5 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+120px)]">
        <h1 className={titleInContent ? 'sr-only' : 'font-display text-[28px] leading-tight font-extrabold'}>{title}</h1>
        {children}
      </main>
    </div>
  )
}
