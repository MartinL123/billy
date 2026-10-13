import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileImage } from '../../components/FileImage'
import { outlineButton } from '../../components/Form'
import { ChevronLeftIcon, ChevronRightIcon, CloudCheckIcon, CloudPendingIcon, ImportIcon, PhoneIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { ConfirmSheet } from '../../components/Sheet'
import { auth } from '../../firebase/app'
import { logOut } from '../../firebase/auth'
import { QUOTA_BYTES, storageUsed } from '../../firebase/files'
import { useData } from '../../firebase/store'
import type { Contact } from '../../firebase/types'
import { formatAgeShort } from '../../lib/age'
import { formatLong, formatShort, parseISO } from '../../lib/dates'
import { formatBytes } from '../../lib/image'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { categoryLabel, kindBadge } from './documents'
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
          <button type="button" onClick={onAdd} className="min-h-11 self-start border-0 bg-transparent p-0 text-base font-semibold text-primary">
            Ajouter
          </button>
        )}
      </div>
      {phone && (
        <a href={`tel:${phone}`} aria-label={callLabel} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <PhoneIcon size={20} />
        </a>
      )}
    </div>
  )
}

export default function Profile() {
  const { dog, documents, events, pendingCount, online } = useData()
  const today = useToday()
  const back = useBack('/')
  const [editing, setEditing] = useState(false)
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

  if (editing) return <ProfileEdit dog={dog} onClose={() => setEditing(false)} />

  const email = auth.currentUser?.email ?? ''
  const year = parseISO(today).y
  const usedRatio = used === undefined ? 0 : used / QUOTA_BYTES

  return (
    <div className="mx-auto flex max-w-[430px] flex-col gap-5 px-5 pt-[calc(env(safe-area-inset-top)+4px)] pb-[calc(env(safe-area-inset-bottom)+40px)]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="flex h-11 items-center gap-1 border-0 bg-transparent p-0 text-base font-semibold text-primary">
          <ChevronLeftIcon />
          Retour
        </button>
        <button type="button" onClick={() => setEditing(true)} className="h-11 border-0 bg-transparent px-3 text-base font-semibold text-primary">
          Modifier
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        {dog.photoThumbFileId ? (
          <FileImage
            fileId={dog.photoThumbFileId}
            alt={`Photo de ${dog.name}`}
            className="size-[120px] rounded-full border-4 border-white shadow-[0_2px_8px_rgba(24,32,30,0.12)]"
            eager
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex size-[120px] items-center justify-center rounded-full border-4 border-solid border-white bg-milestone-soft p-3 text-[13px] font-semibold text-milestone-dark shadow-[0_2px_8px_rgba(24,32,30,0.12)]"
          >
            Ajouter une photo
          </button>
        )}
        <h1 className="mt-1 font-display text-[32px] font-bold">{dog.name}</h1>
        <div className="text-base text-muted">
          {dog.breed} · {formatAgeShort(dog.birthDate, today)}
        </div>
        <Pending show={dog.pending} />
      </div>

      <div className="card px-4 py-1">
        <InfoRow first label="Naissance" value={formatLong(dog.birthDate)} />
        <InfoRow label="Adoption" value={formatLong(dog.adoptionDate)} />
        <InfoRow label="Puce" value={dog.chip || 'À compléter'} />
      </div>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[19px] font-bold">Contacts</h2>
        <div className="card px-4 py-1">
          <ContactRow first role="Vétérinaire" callLabel="Appeler le vétérinaire" contact={dog.vet} onAdd={() => setEditing(true)} />
          <ContactRow role="Éducateur" callLabel="Appeler l'éducateur" contact={dog.trainer} onAdd={() => setEditing(true)} />
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[19px] font-bold">Documents</h2>
          {documents.length > 0 && (
            <span className="text-sm text-muted">
              {documents.length} document{documents.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {documents.length > 0 ? (
          <div className="card px-4 py-1">
            {documents.map((document, i) => {
              const badge = kindBadge(document.kind)
              const event = events.find((e) => e.id === document.eventId)
              const detail = event?.date
                ? `lié à « ${event.title} » du ${formatShort(event.date, year)}`
                : `ajouté le ${formatShort(document.date, year)}`
              return (
                <Link
                  key={document.id}
                  to={`/document/${document.id}`}
                  className={`flex items-center gap-3 py-3 text-text no-underline ${i ? 'border-t border-divider' : ''}`}
                >
                  <span className={`flex h-[54px] w-11 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-base font-semibold">{document.title}</span>
                    <span className="truncate text-[13px] text-muted">
                      {categoryLabel(document.category)} · {detail}
                    </span>
                    <Pending show={document.pending} />
                  </span>
                  <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-[15px] leading-snug text-muted">Carnet de santé, comptes rendus, ordonnances : garde tous ses papiers ici, même hors ligne.</p>
        )}
        <Link to="/document/nouveau" className={outlineButton}>
          <ImportIcon size={20} />
          Importer un document
        </Link>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="text-[19px] font-bold">Compte</h2>
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
        <button type="button" onClick={() => setConfirmLogout(true)} className="h-12 rounded-full border-[1.5px] border-border bg-surface text-[15px] font-semibold text-text">
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
    </div>
  )
}
