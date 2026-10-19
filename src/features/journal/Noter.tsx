import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { PhotoIcon } from '../../components/Icons'
import { useToast } from '../../components/Toast'
import { SKILLS, stepPhrase } from '../../content/phrases'
import { answerQuestion } from '../../firebase/db'
import { saveImage } from '../../firebase/files'
import { useData } from '../../firebase/store'
import { completeQuest, recordMoment, type MomentOutcome } from '../../firebase/training'
import type { EntryPhoto } from '../../firebase/types'
import { EMPTY_PROGRESS, remaining } from '../../lib/bossProgress'
import { isValidISO } from '../../lib/dates'
import { compressImage, PHOTO } from '../../lib/image'
import { canAskStep, FEELINGS, hasNextStep, isFearMoment, type Feeling } from '../../lib/moment'
import { QUEST_XP } from '../../lib/quest'
import { useToday } from '../../lib/useToday'
import { BonesGained } from '../../components/BoneIcon'
import { BONES } from '../../lib/bones'
import { SkillPill } from '../billy/SkillPill'
import { useQuest } from '../today/useQuest'
import { StepSuccess } from '../training/Celebration'
import { takeDraftPhotos } from './draft'
import { Face } from './Face'
import { errorText } from '../../firebase/errors'
import { place } from '../../lib/garden'
import { ofName } from '../../lib/gender'

const MAX_PHOTOS = 10
interface Photo {
  key: string
  full: Blob
  thumb: Blob
  previewUrl: string
}

const legend = 'mb-2.5 p-0 text-lg font-bold'
const choice = (on: boolean) => `btn px-2 ${on ? 'btn-on' : 'btn-outline'}`

/**
 * Noter ce qu’on a fait : l’action principale de l’app. Tout est choisi par l’utilisateur, rien n’est deviné.
 * L’écran ne demande jamais ce qui est évident : depuis la quête du jour, la compétence est fixe et c’est aujourd’hui.
 */
export default function Noter() {
  const [params] = useSearchParams()
  const { dog, bossProgress, bones } = useData()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()

  const from = params.get('depuis')
  const today0 = useQuest()
  // Depuis la quête du jour : la compétence vient de la quête, elle n’est pas modifiable.
  const [fromQuest] = useState(() => from === 'quete' && !today0.done && today0.quest.kind !== 'repos')
  const asked = fromQuest ? [today0.quest.bossId ?? ''] : (params.get('competences') ?? '').split(',')
  const [text, setText] = useState(fromQuest ? today0.note : '')
  const [photos, setPhotos] = useState<Photo[]>([])
  // La date : aujourd’hui (ou l’adoption pour un souvenir du questionnaire). Elle se change ensuite dans le détail.
  const [date] = useState(() => (params.get('quand') === 'autre' && isValidISO(dog.adoptionDate) ? dog.adoptionDate : today))
  // Depuis la mission pas à pas : le ressenti est déjà choisi (« Ça s’est bien passé ? »).
  const [feeling, setFeeling] = useState<Feeling | undefined>(() => (FEELINGS.some((f) => f.value === params.get('ressenti')) ? (params.get('ressenti') as Feeling) : undefined))
  // Plus de grille de compétences : seule une compétence demandée (fiche, exercice terminé, mission) compte.
  const [skills] = useState<string[]>(() => asked.filter((id) => SKILLS.some((s) => s.id === id)))
  const [movedAway, setMovedAway] = useState(false)
  const [yes, setYes] = useState<Record<string, boolean>>({})
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [outcome, setOutcome] = useState<MomentOutcome | null>(null)
  const [shown, setShown] = useState(0)

  const photosRef = useRef(photos)
  photosRef.current = photos

  const addPhotos = async (files: File[]) => {
    setError('')
    const accepted = files.slice(0, Math.max(0, MAX_PHOTOS - photosRef.current.length))
    for (const [i, file] of accepted.entries()) {
      setProgress(`Préparation des photos… ${i + 1} sur ${accepted.length}`)
      try {
        const { full, thumb } = await compressImage(file, PHOTO)
        setPhotos((current) => [...current, { key: crypto.randomUUID(), full, thumb, previewUrl: URL.createObjectURL(thumb) }])
      } catch (err) {
        setError(errorText(err, 'Une photo n’a pas pu être ajoutée.'))
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

  // Aucune question « Il a eu peur ? » : un moment difficile sur une compétence de peur en est une.
  const fear = isFearMoment(feeling, skills)
  const input = { feeling, fear, movedAway: fear && movedAway }
  const askable = canAskStep(input)
  const stepSkills = skills.filter((id) => hasNextStep(bossProgress, id))
  // Depuis la mission pas à pas, « Bien » ou « Super » compte comme une réussite de l’étape en cours.
  const auto = params.get('auto') === '1' && fromQuest
  const yesIds = askable ? stepSkills.filter((id) => (auto ? feeling !== 'difficile' : yes[id])) : []
  const leave = () => navigate(params.get('retour') === 'questionnaire' ? '/questionnaire?etape=fin' : '/', { replace: true })

  const save = async () => {
    if (progress || saving) return
    if (!fromQuest && !text.trim() && photos.length === 0) return setError('Écrivez quelques mots ou ajoutez une photo.')
    if (!isValidISO(date) || date > today) return setError('Choisissez une date, aujourd’hui ou avant.')
    setSaving(true)
    try {
      const saved: EntryPhoto[] = []
      for (const photo of photos) saved.push({ fileId: await saveImage(photo.full), thumbFileId: await saveImage(photo.thumb) })
      const result = recordMoment(
        { date, text: text.trim() || today0.note, tags: [], photos: saved, skills, feeling, fear, movedAway: input.movedAway },
        yesIds,
        bossProgress,
        dog.name,
        bones,
      )
      if (fromQuest) completeQuest(today, { kind: today0.quest.kind, bossId: today0.quest.bossId, exerciseId: today0.quest.planned?.exercise.id }, today0.skips, QUEST_XP)
      // Souvenir des premières semaines : l’écran de résultat du questionnaire le retrouve.
      if (params.get('retour') === 'questionnaire') answerQuestion('souvenir', result.entryId, { 'questionnaire.souvenirs': [...(dog.questionnaire?.souvenirs ?? []), result.entryId] })
      setOutcome(result)
    } catch (err) {
      setSaving(false)
      setError(errorText(err, 'L’enregistrement a échoué.'))
    }
  }

  // Mission pas à pas : on enregistre tout de suite, puis « C’est réussi ! » et les os.
  const autoSaved = useRef(false)
  useEffect(() => {
    if (!auto || autoSaved.current || !feeling) return
    autoSaved.current = true
    void save()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, feeling])

  // Après l’enregistrement : les réussites une à une, puis retour.
  // Une seule récompense, les os : plus d’écran « Nouveau niveau ».
  const celebrations = outcome ? outcome.steps.length : 0
  useEffect(() => {
    if (outcome && shown >= celebrations) {
      // « +10 os » avec l’os qui saute : les os du moment, plus ceux de la mission.
      toast(<BonesGained label="Noté !" amount={outcome.bones + (fromQuest ? BONES.mission : 0)} />, fromQuest ? undefined : { label: 'Annuler', run: outcome.undo }, { bones: true, shower: fromQuest })
      leave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome, shown])

  if (outcome) {
    const step = outcome.steps[shown]
    if (step) return <StepSuccess dogName={dog.name} bossId={step.bossId} level={step.level} onClose={() => setShown(shown + 1)} />
    return null
  }

  // Mission pas à pas : rien à remplir, l’enregistrement est en cours.
  if (auto && !error)
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] items-center justify-center px-5">
        <p role="status" className="text-[17px] font-semibold text-muted">
          Enregistrement…
        </p>
      </main>
    )

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
        <h1 className="text-lg font-bold">{fromQuest ? 'Mission réussie ?' : 'Un souvenir'}</h1>
        <div className="w-[92px]" />
      </header>

      <div className="flex flex-col gap-6 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+130px)]">
        {fromQuest && (
          <div className="flex flex-wrap items-center gap-2">
            <SkillPill bossId={skills[0] ?? ''} />
            <span className="text-[15px] font-semibold text-muted">Mission du jour</span>
          </div>
        )}

        {/* 1. La photo : une grande zone, la photothèque (jamais l’appareil photo). */}
        <div className="flex flex-col gap-2">
          {photos.length > 0 && (
            <div className={`grid gap-2 ${photos.length > 1 ? 'grid-cols-3' : ''}`}>
              {photos.map((photo, i) => (
                <div key={photo.key} className={`relative overflow-hidden rounded-[20px] bg-placeholder ${photos.length > 1 ? 'aspect-square' : 'h-[220px]'}`}>
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
            <FilePicker accept="image/*" onFiles={(files) => void addPhotos(files)} className={photos.length ? 'btn btn-outline' : 'flex h-[200px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-[#9AA39F] bg-surface text-[17px] font-bold text-primary'}>
              <PhotoIcon size={photos.length ? 22 : 36} />
              Ajouter une photo
            </FilePicker>
          )}
          {progress && (
            <p role="status" className="text-[15px] text-muted">
              {progress}
            </p>
          )}
        </div>

        {/* 2. Un mot. */}
        <label className="flex flex-col gap-2">
          <span className="text-lg font-bold">Un mot ?</span>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setError('')
            }}
            placeholder={`Une balade, un jeu, un progrès ${ofName(dog.name)}…`}
            className="resize-none rounded-[18px] border-2 border-solid border-border bg-surface px-4 py-3.5 text-[17px] leading-[1.45] text-text focus:border-primary"
          />
        </label>

        <fieldset className="m-0 border-0 p-0">
          <legend className={legend}>Comment c’était ?</legend>
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

        {fear && (
          <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend className={legend}>C’était difficile : qu’avez-vous fait ?</legend>
            <label className={`flex min-h-16 items-center gap-3.5 rounded-[18px] border-2 border-solid px-4 py-3 ${movedAway ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}>
              <input type="checkbox" checked={movedAway} onChange={(e) => setMovedAway(e.target.checked)} className="size-7 shrink-0 accent-primary" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[17px] leading-snug font-bold">{place('On s’est éloignés pour qu’il se sente mieux')}</span>
                <span className="text-[15px] text-muted">C’est la bonne réaction</span>
              </span>
            </label>
          </fieldset>
        )}

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
                <legend className="sr-only">{skill.name} : prochaine étape</legend>
                <span className="text-[13px] font-bold tracking-[0.6px] text-milestone-dark uppercase">{skill.name} · prochaine étape</span>
                <p className="text-[17px] leading-snug font-semibold">
                  {stepPhrase(id, left.target ?? 1)}. {date === today ? "C’est réussi aujourd’hui ?" : "C’est réussi ?"}
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex gap-1.5" aria-hidden="true">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className={`h-2.5 w-9 rounded-full ${i < done ? 'bg-milestone' : 'bg-placeholder'}`} />
                    ))}
                  </span>
                  <span className="text-[15px] text-muted">
                    {already ? 'Déjà réussi ce jour-là' : missing === 0 ? 'Étape acquise !' : done === 0 ? 'À réussir 3 jours différents' : `Encore ${missing} fois, un autre jour`}
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
          <button type="submit" disabled={saving || Boolean(progress)} className="btn btn-main min-h-[60px] w-full px-6 text-[19px] disabled:opacity-60">
            <span>{saving ? 'Enregistrement…' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>
    </form>
  )
}
