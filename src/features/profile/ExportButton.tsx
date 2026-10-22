import { useState } from 'react'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { exportSnapshot } from '../../lib/exportData'

/**
 * T-065 : « Exporter mes données ». Un fichier JSON (dates, durées, sources, compteurs ; jamais de position, de texte,
 * de photo ni de contact) partagé ou téléchargé sur l'appareil. Rien n'est envoyé ailleurs.
 */
export function ExportButton() {
  const data = useData()
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setBusy(true)
    try {
      const now = new Date()
      const json = JSON.stringify(exportSnapshot(data as unknown as Parameters<typeof exportSnapshot>[0], now), null, 1)
      const name = `flair-export-${now.toISOString().slice(0, 10)}.json`
      const file = new File([json], name, { type: 'application/json' })
      // iPhone : la feuille de partage (Enregistrer dans Fichiers, AirDrop) ; ailleurs : un téléchargement.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name }).catch(() => undefined)
      } else {
        const url = URL.createObjectURL(file)
        const link = document.createElement('a')
        link.href = url
        link.download = name
        link.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
        toast('Fichier enregistré dans Téléchargements')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button type="button" onClick={run} disabled={busy} className="btn btn-secondary">
      {busy ? 'Un instant…' : 'Exporter mes données'}
    </button>
  )
}
