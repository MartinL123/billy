import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_NAME } from '../../appName'
import { FileImage } from '../../components/FileImage'
import { ChevronRightIcon, NoteIcon, PawIcon } from '../../components/Icons'
import { updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { ESSENTIALS, essentialsDone } from '../../lib/questionnaire'

/** Les empreintes qui flottent en transparence (position, taille, rotation, décalage dans la boucle de 6 s). */
const PAWS = [
  { style: { left: 48, top: 120 }, size: 34, r: '-18deg', delay: '0s' },
  { style: { right: 56, top: 210 }, size: 26, r: '22deg', delay: '2s' },
  { style: { left: 70, bottom: 180 }, size: 30, r: '12deg', delay: '4s' },
]

/** Le temps de l’animation d’entrée avant d’ouvrir l’accueil : l’accueil est utilisable en moins d’1 s. */
const ENTER_MS = 450
/** L’app entre seule après 1 s (T-049) ; un toucher entre tout de suite. */
export const AUTO_ENTER_MS = 1000

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Écran d’ouverture, à chaque lancement (T-017), animé (T-032, maquette « Flair — Accueil et ouverture ») :
 * halo qui respire, deux ondes, empreintes qui flottent ; au toucher, la photo s’enfonce puis grandit, une onde claire
 * envahit l’écran et l’accueil monte. Depuis la V5 (T-049), l’app entre seule après 1 s ; un toucher entre tout de suite.
 */
export default function Opening() {
  const { dog } = useData()
  const navigate = useNavigate()
  const [entering, setEntering] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // Les questions du départ (T-012) : tant qu’elles ne sont pas faites, l’entrée y mène.
  const starting = !essentialsDone(dog.questionnaire)

  const go = () => {
    // Tant que les questions du départ ne sont pas faites, elles s’ouvrent toutes seules. « Continuer plus tard » reste possible.
    if (starting) {
      if (!dog.questionnaire?.startedAt) updateDog({ questionnaire: { answers: {}, ...dog.questionnaire, startedAt: new Date().toISOString() } })
      navigate('/questionnaire', { replace: true })
    } else {
      navigate('/', { replace: true, state: { fromOpening: true } })
    }
  }

  const enter = () => {
    if (entering) return
    if (reducedMotion()) return go()
    setEntering(true)
    timer.current = window.setTimeout(go, ENTER_MS)
  }

  // Entrée seule (T-049) : après 1 s, ou tout de suite si l’iPhone réduit les animations.
  const auto = useRef<number | undefined>(undefined)
  const enterRef = useRef(enter)
  enterRef.current = enter
  useEffect(() => {
    auto.current = window.setTimeout(() => enterRef.current(), reducedMotion() ? 0 : AUTO_ENTER_MS)
    return () => window.clearTimeout(auto.current)
  }, [])

  return (
    <main className={`relative mx-auto flex min-h-dvh max-w-[430px] flex-col items-center overflow-hidden bg-primary px-6 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+32px)] text-white ${entering ? 'op-leave' : ''}`}>
      {PAWS.map((paw, i) => (
        <span key={i} aria-hidden="true" className="op-paw pointer-events-none absolute" style={{ ...paw.style, ['--r' as string]: paw.r, animationDelay: paw.delay }}>
          <PawIcon size={paw.size} color="#FFFFFF" />
        </span>
      ))}

      <button type="button" onClick={enter} aria-label={`Entrer dans ${APP_NAME}`} className="relative mt-[16vh] size-[240px] shrink-0 border-0 bg-transparent p-0">
        <span aria-hidden="true" className="op-ring absolute inset-5 rounded-full border-2 border-solid border-white/60" />
        <span aria-hidden="true" className="op-ring-late absolute inset-5 rounded-full border-2 border-solid border-white/60" />
        {entering && <span aria-hidden="true" className="op-burst absolute inset-[70px] rounded-full bg-bg" />}
        <span className={`absolute inset-[15px] flex items-center justify-center rounded-full bg-white/12 ${entering ? 'op-press' : 'op-halo'}`}>
          <span className="flex size-[168px] items-center justify-center overflow-hidden rounded-full border-[5px] border-solid border-gold bg-[#F6D9C2] shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
            {dog.photoThumbFileId ? <FileImage fileId={dog.photoThumbFileId} alt="" className="size-full" eager /> : <PawIcon size={84} color="#8A3E0C" />}
          </span>
        </span>
      </button>
      <span className="op-name mt-[18px] font-display text-[2.7059rem] leading-none font-semibold tracking-[-0.5px]">{dog.name}</span>
      <button type="button" onClick={enter} className="whitespace-nowrap op-cta mt-3.5 flex min-h-[52px] items-center rounded-full border-0 bg-white/18 px-[26px] text-[1rem] font-bold text-white">
        Touchez sa photo pour entrer
      </button>

      {/* Les questions du départ, tant qu’elles ne sont pas faites (le reste se complète ensuite depuis l’accueil). */}
      {starting ? (
        <button
          type="button"
          onClick={() => navigate('/questionnaire')}
          className="mt-auto flex min-h-16 w-full items-center gap-3.5 rounded-[20px] border-2 border-solid border-white/70 bg-transparent px-[18px] py-3 text-left text-white"
        >
          <NoteIcon size={26} className="shrink-0" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="title-card">Questionnaire de départ</span>
            <span className="text-sm text-white/85">{ESSENTIALS.length} questions pour commencer</span>
          </span>
          <ChevronRightIcon size={22} className="shrink-0" />
        </button>
      ) : (
        <span className="mt-auto text-[0.8824rem] text-white/85">{APP_NAME}</span>
      )}
    </main>
  )
}
