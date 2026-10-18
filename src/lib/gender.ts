// Accord au féminin (audit R-006) : pour une chienne, les textes qui parlent du chien passent au féminin.
// Les textes sont écrits au masculin ; on ne transforme que ceux qui parlent du chien (jamais ce que l’utilisateur a écrit).

/** « Femelle » dans le profil. */
export const isFemale = (sex: string | undefined) => (sex ?? '').trim().toLowerCase() === 'femelle'

// Participes et adjectifs qui s’accordent avec le chien, dans la phrase où il est le sujet.
const ADJECTIVES: [string, string][] = [
  ['content', 'contente'],
  ['détendu', 'détendue'],
  ['seul', 'seule'],
  ['prêt', 'prête'],
  ['habitué', 'habituée'],
  ['stérilisé', 'stérilisée'],
  ['vacciné', 'vaccinée'],
  ['craintif', 'craintive'],
  ['inquiet', 'inquiète'],
  ['assis', 'assise'],
  ['couché', 'couchée'],
  ['fatigué', 'fatiguée'],
  ['stressé', 'stressée'],
  ['occupé', 'occupée'],
  ['attaché', 'attachée'],
  ['joueur', 'joueuse'],
  ['peureux', 'peureuse'],
  ['curieux', 'curieuse'],
  ['heureux', 'heureuse'],
  ['excité', 'excitée'],
  ['âgé', 'âgée'],
  ['adopté', 'adoptée'],
  ['manipulé', 'manipulée'],
  ['né', 'née'],
  ['bloqué', 'bloquée'],
  ['rassuré', 'rassurée'],
  ['calmé', 'calmée'],
  ['allé', 'allée'],
  ['venu', 'venue'],
  ['revenu', 'revenue'],
  ['parti', 'partie'],
  ['passé', 'passée'],
]
const ADJ = new Map(ADJECTIVES)
const WORD = /[A-Za-zÀ-ÿ]+/g

// « il » impersonnel : il faut, il y a, il est 17 h, il reste 3 minutes…
const IMPERSONAL = /^\s+(faut|faudra|fallait|y\s|est\s+\d|reste\s+[\d$]|vaut|suffit|s’agit|s’agit|pleut|fait\s+(beau|froid|chaud|nuit|jour)|vous\s+rest)/i

const keepCase = (from: string, to: string) => (/^[A-ZÀ-Ý]/.test(from) ? to.replace(/^./, (c) => c.toLocaleUpperCase('fr')) : to)

/** Le même texte, au féminin : il → elle, qu’il → qu’elle, s’il → si elle, -t-il → -t-elle, et les accords qui suivent. */
export function feminize(text: string): string {
  let out = ''
  let i = 0
  // Chaque sujet « il » trouvé : on accorde la fin de sa phrase (jusqu’au prochain signe fort).
  const subject = /(\b[Ss]’il\b|\b[Ss]'il\b|\b[Qq]u’il\b|\b[Qq]u’il\b|-t-il\b|-il\b|\b[Ii]l\b)/g
  let m: RegExpExecArray | null
  while ((m = subject.exec(text))) {
    const word = m[0]
    const after = text.slice(m.index + word.length)
    const lower = word.toLowerCase()
    if ((lower === 'il' && IMPERSONAL.test(after)) || /^\s+vous\s+pla[iî]t/i.test(after)) continue
    out += text.slice(i, m.index)
    out += lower.startsWith('s') ? keepCase(word, 'si elle') : lower.startsWith('qu') ? word.slice(0, 3) + 'elle' : lower.startsWith('-t-') ? '-t-elle' : lower.startsWith('-') ? '-elle' : keepCase(word, 'elle')
    // La fin de la phrase : accords des adjectifs.
    // (jusqu’au prochain sujet « il » aussi, qui sera traité à son tour)
    const end = after.search(/[.;:!?\n]|\b[Ii]l\b|[’']il\b|-il\b/)
    const clause = end < 0 ? after : after.slice(0, end)
    out += clause.replace(WORD, (w) => (ADJ.has(w.toLowerCase()) ? keepCase(w, ADJ.get(w.toLowerCase())!) : w))
    i = m.index + word.length + clause.length
    subject.lastIndex = i
  }
  out += text.slice(i)
  return out
    .replace(/\bNé le\b/g, 'Née le')
    .replace(/\bné le\b/g, 'née le')
    .replace(/(?<![A-Za-zÀ-ÿ])(Stérilisé|Non stérilisé|Vacciné|Non vacciné|Adopté|Pucé)(?![A-Za-zÀ-ÿ])/g, (w) => `${w}e`)
    .replace(/l’avez-vous adopté(?![A-Za-zÀ-ÿ])/g, 'l’avez-vous adoptée')
}

/** Le texte accordé selon le sexe du chien (masculin par défaut, tel qu’il est écrit). */
export const forSex = (text: string, sex: string | undefined): string => (isFemale(sex) ? feminize(text) : text)

/** Un adjectif seul (« Détendu », « Inquiet »), accordé selon le sexe du chien. */
export const agree = (word: string, sex: string | undefined): string => {
  if (!isFemale(sex)) return word
  const fem = ADJ.get(word.toLowerCase())
  return fem ? keepCase(word, fem) : word
}

/**
 * « de » + un nom propre, avec élision (audit R-007) : « d’Oslo », « d’Hector », « d’Élise », mais « de Billy ».
 * Le « h » est traité comme muet (cas le plus courant pour un prénom).
 */
export const ofName = (name: string): string => (/^[aeiouyhàâäéèêëîïôöùûüœæAEIOUYHÀÂÄÉÈÊËÎÏÔÖÙÛÜŒÆ]/.test(name.trim()) && !/^[Yy][aeiouéèêàâôû]/.test(name.trim()) ? `d’${name}` : `de ${name}`)
