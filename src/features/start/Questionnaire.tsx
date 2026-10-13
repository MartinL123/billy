import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { FilePicker } from '../../components/FilePicker'
import { CheckIcon, TrashIcon } from '../../components/Icons'
import { SKILLS } from '../../content/phrases'
import { answerQuestion, ensureMilestones, recordCare, saveWeight, updateDog } from '../../firebase/db'
import { deleteFile, saveImage } from '../../firebase/files'
import { newId } from '../../firebase/paths'
import { useData } from '../../firebase/store'
import { declarePreApp } from '../../firebase/training'
import type { Dog } from '../../firebase/types'
import { isValidISO } from '../../lib/dates'
import { sortMeals, type Meal } from '../../lib/feeding'
import { careStatus } from '../../lib/health'
import { compressImage, PHOTO } from '../../lib/image'
import {
  deriveTraits,
  fearSkills,
  FOLLOW_UPS,
  normalizeAnswers,
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

const label = 'text-[17px] font-bold'
const input = 'field min-h-14 text-[17px]'
const option = (on: boolean) =>
  `flex min-h-[64px] w-full items-center gap-3.5 rounded-[20px] border-2 border-solid px-4 py-3 text-left ${on ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`
const chipClass = (on: boolean) => `min-h-12 rounded-full border-2 border-solid px-4 text-left text-[15px] leading-tight font-semibold ${on ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`

const MEAL_LABELS = ['Matin', 'Midi', 'Après-midi', 'Soir']
const mealLabel = (time: string) => MEAL_LABELS[time < '11:00' ? 0 : time < '13:30' ? 1 : time < '18:00' ? 2 : 3]!

function Tick({ on }: { on: boolean }) {
  return (
    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-solid ${on ? 'border-white bg-white text-primary' : 'border-[#9AA39F]'}`}>
      {on && <CheckIcon size={16} />}
    </span>
  )
}

/**
 * Questionnaire de départ, en 5 parties. Une question par écran, pré-remplie avec ce que l'app sait déjà :
 * on confirme au lieu de retaper. Une réponse ne compte qu'après « Suivant ».
 */
export default function Questionnaire() {
  const { dog, events, weights, bossProgress } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const later = useBack('/')
  const answers = normalizeAnswers(dog.questionnaire?.answers ?? {})
  const [params] = useSearchParams()
  // On reprend où on s'était arrêté, ou sur l'écran demandé (profil : « Modifier ses réactions »).
  const [index, setIndex] = useState(() => {
    const asked = STEPS.findIndex((s) => s.id === params.get('etape'))
    return asked >= 0 ? asked : questionnaireStatus(dog.questionnaire).resumeAt
  })
  const step = STEPS[Math.min(index, STEPS.length - 1)]!
  const [error, setError] = useState('')

  // Brouillon : ce que l'app sait déjà. Rien n'est enregistré avant « Suivant ».
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
    vaccin: careStatus(events, 'vaccin').last?.date ?? '',
    'vaccin-nom': dog.vaccineName ?? '',
    rage: dog.rabies ?? '',
    vermifuge: careStatus(events, 'vermifuge').last?.date ?? '',
    antiparasitaire: careStatus(events, 'antiparasitaire').last?.date ?? '',
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
    setIndex(Math.max(0, Math.min(STEPS.length - 1, next)))
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

  /** « Suivant » : c'est seulement ici qu'une réponse compte. */
  const next = () => {
    const id = step.id
    if (id === 'nom') {
      if (!text('nom')) return setError('Donnez le nom de votre chien.')
      save({ name: text('nom') })
    } else if (id === 'naissance' || id === 'adoption') {
      const date = text(id)
      // Facultatif, comme tout le questionnaire : sans date, l'âge n'est simplement pas affiché.
      if (date && (!isValidISO(date) || date > today)) return setError('Choisissez une date, aujourd’hui ou avant.')
      if (id === 'adoption') save({ adoptionDate: date })
      else save({ birthDate: date, traits: deriveTraits(dog.traits ?? [], reactions, dog.homeMood, date, today) })
      // Anniversaire, 6 mois, 1 an, anniversaire d'adoption : ajoutés au calendrier, une seule fois.
      if (date) ensureMilestones(events, text('nom') || dog.name, id === 'adoption' ? { adoption: date } : { birth: date }, today)
    } else if (id === 'sexe') save({ sex: text(id) })
    else if (id === 'sterilise') save({ neutered: text(id) })
    else if (id === 'race') save({ breed: text(id) })
    else if (id === 'poids') {
      const kg = Number(text('poids').replace(',', '.'))
      if (text('poids') && (!Number.isFinite(kg) || kg <= 0 || kg > 120)) return setError('Écrivez son poids en kilos, par exemple 8,7.')
      if (kg && weights[0]?.kg !== kg) saveWeight(newId('weights'), { date: today, kg })
      save()
    } else if (id === 'provenance') save({ origin: text(id) })
    else if (id === 'puce') save({ chip: text(id) })
    else if (id === 'veto') save({ vet: { name: text('veto-nom'), phone: text('veto-tel') } })
    else if (id === 'educateur') save({ trainer: { name: text('educateur-nom'), phone: text('educateur-tel') } })
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
    go(index + 1)
  }

  const title = step.title.replace('{nom}', draft.nom || (dog.unnamed ? 'votre chien' : dog.name))
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
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={later} className="btn btn-quiet min-h-12 px-4">
            Continuer plus tard
          </button>
          <span className="text-[15px] font-bold text-muted" aria-live="polite">
            Partie {step.part} sur {PARTS.length}
          </span>
        </div>
        <div role="progressbar" aria-label="Avancement du questionnaire" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={index + 1} className="h-2.5 overflow-hidden rounded-full bg-placeholder">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
        </div>
        <p className="text-[13px] font-bold tracking-[0.6px] text-primary uppercase">{PARTS[step.part - 1]}</p>
      </header>

      <div className="flex flex-1 flex-col gap-5">
        {step.kind !== 'fin' && step.kind !== 'skill' && (
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[28px] leading-tight font-bold">{title}</h1>
            {step.help && <p className="text-[17px] leading-snug text-muted">{step.help}</p>}
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

        {step.kind === 'longtext' && <textarea aria-label={title} rows={3} value={draft[step.id] ?? ''} onChange={(e) => set(step.id, e.target.value)} className="resize-none rounded-[18px] border-2 border-solid border-border bg-surface px-4 py-3.5 text-[17px] leading-[1.45] text-text" />}

        {step.kind === 'date' && (
          <div className="flex flex-col gap-2.5">
            <input aria-label={title} type="date" max={today} value={draft[step.id] ?? ''} onChange={(e) => set(step.id, e.target.value)} className={`${input} px-3`} />
            {step.part === 2 && (
              <button type="button" onClick={() => set(step.id, '')} className={`btn ${draft[step.id] ? 'btn-quiet' : 'btn-on'}`}>
                Je ne sais pas
              </button>
            )}
          </div>
        )}

        {step.kind === 'choice' && (
          <div role="radiogroup" aria-label={title} className="flex flex-col gap-2.5">
            {step.options?.map(({ value, label: text }) => {
              const on = draft[step.id] === value
              return (
                <button key={value} type="button" role="radio" aria-checked={on} onClick={() => set(step.id, on ? '' : value)} className={option(on)}>
                  <Tick on={on} />
                  <span className="text-[19px] font-bold">{text}</span>
                </button>
              )
            })}
          </div>
        )}

        {step.kind === 'multi' && (
          <div className="grid grid-cols-2 gap-2.5">
            {step.options?.map(({ value, label: text }) => {
              const on = choices.includes(value)
              return (
                <button key={value} type="button" role="checkbox" aria-checked={on} onClick={() => set(step.id, (on ? choices.filter((c) => c !== value) : [...choices, value]).join('|'))} className={`${option(on)} gap-2.5 px-3`}>
                  <Tick on={on} />
                  <span className="text-[17px] leading-tight font-bold">{text}</span>
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
              <FileImage fileId={dog.photoThumbFileId} alt={`Photo de ${dog.name}`} className="size-40 rounded-full" eager />
            ) : (
              <span className="flex size-40 items-center justify-center rounded-full bg-milestone-soft font-display text-6xl font-bold text-milestone-dark">{(draft.nom || '?').charAt(0).toUpperCase()}</span>
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
                  <input aria-label={`Heure du repas ${i + 1}`} type="time" value={meal.time} onChange={(e) => setMeals(meals.map((m, j) => (j === i ? { time: e.target.value, label: mealLabel(e.target.value) } : m)))} className={`${input} min-w-0 flex-1 px-3`} />
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
                    <span className="flex-1 text-[17px] leading-snug">{reactionSentence(reaction)}</span>
                    <button type="button" aria-label={`Retirer : ${reaction.situation}`} onClick={() => setReactions(reactions.filter((r) => r !== reaction))} className="btn btn-quiet min-h-12 shrink-0 px-3">
                      Retirer
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <fieldset className="m-0 flex flex-col gap-3 rounded-[20px] border-2 border-dashed border-[#9AA39F] p-4">
              <legend className="px-1 text-[17px] font-bold">Ajouter une phrase</legend>
              <label className="flex flex-col gap-2">
                <span className={label}>Quand…</span>
                <input value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="il croise un vélo" autoComplete="off" className={input} />
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
                  <span className={label}>…il est</span>
                  {REACTION_LEVELS.map(({ value, label: text }) => (
                    <button key={value} type="button" onClick={() => addReaction(value)} className="btn btn-outline">
                      {text}
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
              <span className="font-display text-2xl font-bold">{skill.name}</span>
            </div>
            <h1 className="font-display text-[26px] leading-tight font-bold">{title}</h1>
            <div role="radiogroup" aria-label={skill.name} className="flex flex-col gap-2.5">
              {skillOptions(skill.id).map(({ value, label: text }) => {
                const current = skillValue(skill.id)
                const on = current === value || (value === 'dehors' && (current === 'anime' || current === 'partout'))
                return (
                  <button key={value} type="button" role="radio" aria-checked={on} onClick={() => setSkillDraft({ ...skillDraft, [skill.id]: value })} className={option(on)}>
                    <Tick on={on} />
                    <span className="text-[19px] font-bold">{text}</span>
                  </button>
                )
              })}
              <button type="button" role="radio" aria-checked={skillValue(skill.id) === 'nsp'} onClick={() => setSkillDraft({ ...skillDraft, [skill.id]: 'nsp' })} className={`btn ${skillValue(skill.id) === 'nsp' ? 'btn-on' : 'btn-quiet'}`}>
                Je ne sais pas
              </button>
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
                  <legend className="mb-2 p-0 text-[19px] font-bold">{question}</legend>
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
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {error}
          </p>
        )}
      </div>

      <footer className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={`btn ${step.kind === 'fin' ? 'btn-outline' : 'btn-quiet'} px-5 disabled:opacity-40`}>
          Retour
        </button>
        <button type="button" onClick={next} className="btn btn-main">
          {step.kind === 'fin' ? 'C’est bon, on commence' : 'Suivant'}
        </button>
      </footer>
    </main>
  )
}
