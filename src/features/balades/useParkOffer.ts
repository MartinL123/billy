import { useEffect, useRef, useState } from 'react'
import { useData } from '../../firebase/store'
import { canOfferPark, dwellStep, NO_DWELL, parkOfferOn, parkOfferText, type DwellState, type ParkArea } from '../../lib/parkDwell'
import type { GpsPoint } from '../../lib/gpsWalk'
import { FlairNative } from '../../native/flair'
import { useQuest } from '../today/useQuest'
import { loadParks } from './parks'

/**
 * T-101 (V6.1 § 8) : pendant la balade, entré dans un parc et resté 30 s, si la mission du jour n’est pas faite :
 * le bandeau « Vous êtes au square X. 3 min de « … » ici ? ». Une seule fois par balade (bandeau ou, écran verrouillé,
 * la notification programmée par l’iPhone avec les mêmes parcs). Mission faite, jour de repos ou réglage éteint : rien.
 */
export function useParkOffer({ active, points, now }: { active: boolean; points: GpsPoint[]; now: number }) {
  const { dog } = useData()
  const { quest, mission, minutes, done } = useQuest()
  const allowed = canOfferPark({ enabled: parkOfferOn(dog.notifications), done, rest: quest.kind === 'repos' || !quest.planned })
  const [parks, setParks] = useState<ParkArea[]>([])
  const [offer, setOffer] = useState<ParkArea>()
  const dwell = useRef<DwellState>(NO_DWELL)
  const asked = useRef(false)
  const first = points[0]

  // Les parcs autour du départ, une fois par écran (gardés 7 jours sur l’appareil) ; l’iPhone les reçoit aussi.
  useEffect(() => {
    if (!active || !allowed || !first || asked.current) return
    asked.current = true
    void loadParks(first.lat, first.lng).then(setParks)
  }, [active, allowed, first])

  // L’iPhone garde les parcs et leurs phrases pour l’écran verrouillé ; plus rien à proposer : liste vide.
  const title = mission.title
  useEffect(() => {
    if (!active) return
    const list = allowed && !dwell.current.offered ? parks.map((p) => ({ s: p.s, w: p.w, n: p.n, e: p.e, text: parkOfferText(p, title, minutes) })) : []
    FlairNative.setParks({ parks: list, title: 'Un exercice au parc ?' }).catch(() => undefined)
  }, [active, allowed, parks, title, minutes])

  // Déjà proposé pendant cette balade (notification écran verrouillé, ou bandeau avant de quitter l’écran) ?
  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible') return
      FlairNative.currentWalk()
        .then((w) => {
          if (w.parkOffered) dwell.current = { ...dwell.current, offered: true }
        })
        .catch(() => undefined)
    }
    check()
    document.addEventListener('visibilitychange', check)
    return () => document.removeEventListener('visibilitychange', check)
  }, [])

  const show = (park: ParkArea | undefined) => {
    if (!park) return
    setOffer(park)
    FlairNative.parkOffered().catch(() => undefined)
  }

  // Chaque nouvelle position (à son arrivée : les horloges du GPS et de l’écran restent les mêmes)…
  const last = points[points.length - 1]
  useEffect(() => {
    if (!active || !allowed || !parks.length || !last) return
    const step = dwellStep(dwell.current, Date.now(), parks, last)
    dwell.current = step.state
    show(step.offer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.time, parks, active, allowed])
  // …et chaque seconde : immobile dans le parc, l’iPhone n’envoie plus de positions.
  useEffect(() => {
    if (!active || !allowed || !parks.length) return
    const step = dwellStep(dwell.current, now, parks)
    dwell.current = step.state
    show(step.offer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now])

  return {
    offer: offer && allowed ? { park: offer, text: parkOfferText(offer, title, minutes) } : undefined,
    later: () => setOffer(undefined),
  }
}
