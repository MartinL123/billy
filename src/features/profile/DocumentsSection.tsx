import { Link } from 'react-router-dom'
import { outlineButton } from '../../components/Form'
import { ChevronRightIcon, ImportIcon } from '../../components/Icons'
import { Pending } from '../../components/Pending'
import { useData } from '../../firebase/store'
import { formatShort, parseISO } from '../../lib/dates'
import { useToday } from '../../lib/useToday'
import { categoryLabel, kindBadge } from './documents'

/** Les papiers de Billy, dans l'onglet Santé. */
export function DocumentsSection() {
  const { documents, events } = useData()
  const year = parseISO(useToday()).y
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[19px] font-bold">Documents</h2>
        {documents.length > 0 && (
          <span className="text-sm text-muted">
            {documents.length} document{documents.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      {documents.length > 0 ? (
        <div className="card px-4 py-1">
          {documents.map((document, i) => {
            const badge = kindBadge(document.kind)
            const event = events.find((e) => e.id === document.eventId)
            const detail = event?.date
              ? `lié à « ${event.title} » du ${formatShort(event.date, year)}`
              : `ajouté le ${formatShort(document.date, year)}`
            return (
              <Link
                key={document.id}
                to={`/document/${document.id}`}
                className={`flex items-center gap-3 py-3 text-text no-underline ${i ? 'border-t border-divider' : ''}`}
              >
                <span className={`flex h-[54px] w-11 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold ${badge.className}`}>{badge.label}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold">{document.title}</span>
                  <span className="truncate text-[13px] text-muted">
                    {categoryLabel(document.category)} · {detail}
                  </span>
                  <Pending show={document.pending} />
                </span>
                <ChevronRightIcon size={20} className="shrink-0 text-[#8C9692]" />
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-[15px] leading-snug text-muted">Carnet de santé, comptes rendus, ordonnances : gardez tous ses papiers ici, même hors ligne.</p>
      )}
      <Link to="/document/nouveau" className={outlineButton}>
        <ImportIcon size={20} />
        Importer un document
      </Link>
    </section>
  )
}
