import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { importWalk } from '../../lib/balade'
import { MAX_GPX_BYTES, readGpx } from '../../lib/gpx'
import { setDraftWalk } from '../journal/draft'

/** « Ajouter une balade » : un fichier .gpx (export Strava, montre…) depuis l'app Fichiers. Jamais de GPS en direct. */
export function ImportWalkButton() {
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const pick = async (file: File | undefined) => {
    setError('')
    if (!file) return
    if (file.size > MAX_GPX_BYTES) return setError('Ce fichier est trop lourd (5 Mo au maximum).')
    const { name, points } = readGpx(await file.text())
    if (points.length < 2) return setError('Ce fichier ne contient pas de balade. Choisissez un fichier .gpx exporté de Strava.')
    setDraftWalk({ name, walk: importWalk(points), raw: points })
    navigate('/noter?balade=1')
  }

  return (
    <div className="flex flex-col gap-2 px-5">
      <label className="btn btn-outline min-h-12 cursor-pointer gap-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 19c3-1 4-5 7-6s5 2 9-2" />
          <circle cx="4" cy="19" r="2" />
          <circle cx="20" cy="11" r="2" />
        </svg>
        Ajouter une balade
        <input type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {error && (
        <p role="alert" className="rounded-[18px] bg-danger-soft px-4 py-3 text-[15px] font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
