import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PinIcon } from '../../components/Icons'
import { watchCalm, watchSpots, type CalmVote, type Spot, type WithId } from '../../firebase/community'
import { formatDistance, pickCalmSpot } from '../../lib/community'
import { useGrantedPosition } from '../../lib/useGrantedPosition'

/** « Un spot calme pour ça » dans une mission « rue calme », « lieu calme »… (communaute.md § 4). Rien s'il n'y en a pas. */
export function CalmSpotCard() {
  const [spots, setSpots] = useState<WithId<Spot>[]>([])
  const [calm, setCalm] = useState<Record<string, WithId<CalmVote>[]>>({})
  const here = useGrantedPosition()
  useEffect(() => watchSpots(setSpots), [])
  const ids = useMemo(() => spots.map((s) => s.id).join(','), [spots])
  useEffect(() => {
    const stops = (ids ? ids.split(',') : []).map((id) => watchCalm(id, (votes) => setCalm((current) => ({ ...current, [id]: votes }))))
    return () => stops.forEach((stop) => stop())
  }, [ids])
  const spot = pickCalmSpot(spots, calm, here)
  if (!spot) return null
  return (
    <Link to={`/meute?spot=${spot.id}`} className="card flex items-center gap-3 p-4 text-text no-underline">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <PinIcon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] font-extrabold tracking-[0.6px] text-muted uppercase">Un spot calme pour ça</span>
        <span className="text-[17px] font-bold">{spot.name}</span>
        <span className="text-[15px] text-muted">{[spot.headline, spot.meters !== undefined ? formatDistance(spot.meters) : ''].filter(Boolean).join(' · ')}</span>
      </span>
    </Link>
  )
}
