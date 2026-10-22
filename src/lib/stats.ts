/**
 * Composant Stats (V6 § 1) : sépare une valeur affichée de son unité finale, pour l’unité collée en plus petit.
 * « 2,1 km » → 2,1 + km · « 32 min » → 32 + min · « 4 % » → 4 + % · « 1 h 05 » reste entier (l’unité est au milieu).
 */
export function statParts(text: string): { value: string; unit?: string } {
  const match = /^(.*\d)[\s  ]+([^\d\s  ]+)$/.exec(text.trim())
  return match ? { value: match[1]!, unit: match[2]! } : { value: text.trim() }
}
