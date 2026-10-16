import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, CloudCheckIcon, CloudPendingIcon, NoteIcon, PhoneIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet, Sheet } from '../../components/Sheet'
import { auth } from '../../firebase/app'
import { authErrorMessage, confirmPassword, deleteAccount, logOut } from '../../firebase/auth'
import { leavePack } from '../../firebase/community'
import { eraseUserData, setClosingAccount } from '../../firebase/erase'
import { setUsage, storageUsed } from '../../firebase/files'
import { ALMOST_FULL_MESSAGE, FULL_MESSAGE, USER_QUOTA, usageLabel, usageLevel } from '../../lib/usage'
import { PasswordSheet } from '../account/PasswordSheet'
import { useData } from '../../firebase/store'
import type { Contact } from '../../firebase/types'
import { formatAgeShort } from '../../lib/age'
import { formatLong, formatShort, formatTime, isValidISO } from '../../lib/dates'
import { levelTitle } from '../../content/phrases'
import { questionnaireStatus, reactionSentence, reactionsFromFears, statusLabel } from '../../lib/questionnaire'
import { dogLevel } from '../../lib/level'
import { sortMeals } from '../../lib/feeding'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { DogPhoto } from '../shop/DogPhoto'
import { EveningReminder } from './EveningReminder'
import { WalkSettings } from './WalkSettings'
import { ProfileEdit } from './ProfileEdit'


function InfoRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-3.5 text-[15px] ${first ? '' : 'border-t border-divider'}`}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  )
}

function ContactRow({ role, callLabel, contact, first }: { role: string; callLabel: string; contact?: Contact; first?: boolean }) {
  const phone = contact?.phone.replace(/[^\d+]/g, '')
  const known = Boolean(contact?.name || phone)
  return (
    <div className={`flex items-center gap-3 py-3 ${first ? '' : 'border-t border-divider'}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] text-muted">{role}</span>
        {known ? (
          <>
            <span className="truncate text-base font-semibold">{contact?.name || contact?.phone}</span>
            {contact?.name && contact.phone && <span className="text-[13px] text-muted">{contact.phone}</span>}
          </>
        ) : (
          <span className="text-base text-muted">Pas encore renseigné</span>
        )}
      </div>
      {/* « Appeler » seulement si un numéro est enregistré. */}
      {phone ? (
        <a href={`tel:${phone}`} aria-label={callLabel} className="btn btn-outline min-h-12 shrink-0 px-4">
          <PhoneIcon size={20} />
          Appeler
        </a>
      ) : (
        <Link to="/profil/modifier" aria-label={`Ajouter : ${role.toLocaleLowerCase('fr')}`} className="btn btn-outline min-h-12 shrink-0 px-4">
          Ajouter
        </Link>
      )}
    </div>
  )
}

/**
 * Supprimer le compte : un panneau dans l'app, jamais de fenêtre système. Il faut retaper son mot de passe.
 * D'abord toutes les données sous users/{uid}/…, puis le compte.
 */
function DeleteAccountSheet({ dogName, online, onClose }: { dogName: string; online: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const erase = async () => {
    if (busy) return
    if (!online) return setError('Pas de réseau. La suppression a besoin d’Internet.')
    if (!password) return setError('Entrez votre mot de passe.')
    setBusy(true)
    setError('')
    try {
      await confirmPassword(password)
    } catch (err) {
      setBusy(false)
      return setError(authErrorMessage(err).text)
    }
    try {
      // Tant que la suppression est en cours, l'app ne recrée pas de profil vide.
      setClosingAccount(true)
      await leavePack(auth.currentUser?.uid ?? '')
      await eraseUserData()
      await deleteAccount()
    } catch {
      setClosingAccount(false)
      setBusy(false)
      setError('La suppression n’a pas pu se terminer. Réessayez dans un instant.')
    }
  }

  return (
    <Sheet label="Supprimer mon compte" onClose={busy ? () => undefined : onClose}>
      <h2 className="mt-1 font-display text-[24px] leading-tight font-extrabold">Supprimer mon compte et mes données ?</h2>
      <p className="text-[17px] leading-snug">Tout ce qui concerne {dogName} sera effacé pour toujours : profil, carnet, photos, documents, calendrier et progression. On ne peut pas revenir en arrière.</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold">Votre mot de passe, pour confirmer</span>
        <span className="flex gap-2">
          <input type={shown ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={error ? true : undefined} className={`field min-w-0 flex-1 ${error ? 'border-danger' : ''}`} />
          <button type="button" aria-pressed={shown} onClick={() => setShown(!shown)} className="btn btn-outline shrink-0 px-4">
            {shown ? 'Masquer' : 'Afficher'}
          </button>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {error}
        </p>
      )}
      <button type="button" onClick={() => void erase()} disabled={busy} className="btn btn-danger mt-1 disabled:opacity-60">
        {busy ? 'Suppression en cours…' : 'Tout supprimer définitivement'}
      </button>
      <button type="button" onClick={onClose} disabled={busy} className="btn btn-on disabled:opacity-60">
        Garder mon compte
      </button>
    </Sheet>
  )
}

/** Le profil du chien : on l'ouvre en touchant sa photo dans son onglet. */
export default function Profile() {
  const { dog, documents, weights, bossProgress, usage, pendingCount, online } = useData()
  const today = useToday()
  const back = useBack('/billy')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [used, setUsed] = useState<number>()

  useEffect(() => {
    if (!online) return
    let alive = true
    storageUsed()
      .then((bytes) => {
        if (!alive) return
        setUsed(bytes)
        // Une fois par ouverture : le compteur du compte repart de ce qui est vraiment enregistré.
        if (bytes !== usage) setUsage(bytes)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [online, documents.length])

  const email = auth.currentUser?.email ?? ''
  const space = used ?? usage
  const spaceLevel = usageLevel(space)
  const level = dogLevel(bossProgress)
  const sentences = (dog.reactions ?? reactionsFromFears(dog.fears ?? [])).map(reactionSentence)
  const lastWeight = weights[0]
  const status = questionnaireStatus(dog.questionnaire)

  return (
    <div className="mx-auto flex max-w-[430px] flex-col gap-5 px-5 pb-[calc(env(safe-area-inset-bottom)+40px)]">
      <header className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          Retour
        </button>
        <span className="text-lg font-bold">Son profil</span>
        <div className="w-[104px]" />
      </header>

      <div className="flex flex-col items-center gap-2 text-center">
        <DogPhoto size={120} alt={`Photo de ${dog.name}`} className="rounded-full shadow-[0_2px_8px_rgba(24,32,30,0.12)]" />
        <h1 className="mt-1 font-display text-[32px] leading-none font-extrabold">{dog.name}</h1>
        <p className="text-base text-muted">
          {[formatAgeShort(dog.birthDate, today), `Niveau ${level.level}`, levelTitle(level.level)].filter(Boolean).join(' · ')}
        </p>
        <Link to="/profil/modifier" className="btn btn-outline mt-1">
          {dog.photoThumbFileId ? 'Changer la photo' : 'Ajouter une photo'}
        </Link>
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl font-bold">Son identité</h2>
        <Pending show={dog.pending} />
        <div className="card px-4 py-1">
          <InfoRow first label="Né le" value={isValidISO(dog.birthDate) ? `${formatLong(dog.birthDate)} · ${formatAgeShort(dog.birthDate, today)}` : 'Pas encore renseigné'} />
          {(dog.sex || dog.neutered) && <InfoRow label={dog.sex || 'Stérilisé'} value={dog.neutered === 'Oui' ? 'Stérilisé' : dog.neutered === 'Non' ? 'Non stérilisé' : dog.neutered ? 'Stérilisation prévue' : '—'} />}
          <InfoRow label="Race" value={dog.breed || 'Pas encore renseignée'} />
          <InfoRow label="Adopté le" value={isValidISO(dog.adoptionDate) ? `${formatLong(dog.adoptionDate)}${dog.origin ? ` · ${dog.origin.toLocaleLowerCase('fr')}` : ''}` : 'Pas encore renseigné'} />
          <InfoRow label="Puce" value={dog.chip || 'Pas encore renseignée'} />
          {lastWeight && <InfoRow label="Poids" value={`${String(lastWeight.kg).replace('.', ',')} kg · ${formatShort(lastWeight.date)}`} />}
        </div>
        <Link to="/profil/modifier" className="btn btn-outline">
          Modifier son identité
        </Link>
      </section>

      {dog.feeding && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-xl font-bold">Au quotidien</h2>
          <div className="card px-4 py-1">
            <InfoRow first label="Ration" value={`${dog.feeding.gramsPerDay} g par jour`} />
            <InfoRow label="Repas" value={sortMeals(dog.feeding.meals).map((m) => formatTime(m.time)).join(' · ') || 'À compléter'} />
            {dog.treats && <InfoRow label="Il adore" value={dog.treats} />}
            {dog.games?.length ? <InfoRow label="Ses jeux" value={dog.games.join(', ').toLocaleLowerCase('fr')} /> : null}
            {dog.aloneTime && <InfoRow label="Seul" value={`${dog.aloneTime.toLocaleLowerCase('fr')}${dog.aloneTime === 'Jamais' ? '' : ' par jour'}`} />}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl font-bold">Comment il réagit</h2>
        <div className="card flex flex-col gap-3 p-4">
          {sentences.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[17px] leading-snug">
              {sentences.map((sentence) => (
                <li key={sentence}>{sentence}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[17px] leading-snug text-muted">Pas encore renseigné.</p>
          )}
          {dog.homeMood && <p className="text-[17px] leading-snug">À la maison, il est plutôt {dog.homeMood.toLocaleLowerCase('fr')}.</p>}
          <Link to="/questionnaire?etape=reactions" className="btn btn-outline">
            Modifier ses réactions
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl font-bold">Contacts</h2>
        <div className="card px-4 py-1">
          <ContactRow first role="Vétérinaire" callLabel="Appeler le vétérinaire" contact={dog.vet} />
          <ContactRow role="Éducateur" callLabel="Appeler l'éducateur" contact={dog.trainer} />
        </div>
      </section>

      <WalkSettings />

      <EveningReminder dogName={dog.name} />

      {/* Une fois terminé, on arrive sur le résultat : c'est là qu'on corrige ce qu'il savait déjà faire. */}
      <Link to={status.complete ? '/questionnaire?etape=fin' : '/questionnaire'} className="card-link min-h-16">
        <NoteIcon size={24} className="shrink-0 text-primary" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[17px] font-bold">Questionnaire de départ</span>
          <span className="text-sm text-muted">{statusLabel(status)}</span>
        </span>
        <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
      </Link>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl font-bold">Compte</h2>
        <div className="card px-4 py-1">
          <div className="flex items-center gap-3 py-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-placeholder font-bold text-[#3F4946]">{email.charAt(0).toUpperCase()}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[13px] text-muted">Connecté avec</span>
              <span className="truncate text-base font-semibold">{email}</span>
            </div>
          </div>
          <div role="status" className="flex items-center gap-2.5 border-t border-divider py-3.5">
            {pendingCount === 0 ? (
              <>
                <CloudCheckIcon size={20} className="shrink-0 text-primary" />
                <span className="flex-1 text-[15px] font-semibold text-primary">Tout est synchronisé</span>
              </>
            ) : (
              <>
                <CloudPendingIcon size={20} className="shrink-0 text-info" />
                <span className="flex-1 text-[15px] font-semibold text-info">
                  {pendingCount > 1 ? `${pendingCount} éléments en attente d'envoi` : "1 élément en attente d'envoi"}
                </span>
              </>
            )}
            {!online && <span className="text-[13px] text-muted">Hors ligne</span>}
          </div>
          <div className="flex flex-col gap-2 border-t border-divider py-3.5">
            <div className={`text-[15px] font-semibold ${spaceLevel === 'ok' ? 'text-text' : 'text-milestone-dark'}`}>{usageLabel(space)}</div>
            <div className="h-2.5 overflow-hidden rounded-full bg-placeholder" role="img" aria-label={usageLabel(space)}>
              <div className={`h-full rounded-full ${spaceLevel === 'ok' ? 'bg-primary' : 'bg-milestone'}`} style={{ width: `${Math.min(100, Math.max(2, (space / USER_QUOTA) * 100))}%` }} />
            </div>
            {spaceLevel !== 'ok' && <p role="status" className="text-[15px] leading-snug text-milestone-dark">{spaceLevel === 'plein' ? FULL_MESSAGE : ALMOST_FULL_MESSAGE}</p>}
          </div>
        </div>
        <button type="button" onClick={() => setChangingPassword(true)} className="btn btn-outline">
          Changer mon mot de passe
        </button>
        <Link to="/installer" className="btn btn-outline">
          Mettre l'app sur mon téléphone
        </Link>
        <button type="button" onClick={() => setConfirmLogout(true)} className="btn btn-quiet">
          Se déconnecter
        </button>
        <button type="button" onClick={() => setDeleting(true)} className="btn border-2 border-solid border-danger bg-surface text-danger">
          Supprimer mon compte et mes données
        </button>
        <p className="text-[13px] leading-snug text-muted">Vos données restent privées. Martin, qui gère l'app, peut techniquement y accéder.</p>
      </section>

      <p className="text-center text-[13px] text-muted">
        Version du {new Date(__BUILD_TIME__).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      </p>

      {changingPassword && <PasswordSheet onClose={() => setChangingPassword(false)} />}
      {deleting && <DeleteAccountSheet dogName={dog.name} online={online} onClose={() => setDeleting(false)} />}

      {confirmLogout && (
        <ConfirmSheet
          title="Se déconnecter ?"
          message={
            pendingCount > 0
              ? `Attention : ${pendingCount > 1 ? `${pendingCount} éléments ne sont pas encore envoyés` : "1 élément n'est pas encore envoyé"}. Reconnectez-vous à Internet avant de vous déconnecter pour ne rien perdre.`
              : 'Vos données restent en sécurité dans votre compte. Il faudra votre mot de passe pour revenir.'
          }
          confirmLabel="Se déconnecter"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => void logOut()}
        />
      )}
    </div>
  )
}

/** Modifier le profil : plein écran. */
export function ProfileEditScreen() {
  const { dog } = useData()
  const back = useBack('/profil')
  return <ProfileEdit dog={dog} onClose={back} />
}
