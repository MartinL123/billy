import { useEffect, useState } from 'react'
import { ConfirmSheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { logOut } from '../../firebase/auth'
import { auth } from '../../firebase/app'
import { useData } from '../../firebase/store'
import { createInvite, removeViewer, stopViewing, watchViewers, type Viewer } from '../../firebase/viewer'
import { formatLong } from '../../lib/dates'
import { inviteLink } from '../../lib/visitor'
import { restartApp } from './Invitation'
import { dogName } from '../../lib/dogName'

/**
 * Profil › Famille (T-048) : inviter un proche à regarder, en lecture seule (balades, souvenirs, santé, progrès ;
 * jamais les documents). Le proche a son propre compte ; il ouvre le lien une fois connecté.
 */
export function FamilySection() {
  const { dog } = useData()
  const toast = useToast()
  const [viewers, setViewers] = useState<Viewer[]>([])
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<Viewer>()
  useEffect(() => watchViewers(setViewers), [])

  const invite = async () => {
    setBusy(true)
    try {
      const url = inviteLink(await createInvite(), window.location)
      setLink(url)
      // Le partage d’iOS (Messages, WhatsApp…) ; sinon le lien est copié.
      if (navigator.share) await navigator.share({ title: `Suivre ${dogName(dog)}`, url }).catch(() => undefined)
      else await copy(url)
    } catch {
      toast('Pas de réseau : réessayez une fois connecté.')
    } finally {
      setBusy(false)
    }
  }
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast('Lien copié')
    } catch {
      // Copie refusée : le lien reste affiché, à sélectionner.
    }
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="title-section">Famille</h2>
      <p className="text-[0.8824rem] leading-snug text-[#3F4946]">Un proche suit {dogName(dog)} depuis son compte : balades, souvenirs, santé et progrès, sans rien pouvoir modifier. Les documents restent privés.</p>
      {viewers.length > 0 && (
        <ul className="card m-0 flex list-none flex-col px-4 py-1">
          {viewers.map((viewer, i) => (
            <li key={viewer.id} className={`flex min-h-14 items-center gap-3 py-2 ${i ? 'border-t border-divider' : ''}`}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-semibold">{viewer.email || 'Un proche'}</span>
                {viewer.since && <span className="text-[0.7647rem] text-muted">Depuis le {formatLong(viewer.since.slice(0, 10))}</span>}
              </span>
              <button type="button" onClick={() => setRemoving(viewer)} className="btn-text min-h-11 px-3 text-[0.8824rem] text-danger">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {link && (
        <button type="button" onClick={() => copy(link)} className="card flex flex-col items-start gap-1 border-0 px-4 py-3 text-left">
          <span className="text-[0.7647rem] font-bold text-muted">Lien à envoyer, valable 7 jours et une seule fois (touchez pour le copier)</span>
          <span className="text-[0.8824rem] break-all text-text">{link}</span>
        </button>
      )}
      <button type="button" onClick={invite} disabled={busy} className="btn btn-secondary min-h-12">
        {busy ? 'Un instant…' : 'Inviter un proche'}
      </button>
      {removing && (
        <ConfirmSheet
          title={'Retirer ce proche\u00a0?'}
          message={`${removing.email || 'Ce proche'} ne verra plus ${dogName(dog)}. Vous pourrez l’inviter à nouveau.`}
          confirmLabel="Retirer"
          onCancel={() => setRemoving(undefined)}
          onConfirm={() => {
            void removeViewer(removing.id)
            setRemoving(undefined)
          }}
        />
      )}
    </section>
  )
}

/** Le profil d’un visiteur : à qui il regarde, arrêter, se déconnecter. Rien d’autre à régler. */
export function VisitorAccount() {
  const { dog } = useData()
  const [stopping, setStopping] = useState(false)
  const email = auth.currentUser?.email ?? ''
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="title-section">Vous regardez {dog.name}</h2>
      <p className="text-[0.8824rem] leading-snug text-[#3F4946]">En lecture seule : vous voyez ses balades, ses souvenirs, sa santé et ses progrès, sans rien modifier.</p>
      <div className="card px-4 py-3.5">
        <span className="text-[0.7647rem] text-muted">Connecté avec</span>
        <p className="truncate text-base font-semibold">{email}</p>
      </div>
      <button type="button" onClick={() => setStopping(true)} className="btn btn-tertiary min-h-12">
        Ne plus regarder {dog.name}
      </button>
      <button type="button" onClick={() => void logOut()} className="btn btn-tertiary min-h-11">
        Se déconnecter
      </button>
      {stopping && (
        <ConfirmSheet
          title={`Ne plus regarder ${dog.name} ?`}
          message="Il faudra une nouvelle invitation pour le revoir."
          confirmLabel="Ne plus regarder"
          onCancel={() => setStopping(false)}
          onConfirm={async () => {
            await stopViewing().catch(() => undefined)
            restartApp()
          }}
        />
      )}
    </section>
  )
}
