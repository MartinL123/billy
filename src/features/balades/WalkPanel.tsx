import { Stats } from '../../components/Stats'
import { BackLink } from '../../components/BackLink'
import { outlineButton } from '../../components/Form'
import { PinIcon } from '../../components/Icons'
import { formatDuration } from '../../lib/balade'
import { formatLong } from '../../lib/dates'
import { durationLabel, formatRouteDistance, type Route } from '../../lib/route'
import { walkSourceLabel } from '../../lib/walkSource'
import { useRef } from 'react'
import { HOME_CLEARANCE, useSheet } from './useSheet'

/**
 * Le panneau d’une balade ouverte en plein écran sur la carte (depuis sa fiche, T-098) : ce qu’elle est, la revoir,
 * y placer des repères (R-059). Il se glisse vers le
 * bas comme le panneau des balades (même geste) : réduit, il garde le nom de la balade et la carte prend l’écran.
 */
export function WalkPanel({ source, name, date, route, color, replaying, onReplay, onAddMark, onClose, readOnly = false }: { readOnly?: boolean; source?: string; name: string; date: string; route: Route; color?: string; replaying: boolean; onReplay: () => void; /** R-059 : `visibleBottom` = le haut du panneau (la carte visible s’arrête là). */ onAddMark: (visibleBottom: number) => void; onClose: () => void }) {
  // R-091 : au cran du milieu, « Revoir la balade » et « Ajouter un repère » entiers, au-dessus du rond Accueil.
  const actionsEnd = useRef<HTMLButtonElement>(null)
  const sheet = useSheet({ halfRef: actionsEnd, bottomInset: HOME_CLEARANCE })
  const canMark = !readOnly && route.points.length > 0
  const stats = [
    { value: formatRouteDistance(route.distanceM), label: 'Distance' },
    { value: route.durationMin ? (route.source ? formatDuration(route.durationMin) : durationLabel(route.durationMin)) : '', label: 'Durée' },
    { value: route.moments.length ? String(route.moments.length) : '', label: route.moments.length > 1 ? 'Repères' : 'Repère' },
  ]
  return (
    <section
      ref={sheet.ref}
      aria-label={name}
      {...sheet.handlers}
      style={sheet.style}
      className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+62px)] bottom-0 z-10 mx-auto flex max-w-[430px] flex-col gap-2.5 rounded-t-[26px] bg-surface px-5 pt-2 shadow-[0_-4px_18px_rgba(24,32,30,0.18)]"
    >
      <button type="button" onClick={sheet.cycle} aria-expanded={!sheet.collapsed} aria-label={sheet.handleLabel} className="mx-auto -mb-2 flex min-h-11 w-24 shrink-0 touch-none items-center justify-center border-0 bg-transparent">
        {sheet.snap === 'full' ? (
          <svg width="28" height="14" viewBox="0 0 28 14" aria-hidden="true">
            <path d="M3 3l11 8 11-8" fill="none" stroke="#7D8783" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="h-1.5 w-11 rounded-full bg-line-strong" />
        )}
      </button>
      {/* T-098 : la carte en plein écran s’ouvre depuis la fiche de la balade ; le retour y ramène. */}
      <div className="flex shrink-0 items-center">
        <BackLink label="Sa fiche" onClick={onClose} />
      </div>
      <h1 className="flex shrink-0 items-center gap-2.5 title-section">
        {color && <span className="h-1.5 w-6 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />}
        {name}
      </h1>
      {/* Réduit, le panneau ne garde que ce qui précède (le nom) : la suite glisse sous la barre. */}
      <div ref={sheet.bodyRef} onScroll={sheet.onBodyScroll} className={`-mx-5 flex min-h-0 flex-1 flex-col gap-2.5 overscroll-contain px-5 pb-9 [&>*]:shrink-0 ${sheet.snap === 'full' ? 'overflow-y-auto' : 'overflow-y-hidden'}`} aria-hidden={sheet.collapsed || undefined} inert={sheet.collapsed || undefined}>
        <p className="text-[0.8824rem] text-muted">{formatLong(date)}</p>
        <Stats items={stats} />
        {/* R-092 : la même étiquette que dans la liste et sur la fiche. */}
        <p className="source-note">Source{'\u00a0'}: {walkSourceLabel(source, route.source)}</p>
        <p className="text-[0.8824rem] text-[#3F4946]">{readOnly ? 'Touchez une autre balade pour l’ouvrir.' : 'Touchez le tracé pour ajouter un repère, une autre balade pour l’ouvrir.'}</p>
        {route.points.length > 1 && (
          <button ref={canMark ? undefined : actionsEnd} type="button" onClick={onReplay} className="btn btn-main min-h-[52px] gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              {replaying ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
            </svg>
            {replaying ? 'Arrêter' : 'Revoir la balade'}
          </button>
        )}
        {/* R-059 : la même chose que toucher le tracé, sans viser (VoiceOver, Switch Control). */}
        {canMark && (
          <button ref={actionsEnd} type="button" onClick={() => onAddMark(sheet.ref.current?.getBoundingClientRect().top ?? window.innerHeight)} className={`${outlineButton} gap-2`}>
            <PinIcon size={20} />
            Ajouter un repère
          </button>
        )}
      </div>
    </section>
  )
}
