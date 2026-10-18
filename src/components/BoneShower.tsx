import { BoneIcon } from './BoneIcon'

/** Une douzaine d’os qui jaillissent du centre (1 s) : directions fixes, pour une gerbe régulière. */
const BONES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
  const distance = 120 + (i % 3) * 40
  return { x: Math.round(Math.cos(angle) * distance), y: Math.round(Math.sin(angle) * distance + 60), rot: `${(i % 2 ? 1 : -1) * (90 + i * 20)}deg`, delay: `${(i % 4) * 40}ms` }
})

/** Fin de mission, nouvelle étape (T-033) : la gerbe d’os, par-dessus l’écran, sans bloquer les touchers. */
export function BoneShower() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {BONES.map((bone, i) => (
        <span key={i} className="shower-bone" style={{ ['--x' as string]: `${bone.x}px`, ['--y' as string]: `${bone.y}px`, ['--rot' as string]: bone.rot, ['--delay' as string]: bone.delay }}>
          <BoneIcon size={26} />
        </span>
      ))}
    </div>
  )
}
