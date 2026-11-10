import { useEffect, useRef } from 'react'
import { useToast } from '../../components/Toast'
import { startLiveShare, updateLivePrivate } from '../../firebase/live'
import { useData } from '../../firebase/store'
import { gpsDistance } from '../../lib/gpsWalk'
import { activeShare, followLink, liveTrack, nearMessage, nearNotice, nearSmsLink, newToken, type LivePrivate } from '../../lib/liveShare'
import { isNative } from '../../native'
import { FlairNative } from '../../native/flair'
import { useLivePrivate } from './useLivePrivate'

// T-124 (app iOS) : « Vous passez près de chez Coralie. Le prévenir ? ». L’iPhone surveille la distance pendant la
// balade (FlairNativePlugin.swift, `watchForProches`) ; ici, le toucher : le partage en direct vers ce proche (lancé
// s’il ne l’était pas), puis Messages avec le texte prêt. Rien n’est envoyé sans ce toucher.

/** La notification touchée (app relancée) : gardée jusqu’à ce que le pont soit prêt (données lues). */
let pending: string | undefined
export const PROCHE_OPEN = 'flair:proche'
export function openProche(id: string) {
  pending = id
  window.dispatchEvent(new CustomEvent(PROCHE_OPEN))
}

/** Pendant la balade lancée : l’iPhone reçoit les proches dont l’adresse est connue (jamais envoyés ailleurs). */
export function useNearProches(active: boolean) {
  const priv = useLivePrivate()
  const homes = (priv?.proches ?? []).filter((p) => p.home).map((p) => ({ id: p.id, name: p.name, lat: p.home!.lat, lng: p.home!.lng }))
  const key = JSON.stringify(homes)
  useEffect(() => {
    if (!active || !isNative() || priv === undefined) return
    FlairNative.setNearProches({ proches: homes }).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, key, priv === undefined])
}

/** Le partage vers ce proche (lancé ou élargi), puis Messages. */
async function prevenir(id: string, priv: LivePrivate, dog: { name: string }, toast: ReturnType<typeof useToast>) {
  const proche = priv.proches?.find((p) => p.id === id)
  if (!proche) return
  const walk = await FlairNative.currentWalk().catch(() => undefined)
  const share = activeShare(priv.liveShares, Date.now())
  let token = share?.token
  if (share && !share.with.includes(proche.name)) {
    updateLivePrivate({ liveShares: (priv.liveShares ?? []).map((s) => (s.token === share.token ? { ...s, with: [...s.with, proche.name] } : s)) })
  }
  if (!token) {
    if (!walk?.active || walk.stopped || !walk.startedAt) return toast('La balade est terminée\u00a0: rien à partager.')
    token = newToken()
    const here = walk.points[walk.points.length - 1]
    startLiveShare(
      token,
      { dogName: dog.name, ...(priv.ownerName ? { ownerName: priv.ownerName } : {}), startedAt: walk.startedAt, ...(here ? { lat: here.lat, lng: here.lng } : {}), distanceM: gpsDistance(walk.points), track: liveTrack(walk.points) },
      [proche.name],
      priv.liveShares,
    )
  }
  // Messages s’ouvre avec le texte prêt ; c’est vous qui envoyez.
  window.location.href = nearSmsLink(proche.contact, nearMessage(dog.name, followLink(token, window.location)))
}

/** Monté avec l’app (iOS) : la notification touchée, ou, app ouverte, le bandeau « Prévenir ». */
export function ProcheNearBridge() {
  const { dog } = useData()
  const priv = useLivePrivate()
  const toast = useToast()
  const latest = useRef({ priv, dog, toast })
  latest.current = { priv, dog, toast }
  const ready = priv !== undefined

  // La notification touchée.
  useEffect(() => {
    if (!isNative() || !ready) return
    const run = () => {
      const id = pending
      pending = undefined
      const { priv, dog, toast } = latest.current
      if (id && priv) void prevenir(id, priv, dog, toast)
    }
    run()
    window.addEventListener(PROCHE_OPEN, run)
    return () => window.removeEventListener(PROCHE_OPEN, run)
  }, [ready])

  // App au premier plan : la même question, dans un bandeau.
  useEffect(() => {
    if (!isNative()) return
    const handle = FlairNative.addListener('procheNear', ({ id }) => {
      const { priv, dog, toast } = latest.current
      const proche = priv?.proches?.find((p) => p.id === id)
      if (!proche || !priv) return
      toast(nearNotice(proche.name), { label: 'Prévenir', run: () => void prevenir(id, latest.current.priv ?? priv, dog, latest.current.toast) })
    })
    return () => {
      void handle.then((h) => h.remove())
    }
  }, [])
  return null
}
