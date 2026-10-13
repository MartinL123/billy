export const SUGGESTED_TAGS = ['Progrès', 'Balade', 'Bretagne', 'Bêtise', 'Éducateur', 'Santé']

export function cleanTag(raw: string): string {
  const tag = raw.trim().replace(/\s+/g, ' ')
  return tag.charAt(0).toUpperCase() + tag.slice(1)
}

const key = (tag: string) => tag.toLocaleLowerCase('fr')

/** Tags suggérés puis tags libres déjà utilisés, sans doublon (casse ignorée). */
export function allTags(used: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const tag of [...SUGGESTED_TAGS, ...used]) {
    if (!tag || seen.has(key(tag))) continue
    seen.add(key(tag))
    out.push(tag)
  }
  return out
}

export const sameTag = (a: string, b: string) => key(a) === key(b)
