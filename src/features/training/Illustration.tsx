import type { ReactNode } from 'react'

// Petites scènes dessinées à partir des mêmes pièces : un chien (debout, assis, couché), un maître, une friandise.
// Volontairement très simples : elles montrent le geste, le texte donne le détail.

const FUR = '#C98B4E'
const FUR_DARK = '#8A5A2B'
const INK = '#18201E'
const PERSON = '#1E5A50'
const TREAT = '#D9661F'
const GROUND = 96

export type Pose = 'debout' | 'assis' | 'couche'

function Dog({ pose, x, flip = false, fur = FUR, dark = FUR_DARK, pawUp = false }: { pose: Pose; x: number; flip?: boolean; fur?: string; dark?: string; pawUp?: boolean }) {
  const head = (cx: number, cy: number) => (
    <>
      <circle cx={cx} cy={cy} r="11" fill={fur} />
      <rect x={cx + 4} y={cy - 1} width="14" height="9" rx="4.5" fill={fur} />
      <ellipse cx={cx - 5} cy={cy - 2} rx="5" ry="10" fill={dark} transform={`rotate(15 ${cx - 5} ${cy - 2})`} />
      <circle cx={cx + 17} cy={cy + 2} r="2" fill={INK} />
      <circle cx={cx + 3} cy={cy - 3} r="1.6" fill={INK} />
    </>
  )
  const tail = (d: string) => <path d={d} fill="none" stroke={fur} strokeWidth="5" strokeLinecap="round" />
  let body: ReactNode
  if (pose === 'debout') {
    body = (
      <>
        <rect x="-14" y="-22" width="6" height="22" rx="3" fill={dark} />
        <rect x="20" y="-22" width="6" height="22" rx="3" fill={dark} />
        {tail('M-24,-32 q-10,-6 -10,-16')}
        <rect x="-26" y="-38" width="54" height="22" rx="11" fill={fur} />
        <rect x="-22" y="-22" width="6" height="22" rx="3" fill={fur} />
        <rect x="12" y="-22" width="6" height="22" rx="3" fill={fur} />
        {head(30, -44)}
      </>
    )
  } else if (pose === 'assis') {
    body = (
      <>
        {tail('M-20,-6 q-10,0 -14,-7')}
        <ellipse cx="-8" cy="-10" rx="14" ry="10" fill={fur} />
        <ellipse cx="2" cy="-28" rx="12" ry="20" fill={fur} transform="rotate(18 2 -28)" />
        {pawUp ? <rect x="8" y="-30" width="22" height="6" rx="3" fill={fur} transform="rotate(-12 8 -27)" /> : <rect x="8" y="-26" width="6" height="26" rx="3" fill={fur} />}
        <rect x="1" y="-22" width="6" height="22" rx="3" fill={dark} />
        {head(12, -52)}
      </>
    )
  } else {
    body = (
      <>
        {tail('M-26,-8 q-10,2 -14,-3')}
        <rect x="-28" y="-18" width="52" height="18" rx="9" fill={fur} />
        <rect x="14" y="-6" width="22" height="6" rx="3" fill={dark} />
        {head(26, -24)}
      </>
    )
  }
  return <g transform={`translate(${x} ${GROUND}) ${flip ? 'scale(-1 1)' : ''}`}>{body}</g>
}

/** Maître vu de profil ; `hand` est la position de sa main dans la scène. */
function Person({ x, hand }: { x: number; hand?: [number, number] }) {
  return (
    <g>
      {hand && <line x1={x - 2} y1={GROUND - 58} x2={hand[0]} y2={hand[1]} stroke={PERSON} strokeWidth="5" strokeLinecap="round" />}
      <rect x={x - 7} y={GROUND - 36} width="6" height="36" rx="3" fill={PERSON} />
      <rect x={x + 1} y={GROUND - 36} width="6" height="36" rx="3" fill={PERSON} />
      <rect x={x - 7} y={GROUND - 68} width="14" height="36" rx="7" fill={PERSON} />
      <circle cx={x} cy={GROUND - 78} r="8" fill={PERSON} />
      {hand && <circle cx={hand[0]} cy={hand[1]} r="4" fill={PERSON} />}
    </g>
  )
}

const Treat = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r="4" fill={TREAT} stroke="#FFFFFF" strokeWidth="1.5" />

function Arrow({ d, dashed = false, both = false }: { d: string; dashed?: boolean; both?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={INK}
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray={dashed ? '4 4' : undefined}
      markerEnd="url(#fleche)"
      markerStart={both ? 'url(#fleche-debut)' : undefined}
    />
  )
}

const Gaze = ({ from, to }: { from: [number, number]; to: [number, number] }) => (
  <line x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={TREAT} strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
)

const Palm = ({ x, y }: { x: number; y: number }) => <rect x={x - 5} y={y - 8} width="10" height="14" rx="4" fill={PERSON} stroke="#FFFFFF" strokeWidth="1.5" />

const Snow = ({ x, y }: { x: number; y: number }) => (
  <g stroke="#2559A8" strokeWidth="2" strokeLinecap="round">
    <line x1={x - 7} y1={y} x2={x + 7} y2={y} />
    <line x1={x - 3.5} y1={y - 6} x2={x + 3.5} y2={y + 6} />
    <line x1={x + 3.5} y1={y - 6} x2={x - 3.5} y2={y + 6} />
  </g>
)

const SCENES: Record<string, () => ReactNode> = {
  nom: () => (
    <>
      <Dog pose="debout" x={62} />
      <Person x={152} />
      <rect x="92" y="10" width="52" height="22" rx="11" fill="#FFFFFF" stroke={PERSON} strokeWidth="1.5" />
      <text x="118" y="25" textAnchor="middle" fontSize="12" fontWeight="700" fill={PERSON}>
        Billy !
      </text>
      <Gaze from={[98, 48]} to={[144, 22]} />
    </>
  ),
  regard: () => (
    <>
      <Dog pose="assis" x={70} />
      <Person x={140} />
      <Gaze from={[88, 40]} to={[132, 20]} />
    </>
  ),
  assis: () => (
    <>
      <Dog pose="assis" x={72} />
      <Person x={148} hand={[104, 30]} />
      <Treat x={100} y={30} />
      <Arrow d="M94,22 q-12,-10 -24,-2" />
    </>
  ),
  couche: () => (
    <>
      <Dog pose="couche" x={66} />
      <Person x={156} hand={[122, 84]} />
      <Treat x={118} y={88} />
      <Arrow d="M118,46 v28" />
    </>
  ),
  'pas-bouger': () => (
    <>
      <Dog pose="assis" x={40} />
      <Person x={166} hand={[150, 34]} />
      <Palm x={150} y={32} />
      <Arrow d="M72,104 h70" dashed both />
    </>
  ),
  stop: () => (
    <>
      <Dog pose="debout" x={44} />
      <Person x={170} hand={[154, 30]} />
      <Palm x={154} y={28} />
      <Arrow d="M96,104 h48" dashed both />
    </>
  ),
  rappel: () => (
    <>
      <path d="M12,60 h14 M8,72 h16" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <Dog pose="debout" x={62} />
      <Person x={168} hand={[150, 62]} />
      <Arrow d="M112,40 h30" />
    </>
  ),
  laisse: () => (
    <>
      <Dog pose="debout" x={70} />
      <Person x={136} hand={[124, 52]} />
      <path d="M124,52 Q118,84 102,60" fill="none" stroke={TREAT} strokeWidth="2.5" strokeLinecap="round" />
      <Arrow d="M150,104 h32" />
    </>
  ),
  pied: () => (
    <>
      <Dog pose="debout" x={86} />
      <Person x={138} hand={[126, 58]} />
      <Treat x={124} y={62} />
      <Arrow d="M156,104 h30" />
    </>
  ),
  lache: () => (
    <>
      <Dog pose="debout" x={58} />
      <path d="M108,56 h18" stroke="#7B4FC9" strokeWidth="6" strokeLinecap="round" />
      <Person x={166} hand={[146, 46]} />
      <Treat x={142} y={46} />
      <Arrow d="M112,28 q16,-10 30,2" both />
    </>
  ),
  'pas-toucher': () => (
    <>
      <Dog pose="assis" x={48} />
      <Treat x={118} y={90} />
      <circle cx="118" cy="90" r="11" fill="none" stroke="#B3261E" strokeWidth="2.5" />
      <line x1="110" y1="98" x2="126" y2="82" stroke="#B3261E" strokeWidth="2.5" strokeLinecap="round" />
      <Person x={168} />
      <Gaze from={[66, 40]} to={[160, 22]} />
    </>
  ),
  attends: () => (
    <>
      <Dog pose="assis" x={44} />
      <path d="M102,86 h30 l-4,10 h-22 z" fill="#2F6FD0" />
      <Person x={168} hand={[152, 36]} />
      <Palm x={152} y={34} />
    </>
  ),
  patte: () => (
    <>
      <Dog pose="assis" x={72} pawUp />
      <Person x={150} hand={[110, 66]} />
    </>
  ),
  manipulations: () => (
    <>
      <Dog pose="assis" x={72} />
      <Person x={150} hand={[90, 88]} />
      <Treat x={112} y={40} />
    </>
  ),
  touche: () => (
    <>
      <Dog pose="debout" x={64} />
      <Person x={160} hand={[122, 54]} />
      <Palm x={120} y={54} />
    </>
  ),
  tourne: () => (
    <>
      <Dog pose="debout" x={86} />
      <Person x={166} hand={[138, 46]} />
      <Treat x={134} y={46} />
      <Arrow d="M128,30 a34,20 0 1 0 -8,34" dashed />
    </>
  ),
  dehors: () => (
    <>
      <circle cx="170" cy="24" r="12" fill="#F4C27A" />
      <rect x="10" y="26" width="30" height="70" rx="3" fill="#FFFFFF" stroke={PERSON} strokeWidth="2" />
      <circle cx="34" cy="62" r="2" fill={PERSON} />
      <Dog pose="debout" x={104} />
      <path d="M60,96 l3,-9 l3,9 M150,96 l3,-9 l3,9 M172,96 l3,-9 l3,9" fill="none" stroke={PERSON} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  nuit: () => (
    <>
      <path d="M168,14 a12,12 0 1 0 10,20 a10,10 0 0 1 -10,-20" fill="#F4C27A" />
      <path d="M52,82 q48,26 96,0 v8 q-48,16 -96,0 z" fill="#7B4FC9" />
      <Dog pose="couche" x={98} />
    </>
  ),
  seul: () => (
    <>
      <rect x="150" y="22" width="34" height="74" rx="3" fill="#FFFFFF" stroke={PERSON} strokeWidth="2" />
      <circle cx="157" cy="60" r="2" fill={PERSON} />
      <path d="M32,82 q44,26 88,0 v8 q-44,16 -88,0 z" fill="#7B4FC9" />
      <Dog pose="couche" x={74} />
    </>
  ),
  panier: () => (
    <>
      <path d="M72,82 q48,26 96,0 v8 q-48,16 -96,0 z" fill="#7B4FC9" />
      <Dog pose="couche" x={118} />
      <Arrow d="M14,56 q24,-18 44,6" />
    </>
  ),
  chiens: () => (
    <>
      <Dog pose="debout" x={44} />
      <Dog pose="debout" x={158} flip fur="#8C9692" dark="#5A6662" />
    </>
  ),
  bruits: () => (
    <>
      <Dog pose="assis" x={44} />
      <path d="M160,50 q-10,12 0,24 M170,42 q-18,20 0,40 M180,34 q-26,28 0,56" fill="none" stroke="#B3261E" strokeWidth="2.5" strokeLinecap="round" />
      <Arrow d="M74,104 h72" dashed both />
    </>
  ),
  voiture: () => (
    <>
      <path d="M40,84 v-18 q0,-8 8,-8 h20 l14,-22 h50 l16,22 h14 q8,0 8,8 v18 z" fill={PERSON} />
      <path d="M88,42 h38 l10,16 h-58 z" fill="#DCEBE6" />
      <g transform="translate(42 0.5) scale(0.62)">
        <Dog pose="couche" x={100} />
      </g>
      <circle cx="74" cy="86" r="10" fill={INK} />
      <circle cx="146" cy="86" r="10" fill={INK} />
    </>
  ),
  traverse: () => (
    <>
      <rect x="112" y="96" width="88" height="14" fill="#8C9692" />
      <path d="M124,103 h14 M150,103 h14 M176,103 h14" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <line x1="112" y1="60" x2="112" y2="110" stroke="#B3261E" strokeWidth="3" strokeDasharray="5 5" />
      <Dog pose="assis" x={48} />
      <Person x={92} />
      <Arrow d="M122,70 h60" dashed />
    </>
  ),
  flair: () => (
    <>
      <Dog pose="debout" x={58} />
      <path d="M112,90 q24,-18 48,0 q-24,10 -48,0" fill="#DCEBE6" stroke={PERSON} strokeWidth="1.5" />
      <Treat x={126} y={88} />
      <Treat x={146} y={90} />
      <Treat x={178} y={92} />
    </>
  ),
  gobelets: () => (
    <>
      <Dog pose="assis" x={44} />
      {[104, 136, 168].map((x) => (
        <path key={x} d={`M${x - 10},94 l4,-28 h12 l4,28 z`} fill="#2F6FD0" />
      ))}
      <Treat x={136} y={54} />
      <Arrow d="M136,36 v10" />
    </>
  ),
  parcours: () => (
    <>
      <Dog pose="debout" x={50} />
      <rect x="104" y="86" width="26" height="10" rx="5" fill="#7B4FC9" />
      <path d="M150,96 v-26 h30 v26" fill="none" stroke={TREAT} strokeWidth="4" strokeLinejoin="round" />
      <Arrow d="M98,62 q20,-22 40,0" dashed />
    </>
  ),
  'ping-pong': () => (
    <>
      <Person x={22} />
      <Dog pose="debout" x={96} />
      <Person x={178} />
      <Arrow d="M48,24 h104" dashed both />
    </>
  ),
  macher: () => (
    <>
      <Dog pose="couche" x={78} />
      <path d="M120,92 l30,-6 q8,2 0,8 z" fill={TREAT} />
      <path d="M150,86 l8,-8 M152,90 l11,-3" stroke={PERSON} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  'macher-froid': () => (
    <>
      <Dog pose="couche" x={78} />
      <path d="M120,92 l30,-6 q8,2 0,8 z" fill={TREAT} />
      <path d="M150,86 l8,-8 M152,90 l11,-3" stroke={PERSON} strokeWidth="2.5" strokeLinecap="round" />
      <Snow x={172} y={30} />
      <Snow x={150} y={48} />
    </>
  ),
}

export const hasScene = (scene: string) => scene in SCENES

/** Illustration d'un exercice, d'un jeu ou d'une chose à mâcher. Décorative : le texte dit la même chose. */
export function Illustration({ scene, className = '' }: { scene: string; className?: string }) {
  const draw = SCENES[scene]
  if (!draw) return null
  return (
    <svg viewBox="0 0 200 112" aria-hidden="true" className={`block w-full rounded-field bg-bg ${className}`}>
      <defs>
        <marker id="fleche" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M1,1 L9,5 L1,9" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
        <marker id="fleche-debut" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M9,1 L1,5 L9,9" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <line x1="0" y1={GROUND} x2="200" y2={GROUND} stroke="#D3D9D6" strokeWidth="2" />
      {draw()}
    </svg>
  )
}
