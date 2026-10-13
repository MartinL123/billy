import { Link } from 'react-router-dom'
import { BOSSES, MAX_LEVEL, TIERS, type Boss } from '../../content/training'
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

interface TreeProps {
  progress: ProgressMap
  weatherByBoss: Record<string, Weather | undefined>
  featured: string[]
}

/** Arbre de compétences : 3 étages, des liens conseillés en traits fins, aucun verrou. */
export function Tree({ progress, weatherByBoss, featured }: TreeProps) {
  const links = BOSSES.flatMap((boss) => boss.recommends.flatMap((rec) => rec.requires.map((req) => ({ from: req, to: boss.id }))))

  return (
    <div className="relative w-full" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" className="absolute inset-0 size-full">
        {links.map(({ from, to }) => {
          const [x1, y1] = center(from.bossId)
          const [x2, y2] = center(to)
          const lit = linkLit(progress, from)
          return (
            <line
              key={`${from.bossId}-${from.level}-${to}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={lit ? '#1E5A50' : '#C9D1CD'}
              strokeWidth={lit ? 1.75 : 1}
              strokeDasharray={lit ? undefined : '3 4'}
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
              const label = `${boss.name}, ${level} palier${level > 1 ? 's' : ''} acquis sur ${MAX_LEVEL}${stars ? `, ${stars} étoile${stars > 1 ? 's' : ''}` : ''}${weather ? `, météo ${WEATHER_LABEL[weather]}` : ''}${isFeatured ? ', conseillé' : ''}`
              return (
                <Link key={id} to={`/boss/${id}`} aria-label={label} className="flex min-h-11 flex-col items-center gap-1 text-text no-underline">
                  <span className="relative">
                    <span className={`flex size-[52px] items-center justify-center rounded-full border-2 border-solid ${INTENSITY[level]}`}>
                      <BossIcon bossId={id} size={26} />
                    </span>
                    {weather && (
                      <span className="absolute -top-1.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-surface text-text shadow-card">
                        <WeatherIcon weather={weather} size={16} />
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[12px] leading-tight font-semibold">{boss.short}</span>
                  <span className="flex items-center gap-[3px]" aria-hidden="true">
                    {Array.from({ length: MAX_LEVEL }, (_, i) => (
                      <span key={i} className={`size-[7px] rounded-full ${i < level ? 'bg-primary' : 'bg-[#C9D1CD]'}`} />
                    ))}
                    {stars > 0 && <span className="ml-0.5 text-[11px] leading-none font-bold text-milestone-dark">★{stars}</span>}
                  </span>
                  {isFeatured && <span className="rounded-full bg-milestone-soft px-1.5 py-px text-[10px] leading-tight font-bold text-milestone-dark">Conseillé</span>}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
