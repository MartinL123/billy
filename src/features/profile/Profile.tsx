import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CloudCheckIcon, CloudPendingIcon, PhoneIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet } from '../../components/Sheet'
import { auth } from '../../firebase/app'
import { logOut } from '../../firebase/auth'
import { QUOTA_BYTES, storageUsed } from '../../firebase/files'
import { useData } from '../../firebase/store'
import type { Contact } from '../../firebase/types'
import { formatAgeShort } from '../../lib/age'
import { formatLong, formatTime } from '../../lib/dates'
import { CHARACTER } from '../../content/phrases'
import { formatBytes } from '../../lib/image'
import { sortMeals } from '../../lib/feeding'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { ProfileEdit } from './ProfileEdit'

/** Alerte d'espace au-delà de 70 % du quota gratuit. */
const STORAGE_ALERT = 0.7

function InfoRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 py-3.5 text-[15px] ${first ? '' : 'border-t border-divider'}`}>
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  )
}

function ContactRow({ role, callLabel, contact, first, onAdd }: { role: string; callLabel: string; contact?: Contact; first?: boolean; onAdd: () => void }) {
  const phone = contact?.phone.replace(/[^\d+]/g, '')
  return (
    <div className={`flex items-center gap-3 py-3 ${first ? '' : 'border-t border-divider'}`}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] text-muted">{role}</span>
        {contact?.name || phone ? (
          <>
            <span className="truncate text-base font-semibold">{contact?.name || contact?.phone}</span>
            {contact?.name && contact.phone && <span className="text-[13px] text-muted">{contact.phone}</span>}
          </>
        ) : (
          <button type="button" onClick={onAdd} className="btn btn-outline self-start">
            Ajouter
          </button>
        )}
      </div>
      {phone && (
        <a href={`tel:${phone}`} aria-label={callLabel} className="btn btn-outline min-h-12 shrink-0 px-4">
          <PhoneIcon size={20} />
          Appeler
        </a>
      )}
    </div>
  )
}

/** Le profil, sous les compétences dans l'onglet Billy : identité, alimentation, caractère, contacts, compte. */
export function ProfileSections() {
  const { dog, documents, pendingCount, online } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const edit = () => navigate('/profil/modifier')
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [used, setUsed] = useState<number>()

  useEffect(() => {
    if (!online) return
    let alive = true
    storageUsed()
      .then((bytes) => alive && setUsed(bytes))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [online, documents.length])

  const email = auth.currentUser?.email ?? ''
  const usedRatio = used === undefined ? 0 : used / QUOTA_BYTES
  const character = CHARACTER.filter((c) => dog.traits?.includes(c.trait))

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl font-bold">Son profil</h2>
        <Pending show={dog.pending} />
        <div className="card px-4 py-1">
          <InfoRow first label="Naissance" value={formatLong(dog.birthDate)} />
          <InfoRow label="Adoption" value={formatLong(dog.adoptionDate)} />
          <InfoRow label="Race" value={`${dog.breed} · ${formatAgeShort(dog.birthDate, today)}`} />
          <InfoRow label="Puce" value={dog.chip || 'À compléter'} />
        </div>
        <Link to="/profil/modifier" className="btn btn-outline">
          Modifier le profil
        </Link>
      </section>

      {dog.feeding && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-xl font-bold">Alimentation</h2>
          <div className="card px-4 py-1">
            <InfoRow first label="Ration" value={`${dog.feeding.gramsPerDay} g par jour`} />
            <InfoRow label="Repas" value={sortMeals(dog.feeding.meals).map((m) => formatTime(m.time)).join(' · ') || 'À compléter'} />
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl font-bold">Son caractère</h2>
        <div className="card flex flex-col gap-3 p-4">
          {character.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[17px] leading-snug">
              {character.map((c) => (
                <li key={c.trait}>{c.label}</li>
              ))}
            </ul>
          ) : (
            <p className="text-[17px] leading-snug text-muted">Rien de noté pour l'instant.</p>
          )}
          {dog.fears?.length || dog.fearsOther ? <p className="text-[15px] leading-snug text-muted">Ce qui lui fait peur : {[...(dog.fears ?? []), dog.fearsOther].filter(Boolean).join(', ').toLocaleLowerCase('fr')}.</p> : null}
          <Link to="/profil/modifier" className="btn btn-outline">
            Modifier son caractère
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-xl font-bold">Contacts</h2>
        <div className="card px-4 py-1">
          <ContactRow first role="Vétérinaire" callLabel="Appeler le vétérinaire" contact={dog.vet} onAdd={edit} />
          <ContactRow role="Éducateur" callLabel="Appeler l'éducateur" contact={dog.trainer} onAdd={edit} />
        </div>
      </section>

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
          {usedRatio >= STORAGE_ALERT && used !== undefined && (
            <div role="alert" className="flex flex-col gap-2 border-t border-divider py-3.5">
              <div className="text-[15px] font-semibold text-milestone-dark">
                Espace utilisé : {Math.round(usedRatio * 100)} % ({formatBytes(used)} sur 1 Go)
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-milestone-soft">
                <div className="h-full rounded-full bg-milestone" style={{ width: `${Math.min(100, usedRatio * 100)}%` }} />
              </div>
              <p className="text-[13px] leading-snug text-muted">L'espace gratuit se remplit. Pense à supprimer des documents ou des photos en double.</p>
            </div>
          )}
        </div>
        <button type="button" onClick={() => setConfirmLogout(true)} className="btn btn-quiet">
          Se déconnecter
        </button>
      </section>

      {confirmLogout && (
        <ConfirmSheet
          title="Se déconnecter ?"
          message={
            pendingCount > 0
              ? `Attention : ${pendingCount > 1 ? `${pendingCount} éléments ne sont pas encore envoyés` : "1 élément n'est pas encore envoyé"}. Reconnecte-toi à Internet avant de te déconnecter pour ne rien perdre.`
              : 'Tes données restent en sécurité dans ton compte. Il faudra ton mot de passe pour revenir.'
          }
          confirmLabel="Se déconnecter"
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => void logOut()}
        />
      )}
    </>
  )
}

/** Modifier le profil : plein écran, hors des onglets. */
export default function ProfileEditScreen() {
  const { dog } = useData()
  const back = useBack('/billy')
  return <ProfileEdit dog={dog} onClose={back} />
}
