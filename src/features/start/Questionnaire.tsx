import { useState } from 'react'
import { BackLink } from '../../components/BackLink'
import { NativePickerInput } from '../../components/Form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { FilePicker } from '../../components/FilePicker'
import { CheckIcon, TrashIcon } from '../../components/Icons'
import { SKILLS } from '../../content/phrases'
import { answerQuestion, ensureMilestones, recordCare, saveEvent, saveWeight, updateDog } from '../../firebase/db'
import { deleteFile, saveImage } from '../../firebase/files'
import { newId } from '../../firebase/paths'
import { useData } from '../../firebase/store'
import { declarePreApp } from '../../firebase/training'
import type { Dog } from '../../firebase/types'
import { isValidISO } from '../../lib/dates'
import { sortMeals, type Meal } from '../../lib/feeding'
import { nextTrainerSession, STERILISATION_PLANNED, sterilisationReminder, trainerSession } from '../../lib/events'
import { lastDone } from '../../lib/health'
import { agree, forSex, ofName } from '../../lib/gender'
import { compressImage, PHOTO } from '../../lib/image'
import {
  allPartsDone,
  deriveTraits,
  essentialIndexes,
  essentialsDone,
  fearSkills,
  FOLLOW_UPS,
  normalizeAnswers,
  partIndexes,
  PARTS,
  questionnaireStatus,
  REACTION_LEVELS,
  reactionSentence,
  reactionsFromFears,
  SITUATIONS,
  situationSkill,
  skillOptions,
  STEPS,
  stepsForAnswer,
  type Reaction,
  type SkillAnswer,
} from '../../lib/questionnaire'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { BossIcon } from '../training/BossIcon'
import { Result } from './Result'
import { errorText } from '../../firebase/errors'

const label = 'text-[1rem] font-bold'
const input = 'field min-h-14 text-[1rem]'
const option = (on: boolean) =>
  `flex min-h-[64px] w-full items-center gap-3.5 rounded-[20px] border-2 border-solid px-4 py-3 text-left ${on ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`
const chipClass = (on: boolean) => `min-h-12 rounded-full border-2 border-solid px-4 text-left text-[0.8824rem] leading-tight font-semibold ${on ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`

const MEAL_LABELS = ['Matin', 'Midi', 'Après-midi', 'Soir']
const mealLabel = (time: string) => MEAL_LABELS[time < '11:00' ? 0 : time < '13:30' ? 1 : time < '18:00' ? 2 : 3]!

function Tick({ on }: { on: boolean }) {
  return (
    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-solid ${on ? 'border-white bg-white text-primary' : 'border-line-strong'}`}>
      {on && <CheckIcon size={16} />}
    </span>
  )
}

/**
 * Questionnaire de départ, en 5 parties. Une question par écran, pré-remplie avec ce que l’app sait déjà :
 * on confirme au lieu de retaper. Une réponse ne compte qu’après « Suivant ».
 */
export default function Questionnaire() {
  const { dog, events, weights, bossProgress } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const later = useBack('/')
  const answers = normalizeAnswers(dog.questionnaire?.answers ?? {})
  const [params] = useSearchParams()
  // Le parcours (T-012) : au départ, les 9 questions essentielles ; « Compléter son profil » (?partie=N), une partie ;
  // sinon tout le questionnaire, où l’on reprend là où on s’était arrêté (ou sur l’écran demandé).
  const [route] = useState<{ kind: 'depart' | 'partie' | 'tout'; flow: number[]; start: number }>(() => {
    const all = STEPS.map((_, i) => i)
    const part = Number(params.get('partie'))
    const asked = STEPS.findIndex((s) => s.id === params.get('etape'))
    if (part >= 1 && part <= PARTS.length) {
      // Seulement les questions encore sans réponse : le compte annoncé sur l’accueil est le bon.
      const open = partIndexes(part).filter((i) => answers[STEPS[i]!.id] === undefined)
      return { kind: 'partie', flow: open.length ? open : partIndexes(part), start: 0 }
    }
    if (asked < 0 && !essentialsDone(dog.questionnaire)) {
      const flow = essentialIndexes()
      const first = flow.findIndex((i) => answers[STEPS[i]!.id] === undefined)
      return { kind: 'depart', flow, start: Math.max(0, first) }
    }
    return { kind: 'tout', flow: all, start: asked >= 0 ? asked : questionnaireStatus(dog.questionnaire).resumeAt }
  })
  const flow = route.flow
  const [pos, setPos] = useState(route.start)
  const [direction, setDirection] = useState(0)
  const index = flow[Math.min(pos, flow.length - 1)]!
  const step = STEPS[index]!
  const [error, setError] = useState('')

  // Brouillon : ce que l’app sait déjà. Rien n’est enregistré avant « Suivant ».
  const [draft, setDraft] = useState<Record<string, string>>(() => ({
    nom: dog.unnamed ? '' : dog.name,
    naissance: dog.birthDate,
    sexe: dog.sex ?? '',
    sterilise: dog.neutered ?? '',
    race: dog.breed,
    poids: weights[0] ? String(weights[0].kg).replace('.', ',') : '',
    adoption: dog.adoptionDate,
    provenance: dog.origin ?? '',
    puce: dog.chip ?? '',
    'veto-nom': dog.vet?.name ?? '',
    'veto-tel': dog.vet?.phone ?? '',
    vaccin: lastDone(events, 'vaccin'),
    'vaccin-nom': dog.vaccineName ?? '',
    rage: dog.rabies ?? '',
    vermifuge: lastDone(events, 'vermifuge'),
    antiparasitaire: lastDone(events, 'antiparasitaire'),
    'antiparasitaire-type': dog.antiparasiteType ?? '',
    'sante-notes': dog.healthNotes ?? '',
    allergie: dog.allergies ?? '',
    nourriture: dog.foodType ?? '',
    'nourriture-marque': dog.foodBrand ?? '',
    friandises: dog.treats ?? '',
    jeux: (dog.games ?? []).join('|'),
    logement: dog.housing ?? '',
    jardin: dog.garden ?? '',
    seul: dog.aloneTime ?? '',
    sorties: dog.walksPerDay ?? '',
    'educateur-nom': dog.trainer?.name ?? '',
    'educateur-tel': dog.trainer?.phone ?? '',
    'educateur-date': nextTrainerSession(events, today)?.date ?? '',
    'educateur-heure': nextTrainerSession(events, today)?.time ?? '',
    foyer: dog.household ?? '',
    humeur: dog.homeMood ?? '',
  }))
  const set = (key: string, value: string) => {
    setError('')
    setDraft((current) => ({ ...current, [key]: value }))
  }
  const [grams, setGrams] = useState(dog.feeding ? String(dog.feeding.gramsPerDay) : '')
  const [meals, setMeals] = useState<Meal[]>(() => sortMeals(dog.feeding?.meals ?? []))
  // Les anciennes cases « ce qui lui fait peur » arrivent en phrases, à confirmer.
  const [reactions, setReactions] = useState<Reaction[]>(() => dog.reactions ?? reactionsFromFears(dog.fears ?? []))
  const [situation, setSituation] = useState('')
  const [skillDraft, setSkillDraft] = useState<Record<string, SkillAnswer>>({})

  const go = (next: number) => {
    setError('')
    // Fin d’un parcours court : les essentiels mènent à l’écran de bienvenue (T-011), une partie revient à l’accueil.
    if (next >= flow.length && route.kind !== 'tout') {
      if (route.kind === 'depart') {
        // Champ par champ : la dernière réponse, encore en route, n’est pas écrasée.
        updateDog({ 'questionnaire.essentialsAt': new Date().toISOString() } as Partial<Dog>)
        return navigate('/bienvenue', { replace: true })
      }
      // La dernière partie remplie : le questionnaire est terminé (ses +50 os arrivent comme pour un questionnaire fait d’un bloc).
      if (allPartsDone(dog.questionnaire, flow.map((i) => STEPS[i]!.id))) answerQuestion('fin', 'ok', { 'questionnaire.completedAt': new Date().toISOString() })
      return navigate('/', { replace: true })
    }
    const target = Math.max(0, Math.min(flow.length - 1, next))
    setDirection(Math.sign(target - pos))
    setPos(target)
    window.scrollTo(0, 0)
  }

  const choosePhoto = async (files: File[]) => {
    const file = files[0]
    if (!file) return
    try {
      const { full, thumb } = await compressImage(file, PHOTO)
      const [photoFileId, photoThumbFileId] = [await saveImage(full), await saveImage(thumb)]
      deleteFile(dog.photoFileId)
      deleteFile(dog.photoThumbFileId)
      updateDog({ photoFileId, photoThumbFileId })
    } catch (err) {
      setError(errorText(err, 'Photo illisible.'))
    }
  }

  // Une situation qui lui fait peur pré-règle la compétence sur « Pas encore » (modifiable).
  const skillValue = (id: string): SkillAnswer | undefined => skillDraft[id] ?? (answers[id] as SkillAnswer | undefined) ?? (fearSkills(reactions).includes(id) ? 'non' : undefined)

  const save = (patch: Partial<Dog> = {}, value = 'ok') => answerQuestion(step.id, value, patch as Record<string, unknown>)
  const text = (key: string) => (draft[key] ?? '').trim()
  const careDate = (key: string) => {
    const date = text(key)
    if (date && (!isValidISO(date) || date > today)) {
      setError('Choisissez une date, aujourd’hui ou avant.')
      return null
    }
    return date
  }

  /** « Suivant » : c’est seulement ici qu’une réponse compte. */
  const next = () => {
    const id = step.id
    if (id === 'nom') {
      if (!text('nom')) return setError('Donnez le nom de votre chien.')
      save({ name: text('nom') })
    } else if (id === 'naissance' || id === 'adoption') {
      const date = text(id)
      // Facultatif, comme tout le questionnaire : sans date, l’âge n’est simplement pas affiché.
      if (date && (!isValidISO(date) || date > today)) return setError('Choisissez une date, aujourd’hui ou avant.')
      if (id === 'adoption') save({ adoptionDate: date })
      else save({ birthDate: date, traits: deriveTraits(dog.traits ?? [], reactions, dog.homeMood, date, today) })
      // Anniversaire, 6 mois, 1 an, anniversaire d’adoption : ajoutés au calendrier, une seule fois.
      if (date) ensureMilestones(events, text('nom') || dog.name, id === 'adoption' ? { adoption: date } : { birth: date }, today)
    } else if (id === 'sexe') save({ sex: text(id) })
    else if (id === 'sterilise') {
      const date = text('sterilise-date')
      if (text(id) === STERILISATION_PLANNED) {
        if (date && (!isValidISO(date) || date < today)) return setError('Choisissez une date à venir, ou laissez vide.')
        // « C’est prévu » : un rappel dans Santé, à la date choisie ou pour prendre rendez-vous.
        const reminder = sterilisationReminder(events, date, dog.birthDate, today)
        if (reminder) saveEvent(newId('events'), reminder)
      }
      save({ neutered: text(id) })
    }
    else if (id === 'race') save({ breed: text(id) })
    else if (id === 'poids') {
      const kg = Number(text('poids').replace(',', '.'))
      if (text('poids') && (!Number.isFinite(kg) || kg <= 0 || kg > 120)) return setError('Écrivez son poids en kilos, par exemple 8,7.')
      if (kg && weights[0]?.kg !== kg) saveWeight(newId('weights'), { date: today, kg })
      save()
    } else if (id === 'provenance') save({ origin: text(id) })
    else if (id === 'puce') save({ chip: text(id) })
    else if (id === 'veto') save({ vet: { name: text('veto-nom'), phone: text('veto-tel') } })
    else if (id === 'educateur') {
      const date = text('educateur-date')
      if (date && (!isValidISO(date) || date < today)) return setError('Choisissez une date à venir pour la prochaine séance.')
      // La prochaine séance devient un rendez-vous « Éducateur » dans Santé.
      const session = trainerSession(events, { date, time: text('educateur-heure'), name: text('educateur-nom') }, today)
      if (session) saveEvent(newId('events'), session)
      save({ trainer: { name: text('educateur-nom'), phone: text('educateur-tel') } })
    }
    else if (id === 'vaccin') {
      const date = careDate(id)
      if (date === null) return
      const name = text('vaccin-nom')
      if (date) recordCare(events, { type: 'vaccin', title: name ? `Vaccin ${name}` : 'Vaccin', date, recurrence: 'yearly' })
      save({ vaccineName: name })
    } else if (id === 'vermifuge') {
      const date = careDate(id)
      if (date === null) return
      if (date) recordCare(events, { type: 'vermifuge', title: 'Vermifuge', date, recurrence: 'quarterly' })
      save()
    } else if (id === 'antiparasitaire') {
      const date = careDate(id)
      if (date === null) return
      if (date) recordCare(events, { type: 'antiparasitaire', title: 'Antiparasitaire puces et tiques', date, recurrence: 'monthly' })
      save({ antiparasiteType: text('antiparasitaire-type') })
    } else if (id === 'rage') save({ rabies: text(id) })
    else if (id === 'sante-notes') save({ healthNotes: text(id) })
    else if (id === 'allergie') save({ allergies: text(id) })
    else if (id === 'nourriture') save({ foodType: text(id), foodBrand: text('nourriture-marque') })
    else if (id === 'repas') {
      const perDay = Number(grams)
      const kept = sortMeals(meals.filter((m) => /^\d{2}:\d{2}$/.test(m.time)))
      save(perDay > 0 || kept.length ? { feeding: { gramsPerDay: perDay || 0, meals: kept } } : {})
    } else if (id === 'friandises') save({ treats: text(id) })
    else if (id === 'jeux') save({ games: text('jeux') ? text('jeux').split('|') : [] })
    else if (id === 'logement') save({ housing: text(id) })
    else if (id === 'jardin') save({ garden: text(id) })
    else if (id === 'seul') save({ aloneTime: text(id) })
    else if (id === 'sorties') save({ walksPerDay: text(id) })
    else if (id === 'foyer') save({ household: text(id) })
    else if (id === 'reactions') save({ reactions, traits: deriveTraits(dog.traits ?? [], reactions, dog.homeMood, dog.birthDate, today) })
    else if (id === 'humeur') save({ homeMood: text(id), traits: deriveTraits(dog.traits ?? [], reactions, text(id), dog.birthDate, today) })
    else if (step.kind === 'skill') {
      const value = skillValue(id) ?? 'nsp'
      save({}, value)
      // Les étapes déjà sues sont acquises : il savait déjà le faire. Une réponse ne fait jamais baisser.
      declarePreApp(id, bossProgress[id], stepsForAnswer(value), today)
    } else if (id === 'fin') {
      answerQuestion('fin', 'ok', { 'questionnaire.completedAt': new Date().toISOString() })
      return navigate('/', { replace: true })
    } else save()
    go(pos + 1)
  }

  // « Je ne sais pas » (dates de santé, ce qu’il sait faire) : on passe à la question suivante sans rien enregistrer d’autre.
  const unknown = step.kind === 'skill' || (step.kind === 'date' && step.part === 2)
  const dontKnow = () => {
    if (step.kind === 'skill') {
      setSkillDraft({ ...skillDraft, [step.id]: 'nsp' })
      save({}, 'nsp')
    } else {
      set(step.id, '')
      save({}, 'nsp')
    }
    go(pos + 1)
  }

  // Accordé au féminin dès que « Femelle » est répondu (audit R-006) ; avant, les questions restent neutres.
  const g = (text: string) => forSex(text, draft.sexe)
  const title = g(step.title.replace('de {nom}', ofName(draft.nom || (dog.unnamed ? 'votre chien' : dog.name))).replace('{nom}', draft.nom || (dog.unnamed ? 'votre chien' : dog.name)))
  const skill = SKILLS.find((s) => s.id === step.id)
  const choices = (draft[step.id] ?? '').split('|').filter(Boolean)

  const addReaction = (reaction: string) => {
    const what = situation.trim()
    if (!what) return
    setReactions([...reactions.filter((r) => r.situation !== what), { situation: what, reaction, ...(situationSkill(what) ? { bossId: situationSkill(what) } : {}) }])
    setSituation('')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
      <header className="flex flex-col gap-3 pb-5">
        {/* « Retour » toujours en haut à gauche, sur toutes les questions (audit R-019). */}
        <div className="flex items-center justify-between gap-3">
          {pos > 0 ? (
            <BackLink label="Retour" onClick={() => go(pos - 1)} className="whitespace-nowrap" />
          ) : (
            <span />
          )}
          <button type="button" onClick={later} className="btn-text -mr-1 whitespace-nowrap">
            Continuer plus tard
          </button>
        </div>
        <div role="progressbar" aria-label="Avancement du questionnaire" aria-valuemin={1} aria-valuemax={flow.length} aria-valuenow={pos + 1} className="h-2.5 overflow-hidden rounded-full bg-placeholder">
          {/* La barre glisse (transform seulement, fluide sur iPhone ; T-033). */}
          <div className="h-full origin-left rounded-full bg-primary transition-transform duration-[250ms] ease-[cubic-bezier(.2,.8,.3,1)]" style={{ transform: `scaleX(${(pos + 1) / flow.length})` }} />
        </div>
        {/* La partie est rappelée ici, sous la barre : la ligne du haut garde ses boutons sur une seule ligne. */}
        <p className="flex flex-wrap justify-between gap-x-3 surtitre" aria-live="polite">
          <span className="text-primary">{route.kind === 'depart' ? 'Pour commencer' : PARTS[step.part - 1]}</span>
          <span className="text-muted">{route.kind === 'tout' ? `Partie ${step.part} sur ${PARTS.length}` : `Question ${pos + 1} sur ${flow.length}`}</span>
        </p>
      </header>

      {/* La question suivante arrive de la droite, la précédente de la gauche (T-033). */}
      <div key={pos} className={`flex flex-1 flex-col gap-5 ${direction > 0 ? 'q-next' : direction < 0 ? 'q-prev' : ''}`}>
        {step.kind !== 'fin' && step.kind !== 'skill' && (
          <div className="flex flex-col gap-2">
            <h1 className="title-screen">{title}</h1>
            {step.help && <p className="text-[1rem] leading-snug text-muted">{g(step.help)}</p>}
          </div>
        )}

        {(step.kind === 'text' || step.kind === 'number') && (
          <input
            aria-label={title}
            value={draft[step.id] ?? ''}
            onChange={(e) => set(step.id, e.target.value)}
            inputMode={step.kind === 'number' ? 'decimal' : undefined}
            placeholder={step.placeholder}
            autoComplete="off"
            className={input}
          />
        )}

        {step.kind === 'longtext' && <textarea aria-label={title} rows={3} value={draft[step.id] ?? ''} onChange={(e) => set(step.id, e.target.value)} className="resize-none rounded-[18px] border-2 border-solid border-border bg-surface px-4 py-3.5 text-[1rem] leading-[1.45] text-text" />}

        {step.kind === 'date' && (
          <div className="flex flex-col gap-2.5">
            <NativePickerInput aria-label={title} type="date" max={today} value={draft[step.id] ?? ''} onChange={(e) => set(step.id, e.target.value)} className={`${input} px-3`} />
          </div>
        )}

        {step.kind === 'choice' && (
          <div role="radiogroup" aria-label={title} className="flex flex-col gap-2.5">
            {step.options?.map(({ value, label: text }) => {
              const on = draft[step.id] === value
              return (
                <button key={value} type="button" role="radio" aria-checked={on} onClick={() => set(step.id, on ? '' : value)} className={option(on)}>
                  <Tick on={on} />
                  <span className="text-[1.1176rem] font-bold">{g(text)}</span>
                </button>
              )
            })}
            {step.id === 'sterilise' && draft[step.id] === STERILISATION_PLANNED && (
              <label className="mt-2 flex flex-col gap-2">
                <span className={label}>
                  Quand ? <span className="font-normal text-muted">(facultatif)</span>
                </span>
                <NativePickerInput type="date" min={today} value={draft['sterilise-date'] ?? ''} onChange={(e) => set('sterilise-date', e.target.value)} className={`${input} px-3`} />
                <span className="text-[0.8824rem] text-muted">{draft['sterilise-date'] ? 'Un rappel s’ajoutera dans Santé.' : 'Sans date, Santé vous rappellera de prendre rendez-vous.'}</span>
              </label>
            )}
          </div>
        )}

        {step.kind === 'multi' && (
          <div className="grid grid-cols-2 gap-2.5">
            {step.options?.map(({ value, label: text }) => {
              const on = choices.includes(value)
              return (
                <button key={value} type="button" role="checkbox" aria-checked={on} onClick={() => set(step.id, (on ? choices.filter((c) => c !== value) : [...choices, value]).join('|'))} className={`${option(on)} gap-2.5 px-3`}>
                  <Tick on={on} />
                  <span className="text-[1rem] leading-tight font-bold">{g(text)}</span>
                </button>
              )
            })}
          </div>
        )}

        {step.detail && (
          <label className="flex flex-col gap-2">
            <span className={label}>{step.detail.label}</span>
            <input value={draft[step.detail.key] ?? ''} onChange={(e) => set(step.detail!.key, e.target.value)} placeholder={step.detail.placeholder} autoComplete="off" className={input} />
          </label>
        )}

        {step.kind === 'photo' && (
          <div className="flex flex-col items-center gap-4">
            {dog.photoThumbFileId ? (
              <FileImage fileId={dog.photoThumbFileId} alt={`Photo ${ofName(dog.name)}`} className="size-40 rounded-full" eager />
            ) : (
              <span className="flex size-40 items-center justify-center rounded-full bg-primary-soft font-display text-6xl font-semibold text-primary-dark">{(draft.nom || '?').charAt(0).toUpperCase()}</span>
            )}
            <FilePicker accept="image/*" multiple={false} onFiles={(files) => void choosePhoto(files)} className="btn btn-outline w-full">
              {dog.photoThumbFileId ? 'Changer la photo' : 'Choisir une photo'}
            </FilePicker>
          </div>
        )}

        {step.kind === 'contact' && (
          <>
            <label className="flex flex-col gap-2">
              <span className={label}>Son nom</span>
              <input value={draft[`${step.id}-nom`] ?? ''} onChange={(e) => set(`${step.id}-nom`, e.target.value)} autoComplete="off" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Son téléphone</span>
              <input type="tel" inputMode="tel" value={draft[`${step.id}-tel`] ?? ''} onChange={(e) => set(`${step.id}-tel`, e.target.value)} autoComplete="off" className={input} />
            </label>
            {step.id === 'educateur' && (
              <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
                <legend className={`${label} mb-2 p-0`}>
                  Prochaine séance <span className="font-normal text-muted">(facultatif)</span>
                </legend>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <NativePickerInput aria-label="Date de la prochaine séance" type="date" min={today} value={draft['educateur-date'] ?? ''} onChange={(e) => set('educateur-date', e.target.value)} className={`${input} min-w-0 px-3`} />
                  <NativePickerInput aria-label="Heure de la prochaine séance" type="time" value={draft['educateur-heure'] ?? ''} onChange={(e) => set('educateur-heure', e.target.value)} className={`${input} w-[120px] px-3`} />
                </div>
                <p className="text-[0.8824rem] text-muted">Elle s’ajoutera dans Santé.</p>
              </fieldset>
            )}
          </>
        )}

        {step.kind === 'meals' && (
          <>
            <label className="flex flex-col gap-2">
              <span className={label}>Grammes par jour</span>
              <input inputMode="numeric" value={grams} onChange={(e) => setGrams(e.target.value.replace(/[^\d]/g, ''))} autoComplete="off" className={input} />
            </label>
            <div className="flex flex-col gap-2">
              <span className={label}>Ses repas</span>
              {meals.map((meal, i) => (
                <div key={i} className="flex items-center gap-2">
                  <NativePickerInput aria-label={`Heure du repas ${i + 1}`} type="time" value={meal.time} onChange={(e) => setMeals(meals.map((m, j) => (j === i ? { time: e.target.value, label: mealLabel(e.target.value) } : m)))} className={`${input} min-w-0 flex-1 px-3`} />
                  <button type="button" aria-label={`Retirer le repas ${i + 1}`} onClick={() => setMeals(meals.filter((_, j) => j !== i))} className="btn btn-quiet min-h-14 shrink-0 px-4">
                    <TrashIcon size={20} />
                    Retirer
                  </button>
                </div>
              ))}
              {meals.length < 4 && (
                <button type="button" onClick={() => setMeals([...meals, { time: '12:00', label: mealLabel('12:00') }])} className="btn btn-outline">
                  Ajouter un repas
                </button>
              )}
            </div>
          </>
        )}

        {step.kind === 'reactions' && (
          <>
            {reactions.length > 0 && (
              <ul className="card m-0 flex list-none flex-col p-0">
                {reactions.map((reaction, i) => (
                  <li key={reaction.situation} className={`flex items-center gap-3 px-4 py-2.5 ${i ? 'border-t border-divider' : ''}`}>
                    <span className="flex-1 text-[1rem] leading-snug">{reactionSentence(reaction)}</span>
                    <button type="button" aria-label={`Retirer : ${reaction.situation}`} onClick={() => setReactions(reactions.filter((r) => r !== reaction))} className="btn btn-quiet min-h-12 shrink-0 px-3">
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <fieldset className="m-0 flex flex-col gap-3 rounded-[20px] border-2 border-dashed border-line-strong p-4">
              <legend className="px-1 text-[1rem] font-bold">Ajouter une phrase</legend>
              <label className="flex flex-col gap-2">
                <span className={label}>Quand…</span>
                <input value={situation} onChange={(e) => setSituation(e.target.value)} placeholder={g('il croise un vélo')} autoComplete="off" className={input} />
              </label>
              <div className="flex flex-wrap gap-2">
                {SITUATIONS.filter((s) => !reactions.some((r) => r.situation === s.text)).map((s) => (
                  <button key={s.text} type="button" aria-pressed={situation === s.text} onClick={() => setSituation(s.text)} className={chipClass(situation === s.text)}>
                    {s.text}
                  </button>
                ))}
              </div>
              {situation.trim() && (
                <div className="flex flex-col gap-2">
                  <span className={label}>{g('…il est')}</span>
                  {REACTION_LEVELS.map(({ value, label: text }) => (
                    <button key={value} type="button" onClick={() => addReaction(value)} className="btn btn-outline">
                      {g(text.split(' ').map((w) => agree(w, draft.sexe)).join(' '))}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>
          </>
        )}

        {step.kind === 'skill' && skill && (
          <>
            <div className="flex items-center gap-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                <BossIcon bossId={skill.id} size={30} />
              </span>
              <span className="title-section">{skill.name}</span>
            </div>
            <h1 className="title-screen">{title}</h1>
            <div role="radiogroup" aria-label={skill.name} className="flex flex-col gap-2.5">
              {skillOptions(skill.id).map(({ value, label: text }) => {
                const current = skillValue(skill.id)
                const on = current === value || (value === 'dehors' && (current === 'anime' || current === 'partout'))
                return (
                  <button key={value} type="button" role="radio" aria-checked={on} onClick={() => setSkillDraft({ ...skillDraft, [skill.id]: value })} className={option(on)}>
                    <Tick on={on} />
                    <span className="text-[1.1176rem] font-bold">{text}</span>
                  </button>
                )
              })}
            </div>
            {/* Chien âgé ou déjà éduqué : deux questions de plus, qui donnent les dernières étapes. */}
            {FOLLOW_UPS.map(({ value, question }, i) => {
              const current = skillValue(skill.id)
              const reached = stepsForAnswer(current)
              if (reached < 3 + i) return null
              const yes = reached >= 4 + i
              const below: SkillAnswer = i === 0 ? 'dehors' : 'anime'
              return (
                <fieldset key={value} className="m-0 flex flex-col gap-2 border-0 p-0">
                  <legend className="mb-2 p-0 text-[1.1176rem] font-bold">{question}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" aria-pressed={yes} onClick={() => setSkillDraft({ ...skillDraft, [skill.id]: value })} className={`btn ${yes ? 'btn-on' : 'btn-outline'}`}>
                      Oui
                    </button>
                    <button type="button" aria-pressed={!yes} onClick={() => setSkillDraft({ ...skillDraft, [skill.id]: below })} className={`btn ${yes ? 'btn-outline' : 'btn-on'}`}>
                      Pas encore
                    </button>
                  </div>
                </fieldset>
              )
            })}
          </>
        )}

        {step.kind === 'fin' && <Result />}

        {error && (
          <p role="alert" className="text-[0.8824rem] font-semibold text-danger">
            {error}
          </p>
        )}
      </div>

      <footer className={`mt-6 grid gap-2.5 ${unknown ? 'grid-cols-[auto_minmax(0,1fr)]' : 'grid-cols-1'}`}>
        {unknown && (
          // « Je ne sais pas » prend la largeur de son texte, sur une ligne ; « Suivant » prend le reste.
          <button type="button" onClick={dontKnow} className="btn btn-outline min-h-[60px] px-5 whitespace-nowrap">
            Je ne sais pas
          </button>
        )}
        <button type="button" onClick={next} className={`btn btn-main ${unknown ? 'min-h-[60px]' : ''}`}>
          {step.kind === 'fin' ? 'C’est bon, on commence' : 'Suivant'}
        </button>
      </footer>
    </main>
  )
}
