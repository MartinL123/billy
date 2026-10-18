import { describe, expect, it } from 'vitest'
import { lateLabel } from './events'

describe('soin en retard (audit R-002)', () => {
  it('dit de combien de jours', () => {
    expect(lateLabel('2026-08-10', '2026-10-18')).toBe('En retard de 69 jours')
    expect(lateLabel('2026-10-17', '2026-10-18')).toBe('En retard de 1 jour')
    expect(lateLabel('2026-10-18', '2026-10-18')).toBe('')
    expect(lateLabel('', '2026-10-18')).toBe('')
  })
})
