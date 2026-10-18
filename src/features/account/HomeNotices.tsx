import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CloseIcon } from '../../components/Icons'
import { updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { showInstallBanner } from '../../lib/install'
import { questionnaireStatus } from '../../lib/questionnaire'
import { isStandalone } from './Install'
import { PasswordSheet } from './PasswordSheet'

const BANNER_KEY = 'billy.installer.ferme'

function dismissedAt(): number | null {
  try {
    const value = localStorage.getItem(BANNER_KEY)
    return value ? Number(value) : null
  } catch {
    return null
  }
}

/** Après le questionnaire : proposer de remplacer le mot de passe donné par Martin. Fermable, une seule fois. */
export function PasswordPrompt() {
  const { dog } = useData()
  const [open, setOpen] = useState(false)
  if (dog.passwordPromptDone || !questionnaireStatus(dog.questionnaire).complete) return null
  return (
    <section className="flex flex-col gap-3 rounded-[22px] bg-info-soft p-4">
      <p className="text-[17px] leading-snug font-semibold text-[#1D3F73]">Votre mot de passe vous a été donné : choisissez-en un à vous.</p>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button type="button" onClick={() => setOpen(true)} className="btn btn-outline bg-surface whitespace-nowrap">
          Le changer
        </button>
        <button type="button" onClick={() => updateDog({ passwordPromptDone: true })} className="btn btn-quiet px-4">
          Plus tard
        </button>
      </div>
      {open && <PasswordSheet onClose={() => setOpen(false)} />}
    </section>
  )
}

/** Le bandeau d’installation est-il à montrer ? (l’accueil n’affiche alors pas l’encadré du mot de passe) */
export const installBannerVisible = () => showInstallBanner(isStandalone(), dismissedAt(), Date.now())

/** Dans le navigateur seulement : « Ajoutez Billy à votre écran d’accueil », fermable, revient au plus tous les 7 jours. */
export function InstallBanner() {
  const [visible, setVisible] = useState(() => showInstallBanner(isStandalone(), dismissedAt(), Date.now()))
  if (!visible) return null
  const close = () => {
    try {
      localStorage.setItem(BANNER_KEY, String(Date.now()))
    } catch {
      // Stockage indisponible : le bandeau reviendra à la prochaine ouverture, ce n’est pas grave.
    }
    setVisible(false)
  }
  return (
    <aside className="flex items-center gap-2 rounded-[18px] border border-solid border-divider bg-surface py-1.5 pr-1.5 pl-4">
      <span className="flex-1 text-[15px] leading-snug">Ajoutez Billy à votre écran d’accueil</span>
      <Link to="/installer" className="btn btn-outline min-h-11 shrink-0 px-3.5 text-[15px]">
        Comment ?
      </Link>
      <button type="button" aria-label="Fermer" onClick={close} className="flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-muted">
        <CloseIcon size={20} />
      </button>
    </aside>
  )
}
