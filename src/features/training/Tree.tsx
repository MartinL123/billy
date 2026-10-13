import { useState } from 'react'
import { Link } from 'react-router-dom'
import { bossById, BOSSES, MAX_LEVEL, TIERS, type Boss } from '../../content/training'
import { levelOf, linkLit, type ProgressMap } from '../../lib/bossProgress'
import { WEATHER_LABEL, type Weather } from '../../lib/weather'
import { BossIcon, WeatherIcon } from './BossIcon'

// Ordre des boss dans chaque étage, choisi pour que les liens se croisent le moins possible.
const ORDER: Record<string, string[]> = {
  monde: ['congeneres', 'ville', 'rencontres'],
  quotidien: ['laisse', 'rappel', 'nouveaute', 'manieres'],
  fondations: ['lien', 'calme', 'soins'],
}

const WIDTH = 350
const ROW = 132
const HEIGHT = ROW * 3
const NODE_Y = 42

/** Centre de la pastille d'un boss, dans le repère 350 × 396 de l'arbre. */
function center(bossId: string): [number, number] {
  for (const [row, tier] of TIERS.entries()) {
    const ids = ORDER[tier.id]!
    const index = ids.indexOf(bossId)
    if (index >= 0) return [((index + 0.5) / ids.length) * WIDTH, row * ROW + NODE_Y]
  }
  return [0, 0]
}

// Un boss s'allume un peu plus à chaque palier acquis : 5 niveaux d'intensité.
const INTENSITY = ['bg-surface text-primary border-[#C9D1CD]', 'bg-[#DCEBE6] text-primary-dark border-[#DCEBE6]', 'bg-[#B4D3CB] text-primary-dark border-[#B4D3CB]', 'bg-[#7FB0A5] text-[#0C2B26] border-[#7FB0A5]', 'bg-[#3F7F73] text-white border-[#3F7F73]', 'bg-primary text-white border-primary']

const LINKS = BOSSES.flatMap((boss) => boss.recommends.flatMap((rec) => rec.requires.map((req) => ({ from: req, to: boss.id }))))

interface TreeProps {
  progress: ProgressMap
  weatherByBoss: Record<string, Weather | undefined>
  featured: string[]
}

/**
 * Arbre de compétences : 3 étages, aucun verrou. Les liens conseillés restent très discrets ;
 * ceux des boss conseillés sont visibles, et toucher un boss fait ressortir les siens.
 */
export function Tree({ progress, weatherByBoss, featured }: TreeProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const chosen = selected ? bossById(selected) : undefined
  const helps = chosen ? LINKS.filter((l) => l.from.bossId === chosen.id).map((l) => bossById(l.to)?.name) : []

  return (
    <div className="flex flex-col gap-3">
      <div className="relative w-full" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" className="absolute inset-0 size-full">
          {LINKS.map(({ from, to }) => {
            const [x1, y1] = center(from.bossId)
            const [x2, y2] = center(to)
            const lit = linkLit(progress, from)
            const strong = selected !== null && (to === selected || from.bossId === selected)
            const visible = strong || (selected === null && featured.includes(to))
            return (
              <line
                key={`${from.bossId}-${from.level}-${to}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strong ? '#1E5A50' : visible ? '#8C9692' : '#E6EAE7'}
                strokeWidth={strong ? 2 : 1}
                strokeDasharray={visible && !lit ? '4 4' : undefined}
                strokeLinecap="round"
              />
            )
          })}
        </svg>
        {TIERS.map((tier, row) => (
          <div key={tier.id} className="absolute inset-x-0" style={{ top: `${((row * ROW) / HEIGHT) * 100}%`, height: `${(ROW / HEIGHT) * 100}%` }}>
            <span className="absolute top-0 left-0 text-[11px] font-bold tracking-[0.6px] text-muted uppercase">{tier.label}</span>
            <div className="grid h-full pt-4" style={{ gridTemplateColumns: `repeat(${ORDER[tier.id]!.length}, minmax(0, 1fr))` }}>
              {ORDER[tier.id]!.map((id) => {
                const boss = BOSSES.find((b) => b.id === id) as Boss
                const level = levelOf(progress, id)
                const stars = progress[id]?.masteryPlaces.length ?? 0
                const weather = weatherByBoss[id]
                const isFeatured = featured.includes(id)
                const isSelected = id === selected
                const label = `${boss.name}, ${level} palier${level > 1 ? 's' : ''} acquis sur ${MAX_LEVEL}${stars ? `, ${stars} étoile${stars > 1 ? 's' : ''}` : ''}${weather ? `, météo ${WEATHER_LABEL[weather]}` : ''}${isFeatured ? ', conseillé' : ''}`
                return (
                  <button
                    key={id}
                    type="button"
                    aria-label={label}
                    aria-pressed={isSelected}
                    onClick={() => setSelected(isSelected ? null : id)}
                    className="flex min-h-11 flex-col items-center gap-1 border-0 bg-transparent p-0 text-text"
                  >
                    <span className="relative">
                      <span className={`flex size-[52px] items-center justify-center rounded-full border-2 border-solid ${INTENSITY[level]} ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                        <BossIcon bossId={id} size={26} />
                      </span>
                      {weather && (
                        <span className="absolute -top-1.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-surface text-text shadow-card">
                          <WeatherIcon weather={weather} size={16} />
                        </span>
                      )}
                    </span>
                    <span className={`max-w-full truncate rounded bg-surface px-0.5 text-[12px] leading-tight ${isSelected ? 'font-bold text-primary-dark' : 'font-semibold'}`}>{boss.short}</span>
                    <span className="flex items-center gap-[3px] rounded bg-surface px-0.5" aria-hidden="true">
                      {Array.from({ length: MAX_LEVEL }, (_, i) => (
                        <span key={i} className={`size-[7px] rounded-full ${i < level ? 'bg-primary' : 'bg-[#C9D1CD]'}`} />
                      ))}
                      {stars > 0 && <span className="ml-0.5 text-[11px] leading-none font-bold text-milestone-dark">★{stars}</span>}
                    </span>
                    {isFeatured && <span className="rounded-full bg-milestone-soft px-1.5 py-px text-[10px] leading-tight font-bold text-milestone-dark">Conseillé</span>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Détail du boss touché. La marge à droite laisse la place au bouton « + ». */}
      <div aria-live="polite" className="flex min-h-[88px] flex-col justify-center gap-2 border-t border-divider px-2 pt-3 pr-[76px]">
        {chosen ? (
          <>
            <p className="text-[15px] leading-snug">
              <span className="font-bold">{chosen.name}</span>
              <span className="text-muted"> · {levelOf(progress, chosen.id)} palier{levelOf(progress, chosen.id) > 1 ? 's' : ''} sur {MAX_LEVEL}</span>
            </p>
            <p className="text-[13px] leading-snug text-muted">
              {chosen.recommends.length
                ? chosen.recommends
                    .map((rec) => `P${rec.level} plus facile avec ${rec.requires.map((r) => `${bossById(r.bossId)?.name} P${r.level}`).join(' et ')}`)
                    .join('. ') + '.'
                : helps.length
                  ? `Il facilite : ${helps.join(', ')}.`
                  : 'Aucun lien conseillé.'}
            </p>
            <Link to={`/boss/${chosen.id}`} className="flex h-11 items-center self-start text-[15px] font-bold text-primary no-underline">
              Ouvrir la fiche
            </Link>
          </>
        ) : (
          <p className="text-[13px] leading-snug text-muted">Touche un boss pour voir ce qui l'aide, puis ouvrir sa fiche. Tous sont ouverts.</p>
        )}
      </div>
    </div>
  )
}
