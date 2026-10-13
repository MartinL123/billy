import { NavLink, Outlet } from 'react-router-dom'
import { CalendarIcon, PhotoIcon, PlusIcon, SunIcon } from './Icons'

const TABS = [
  { to: '/', label: "Aujourd'hui", Icon: SunIcon },
  { to: '/calendrier', label: 'Calendrier', Icon: CalendarIcon },
  { to: '/journal', label: 'Journal', Icon: PhotoIcon },
]

function TabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 grid h-[calc(72px+env(safe-area-inset-bottom))] grid-cols-3 border-t border-divider bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 text-[13px] no-underline ${isActive ? 'font-bold text-primary' : 'font-medium text-muted'}`
          }
        >
          {({ isActive }) => (
            <>
              <span className={`flex h-[30px] w-14 items-center justify-center rounded-full ${isActive ? 'bg-primary-soft' : ''}`}>
                <Icon />
              </span>
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** Écrans à onglets : contenu défilant au-dessus de la barre fixe. */
export function TabLayout() {
  return (
    <>
      <main className="mx-auto max-w-[430px] pt-[calc(env(safe-area-inset-top)+24px)] pb-[calc(env(safe-area-inset-bottom)+176px)]">
        <Outlet />
      </main>
      <TabBar />
    </>
  )
}

const fabClass =
  'fixed right-5 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-20 flex size-16 items-center justify-center rounded-full border-0 bg-primary text-white shadow-fab'

/** Action principale de l'écran, sous le pouce. */
export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={fabClass}>
      <PlusIcon size={28} strokeWidth={2.5} />
    </button>
  )
}
