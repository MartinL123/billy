import { NavLink, Outlet } from 'react-router-dom'
import { HeartIcon, HomeIcon, MapIcon, PlusIcon } from './Icons'

/** Hauteur de la barre (hors zone sûre) et dépassement du rond de l'accueil au-dessus d'elle. */
const BAR = 88
const HOME_RISE = 26

const side = (isActive: boolean) =>
  // Tous les libellés sur la même ligne de base que « Accueil » : contenu calé en bas, 14 px au-dessus du bord.
  `flex flex-col items-center justify-end gap-1 pb-[14px] text-[13px] no-underline ${isActive ? 'font-bold text-primary' : 'font-semibold text-[#3F4946]'}`

function SideTab({ to, label, icon, className = '' }: { to: string; label: string; icon: React.ReactNode; className?: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `${side(isActive)} ${className}`}>
      {({ isActive }) => (
        <>
          <span className={`flex h-8 w-[60px] items-center justify-center rounded-full ${isActive ? 'bg-primary-soft' : ''}`}>{icon}</span>
          <span className="max-w-full truncate px-1">{label}</span>
        </>
      )}
    </NavLink>
  )
}

/**
 * Balades · AUJOURD'HUI · Santé (spec V4 § 1). Aujourd'hui est au centre, en gros : un rond qui dépasse de la barre.
 * Le Carnet, Billy et la Meute restent ouverts depuis les écrans (photo de Billy, Balades), plus depuis la barre.
 */
function TabBar() {
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-[430px] grid-cols-3" style={{ height: BAR }}>
        <SideTab to="/territoire" label="Balades" icon={<MapIcon />} />
        <NavLink to="/" end aria-label="Aujourd'hui" className={({ isActive }) => `relative flex flex-col items-center justify-end gap-1 pb-[14px] text-[13px] no-underline ${isActive ? 'font-bold text-primary' : 'font-semibold text-[#3F4946]'}`}>
          {({ isActive }) => (
            <>
              <span
                aria-hidden="true"
                className={`absolute left-1/2 flex size-[66px] -translate-x-1/2 items-center justify-center rounded-full border-[5px] border-solid border-white bg-primary text-white ${isActive ? 'shadow-[0_6px_18px_rgba(30,90,80,0.45)]' : 'shadow-[0_3px_10px_rgba(24,32,30,0.18)]'}`}
                style={{ top: -HOME_RISE }}
              >
                <HomeIcon size={30} />
              </span>
              <span>Aujourd’hui</span>
            </>
          )}
        </NavLink>
        <SideTab to="/sante" label="Santé" icon={<HeartIcon />} />
      </div>
    </nav>
  )
}

/** Écrans à onglets : contenu défilant au-dessus de la barre fixe, jamais caché par le rond de l'accueil ni par le « + ». */
export function TabLayout() {
  return (
    <>
      <main className="mx-auto max-w-[430px] pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+200px)]">
        <Outlet />
      </main>
      <TabBar />
    </>
  )
}

// Le « + » reste au-dessus de la barre et du rond de l'accueil (88 px de barre + 16 px).
const fabClass =
  'fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+104px)] z-20 flex size-16 items-center justify-center rounded-full border-0 bg-primary text-white shadow-fab'

/** Action principale de l'écran, sous le pouce. */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={fabClass}>
      <PlusIcon size={28} strokeWidth={2.5} />
    </button>
  )
}
