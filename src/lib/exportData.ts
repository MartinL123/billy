// T-065 : « Exporter mes données » (Profil › Compte). Un fichier JSON pour mesurer l'usage réel de Flair
// (docs/profondeur/02-rapport-chiffre.md) : dates, durées, sources, compteurs. Jamais de position, de texte libre,
// de photo, de nom de lieu ni de contact. Rien n'est envoyé : le fichier reste chez l'utilisateur.

type Doc = Record<string, unknown> & { id: string }

const pick = (doc: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter((k) => doc[k] !== undefined).map((k) => [k, doc[k]]))
const count = (value: unknown) => (Array.isArray(value) ? value.length : 0)

/** Une balade ou un souvenir : quand, d'où, combien, jamais où ni quoi. */
function entry(e: Doc) {
  const route = (e.route ?? undefined) as Record<string, unknown> | undefined
  return {
    ...pick(e, ['id', 'date', 'createdAt', 'source', 'feeling', 'fear', 'movedAway', 'xp', 'kind']),
    tags: e.tags,
    skills: e.skills,
    textLength: typeof e.text === 'string' ? e.text.length : 0,
    photos: count(e.photos),
    walkSlot: (e.walkSlot as { creneau?: string } | undefined)?.creneau,
    route: route ? { ...pick(route, ['distanceM', 'durationMin', 'source', 'startTime', 'endTime']), points: count(route.points), moments: count(route.moments) } : undefined,
  }
}

export interface ExportSource {
  dog: Record<string, unknown>
  entries: Doc[]
  walks: Doc[]
  events: Doc[]
  weights: Doc[]
  documents: Doc[]
  dailyQuests: Doc[]
  xpLog: Doc[]
  bones: Doc[]
  bossProgress: Record<string, Doc | undefined>
  sessions: Doc[]
  exposures: Doc[]
  inventory: Doc[]
  fog: Doc[]
}

export function exportSnapshot(d: ExportSource, now: Date) {
  const questionnaire = d.dog.questionnaire as { completedAt?: string } | undefined
  return {
    version: 1,
    exportedAt: now.toISOString(),
    dog: {
      ...pick(d.dog, ['birthDate', 'adoptionDate', 'walkTimes', 'bonesBackfilled', 'filesKindBackfilled', 'seedVersion']),
      questionnaireCompletedAt: questionnaire?.completedAt,
      meals: count((d.dog.feeding as { meals?: unknown[] } | undefined)?.meals),
      activeSkills: d.dog.activeSkills,
    },
    entries: d.entries.map(entry),
    walks: d.walks.map((w) => pick(w, ['id', 'date', 'done', 'noted'])),
    events: d.events.map((e) => pick(e, ['id', 'type', 'date', 'time', 'done', 'doneAt', 'doneDate', 'recurrence', 'createdAt'])),
    weights: d.weights.map((w) => pick(w, ['id', 'date', 'kg'])),
    documents: d.documents.map((doc) => ({ ...pick(doc, ['id', 'category', 'date', 'kind', 'createdAt']), pages: count(doc.fileIds) })),
    dailyQuests: d.dailyQuests.map((q) => pick(q, ['id', 'date', 'skill', 'step', 'done', 'doneAt', 'rest', 'swaps', 'createdAt'])),
    xpLog: d.xpLog.map((x) => pick(x, ['id', 'date', 'amount', 'reason', 'source', 'createdAt'])),
    bones: d.bones.map((b) => pick(b, ['id', 'date', 'amount', 'reason'])),
    bossProgress: Object.values(d.bossProgress).flatMap((p) => (p ? [pick(p, ['id', 'level', 'successes', 'updatedAt', 'startedAt', 'masteredAt'])] : [])),
    counts: { sessions: d.sessions.length, exposures: d.exposures.length, inventory: d.inventory.length, fogZones: d.fog.length },
  }
}
