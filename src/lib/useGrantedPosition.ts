import { useEffect, useState } from 'react'

/** La position, seulement si elle est déjà autorisée : on ne la demande jamais pour ça. Rien n’est enregistré. */
export function useGrantedPosition() {
  const [here, setHere] = useState<{ lat: number; lng: number }>()
  useEffect(() => {
    let live = true
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') navigator.geolocation.getCurrentPosition((pos) => live && setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => undefined, { maximumAge: 600000, timeout: 8000 })
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])
  return here
}
