import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ensureProfile, watchAll, watchCollection, watchDog } from './db'
import { isClosingAccount } from './erase'
import { isExposure, isTrainingSession, type BillyDocument, type BillyEvent, type BossProgress, type DailyQuestDoc, type Dog, type Entry, type Exposure, type Place, type QuestWeek, type TrainingSession, type Weight, type WithId, type XpEntry } from './types'

interface Data {
  dog: WithId<Dog>
  events: WithId<BillyEvent>[]
  weights: WithId<Weight>[]
  /** Les plus récentes d'abord. */
  entries: WithId<Entry>[]
  documents: WithId<BillyDocument>[]
  /** Séances de dressage, les plus récentes d'abord. */
  sessions: WithId<TrainingSession>[]
  exposures: WithId<Exposure>[]
  bossProgress: Record<string, WithId<BossProgress> | undefined>
  places: WithId<Place>[]
  /** Journal d'XP, en ajout seul. */
  xpLog: WithId<XpEntry>[]
  questWeeks: WithId<QuestWeek>[]
  /** Quêtes du jour, les plus récentes d'abord. */
  dailyQuests: WithId<DailyQuestDoc>[]
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
  const [sessions, setSessions] = useState<WithId<TrainingSession>[]>()
  const [exposures, setExposures] = useState<WithId<Exposure>[]>()
  const [bossProgress, setBossProgress] = useState<WithId<BossProgress>[]>()
  const [places, setPlaces] = useState<WithId<Place>[]>()
  const [xpLog, setXpLog] = useState<WithId<XpEntry>[]>()
  const [questWeeks, setQuestWeeks] = useState<WithId<QuestWeek>[]>()
  const [dailyQuests, setDailyQuests] = useState<WithId<DailyQuestDoc>[]>()

  useEffect(() => {
    const stops = [
      watchDog(setDog),
      watchCollection<BillyEvent>('events', 'asc', setEvents),
      watchCollection<Weight>('weights', 'desc', setWeights),
      watchCollection<Entry>('entries', 'desc', (items) => setEntries([...items].sort(byCreation))),
      watchCollection<BillyDocument>('documents', 'desc', (items) => setDocuments([...items].sort(byCreation))),
      // Les documents d'avant la spec V2 du dressage n'ont pas la bonne forme : ils sont ignorés, pas supprimés.
      watchCollection<TrainingSession>('sessions', 'desc', (items) => setSessions(items.filter(isTrainingSession).sort(byCreation))),
      watchCollection<Exposure>('exposures', 'desc', (items) => setExposures(items.filter(isExposure).sort(byCreation))),
      watchAll<BossProgress>('bossProgress', setBossProgress),
      watchAll<Place>('places', setPlaces),
      watchCollection<XpEntry>('xpLog', 'desc', setXpLog),
      watchCollection<QuestWeek>('quests', 'desc', setQuestWeeks),
      watchCollection<DailyQuestDoc>('dailyQuest', 'desc', setDailyQuests),
    ]
    return () => stops.forEach((stop) => stop())
  }, [])

  // Premier lancement : un espace vide, dès que le serveur est joignable. Le nom, les dates et la santé
  // viennent du questionnaire de départ. Aucune donnée de départ n'est plus jamais appliquée d'office.
  useEffect(() => {
    if (dog === null && online && !isClosingAccount()) ensureProfile().catch((error) => console.error('Création du profil impossible', error))
  }, [dog, online])

  const data = useMemo<Data | null>(() => {
    if (!dog || !events || !weights || !entries || !documents || !sessions || !exposures || !bossProgress || !places || !xpLog || !questWeeks || !dailyQuests) return null
    const pendingCount = [dog, ...events, ...weights, ...entries, ...documents, ...sessions, ...exposures, ...bossProgress, ...places].filter((item) => item.pending).length
    const progressById = Object.fromEntries(bossProgress.map((p) => [p.id, p]))
    // Tant que le nom n'est pas donné, l'interface dit « Votre chien ».
    const named = dog.name?.trim() ? dog : { ...dog, name: 'Votre chien', unnamed: true }
    return { dog: named, events, weights, entries, documents, sessions, exposures, bossProgress: progressById, places, xpLog, questWeeks, dailyQuests, pendingCount, online }
  }, [dog, events, weights, entries, documents, sessions, exposures, bossProgress, places, xpLog, questWeeks, dailyQuests, online])

  if (!data) return <>{fallback(dog === null && !online)}</>
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>
}
