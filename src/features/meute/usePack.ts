import { useEffect, useMemo, useState } from 'react'
import { watchCalm, watchFeed, watchMarks, watchMembers, watchSpots, type CalmVote, type FeedItem, type Mark, type Member, type Spot, type WithId } from '../../firebase/community'
import type { ISODate } from '../../lib/dates'

/** Toute la meute, en direct, seulement pendant qu’on regarde l’onglet. */
export function usePack(_week?: ISODate) {
  const [members, setMembers] = useState<WithId<Member>[]>([])
  const [spots, setSpots] = useState<WithId<Spot>[]>([])
  const [marks, setMarks] = useState<WithId<Mark>[]>([])
  const [feed, setFeed] = useState<WithId<FeedItem>[]>([])
  const [calm, setCalm] = useState<Record<string, WithId<CalmVote>[]>>({})

  useEffect(() => {
    const stops = [watchMembers(setMembers), watchSpots(setSpots), watchMarks(setMarks), watchFeed(setFeed)]
    return () => stops.forEach((stop) => stop())
  }, [])

  // Les avis de calme de chaque spot (une petite meute : quelques dizaines de spots au plus).
  const spotIds = useMemo(() => spots.map((s) => s.id).join(','), [spots])
  useEffect(() => {
    const ids = spotIds ? spotIds.split(',') : []
    const stops = ids.map((id) => watchCalm(id, (votes) => setCalm((current) => ({ ...current, [id]: votes }))))
    return () => stops.forEach((stop) => stop())
  }, [spotIds])

  return { members, spots, marks, feed, calm }
}
