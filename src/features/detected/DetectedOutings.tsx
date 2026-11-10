import { useEffect, useMemo, useRef, useState } from 'react'
import { BonesGained } from '../../components/BoneIcon'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { answerOuting, saveDetected } from '../../firebase/imports'
import { useData } from '../../firebase/store'
import { addDays, todayISO } from '../../lib/dates'
import { dogName } from '../../lib/dogName'
import { shouldSync } from '../../lib/watch'
import { bannerLine, detectOutings, LOOKBACK_DAYS, newDetected, outingCardLine, pendingOutings, type PendingOuting } from '../../lib/walkingBouts'
import { useToday } from '../../lib/useToday'
import { walkTimes } from '../../lib/walks'
import { withTimeout } from '../../lib/timeout'
import { isNative } from '../../native'
import { FlairNative, haptic } from '../../native/flair'
import { outingName } from '../../lib/notedOutings'
import { watchOptedIn } from '../balades/watchImport'

// T-121 (app iOS) : les sorties faites iPhone en poche, sans séance Watch, repérées dans la distance à pied de Santé.
// Remplace la carte de la T-085 (Mouvements et forme). Rien sur le web : Santé n’y est pas lisible.

let lastRun: number | undefined

/**
 * À l’ouverture et au retour au premier plan (même moment que la lecture de la Watch, au plus toutes les 5 min) : lit
 * les 14 derniers jours de distance à pied et garde les sorties nouvelles « à confirmer ». Seulement après l’accord
 * pour Santé (« Retrouver les balades de ma montre », R-079).
 */
export function DetectedSync() {
  const { entries, walks, dog } = useData()
  const latest = useRef({ entries, walks, dog })
  latest.current = { entries, walks, dog }

  useEffect(() => {
    if (!isNative()) return
    let running = false
    const run = async () => {
      if (document.visibilityState !== 'visible' || running || !watchOptedIn()) return
      const now = Date.now()
      if (!shouldSync(lastRun, now)) return
      lastRun = now
      running = true
      try {
        const since = new Date(`${addDays(todayISO(), -(LOOKBACK_DAYS - 1))}T00:00:00`).toISOString()
        const read = await withTimeout(FlairNative.getWalkingBouts({ since }), 60_000, 'getWalkingBouts')
        if (!read.available) return
        const { entries, walks, dog } = latest.current
        const found = detectOutings(read.buckets, { walks: entries, noted: walks, times: walkTimes(dog.walkTimes) })
        saveDetected(newDetected(found, walks))
      } catch (error) {
        // Une app iOS plus ancienne (sans getWalkingBouts) ou Santé muet : rien à proposer, on réessaiera.
        console.error('Lecture de la distance à pied impossible', error)
      } finally {
        running = false
      }
    }
    const onVisible = () => void run()
    void run()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('flair:montre', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('flair:montre', onVisible)
    }
  }, [])

  return null
}

/** Accueil, app iOS : « 3 sorties repérées par votre iPhone » ; un toucher ouvre la liste. Rien s’il n’y en a pas. */
export function DetectedBanner() {
  const { entries, walks, dog } = useData()
  const [open, setOpen] = useState<PendingOuting[]>()
  const pending = useMemo(() => (isNative() ? pendingOutings(walks, entries, walkTimes(dog.walkTimes)) : []), [walks, entries, dog.walkTimes])
  if (!pending.length && !open) return null
  return (
    <>
      {pending.length > 0 && (
        <button type="button" onClick={() => setOpen(pending)} className="tap flex min-h-14 w-full items-center gap-3 rounded-2xl border-0 bg-info-soft px-3.5 py-3 text-left text-[0.8824rem] font-bold leading-snug text-info">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
            <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
            <path d="M11 18.5h2" />
          </svg>
          <span className="flex-1">{bannerLine(pending.length)}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" className="shrink-0">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
      {/* La liste du moment de l’ouverture : une carte répondue reste visible avec sa réponse. */}
      {open && <DetectedSheet outings={open} onClose={() => setOpen(undefined)} />}
    </>
  )
}

function DetectedSheet({ outings, onClose }: { outings: PendingOuting[]; onClose: () => void }) {
  const { dog, walks, bones } = useData()
  const today = useToday()
  const toast = useToast()
  const [answers, setAnswers] = useState<Record<string, { status: 'yes' | 'no'; bones: number }>>({})
  const name = dogName(dog)

  const answer = (o: PendingOuting, status: 'yes' | 'no') => {
    const day = walks.find((w) => w.date === o.date)?.detected ?? [o]
    const gains = answerOuting(o, status, day, bones, today)
    const amount = gains.reduce((sum, g) => sum + g.amount, 0)
    if (status === 'yes') {
      haptic('success')
      toast(amount ? <BonesGained label={`${outingName(o.slot)} notée`} amount={amount} /> : `${outingName(o.slot)} notée`, undefined, amount ? { bones: true } : undefined)
    }
    setAnswers((a) => ({ ...a, [o.start]: { status, bones: amount } }))
  }

  return (
    <Sheet label="Sorties repérées" onClose={onClose}>
      <h2 className="title-section mt-1">Sorties repérées</h2>
      <p className="text-[0.9412rem] leading-snug text-[#3F4946]">Votre iPhone vous a vu marcher. Avec {name}&nbsp;?</p>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {outings.map((o) => {
          const done = answers[o.start]
          return (
            <li key={o.start} className="flex flex-col gap-2.5 rounded-card border border-solid border-[#E6EAE7] px-4 py-3.5">
              <span className="flex flex-col">
                <b className="text-[1rem] leading-snug">{outingCardLine(o)}</b>
                <span className="text-[0.8824rem] leading-snug text-[#3F4946]">{outingName(o.slot)}</span>
              </span>
              {done ? (
                <p role="status" className="flex min-h-11 items-center gap-2 text-[0.8824rem] font-bold text-primary">
                  {done.status === 'yes' ? `Notée avec ${name}${done.bones ? ` · +${done.bones} os` : ''}` : 'Pas notée'}
                </p>
              ) : (
                // Sur une ligne ; trop étroit (320 px, texte agrandi), l’un sous l’autre.
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => answer(o, 'yes')} className="btn btn-primary min-h-11 flex-[1_1_9rem] px-3 text-[0.9412rem]">
                    C’était avec {name}
                  </button>
                  <button type="button" onClick={() => answer(o, 'no')} className="btn btn-tertiary min-h-11 flex-[1_1_7rem] px-3 text-[0.9412rem]">
                    Pas avec lui
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <button type="button" onClick={onClose} className="btn-text self-center px-4">
        {Object.keys(answers).length === outings.length ? 'Fermer' : 'Plus tard'}
      </button>
    </Sheet>
  )
}
