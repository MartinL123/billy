import { BackLink } from '../../components/BackLink'
import { useData } from '../../firebase/store'
import { progressFeed } from '../../lib/billyPage'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { ProgressList } from './ProgressList'

/** « Voir tous ses progrès » (T-104) : le fil complet, du plus récent au plus ancien. */
export default function AllProgress() {
  const { dog, entries, xpLog, bossProgress } = useData()
  const today = useToday()
  const back = useBack('/billy')
  const items = progressFeed(entries, xpLog, bossProgress)
  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label={dog.unnamed ? 'Votre chien' : dog.name} onClick={back} />
      </header>
      <main className="flex flex-col gap-4 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <h1 className="title-screen">Ses progrès</h1>
        {items.length ? (
          <div className="card rounded-[20px] px-4 py-1">
            <ProgressList items={items} today={today} />
          </div>
        ) : (
          <p className="text-muted">Ses étapes acquises et ses séances « Super » s’afficheront ici.</p>
        )}
      </main>
    </div>
  )
}
