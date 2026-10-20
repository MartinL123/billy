// R-056 : quand le texte est agrandi dans iOS, certains écrans se simplifient (V5 : l'illustration de la carte du
// moment disparaît d'abord, puis la ligne d'aide). La taille de base vaut 17 px par défaut, 19 en « Grand », 21 et
// 23 au-delà, puis 28 et plus dans les tailles d'accessibilité.

export type TextLevel = 'normal' | 'grand' | 'tres-grand'

/** Le niveau d'après la taille de base du texte (px). */
export function textLevel(basePx: number): TextLevel {
  if (basePx >= 26) return 'tres-grand'
  if (basePx >= 21) return 'grand'
  return 'normal'
}

/** Les classes posées sur <html> : « texte-grand » dès le niveau grand, « texte-tres-grand » en plus au-delà. */
export function textClasses(level: TextLevel): string[] {
  if (level === 'tres-grand') return ['texte-grand', 'texte-tres-grand']
  if (level === 'grand') return ['texte-grand']
  return []
}
