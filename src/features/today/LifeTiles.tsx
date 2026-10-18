import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PawIcon } from '../../components/Icons'
import { auth } from '../../firebase/app'
import { watchMembers } from '../../firebase/community'
import { useData } from '../../firebase/store'
import { activeSkills } from '../../lib/active'
import { balance } from '../../lib/bones'
import { communeAt } from '../../lib/commune'
import { healthTile, memoriesTile, progressTile, walksTile } from '../../lib/dashboard'
import { discoveredShare, inPolygon, knownFog, shareLabel } from '../../lib/fog'
import { useToday } from '../../lib/useToday'
import { walkItems } from '../../lib/walkList'

const STROKE = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** Les icônes des tuiles (traits, comme le reste de l’app). */
const ICONS = {
  progres: (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#1E5A50" {...STROKE} aria-hidden="true">
      <path d="M12 22V12" />
      <path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7z" />
      <path d="M12 15c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z" />
    </svg>
  ),
  balades: (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#2559A8" {...STROKE} aria-hidden="true">
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14" />
      <path d="M15 6v14" />
    </svg>
  ),
  sante: (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#B34A10" {...STROKE} aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  ),
  souvenirs: (
    <svg width="24" height="24" viewBox="0 0 24 24" stroke="#8A6514" {...STROKE} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-8 8" />
    </svg>
  ),
  boutique: (
    <svg width="22" height="22" viewBox="0 0 24 24" stroke="#8A6514" {...STROKE} aria-hidden="true">
      <path d="M4 9h16l-1.5 10h-13z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  ),
  meute: (
    <svg width="22" height="22" viewBox="0 0 24 24" stroke="#1E5A50" {...STROKE} aria-hidden="true">
      <circle cx="8" cy="9" r="3" />
      <circle cx="17" cy="10" r="2.5" />
      <path d="M3 19c0-3 2.5-5 5-5s5 2 5 5" />
      <path d="M14 19c0-2 1.5-4 3-4s4 2 4 4" />
    </svg>
  ),
}

function Tile({ to, icon, tint, title, text, detail, detailColor, children }: { to: string; icon: React.ReactNode; tint: string; title: string; text: string; detail?: string; detailColor: string; children?: React.ReactNode }) {
  return (
    <Link to={to} className="card tap flex min-h-[150px] flex-col gap-1.5 rounded-[22px] p-4 text-text no-underline">
      <span className="flex size-11 items-center justify-center rounded-[14px]" style={{ background: tint }}>
        {icon}
      </span>
      <span className="mt-1 text-[17px] font-extrabold">{title}</span>
      <span className="text-[15px] leading-snug text-[#3F4946]">{text}</span>
      {children}
      {detail && (
        <span className="mt-auto text-[14px] leading-snug font-bold" style={{ color: detailColor }}>
          {detail}
        </span>
      )}
    </Link>
  )
}

/** « Sa vie avec vous » (T-031) : 4 tuiles vivantes, puis la boutique et la meute. Chaque tuile ouvre son écran. */
export function LifeTiles() {
  const { dog, bossProgress, entries, events, bones, fog, communes } = useData()
  const today = useToday()
  const [friends, setFriends] = useState(0)
  useEffect(() => watchMembers((members) => setFriends(members.filter((m) => m.id !== auth.currentUser?.uid).length)), [])

  const walks = useMemo(() => walkItems(entries), [entries])
  // La part découverte de la commune de la dernière balade, si son contour est déjà connu (la carte le demande).
  const share = useMemo(() => {
    const start = walks[0]?.route.points[0]
    const commune = start ? communeAt(communes, { lat: start[0], lng: start[1] }, inPolygon) : undefined
    return commune ? shareLabel(discoveredShare(knownFog(fog), commune), commune.name) : undefined
  }, [walks, communes, fog])

  const active = activeSkills(dog.activeSkills, dog.traits ?? [], bossProgress)
  const progress = progressTile(active, Object.fromEntries(active.map((id) => [id, bossProgress[id]?.level])))
  const balades = walksTile(walks.map((w) => w.route), share)
  const sante = healthTile(events, today)
  const souvenirs = memoriesTile(entries, today)

  return (
    <>
      <h2 className="mt-1 font-display text-[20px] font-extrabold">Sa vie avec vous</h2>
      <div className="grid grid-cols-2 gap-3">
        <Tile to="/billy" icon={ICONS.progres} tint="#DCEBE6" title="Ses progrès" text={progress.text} detail={progress.detail} detailColor="#1E5A50">
          {progress.paws > 0 && (
            <span role="img" aria-label={`Déjà ${progress.paws} étape${progress.paws > 1 ? 's' : ''} franchie${progress.paws > 1 ? 's' : ''}`} className="mt-auto flex gap-1">
              {Array.from({ length: 5 }, (_, k) => (
                <PawIcon key={k} size={18} color={k < progress.paws ? '#1E5A50' : '#D3D9D6'} />
              ))}
            </span>
          )}
        </Tile>
        <Tile to={walks.length ? '/territoire' : '/importer'} icon={ICONS.balades} tint="#E3EAF8" title="Ses balades" text={balades.text} detail={balades.detail} detailColor="#2559A8" />
        <Tile to="/sante" icon={ICONS.sante} tint="#FBE6D4" title="Sa santé" text={sante.text} detail={sante.detail} detailColor={sante.late ? '#B3261E' : '#B34A10'} />
        <Tile to={souvenirs.count ? '/balades' : '/noter'} icon={ICONS.souvenirs} tint="#FCEFD3" title="Ses souvenirs" text={souvenirs.text} detail={souvenirs.detail} detailColor="#6B4E0E" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/boutique" className="card tap flex min-h-[60px] items-center gap-2.5 rounded-[18px] px-3.5 py-3 text-text no-underline">
          {ICONS.boutique}
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-extrabold">La boutique</span>
            <span className="text-[13px] text-[#3F4946]">{balance(bones)} os à dépenser</span>
          </span>
        </Link>
        <Link to="/meute" className="card tap flex min-h-[60px] items-center gap-2.5 rounded-[18px] px-3.5 py-3 text-text no-underline">
          {ICONS.meute}
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] font-extrabold">La meute</span>
            <span className="text-[13px] text-[#3F4946]">{friends ? `${friends} ami${friends > 1 ? 's' : ''} · les spots` : 'Les spots et les amis'}</span>
          </span>
        </Link>
      </div>
    </>
  )
}
