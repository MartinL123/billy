import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, PinIcon } from '../../components/Icons'
import { auth } from '../../firebase/app'
import { watchMarks } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { spotsCount } from '../../lib/territory'

/** « Son territoire · 12 spots marqués » dans l'onglet Billy, vers l'écran Territoire. */
export function TerritoryLink() {
  const { dog } = useData()
  const [count, setCount] = useState(0)
  useEffect(() => watchMarks((marks) => setCount(new Set(marks.filter((m) => m.uid === auth.currentUser?.uid).map((m) => m.spotId)).size)), [])
  return (
    <Link to="/territoire" className="flex min-h-[64px] items-center gap-3 rounded-[22px] bg-surface px-4 py-3 text-text no-underline shadow-[0_2px_8px_rgba(24,32,30,0.08)]">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
        <PinIcon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-display text-lg font-extrabold">Le territoire de {dog.name}</span>
        <span className="text-sm text-[#3F4946]">{count ? spotsCount(count) : 'Aucun spot marqué pour l’instant'}</span>
      </span>
      <ChevronRightIcon size={20} />
    </Link>
  )
}
