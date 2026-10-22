import { useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { CheckIcon } from '../../components/Icons'
import { Stats } from '../../components/Stats'
import { useToast } from '../../components/Toast'
import { markWalkTold } from '../../firebase/db'
import { awardBone } from '../../firebase/training'
import { useData } from '../../firebase/store'
import { useReadOnly } from '../../firebase/viewer'
import { readRoute } from '../../lib/route'
import { useToday } from '../../lib/useToday'
import { clockAt, durationText } from '../../lib/walkSheet'
import { tellBone, tellQueue } from '../../lib/walkTell'
import { StopTiles, usePlaceOnStop } from './StopTiles'
import { WalkMap } from './WalkMap'

/**
 * « Raconter la balade » (V6 § 6.2) : un arrêt par écran (la carte zoomée sur l’arrêt, l’heure, la rue, les tuiles),
 * « Passer » en texte. À la fin, « C’est raconté ! » et +3 os une fois par balade, dans la limite des notes du jour.
 */
export default function TellWalk() {
  const { id } = useParams()
  const { entries, dog, bones } = useData()
  const readOnly = useReadOnly()
  const today = useToday()
  const toast = useToast()
  const navigate = useNavigate()
  const entry = entries.find((e) => e.id === id)
  const route = useMemo(() => readRoute(entry?.route), [entry?.route])
  // Les arrêts et les repères « À raconter » (T-086), figés à l’ouverture : un repère posé ne fait pas sauter l’écran suivant.
  const [queue] = useState(() => (route ? tellQueue(route) : []))
  const [step, setStep] = useState(0)
  const placed = useRef(0)
  const [gained, setGained] = useState(0)
  const placeOnStop = usePlaceOnStop(id ?? '', route ?? { points: [], distanceM: 0, moments: [] })
  const back = () => navigate(`/souvenir/${id}`, { replace: true })

  if (!entry || !route || readOnly) return <Navigate to={id ? `/souvenir/${id}` : '/balades'} replace />
  const done = step >= queue.length

  const next = () => {
    const nextStep = step + 1
    if (nextStep >= queue.length) {
      // Fin du récit : les os une fois, si au moins un repère a été posé.
      const gain = tellBone(entry.id, today, bones, { placed: placed.current, toldAt: entry.toldAt })
      if (placed.current > 0 && !entry.toldAt) markWalkTold(entry.id, today)
      if (gain) {
        awardBone(gain)
        setGained(gain.amount)
        toast(`+${gain.amount} os · balade racontée`, undefined, { bones: true })
      }
    }
    setStep(nextStep)
  }

  if (done)
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-end gap-4 px-5 pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <span className="anim-pop flex size-16 items-center justify-center self-center rounded-full bg-primary text-white">
          <CheckIcon size={34} />
        </span>
        <h1 className="title-screen text-center">C’est raconté !</h1>
        <p className="text-center text-[0.9412rem] text-[#3F4946]">{placed.current ? `Ses arrêts ont leur histoire. Vous les retrouvez dans la fiche de la balade.` : `Rien de noté cette fois. Vous pourrez y revenir depuis la fiche de la balade.`}</p>
        {gained > 0 && <Stats items={[{ value: String(placed.current), label: placed.current > 1 ? 'Arrêts racontés' : 'Arrêt raconté' }, { value: `+${gained}`, label: 'Os gagnés' }]} className="self-stretch" />}
        <button type="button" onClick={back} className="btn btn-main mt-2 min-h-14">
          Voir la balade
        </button>
      </main>
    )

  const item = queue[step]!
  // Un arrêt (numéroté), ou un repère « À raconter » posé hors arrêt (T-086).
  const stop = item.kind === 'stop' ? route.stops![item.stopIndex]! : undefined
  const marker = item.momentIndex !== undefined ? route.moments[item.momentIndex] : undefined
  const place = stop ?? marker!
  const when = route.startTime && item.atS !== undefined ? clockAt(route.startTime, item.atS) : undefined
  const street = stop?.street ?? marker?.street
  const onlyStops = queue.every((q) => q.kind === 'stop')
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col">
      <header className="flex items-center justify-between bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label="La balade" onClick={back} />
        <span className="text-[0.8235rem] font-semibold whitespace-nowrap text-muted tabular-nums" aria-live="polite">
          {onlyStops ? 'Arrêt ' : ''}
          {step + 1} sur {queue.length}
        </span>
      </header>
      <WalkMap route={route} dogName={dog.name} focus={{ lat: place.lat, lng: place.lng, ...(item.kind === 'stop' ? { number: item.stopIndex + 1 } : {}) }} className="h-[38dvh] min-h-[180px]" />
      <main key={step} className="anim-in flex flex-1 flex-col gap-3 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <span className="surtitre text-primary">{item.kind === 'stop' ? `Arrêt ${item.stopIndex + 1}` : 'Repère posé pendant la balade'}</span>
        <h1 className="title-section -mt-2">Que s’est-il passé ici ?</h1>
        <p className="-mt-1 text-[0.9412rem] text-muted">{[when, stop ? `${durationText(stop.durS)} d’arrêt` : undefined, street].filter(Boolean).join(' · ')}</p>
        <StopTiles
          stop={place}
          onPick={(type, note) => {
            if (placeOnStop(item, type, note)) placed.current++
            next()
          }}
        />
        <button type="button" onClick={next} className="btn-text mt-auto self-center px-4">
          Passer
        </button>
        {street && <p className="source-note text-center">Lieux © OpenStreetMap</p>}
      </main>
    </div>
  )
}
