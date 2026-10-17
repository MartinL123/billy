/** Bouton 2D / 3D posé sur une carte (zone tactile 44 px). */
export function Map3DToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? 'Revenir à la carte à plat' : 'Voir en 3D'}
      onClick={() => onChange(!on)}
      className="absolute top-3 right-3 z-10 flex size-11 items-center justify-center rounded-full border-0 bg-surface text-[15px] font-extrabold text-text shadow-[0_2px_8px_rgba(24,32,30,0.25)]"
    >
      {on ? '2D' : '3D'}
    </button>
  )
}
