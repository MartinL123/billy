import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ensureSeed, watchCollection, watchDog } from './db'
import type { BillyDocument, BillyEvent, Dog, Entry, Weight, WithId } from './types'

interface Data {
  dog: WithId<Dog>
  events: WithId<BillyEvent>[]
  weights: WithId<Weight>[]
  /** Les plus récentes d'abord. */
  entries: WithId<Entry>[]
  documents: WithId<BillyDocument>[]
  /** Nombre d'éléments écrits localement et pas encore envoyés. */
  pendingCount: number
  online: boolean
}

const DataContext = createContext<Data | null>(null)

export function useData(): Data {
  const data = useContext(DataContext)
  if (!data) throw new Error('useData hors de DataProvider')
  return data
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  return online
}

const byCreation = <T extends { date: string; createdAt?: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

/** Écoute en direct toutes les données de l'utilisateur (peu nombreuses) et les partage aux écrans. */
export function DataProvider({ children, fallback }: { children: ReactNode; fallback: (offline: boolean) => ReactNode }) {
  const online = useOnline()
  const [dog, setDog] = useState<WithId<Dog> | null>()
  const [events, setEvents] = useState<WithId<BillyEvent>[]>()
  const [weights, setWeights] = useState<WithId<Weight>[]>()
  const [entries, setEntries] = useState<WithId<Entry>[]>()
  const [documents, setDocuments] = useState<WithId<BillyDocument>[]>()

  useEffect(() => {
    const stops = [
      watchDog(setDog),
      watchCollection<BillyEvent>('events', 'asc', setEvents),
      watchCollection<Weight>('weights', 'desc', setWeights),
      watchCollection<Entry>('entries', 'desc', (items) => setEntries([...items].sort(byCreation))),
      watchCollection<BillyDocument>('documents', 'desc', (items) => setDocuments([...items].sort(byCreation))),
    ]
    return () => stops.forEach((stop) => stop())
  }, [])

  // Premier lancement : profil et dates clés, dès que le serveur est joignable.
  useEffect(() => {
    if (dog === null && online) ensureSeed().catch((error) => console.error('Création du profil impossible', error))
  }, [dog, online])

  const data = useMemo<Data | null>(() => {
    if (!dog || !events || !weights || !entries || !documents) return null
    const pendingCount = [dog, ...events, ...weights, ...entries, ...documents].filter((item) => item.pending).length
    return { dog, events, weights, entries, documents, pendingCount, online }
  }, [dog, events, weights, entries, documents, online])

  if (!data) return <>{fallback(dog === null && !online)}</>
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>
}
