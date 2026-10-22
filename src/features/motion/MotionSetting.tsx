import { APP_NAME } from '../../appName'
import { MOTION_PROMISE } from './MotionCard'
import { useMotion } from './useMotion'

/**
 * Profil, app iOS (T-085) : « Sans montre ». L’accès à Mouvements et forme se demande ici aussi (une seule fois) ;
 * refusé, le chemin dans Réglages. Rien sur un iPhone sans capteur.
 */
export function MotionSetting() {
  const { status, ask } = useMotion()
  if (!status || status === 'unavailable') return null
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="title-section">Sans montre</h2>
      {status === 'prompt' && (
        <button type="button" onClick={() => void ask()} className="btn btn-tertiary min-h-12">
          Remarquer mes marches
        </button>
      )}
      <p className="text-[0.8824rem] leading-snug text-[#3F4946]">
        {status === 'denied'
          ? `Coupé. Pour l’activer\u00a0: Réglages › ${APP_NAME} › Mouvements et forme.`
          : `Après une marche de 10\u00a0min ou plus, l’accueil propose de noter la sortie. ${MOTION_PROMISE}`}
      </p>
    </section>
  )
}
