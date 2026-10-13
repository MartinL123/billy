import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { CheckIcon, PhotoIcon } from '../../components/Icons'
import { useToast } from '../../components/Toast'
import { SKILLS, stepPhrase } from '../../content/phrases'
import { saveImage } from '../../firebase/files'
import { useData } from '../../firebase/store'
import { recordMoment, type MomentOutcome } from '../../firebase/training'
import type { EntryPhoto } from '../../firebase/types'
import { EMPTY_PROGRESS, remaining } from '../../lib/bossProgress'
import { addDays, formatLong, isValidISO } from '../../lib/dates'
import { compressImage, PHOTO } from '../../lib/image'
import { canAskStep, FEELINGS, hasNextStep, previewMoment, tileOrder, type Feeling } from '../../lib/moment'
import { useToday } from '../../lib/useToday'
import { totalXp } from '../../lib/xp'
import { BossIcon } from '../training/BossIcon'
import { LevelUp, StepSuccess } from '../training/Celebration'
import { takeDraftPhotos } from './draft'

const MAX_PHOTOS = 10
type When = 'aujourdhui' | 'hier' | 'autre'
interface Photo {
  key: string
  full: Blob
  thumb: Blob
  previewUrl: string
}

const legend = 'mb-2.5 p-0 text-lg font-bold'
const choice = (on: boolean) => `btn px-2 ${on ? 'btn-on' : 'btn-outline'}`

/** Les trois visages : la bouche dit le ressenti, le mot aussi. */
function Face({ feeling }: { feeling: Feeling }) {
  const mouth = feeling === 'difficile' ? 'M9 16.5c1.800-1.600 4.200-1.600 6 0' : feeling === 'bien' ? 'M9 15.500h6' : 'M8.500 14.500c2 2.400 5 2.400 7 0'
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.500" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" />
      <path d={mouth.replace(/(\.\d)00/g, '$1')} />
    </svg>
  )
}

/** Raconter un moment : l'action principale de l'app. Tout est choisi par l'utilisateur, rien n'est deviné. */
export default function Raconter() {
  const [params] = useSearchParams()
  const { dog, entries, sessions, bossProgress, xpLog } = useData()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()

  const [text, setText] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [when, setWhen] = useState<When>(params.get('quand') === 'autre' ? 'autre' : 'aujourdhui')
  const [otherDate, setOtherDate] = useState(params.get('quand') === 'autre' ? dog.adoptionDate : today)
  const [feeling, setFeeling] = useState<Feeling>()
  // Seule une compétence demandée explicitement (fiche d'une compétence, exercice terminé) arrive cochée.
  const [skills, setSkills] = useState<string[]>(() => (params.get('competences') ?? '').split(',').filter((id) => SKILLS.some((s) => s.id === id)))
  const [fear, setFear] = useState<boolean | null>(null)
  const [movedAway, setMovedAway] = useState(false)
  const [yes, setYes] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<MomentOutcome | null>(null)
  const [shown, setShown] = useState(0)

  const photosRef = useRef(photos)
  photosRef.current = photos
  // L'ordre des tuiles est figé à l'ouverture : il ne bouge pas pendant la saisie.
  const [order] = useState(() =>
    tileOrder([...entries.map((e) => ({ date: e.date, createdAt: e.createdAt, skills: e.skills ?? [] })), ...sessions.map((s) => ({ date: s.date, createdAt: s.createdAt, skills: s.bossIds ?? [s.bossId] }))]),
  )

  const addPhotos = async (files: File[]) => {
    setError('')
    const accepted = files.slice(0, Math.max(0, MAX_PHOTOS - photosRef.current.length))
    for (const [i, file] of accepted.entries()) {
      setProgress(`Préparation des photos… ${i + 1} sur ${accepted.length}`)
      try {
        const { full, thumb } = await compressImage(file, PHOTO)
        setPhotos((current) => [...current, { key: crypto.randomUUID(), full, thumb, previewUrl: URL.createObjectURL(thumb) }])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une photo n’a pas pu être ajoutée.')
      }
    }
    setProgress('')
  }

  useEffect(() => {
    const draft = takeDraftPhotos()
    if (draft.length) void addPhotos(draft)
    return () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const date = when === 'aujourdhui' ? today : when === 'hier' ? addDays(today, -1) : otherDate
  const input = { feeling, fear: fear === true, movedAway: fear === true && movedAway }
  const askable = canAskStep(input)
  const stepSkills = skills.filter((id) => hasNextStep(bossProgress, id))
  const yesIds = askable ? stepSkills.filter((id) => yes[id]) : []
  const preview = previewMoment(input, yesIds, bossProgress, isValidISO(date) ? date : today)
  const leave = () => navigate(params.get('retour') === 'questionnaire' ? '/questionnaire' : '/', { replace: true })

  const save = async () => {
    if (progress || saving) return
    if (!text.trim() && photos.length === 0) return setError('Écrivez quelques mots ou ajoutez une photo.')
    if (!isValidISO(date) || date > today) return setError('Choisissez une date, aujourd’hui ou avant.')
    setSaving(true)
    try {
      const saved: EntryPhoto[] = []
      for (const photo of photos) saved.push({ fileId: await saveImage(photo.full), thumbFileId: await saveImage(photo.thumb) })
      const result = recordMoment(
        { date, text: text.trim(), tags: [], photos: saved, skills, feeling, fear: fear === true, movedAway: input.movedAway },
        yesIds,
        bossProgress,
        dog.name,
        totalXp(xpLog),
      )
      setOutcome(result)
    } catch (err) {
      setSaving(false)
      setError(err instanceof Error ? err.message : 'L’enregistrement a échoué.')
    }
  }

  // Après l'enregistrement : les réussites une à une, puis le nouveau niveau, puis retour.
  const celebrations = outcome ? outcome.steps.length + (outcome.levelReached ? 1 : 0) : 0
  useEffect(() => {
    if (outcome && shown >= celebrations) {
      toast(`Moment ajouté au Carnet · +${outcome.xp} XP`, { label: 'Annuler', run: outcome.undo })
      leave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, shown])

  if (outcome) {
    const step = outcome.steps[shown]
    if (step) return <StepSuccess dogName={dog.name} bossId={step.bossId} level={step.level} onClose={() => setShown(shown + 1)} />
    if (outcome.levelReached && shown < celebrations) return <LevelUp dogName={dog.name} level={outcome.levelReached} photoFileId={dog.photoThumbFileId} onClose={() => setShown(shown + 1)} />
    return null
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void save()
      }}
      className="mx-auto max-w-[430px]"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={leave} className="btn btn-quiet min-h-12 px-4">
          Annuler
        </button>
        <h1 className="text-lg font-bold">Raconter un moment</h1>
        <div className="w-[92px]" />
      </header>

      <div className="flex flex-col gap-6 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+130px)]">
        <div className="flex flex-col gap-2">
          <label htmlFor="txt" className="text-lg font-bold">
            Qu'avez-vous fait ?
          </label>
          <textarea
            id="txt"
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
            }}
            placeholder={`Une balade, un jeu, un progrès de ${dog.name}…`}
            className="resize-none rounded-[18px] border-2 border-solid border-primary bg-surface px-4 py-3.5 text-[17px] leading-[1.45] text-text"
          />
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div key={photo.key} className="relative aspect-square overflow-hidden rounded-field bg-placeholder">
                  <img src={photo.previewUrl} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Retirer la photo ${i + 1}`}
                    onClick={() => {
                      URL.revokeObjectURL(photo.previewUrl)
                      setPhotos(photos.filter((p) => p.key !== photo.key))
                    }}
                    className="absolute inset-x-0 bottom-0 flex min-h-12 items-center justify-center border-0 bg-[rgba(24,32,30,0.72)] text-[17px] font-bold text-white"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
          {photos.length < MAX_PHOTOS && (
            <FilePicker accept="image/*" onFiles={(files) => void addPhotos(files)} className="btn btn-outline">
              <PhotoIcon size={22} />
              Ajouter des photos
            </FilePicker>
          )}
          {progress && (
            <p role="status" className="text-[15px] text-muted">
              {progress}
            </p>
          )}
        </div>

        <fieldset className="m-0 border-0 p-0">
          <legend className={legend}>Quand ?</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['aujourdhui', 'Aujourd’hui'],
                ['hier', 'Hier'],
                ['autre', 'Autre date'],
              ] as [When, string][]
            ).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={when === value} onClick={() => setWhen(value)} className={choice(when === value)}>
                {label}
              </button>
            ))}
          </div>
          {when === 'autre' && (
            <label className="mt-2.5 flex flex-col gap-1.5">
              <span className="text-[15px] font-semibold">Quel jour ?</span>
              <input type="date" max={today} value={otherDate} onChange={(e) => setOtherDate(e.target.value)} className="field min-h-14 px-3 text-[17px]" />
              {isValidISO(otherDate) && <span className="text-[15px] text-muted">Le {formatLong(otherDate)}</span>}
            </label>
          )}
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className={legend}>Comment ça s'est passé ?</legend>
          <div className="grid grid-cols-3 gap-2.5">
            {FEELINGS.map(({ value, label }) => {
              const on = feeling === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFeeling(on ? undefined : value)}
                  className={`flex h-[104px] flex-col items-center justify-center gap-1.5 rounded-[20px] border-solid text-[17px] font-bold ${on ? 'border-[3px] border-primary bg-primary text-white' : 'border-2 border-border bg-surface text-text'}`}
                >
                  <Face feeling={value} />
                  {label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 p-0 text-lg font-bold">Vous avez travaillé quoi ?</legend>
          <p className="mb-2.5 text-[15px] text-muted">Touchez une ou plusieurs cases. Facultatif.</p>
          <div className="grid grid-cols-2 gap-2">
            {order.map((id) => {
              const skill = SKILLS.find((s) => s.id === id)!
              const on = skills.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setSkills(on ? skills.filter((s) => s !== id) : [...skills, id])}
                  className={`flex min-h-16 items-center gap-2.5 rounded-[18px] border-2 border-solid px-3 text-left text-[17px] leading-tight font-bold ${on ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`}
                >
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${on ? 'bg-white text-primary' : 'bg-primary-soft text-primary-dark'}`}>
                    {on ? <CheckIcon size={20} /> : <BossIcon bossId={id} size={20} />}
                  </span>
                  {skill.short}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className={legend}>Il a eu peur ?</legend>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" aria-pressed={fear === true} onClick={() => setFear(fear === true ? null : true)} className={choice(fear === true)}>
              Oui
            </button>
            <button type="button" aria-pressed={fear === false} onClick={() => setFear(fear === false ? null : false)} className={choice(fear === false)}>
              Non
            </button>
          </div>
          {fear === true && (
            <label className={`flex min-h-16 items-center gap-3.5 rounded-[18px] border-2 border-solid px-4 py-3 ${movedAway ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}>
              <input type="checkbox" checked={movedAway} onChange={(e) => setMovedAway(e.target.checked)} className="size-7 shrink-0 accent-primary" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[17px] leading-snug font-bold">On s'est éloignés pour qu'il se sente mieux</span>
                <span className="text-[15px] text-muted">C'est la bonne réaction</span>
              </span>
            </label>
          )}
        </fieldset>

        {askable &&
          stepSkills.map((id) => {
            const skill = SKILLS.find((s) => s.id === id)!
            const state = bossProgress[id] ?? EMPTY_PROGRESS
            const left = remaining(state)
            const already = state.validations.some((v) => v.level === left.target && v.date === date)
            const done = left.done + (yes[id] && !already ? 1 : 0)
            const missing = Math.max(0, left.needed - done)
            return (
              <fieldset key={id} className="card m-0 flex flex-col gap-3 border-0 p-4">
                <legend className="sr-only">{skill.name} : prochaine étape</legend>
                <span className="text-[13px] font-bold tracking-[0.6px] text-milestone-dark uppercase">{skill.name} · prochaine étape</span>
                <p className="text-[17px] leading-snug font-semibold">{stepPhrase(id, left.target ?? 1)}. C'est réussi ?</p>
                <div className="flex items-center gap-3">
                  <span className="flex gap-1.5" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`h-2.5 w-9 rounded-full ${i < done ? 'bg-milestone' : 'bg-placeholder'}`} />
                    ))}
                  </span>
                  <span className="text-[15px] text-muted">
                    {already ? 'Déjà réussi ce jour-là' : missing === 0 ? 'Étape acquise !' : done === 0 ? 'À réussir 3 jours différents' : `Encore ${missing} fois, un autre jour`}
                  </span>
                </div>
                {!already && (
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" aria-pressed={yes[id] === true} onClick={() => setYes({ ...yes, [id]: true })} className={choice(yes[id] === true)}>
                      Oui
                    </button>
                    <button type="button" aria-pressed={yes[id] === false} onClick={() => setYes({ ...yes, [id]: false })} className={choice(yes[id] === false)}>
                      Pas encore
                    </button>
                  </div>
                )}
              </fieldset>
            )
          })}
        {!askable && stepSkills.length > 0 && (
          <p className="rounded-[18px] bg-info-soft px-4 py-3 text-[15px] leading-snug text-[#1D3F73]">Les jours difficiles comptent aussi. La prochaine étape attendra un meilleur jour.</p>
        )}

        {error && (
          <p role="alert" className="rounded-[18px] bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button type="submit" disabled={saving || Boolean(progress)} className="btn btn-main min-h-[60px] w-full justify-between px-6 text-[19px] disabled:opacity-60">
            <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
            <span aria-live="polite">+{preview.xp} XP</span>
          </button>
        </div>
      </div>
    </form>
  )
}
