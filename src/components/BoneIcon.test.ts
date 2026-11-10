import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SHOW_BONES } from '../lib/bones'
import { BonesGained } from './BoneIcon'

describe('R-112 · os cachés', () => {
  it('un seul interrupteur, éteint', () => {
    expect(SHOW_BONES).toBe(false)
  })

  it('« +3 os » n’est plus affiché, le texte reste', () => {
    expect(renderToStaticMarkup(createElement(BonesGained, { label: 'Balade notée', amount: 3 }))).toBe('<span>Balade notée</span>')
    expect(renderToStaticMarkup(createElement(BonesGained, { amount: 3 }))).toBe('')
  })
})
