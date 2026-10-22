import { useEffect, useState } from 'react'
import { BackLink } from '../../components/BackLink'
import { DangerButton } from '../../components/Buttons'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, CloudCheckIcon, CloudPendingIcon, NoteIcon, PhoneIcon } from '../../components/Icons'
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
import { formatLong, formatShort, isValidISO } from '../../lib/dates'
import { questionnaireStatus, reactionsFromFears, statusLabel, worryPills } from '../../lib/questionnaire'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { DogPhoto } from '../shop/DogPhoto'
import { NotificationSettings } from '../notifications/NotificationSettings'
import { WalkSettings } from './WalkSettings'
import { ProfileEdit } from './ProfileEdit'
import { place } from '../../lib/garden'
import { ofName } from '../../lib/gender'
import { isNative } from '../../native'
import { useReadOnly } from '../../firebase/viewer'
import { FamilySection, VisitorAccount } from '../visitor/Family'
import { ExportButton } from './ExportButton'
import { WatchOptIn } from '../balades/WatchOptIn'
import { MotionSetting } from '../motion/MotionSetting'
import { WalkPhotosSetting } from './WalkPhotosSetting'
import { ProchesSection } from '../live/Proches'
import { watchOptedIn } from '../balades/watchImport'


function InfoRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-3.5 text-[0.8824rem] ${first ? '' : 'border-t border-divider'}`}>
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
        <span className="text-[0.7647rem] text-muted">{role}</span>
        {known ? (
          <>
            <span className="truncate text-base font-semibold">{contact?.name || contact?.phone}</span>
            {contact?.name && contact.phone && <span className="text-[0.7647rem] text-muted">{contact.phone}</span>}
          </>
        ) : (
          <span className="text-base text-muted">Pas encore renseigné</span>
        )}
      </div>
      {/* « Appeler » seulement si un numéro est enregistré. */}
      {phone ? (
        <a href={`tel:${phone}`} aria-label={callLabel} className="btn-text shrink-0 px-3">
          <PhoneIcon size={20} />
          Appeler
        </a>
      ) : (
        <EditLink to="/profil/modifier" aria-label={`Ajouter : ${role.toLocaleLowerCase('fr')}`} className="btn-text shrink-0 px-3">
          Ajouter
        </EditLink>
      )}
    </div>
  )
}

/**
 * Supprimer le compte : un panneau dans l’app, jamais de fenêtre système. Il faut retaper son mot de passe.
 * D’abord toutes les données sous users/{uid}/…, puis le compte.
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
      return setError(authErrorMessage(err, true).text)
    }
    try {
      // Tant que la suppression est en cours, l’app ne recrée pas de profil vide.
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
      <h2 className="title-section mt-1">Supprimer mon compte et mes données ?</h2>
      <p className="text-[1rem] leading-snug">Tout ce qui concerne {dogName} sera effacé pour toujours : profil, carnet, photos, documents, calendrier et progression. On ne peut pas revenir en arrière.</p>
      <label className="flex flex-col gap-1.5">
        <span className="text-[0.8824rem] font-semibold">Votre mot de passe, pour confirmer</span>
        <span className="flex gap-2">
          <input type={shown ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={error ? true : undefined} className={`field min-w-0 flex-1 ${error ? 'border-danger' : ''}`} />
          <button type="button" aria-pressed={shown} onClick={() => setShown(!shown)} className="btn btn-tertiary shrink-0 px-4">
            {shown ? 'Masquer' : 'Afficher'}
          </button>
        </span>
      </label>
      {error && (
        <p role="alert" className="text-[0.8824rem] font-semibold text-danger">
          {error}
        </p>
      )}
      <DangerButton onClick={() => void erase()} disabled={busy} aria-busy={busy} className="mt-1">
        {busy ? 'Suppression en cours…' : 'Tout supprimer définitivement'}
      </DangerButton>
      <button type="button" onClick={onClose} disabled={busy} className="btn btn-primary">
        Garder mon compte
      </button>
    </Sheet>
  )
}

/** Le profil du chien : on l’ouvre en touchant sa photo dans son onglet. */
export default function Profile() {
  const { dog, documents, weights, usage, pendingCount, online } = useData()
  const today = useToday()
  const back = useBack('/billy')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [used, setUsed] = useState<number>()
  // T-110 : « Réglages » : une ligne par réglage, qui ouvre son panneau.
  const [setting, setSetting] = useState<'notifications' | 'detectees' | 'proches'>()
  // Visiteur (T-048) : il regarde le profil, sans rien régler.
  const readOnly = useReadOnly()

  useEffect(() => {
    if (!online || readOnly) return
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
  const pills = worryPills(dog.reactions ?? reactionsFromFears(dog.fears ?? []))
  const lastWeight = weights[0]
  const status = questionnaireStatus(dog.questionnaire)

  return (
    <div className="mx-auto flex max-w-[430px] flex-col gap-5 px-5 pb-[calc(env(safe-area-inset-bottom)+40px)]">
      <header className="sticky top-0 z-10 -mx-5 flex items-center justify-between bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        {/* T-110 (maquette Profil) : « ‹ Billy », sans titre au centre : son nom est juste dessous. */}
        <BackLink label={dog.name} onClick={back} />
      </header>

      <div className="flex flex-col items-center gap-2 text-center">
        <DogPhoto size={120} alt={`Photo ${ofName(dog.name)}`} className="rounded-full shadow-[0_2px_8px_rgba(24,32,30,0.12)]" />
        <h1 className="title-screen mt-1">{dog.name}</h1>
        <p className="text-base text-muted">
          {[formatAgeShort(dog.birthDate, today)].filter(Boolean).join(' · ')}
        </p>
        {!readOnly && (
          <EditLink to="/profil/modifier" className="btn-text px-4">
            {dog.photoThumbFileId ? 'Changer la photo' : 'Ajouter une photo'}
          </EditLink>
        )}
      </div>

      <section className="flex flex-col gap-2.5">
        <SectionHead title="Son identité" to="/profil/modifier" label="Modifier son identité" />
        <Pending show={dog.pending} />
        <div className="card px-4 py-1">
          <InfoRow first label={place('Né le')} value={isValidISO(dog.birthDate) ? formatLong(dog.birthDate) : 'Pas encore renseigné'} />
          {/* Une ligne par information : « Sexe : Femelle », puis la stérilisation (R-052). */}
          {dog.sex && <InfoRow label="Sexe" value={dog.sex} />}
          {dog.neutered && <InfoRow label="Stérilisation" value={dog.neutered === 'Oui' ? place('Stérilisé') : dog.neutered === 'Non' ? place('Non stérilisé') : 'Prévue'} />}
          <InfoRow label="Race" value={dog.breed || 'Pas encore renseignée'} />
          <InfoRow label={place('Adopté le')} value={isValidISO(dog.adoptionDate) ? `${formatLong(dog.adoptionDate)}${dog.origin ? ` · ${dog.origin.toLocaleLowerCase('fr')}` : ''}` : 'Pas encore renseigné'} />
          <InfoRow label="Puce" value={dog.chip || 'Pas encore renseignée'} />
          {lastWeight && <InfoRow label="Poids" value={`${String(lastWeight.kg).replace('.', ',')} kg · ${formatShort(lastWeight.date)}`} />}
        </div>
      </section>

      {/* T-110 : « Ce qui l’inquiète » : pastilles orange (inquiet, peur), vertes (à l’aise), tirées du questionnaire. */}
      <section className="flex flex-col gap-2.5">
        <SectionHead title={place('Ce qui l’inquiète')} to="/questionnaire?etape=reactions" label="Modifier ses réactions" />
        <div className="card flex flex-col gap-3 p-4">
          {pills.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {pills.map((pill) => (
                <li key={pill.label} className={`rounded-full px-3 py-1.5 text-[0.8235rem] font-bold whitespace-nowrap ${pill.tone === 'worry' ? 'bg-milestone-soft text-milestone-dark' : 'bg-primary-soft text-primary-dark'}`}>
                  {pill.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[1rem] leading-snug text-muted">Pas encore renseigné.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="title-section">Contacts</h2>
        <div className="card px-4 py-1">
          <ContactRow first role="Vétérinaire" callLabel="Appeler le vétérinaire" contact={dog.vet} />
          <ContactRow role="Éducateur" callLabel="Appeler l’éducateur" contact={dog.trainer} />
        </div>
      </section>

      {readOnly ? (
        <VisitorAccount />
      ) : (
        <>
      <WalkSettings />

      {/* Une fois terminé, on arrive sur le résultat : c’est là qu’on corrige ce qu’il savait déjà faire. */}
      <Link to={status.complete ? '/questionnaire?etape=fin' : '/questionnaire'} className="card-link min-h-16">
        <NoteIcon size={24} className="shrink-0 text-primary" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="title-card">Questionnaire de départ</span>
          <span className="text-sm text-muted">{statusLabel(status)}</span>
        </span>
        <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
      </Link>

      <FamilySection />

      {/* T-110 (maquette Profil, T-075) : les réglages regroupés, une ligne chacun. Notifications, balades détectées et partage
          en direct n’existent que dans l’app iOS ; les unités sont fixes (km, kg). */}
      <section className="flex flex-col gap-2.5">
        <h2 className="title-section">Réglages</h2>
        <div className="card px-4 py-1">
          {isNative() && <SettingRow first title="Notifications" detail="Missions, soins, exercices au parc" onClick={() => setSetting('notifications')} />}
          {isNative() && <SettingRow title="Balades détectées" detail="Apple Watch et iPhone" value={watchOptedIn() ? 'Montre' : 'iPhone'} onClick={() => setSetting('detectees')} />}
          {/* T-087 : à qui partager une balade en direct. */}
          {isNative() && <SettingRow title="Partage en direct" detail="Les proches qui suivent la balade" onClick={() => setSetting('proches')} />}
          <SettingRow first={!isNative()} title="Unités" value="km, kg" />
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="title-section">Compte</h2>
        <div className="card px-4 py-1">
          <div className="flex items-center gap-3 py-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-placeholder font-bold text-[#3F4946]">{email.charAt(0).toUpperCase()}</div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[0.7647rem] text-muted">Connecté avec</span>
              <span className="truncate text-base font-semibold">{email}</span>
            </div>
          </div>
          <div role="status" className="flex items-center gap-2.5 border-t border-divider py-3.5">
            {pendingCount === 0 ? (
              <>
                <CloudCheckIcon size={20} className="shrink-0 text-primary" />
                <span className="flex-1 text-[0.8824rem] font-semibold text-primary">Tout est synchronisé</span>
              </>
            ) : (
              <>
                <CloudPendingIcon size={20} className="shrink-0 text-info" />
                <span className="flex-1 text-[0.8824rem] font-semibold text-info">
                  {pendingCount > 1 ? `${pendingCount} éléments en attente d’envoi` : "1 élément en attente d’envoi"}
                </span>
              </>
            )}
            {!online && <span className="text-[0.7647rem] text-muted">Hors ligne</span>}
          </div>
          <div className="flex flex-col gap-2 border-t border-divider py-3.5">
            <div className={`text-[0.8824rem] font-semibold ${spaceLevel === 'ok' ? 'text-text' : 'text-milestone-dark'}`}>{usageLabel(space)}</div>
            <div className="h-2.5 overflow-hidden rounded-full bg-placeholder" role="img" aria-label={usageLabel(space)}>
              <div className={`h-full rounded-full ${spaceLevel === 'ok' ? 'bg-primary' : 'bg-milestone'}`} style={{ width: `${Math.min(100, Math.max(2, (space / USER_QUOTA) * 100))}%` }} />
            </div>
            {spaceLevel !== 'ok' && <p role="status" className="text-[0.8824rem] leading-snug text-milestone-dark">{spaceLevel === 'plein' ? FULL_MESSAGE : ALMOST_FULL_MESSAGE}</p>}
          </div>
        </div>
        {/* T-106 (maquette Profil) : mot de passe en primary, export en secondary, installer et déconnexion en tertiary,
            la suppression du compte en tertiary rouge. */}
        <button type="button" onClick={() => setChangingPassword(true)} className="btn btn-primary">
          Changer mon mot de passe
        </button>
        {/* T-065 : dates, durées, sources et compteurs, sans lieux ni textes ; le fichier reste sur l'appareil. */}
        <ExportButton />
        {/* Dans l’app iOS, elle est déjà sur le téléphone. */}
        {!isNative() && (
          <Link to="/installer" className="btn btn-tertiary">
            Mettre l’app sur mon téléphone
          </Link>
        )}
        <button type="button" onClick={() => setConfirmLogout(true)} className="btn btn-tertiary">
          Se déconnecter
        </button>
        <DangerButton onClick={() => setDeleting(true)}>Supprimer mon compte et mes données</DangerButton>
        <p className="text-[0.7647rem] leading-snug text-muted">Vos données restent privées. Martin, qui gère l’app, peut techniquement y accéder.</p>
      </section>

        </>
      )}

      <p className="text-center text-[0.7647rem] text-muted">
        Version du {new Date(__BUILD_TIME__).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
      </p>

      {setting === 'notifications' && (
        <Sheet label="Notifications" onClose={() => setSetting(undefined)}>
          <NotificationSettings />
        </Sheet>
      )}
      {setting === 'detectees' && (
        // R-079 (Apple Watch), T-085 (sans montre), T-103 (photos des balades) : ce que l’app iOS repère seule.
        <Sheet label="Balades détectées" onClose={() => setSetting(undefined)}>
          <section className="flex flex-col gap-2.5">
            <h2 className="title-section">Apple Watch</h2>
            <WatchOptIn />
          </section>
          <MotionSetting />
          <WalkPhotosSetting />
        </Sheet>
      )}

      {setting === 'proches' && (
        <Sheet label="Partage en direct" onClose={() => setSetting(undefined)}>
          <ProchesSection />
        </Sheet>
      )}

      {changingPassword && <PasswordSheet onClose={() => setChangingPassword(false)} />}
      {deleting && <DeleteAccountSheet dogName={dog.name} online={online} onClose={() => setDeleting(false)} />}

      {confirmLogout && (
        <ConfirmSheet
          title="Se déconnecter ?"
          message={
            pendingCount > 0
              ? `Attention : ${pendingCount > 1 ? `${pendingCount} éléments ne sont pas encore envoyés` : "1 élément n’est pas encore envoyé"}. Reconnectez-vous à Internet avant de vous déconnecter pour ne rien perdre.`
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

/** Le titre d’un bloc et son « Modifier » à droite (maquette Profil), masqué chez un visiteur. */
function SectionHead({ title, to, label }: { title: string; to: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="title-section">{title}</h2>
      <EditLink to={to} aria-label={label} className="btn-text -mr-3 shrink-0 px-3">
        Modifier
      </EditLink>
    </div>
  )
}

/** Une ligne de « Réglages » : son titre, sa précision, sa valeur ; un chevron si elle s’ouvre. */
function SettingRow({ title, detail, value, onClick, first }: { title: string; detail?: string; value?: string; onClick?: () => void; first?: boolean }) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[1rem] font-bold">{title}</span>
        {detail && <span className="text-[0.8235rem] leading-snug text-muted">{detail}</span>}
      </span>
      {value && <span className="shrink-0 text-[0.8824rem] whitespace-nowrap text-muted">{value}</span>}
      {onClick && <ChevronRightIcon size={18} className="shrink-0 text-[#8C9692]" />}
    </>
  )
  const cls = `flex min-h-14 w-full items-center gap-2 py-3 text-left text-text ${first ? '' : 'border-t border-divider'}`
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} border-x-0 border-b-0 bg-transparent px-0`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** Un lien vers « Modifier le profil », masqué chez un visiteur (T-048). */
function EditLink(props: React.ComponentProps<typeof Link>) {
  return useReadOnly() ? null : <Link {...props} />
}

/** Modifier le profil : plein écran. */
export function ProfileEditScreen() {
  const { dog } = useData()
  const back = useBack('/profil')
  return <ProfileEdit dog={dog} onClose={back} />
}
