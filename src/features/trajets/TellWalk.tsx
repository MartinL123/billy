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
import { stopsToTell, tellBone } from '../../lib/walkTell'
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
  // Les arrêts à raconter, figés à l’ouverture : un repère posé ne fait pas sauter l’écran suivant.
  const [queue] = useState(() => (route ? stopsToTell(route) : []))
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

  const stopIndex = queue[step]!
  const stop = route.stops![stopIndex]!
  const when = route.startTime ? clockAt(route.startTime, stop.at) : undefined
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col">
      <header className="flex items-center justify-between bg-bg px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label="La balade" onClick={back} />
        <span className="text-[0.8235rem] font-semibold text-muted tabular-nums" aria-live="polite">
          Arrêt {step + 1} sur {queue.length}
        </span>
      </header>
      <WalkMap route={route} dogName={dog.name} focus={{ lat: stop.lat, lng: stop.lng, number: stopIndex + 1 }} className="h-[38dvh] min-h-[180px]" />
      <main key={stopIndex} className="anim-in flex flex-1 flex-col gap-3 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <span className="surtitre text-primary">Arrêt {stopIndex + 1}</span>
        <h1 className="title-section -mt-2">Que s’est-il passé ici ?</h1>
        <p className="-mt-1 text-[0.9412rem] text-muted">{[when, `${durationText(stop.durS)} d’arrêt`, stop.street].filter(Boolean).join(' · ')}</p>
        <StopTiles
          stop={stop}
          onPick={(type, note) => {
            if (placeOnStop(stopIndex, type, note)) placed.current++
            next()
          }}
        />
        <button type="button" onClick={next} className="btn-text mt-auto self-center px-4">
          Passer
        </button>
        {stop.street && <p className="source-note text-center">Lieux © OpenStreetMap</p>}
      </main>
    </div>
  )
}
