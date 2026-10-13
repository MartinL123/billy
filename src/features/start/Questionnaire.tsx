import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { FilePicker } from '../../components/FilePicker'
import { CheckIcon } from '../../components/Icons'
import { CHARACTER, FEARS, levelTitle, SKILLS, skillText } from '../../content/phrases'
import type { Trait } from '../../content/training'
import { answerQuestion, updateDog } from '../../firebase/db'
import { deleteFile, saveImage } from '../../firebase/files'
import { useData } from '../../firebase/store'
import { declarePreApp } from '../../firebase/training'
import { isValidISO } from '../../lib/dates'
import { compressImage, PHOTO } from '../../lib/image'
import { isPuppy, isSkillStep, questionnaireStatus, questionnaireSteps, SKILL_ANSWERS, stepsForAnswer, type SkillAnswer } from '../../lib/questionnaire'
import { acquiredSteps } from '../../lib/skills'
import { useToday } from '../../lib/useToday'
import { globalLevel, totalXp } from '../../lib/xp'
import { BossIcon } from '../training/BossIcon'

const label = 'text-[17px] font-bold'
const input = 'field min-h-14 text-[17px]'
const option = (on: boolean) =>
  `flex min-h-[64px] w-full items-center gap-3.5 rounded-[20px] border-2 border-solid px-4 py-3 text-left ${on ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text'}`

function Tick({ on }: { on: boolean }) {
  return (
    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-solid ${on ? 'border-white bg-white text-primary' : 'border-[#9AA39F]'}`}>
      {on && <CheckIcon size={16} />}
    </span>
  )
}

/** Questionnaire de départ : une question par écran, chaque réponse enregistrée tout de suite. */
export default function Questionnaire() {
  const { dog, bossProgress, xpLog } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const traits = dog.traits ?? []
  const steps = questionnaireSteps(traits)
  const answers = dog.questionnaire?.answers ?? {}
  const [index, setIndex] = useState(() => questionnaireStatus(dog.questionnaire, traits).resumeAt)
  const step = steps[Math.min(index, steps.length - 1)]!

  // Écran « Votre chien »
  const [name, setName] = useState(dog.name)
  const [breed, setBreed] = useState(dog.breed)
  const [birthDate, setBirthDate] = useState(dog.birthDate)
  const [adoptionDate, setAdoptionDate] = useState(dog.adoptionDate)
  const [error, setError] = useState('')
  // Écran « Son caractère » : « chiot » est déduit de la date de naissance tant que rien n'a été répondu.
  const [character, setCharacter] = useState<Trait[]>(() => (answers.caractere ? traits : [...new Set<Trait>([...traits, ...(isPuppy(dog.birthDate, today) ? (['chiot'] as Trait[]) : [])])]))
  const [fears, setFears] = useState<string[]>(dog.fears ?? [])
  const [fearsOther, setFearsOther] = useState(dog.fearsOther ?? '')

  const go = (next: number) => {
    setError('')
    setIndex(Math.max(0, Math.min(steps.length - 1, next)))
    window.scrollTo(0, 0)
  }
  const later = () => navigate('/ouverture', { replace: true })

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
      setError(err instanceof Error ? err.message : 'Photo illisible.')
    }
  }

  const next = () => {
    if (step === 'identite') {
      if (!name.trim()) return setError('Donnez le nom de votre chien.')
      if (!isValidISO(birthDate) || !isValidISO(adoptionDate)) return setError('Choisissez les deux dates.')
      updateDog({ name: name.trim(), breed: breed.trim(), birthDate, adoptionDate })
      answerQuestion('identite', 'ok')
    } else if (step === 'caractere') {
      // Les traits que le questionnaire ne propose pas (adopté adulte) sont conservés.
      const kept = traits.filter((t) => !CHARACTER.some((c) => c.trait === t))
      answerQuestion('caractere', 'ok', { traits: [...kept, ...character] })
    } else if (step === 'peurs') {
      answerQuestion('peurs', 'ok', { fears, fearsOther: fearsOther.trim() })
    } else if (step === 'fin') {
      answerQuestion('fin', 'ok', { 'questionnaire.completedAt': new Date().toISOString() })
      return later()
    } else if (answers[step] === undefined) {
      answerQuestion(step, step === 'souvenirs' ? 'plus-tard' : 'nsp')
    }
    go(index + 1)
  }

  const answerSkill = (skillId: string, value: SkillAnswer) => {
    answerQuestion(skillId, value)
    // Les étapes déjà sues sont acquises « avant l'app ». Une réponse ne fait jamais baisser.
    declarePreApp(skillId, bossProgress[skillId], stepsForAnswer(value), today)
  }

  const skill = SKILLS.find((s) => s.id === step)
  const text = skill ? skillText(skill.id) : undefined
  const known = acquiredSteps(bossProgress, xpLog)
  const level = globalLevel(totalXp(xpLog)).level
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item])

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
      <header className="flex flex-col gap-3 pb-5">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={later} className="btn btn-quiet min-h-12 px-4">
            Continuer plus tard
          </button>
          <span className="text-[17px] font-bold" aria-live="polite">
            {index + 1} sur {steps.length}
          </span>
        </div>
        <div role="progressbar" aria-label="Avancement du questionnaire" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1} className="h-2.5 overflow-hidden rounded-full bg-placeholder">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
        <p className="text-sm text-muted">Vos réponses sont enregistrées au fur et à mesure.</p>
      </header>

      <div className="flex flex-1 flex-col gap-5">
        {step === 'identite' && (
          <>
            <h1 className="font-display text-[28px] leading-tight font-bold">Votre chien</h1>
            <div className="flex items-center gap-4">
              {dog.photoThumbFileId ? (
                <FileImage fileId={dog.photoThumbFileId} alt={`Photo de ${dog.name}`} className="size-24 shrink-0 rounded-full" eager />
              ) : (
                <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-milestone-soft font-display text-4xl font-bold text-milestone-dark">{name.charAt(0).toUpperCase() || '?'}</span>
              )}
              <FilePicker accept="image/*" multiple={false} onFiles={(files) => void choosePhoto(files)} className="btn btn-outline flex-1">
                {dog.photoThumbFileId ? 'Changer la photo' : 'Choisir une photo'}
              </FilePicker>
            </div>
            <label className="flex flex-col gap-2">
              <span className={label}>Son nom</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={input} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Sa date de naissance</span>
              <input type="date" max={today} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={`${input} px-3`} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Son arrivée à la maison</span>
              <input type="date" max={today} value={adoptionDate} onChange={(e) => setAdoptionDate(e.target.value)} className={`${input} px-3`} />
            </label>
            <label className="flex flex-col gap-2">
              <span className={label}>Sa race</span>
              <input value={breed} onChange={(e) => setBreed(e.target.value)} autoComplete="off" className={input} />
            </label>
          </>
        )}

        {step === 'caractere' && (
          <>
            <h1 className="font-display text-[28px] leading-tight font-bold">Comment décririez-vous {dog.name} ?</h1>
            <p className="text-[17px] text-muted">Touchez tout ce qui lui ressemble.</p>
            <div className="flex flex-col gap-2.5">
              {CHARACTER.map(({ trait, label: text }) => {
                const on = character.includes(trait)
                return (
                  <button key={trait} type="button" role="checkbox" aria-checked={on} onClick={() => setCharacter(toggle(character, trait))} className={option(on)}>
                    <Tick on={on} />
                    <span className="text-[17px] font-bold">{text}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {step === 'peurs' && (
          <>
            <h1 className="font-display text-[28px] leading-tight font-bold">Qu'est-ce qui lui fait peur ?</h1>
            <p className="text-[17px] text-muted">Touchez tout ce qui le concerne.</p>
            <div className="grid grid-cols-2 gap-2.5">
              {FEARS.map((fear) => {
                const on = fears.includes(fear)
                return (
                  <button key={fear} type="button" role="checkbox" aria-checked={on} onClick={() => setFears(toggle(fears, fear))} className={`${option(on)} gap-2.5 px-3`}>
                    <Tick on={on} />
                    <span className="text-[17px] leading-tight font-bold">{fear}</span>
                  </button>
                )
              })}
            </div>
            <label className="flex flex-col gap-2">
              <span className={label}>Autre chose ?</span>
              <input value={fearsOther} onChange={(e) => setFearsOther(e.target.value)} placeholder="L'aspirateur, les vélos…" autoComplete="off" className={input} />
            </label>
          </>
        )}

        {skill && text && (
          <>
            <p className="text-[15px] font-bold tracking-[0.5px] text-muted uppercase">Ce qu'il sait déjà faire</p>
            <div className="flex items-center gap-3.5">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                <BossIcon bossId={skill.id} size={30} />
              </span>
              <span className="font-display text-2xl font-bold">{skill.name}</span>
            </div>
            <h1 className="font-display text-[26px] leading-tight font-bold">{text.question.replace('{nom}', dog.name)}</h1>
            <div role="radiogroup" aria-label={skill.name} className="flex flex-col gap-2.5">
              {SKILL_ANSWERS.map(({ value, label: title }) => {
                const on = answers[skill.id] === value
                const detail = value === 'non' ? 'On va l’apprendre ensemble' : value === 'maison' ? text.atHome : text.outside
                return (
                  <button key={value} type="button" role="radio" aria-checked={on} onClick={() => answerSkill(skill.id, value)} className={option(on)}>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[19px] font-bold">{title}</span>
                      <span className={`text-[15px] ${on ? 'text-white/90' : 'text-muted'}`}>{detail}</span>
                    </span>
                    {on && <CheckIcon size={24} />}
                  </button>
                )
              })}
              <button type="button" role="radio" aria-checked={answers[skill.id] === 'nsp'} onClick={() => answerQuestion(skill.id, 'nsp')} className={`btn ${answers[skill.id] === 'nsp' ? 'btn-on' : 'btn-quiet'}`}>
                Je ne sais pas
              </button>
            </div>
          </>
        )}

        {step === 'souvenirs' && (
          <>
            <h1 className="font-display text-[28px] leading-tight font-bold">Vos premiers souvenirs</h1>
            <p className="text-[17px] leading-snug text-muted">Racontez un moment de vos premières semaines avec {dog.name}. C'est facultatif.</p>
            <button
              type="button"
              onClick={() => {
                answerQuestion('souvenirs', 'ok')
                navigate('/raconter?quand=autre&retour=questionnaire')
              }}
              className="btn btn-outline"
            >
              Raconter un moment
            </button>
          </>
        )}

        {step === 'fin' && (
          <>
            <h1 className="font-display text-[28px] leading-tight font-bold">
              {dog.name} est niveau {level} · {levelTitle(level)}
            </h1>
            {known.length > 0 ? (
              <>
                <p className="text-[17px] text-muted">Voici ce qu'il sait déjà faire :</p>
                <ul className="card m-0 flex list-none flex-col p-0">
                  {known.map((item, i) => (
                    <li key={`${item.bossId}-${item.step}`} className={`flex items-start gap-3 px-4 py-3 ${i ? 'border-t border-divider' : ''}`}>
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                        <CheckIcon size={14} />
                      </span>
                      <span className="text-[17px] leading-snug">{item.phrase}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-[17px] leading-snug text-muted">Tout est à découvrir ensemble. Chaque moment raconté le fera progresser.</p>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {error}
          </p>
        )}
      </div>

      <footer className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-2.5">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className="btn btn-quiet px-5 disabled:opacity-40">
          Retour
        </button>
        <button type="button" onClick={next} className="btn btn-main">
          {step === 'fin' ? 'Commencer' : step === 'souvenirs' ? 'Plus tard' : isSkillStep(step) && answers[step] === undefined ? 'Passer' : 'Suivant'}
        </button>
      </footer>
    </main>
  )
}
