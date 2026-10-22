import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { ensureProfile, watchAll, watchCollection, watchDog } from './db'
import { setKnownUsage } from './files'
import { accountDoc, viewedOwnerUid } from './paths'
import { isClosingAccount } from './erase'
import type { Bone } from '../lib/bones'
import type { WalkDay } from '../lib/walks'
import { isExposure, isTrainingSession, type BillyDocument, type BillyEvent, type BossProgress, type DailyQuestDoc, type Dog, type FogZone, type InventoryItem, type Entry, type Exposure, type TrainingSession, type Weight, type WithId, type XpEntry } from './types'
import { setFemale, setNoGarden } from '../lib/garden'
import { isFemale } from '../lib/gender'
import type { Commune } from '../lib/commune'

interface Data {
  dog: WithId<Dog>
  events: WithId<BillyEvent>[]
  weights: WithId<Weight>[]
  /** Les plus récentes d’abord. */
  entries: WithId<Entry>[]
  documents: WithId<BillyDocument>[]
  /** Séances de dressage, les plus récentes d’abord. */
  sessions: WithId<TrainingSession>[]
  exposures: WithId<Exposure>[]
  bossProgress: Record<string, WithId<BossProgress> | undefined>
  /** Journal d’XP, en ajout seul. */
  xpLog: WithId<XpEntry>[]
  /** Missions du jour, les plus récentes d’abord. */
  dailyQuests: WithId<DailyQuestDoc>[]
  /** Espace utilisé par les photos et documents (octets), connu même hors ligne. */
  usage: number
  /** T-085 : les marches vues par l’iPhone auxquelles on a répondu « Non » (identifiants de période, compte). */
  motionDismissed: string[]
  /** Trajets habituels (20 au plus). */
  /** Brouillard : les cases de 25 m découvertes, par zone (users/{uid}/fog25/{zone}). */
  fog: WithId<FogZone>[]
  /** Communes déjà connues (contour gardé une fois), pour le pourcentage découvert. */
  communes: WithId<Commune>[]
  /** Os gagnés et dépensés. */
  bones: WithId<Bone>[]
  /** Objets achetés dans la boutique. */
  inventory: WithId<InventoryItem>[]
  /** Sorties du jour cochées, un document par jour, les plus récents d’abord. */
  walks: WithId<WalkDay>[]
  /** Nombre d’éléments écrits localement et pas encore envoyés. */
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

/** Écoute en direct toutes les données de l’utilisateur (peu nombreuses) et les partage aux écrans. */
export function DataProvider({ children, fallback }: { children: ReactNode; fallback: (offline: boolean) => ReactNode }) {
  const online = useOnline()
  const [dog, setDog] = useState<WithId<Dog> | null>()
  // T-074 : le dernier profil vu. Après une coupure au premier lancement, l’écouteur peut dire le profil absent alors
  // qu’il existe : l’écran garde alors ce profil (sinon il bascule sans fin entre le squelette et l’app, et chaque
  // bascule la remonte en entier), pendant qu’ensureProfile relit le serveur. Pas pendant la suppression du compte.
  const [lastDog, setLastDog] = useState<WithId<Dog>>()
  const [events, setEvents] = useState<WithId<BillyEvent>[]>()
  const [weights, setWeights] = useState<WithId<Weight>[]>()
  const [entries, setEntries] = useState<WithId<Entry>[]>()
  const [documents, setDocuments] = useState<WithId<BillyDocument>[]>()
  const [sessions, setSessions] = useState<WithId<TrainingSession>[]>()
  const [exposures, setExposures] = useState<WithId<Exposure>[]>()
  const [bossProgress, setBossProgress] = useState<WithId<BossProgress>[]>()
  const [xpLog, setXpLog] = useState<WithId<XpEntry>[]>()
  const [dailyQuests, setDailyQuests] = useState<WithId<DailyQuestDoc>[]>()
  const [bones, setBones] = useState<WithId<Bone>[]>()
  const [usage, setUsageState] = useState(0)
  const [motionDismissed, setMotionDismissed] = useState<string[]>([])
  const [inventory, setInventory] = useState<WithId<InventoryItem>[]>()
  const [fog, setFog] = useState<WithId<FogZone>[]>()
  const [communes, setCommunes] = useState<WithId<Commune>[]>()
  const [walks, setWalks] = useState<WithId<WalkDay>[]>()

  useEffect(() => {
    const stops = [
      watchDog((next) => {
        setDog(next)
        if (next) setLastDog(next)
      }),
      watchCollection<BillyEvent>('events', 'asc', setEvents),
      watchCollection<Weight>('weights', 'desc', setWeights),
      watchCollection<Entry>('entries', 'desc', (items) => setEntries([...items].sort(byCreation))),
      // Visiteur (T-048) : les documents (papiers, ordonnances) restent privés.
      viewedOwnerUid() ? (setDocuments([]), () => undefined) : watchCollection<BillyDocument>('documents', 'desc', (items) => setDocuments([...items].sort(byCreation))),
      // Les documents d’avant la spec V2 du dressage n’ont pas la bonne forme : ils sont ignorés, pas supprimés.
      watchCollection<TrainingSession>('sessions', 'desc', (items) => setSessions(items.filter(isTrainingSession).sort(byCreation))),
      watchCollection<Exposure>('exposures', 'desc', (items) => setExposures(items.filter(isExposure).sort(byCreation))),
      watchAll<BossProgress>('bossProgress', setBossProgress),
      watchCollection<XpEntry>('xpLog', 'desc', setXpLog),
      watchCollection<DailyQuestDoc>('dailyQuest', 'desc', setDailyQuests),
      watchCollection<Bone>('bones', 'desc', setBones),
      watchCollection<WalkDay>('walks', 'desc', setWalks),
      onSnapshot(accountDoc(), (snap) => {
        const account = snap.data() as { usage?: { bytes?: number }; motion?: { dismissed?: unknown } } | undefined
        const bytes = Math.max(0, Number(account?.usage?.bytes ?? 0))
        setUsageState(bytes)
        setKnownUsage(bytes)
        // Champ optionnel (T-085) : absent ou mal formé, aucune période écartée.
        const dismissed = account?.motion?.dismissed
        setMotionDismissed(Array.isArray(dismissed) ? dismissed.filter((id): id is string => typeof id === 'string') : [])
      }, () => undefined),
      watchAll<InventoryItem>('inventory', setInventory),
      watchAll<FogZone>('fog25', setFog),
      watchAll<Commune>('communes', setCommunes),
    ]
    return () => stops.forEach((stop) => stop())
  }, [])

  // Premier lancement : un espace vide, dès que le serveur est joignable. Le nom, les dates et la santé
  // viennent du questionnaire de départ. Aucune donnée de départ n’est plus jamais appliquée d’office.
  useEffect(() => {
    if (dog === null && online && !isClosingAccount() && !viewedOwnerUid()) ensureProfile().catch((error) => console.error('Création du profil impossible', error))
  }, [dog, online])

  const shownDog = dog === null && !isClosingAccount() ? lastDog : dog
  const data = useMemo<Data | null>(() => {
    const dog = shownDog
    if (!dog || !events || !weights || !entries || !documents || !sessions || !exposures || !bossProgress || !xpLog || !dailyQuests || !bones || !inventory || !fog || !communes || !walks) return null
    const pendingCount = [dog, ...events, ...weights, ...entries, ...documents, ...sessions, ...exposures, ...bossProgress].filter((item) => item.pending).length
    const progressById = Object.fromEntries(bossProgress.map((p) => [p.id, p]))
    // Tant que le nom n’est pas donné, l’interface dit « Votre chien ».
    const named = dog.name?.trim() ? dog : { ...dog, name: 'Votre chien', unnamed: true }
    // Sans jardin : les textes du dressage parlent de couloir, palier, parc vide.
    setNoGarden(dog.garden === 'Non')
    setFemale(isFemale(dog.sex))
    return { dog: named, events, weights, entries, documents, sessions, exposures, bossProgress: progressById, xpLog, dailyQuests, bones, inventory, fog, communes, walks, usage, motionDismissed, pendingCount, online }
  }, [shownDog, events, weights, entries, documents, sessions, exposures, bossProgress, xpLog, dailyQuests, bones, inventory, fog, communes, walks, usage, motionDismissed, online])

  if (!data) return <>{fallback(dog === null && !online)}</>
  return <DataContext.Provider value={data}>{children}</DataContext.Provider>
}
