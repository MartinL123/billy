import { place } from './garden'
// La mission pas à pas (spec V4 § 3) : un écran par étape, découpé dans le « Comment faire » de l'exercice.
// Une consigne en gros, 2 lignes d'aide au plus ; la dernière étape lance le minuteur toute seule.

export interface MissionStep {
  /** La consigne, en gros. */
  title: string
  help?: string
  /** Durée en secondes : le minuteur se lance tout seul et passe à la suite à la fin. */
  seconds?: number
}

const capital = (text: string) => text.replace(/^./, (c) => c.toLocaleUpperCase('fr'))

/** « La laisse se tend : vous vous arrêtez. » → consigne « La laisse se tend », aide « Vous vous arrêtez. » */
function split(raw: string): MissionStep {
  // Le texte adapté au chien (sans jardin, au féminin pour une chienne).
  const step = place(raw)
  // Espace normale ou insécable avant les deux-points.
  const [head, ...rest] = step.split(/[ \u00a0]: /)
  if (!rest.length || head!.length > 60) return { title: step.replace(/\.$/, '') }
  return { title: head!, help: capital(rest.join('\u00a0: ')) }
}

export function missionSteps(steps: string[], minutes: number): MissionStep[] {
  return [
    ...steps.map(split),
    { title: `À vous : ${minutes} minute${minutes > 1 ? 's' : ''}`, help: 'Recommencez ces gestes en restant joyeux. Le minuteur s’arrête tout seul.', seconds: minutes * 60 },
  ]
}
