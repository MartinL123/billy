import { Link } from 'react-router-dom'
import { useData } from '../firebase/store'
import { formatDayHeading } from '../lib/dates'
import { useToday } from '../lib/useToday'
import { FileImage } from './FileImage'

/** En-tête commun aux onglets : date du jour, titre de l'écran, avatar vers le profil. */
export function PageHeader({ title, className = '' }: { title: string; className?: string }) {
  const { dog } = useData()
  const today = useToday()
  return (
    <header className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="text-[15px] font-medium text-muted">{formatDayHeading(today)}</div>
        <h1 className="font-display text-[32px] font-bold tracking-[-0.5px]">{title}</h1>
      </div>
      <Link
        to="/billy"
        aria-label={`Profil de ${dog.name}`}
        className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-primary-soft font-display text-xl font-bold text-primary-dark no-underline shadow-[0_1px_3px_rgba(24,32,30,0.15)]"
      >
        {dog.photoThumbFileId ? <FileImage fileId={dog.photoThumbFileId} alt="" className="size-full" eager /> : dog.name.charAt(0).toUpperCase()}
      </Link>
    </header>
  )
}
