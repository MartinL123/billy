import { useDeferredValue, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BackLink } from '../../components/BackLink'
import { Stats } from '../../components/Stats'
import { useToast } from '../../components/Toast'
import { updateEntryRoute } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { useReadOnly } from '../../firebase/viewer'
import { readRoute, storeRoute } from '../../lib/route'
import { trimRoute, untrimRoute } from '../../lib/trim'
import { clockAt, durationText, sheetStats } from '../../lib/walkSheet'
import { paceByMinute, windowOf } from '../../lib/walkStory'
import { TrimChart } from './TrimChart'
import { WalkMap } from './WalkMap'

/**
 * « Ajuster le début et la fin » (spec V6 § 8.3, T-090) : la courbe d’allure de toute la balade et deux poignées. La
 * carte, la durée, la distance et les arrêts suivent ; « Enregistrer » garde la portion (`route.trimmed`), le trajet
 * d’origine reste et « Revenir au trajet d’origine » le rend. Le brouillard déjà levé ne bouge pas.
 */
export default function TrimWalk() {
  const { id } = useParams()
  const { entries, dog } = useData()
  const readOnly = useReadOnly()
  const navigate = useNavigate()
  const toast = useToast()
  const entry = entries.find((e) => e.id === id)
  const route = useMemo(() => readRoute(entry?.route), [entry?.route])
  const track = route?.track
  const [first, last] = track ? windowOf(track) : [0, 0]
  // Rien de touché : la portion déjà gardée, sinon toute la balade (les données peuvent arriver après l’ouverture).
  const [picked, setRange] = useState<[number, number]>()
  const range: [number, number] = picked ?? (route?.trimmed ? [route.trimmed.startS, route.trimmed.endS] : [first, last])
  // La carte et les chiffres suivent la poignée sans freiner le doigt.
  const shownStart = useDeferredValue(range[0])
  const shownEnd = useDeferredValue(range[1])
  const preview = useMemo(() => (route ? trimRoute(route, shownStart, shownEnd) : undefined), [route, shownStart, shownEnd])
  const fullPace = useMemo(() => (track ? paceByMinute(track) : []), [track])
  const back = () => navigate(`/souvenir/${id}`, { replace: true })

  if (!entry || !route || !track || !preview || readOnly) return <Navigate to={id ? `/souvenir/${id}` : '/balades'} replace />
  const start = route.startTime && !Number.isNaN(Date.parse(route.startTime)) ? route.startTime : undefined
  const label = (s: number) => (start ? clockAt(start, s) : s - first < 60 ? 'Départ' : `${durationText(s - first)} après le départ`)
  const changed = range[0] !== (route.trimmed?.startS ?? first) || range[1] !== (route.trimmed?.endS ?? last)

  const save = () => {
    updateEntryRoute(entry.id, storeRoute(trimRoute(route, range[0], range[1])))
    toast('Balade ajustée')
    back()
  }
  const restore = () => {
    updateEntryRoute(entry.id, storeRoute(untrimRoute(route)))
    toast('Trajet d’origine rétabli')
    back()
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col">
      <header className="flex items-center px-4 pt-[calc(env(safe-area-inset-top)+4px)] pb-1">
        <BackLink label="La balade" onClick={back} />
      </header>
      <WalkMap route={preview} dogName={dog.name} className="h-[30dvh] min-h-[150px]" />
      <div className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+112px)]">
        <div className="flex flex-col gap-1">
          <h1 className="title-section">Ajuster le début et la fin</h1>
          <p className="text-[0.9412rem] leading-snug text-[#3F4946]">Déplacez les poignées pour retirer un départ ou une fin enregistrés en trop.</p>
        </div>
        <TrimChart pace={fullPace} first={first} last={last} startS={range[0]} endS={range[1]} label={label} onChange={(a, b) => setRange([a, b])} />
        <Stats items={sheetStats(preview)} />
        <p className="source-note">Le trajet d’origine est gardé. Le brouillard déjà levé reste levé.</p>
        {route.trimmed && (
          <button type="button" onClick={restore} className="btn-text -ml-1 self-start">
            Revenir au trajet d’origine
          </button>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button type="button" onClick={save} disabled={!changed} className="btn btn-main min-h-[56px] w-full">
            Enregistrer
          </button>
        </div>
      </div>
    </main>
  )
}
