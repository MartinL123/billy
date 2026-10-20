import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePicker } from '../../components/FilePicker'
import { useData } from '../../firebase/store'
import { knownImportKeys } from '../../lib/activity'
import { useToday } from '../../lib/useToday'
import { walkTimes } from '../../lib/walks'
import { runImport } from './importRun'

const ACCEPT = '.gpx,.gz,application/gpx+xml,application/gzip,application/x-gzip,application/xml,text/xml'

/** Le bas des écrans d’import : le bouton qui ouvre Fichiers, puis la barre de progression, puis le résultat. */
export function ImportFooter({ label, multiple = true }: { label: string; multiple?: boolean }) {
  const { dog, entries, bones, fog, communes } = useData()
  const today = useToday()
  const navigate = useNavigate()
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const start = async (files: File[]) => {
    setProgress({ done: 0, total: files.length })
    await runImport(files, { knownKeys: knownImportKeys(entries), bones, fog, communes, today, times: walkTimes(dog.walkTimes) }, (done, total) => setProgress({ done, total }))
    navigate('/importer/resultat', { replace: true })
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
      <div className="mx-auto flex max-w-[430px] flex-col gap-2 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {progress ? (
          <div role="status" className="flex flex-col gap-2">
            <span className="text-[1rem] font-bold">
              Import en cours… {progress.done} sur {progress.total}
            </span>
            <span className="h-3 overflow-hidden rounded-full bg-placeholder">
              <span className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
            </span>
          </div>
        ) : (
          <FilePicker accept={ACCEPT} multiple={multiple} onFiles={(files) => void start(files)} className="btn btn-main min-h-[56px] w-full">
            {label}
          </FilePicker>
        )}
      </div>
    </div>
  )
}
