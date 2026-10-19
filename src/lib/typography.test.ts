import { parse } from '@babel/parser'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// R-055 : dans les textes de l'interface, une espace insécable (U+00A0) avant « ? ! : ; », pour qu'un « ? » ne passe
// jamais seul à la ligne. Ce test lit les chaînes et les textes JSX de src/ (pas le code : un « a ? b : c » ne compte
// pas) et signale « mot ? » écrit avec une espace normale.

const SRC = join(__dirname, '..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts') ? [path] : []
  })
}

interface Node {
  type: string
  start: number
  end: number
  [key: string]: unknown
}

/** Les textes d'un fichier : chaînes, morceaux de gabarits `…${…}…` et textes JSX, tels qu'écrits dans le code. */
function texts(source: string): string[] {
  const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] }) as unknown as { program: Node }
  const out: string[] = []
  const visit = (node: Node) => {
    if (node.type === 'ImportDeclaration' || node.type === 'ExportAllDeclaration') return
    if (node.type === 'StringLiteral' || node.type === 'TemplateElement' || node.type === 'JSXText') {
      // Le texte brut (sans les guillemets d'une chaîne) ; un gabarit commence juste après un ${…}.
      const raw = source.slice(node.start, node.end)
      out.push(node.type === 'StringLiteral' ? raw.slice(1, -1) : raw)
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((child) => child && typeof (child as Node).type === 'string' && visit(child as Node))
      else if (value && typeof value === 'object' && typeof (value as Node).type === 'string') visit(value as Node)
    }
  }
  visit(ast.program)
  return out
}

/** « mot ? » avec une espace normale, ou juste après une expression (« {nom} ? ») en début de texte. */
const LOOSE = /([^\s ]|^) ([?!:;])(?=[\s "'`<)\]}.,»]|$)/

describe('typographie française (R-055)', () => {
  it('ne lit que les textes, pas le code', () => {
    const source = "const a = ok ? 'Son nom ?' : `Bravo ${nom} !` // un commentaire : rien\nconst r = /\" ?/"
    expect(texts(source)).toEqual(['Son nom ?', 'Bravo ', ' !'])
  })

  it('une espace insécable avant « ? ! : ; » dans tous les textes de l’interface', () => {
    const faults: string[] = []
    for (const file of files(SRC)) {
      for (const text of texts(readFileSync(file, 'utf8'))) {
        // Des phrases seulement : les classes CSS (« hover:… ») n’ont pas d’espace avant les deux-points.
        if (LOOSE.test(text) && /[A-Za-zÀ-ÿ’]/.test(text)) faults.push(`${relative(SRC, file)} : « ${text.trim().slice(0, 60)} »`)
      }
    }
    expect(faults).toEqual([])
  })
})
