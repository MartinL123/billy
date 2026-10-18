import { useNavigate } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { ChevronRightIcon, NoteIcon, PawIcon } from '../../components/Icons'
import { updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { ESSENTIALS, essentialsDone } from '../../lib/questionnaire'

const SEEN_KEY = 'billy-ouverture-vue'

/** L’écran d’ouverture a-t-il déjà été passé sur cet appareil ? (sans stockage : on le montre, ce n’est pas grave) */
export function openingSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/** Écran d’ouverture, à chaque lancement : on touche la photo du chien pour entrer. */
export default function Opening() {
  const { dog } = useData()
  const navigate = useNavigate()
  // Les questions du départ (T-012) : tant qu’elles ne sont pas faites, l’entrée y mène.
  const starting = !essentialsDone(dog.questionnaire)

  const enter = () => {
    try {
      localStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Stockage indisponible : l’ouverture reviendra au prochain lancement.
    }
    // Tant que les questions du départ ne sont pas faites, elles s’ouvrent toutes seules. « Continuer plus tard » reste possible.
    if (starting) {
      if (!dog.questionnaire?.startedAt) updateDog({ questionnaire: { answers: {}, ...dog.questionnaire, startedAt: new Date().toISOString() } })
      navigate('/questionnaire', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center bg-primary px-6 pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+32px)] text-white">
      <button type="button" onClick={enter} className="mt-[18vh] flex flex-col items-center gap-5 border-0 bg-transparent p-0 text-white">
        <span className="flex size-[210px] animate-breathe items-center justify-center rounded-full bg-white/10">
          <span className="flex size-[168px] items-center justify-center overflow-hidden rounded-[52px] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
            {dog.photoThumbFileId ? <FileImage fileId={dog.photoThumbFileId} alt="" className="size-full" eager /> : <PawIcon size={96} color="#1E5A50" />}
          </span>
        </span>
        <span className="font-display text-[44px] leading-none font-extrabold">{dog.name}</span>
        <span className="flex min-h-12 items-center gap-2 rounded-full bg-white/15 px-[22px] text-[17px] font-bold">Touchez pour entrer</span>
      </button>

      {/* Les questions du départ, tant qu’elles ne sont pas faites (le reste se complète ensuite depuis l’accueil). */}
      {starting && (
      <button
        type="button"
        onClick={() => navigate('/questionnaire')}
        className="mt-auto flex min-h-16 w-full items-center gap-3.5 rounded-[20px] border-2 border-solid border-white/70 bg-transparent px-[18px] py-3 text-left text-white"
      >
        <NoteIcon size={26} className="shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-bold">Questionnaire de départ</span>
          <span className="text-sm text-white/85">{ESSENTIALS.length} questions pour commencer</span>
        </span>
        <ChevronRightIcon size={22} className="shrink-0" />
      </button>
      )}
    </main>
  )
}
