import { describe, expect, it } from 'vitest'
import { dailyQuest } from './quest'

// Le 18 octobre 2026 est un dimanche : le jour du repos de la semaine.
const SUNDAY = '2026-10-18'
const ctx = { today: SUNDAY, active: ['rappel'], progress: {}, moments: [], rests: [] }

describe('jour de repos (audit R-011)', () => {
  it('jamais imposé les 3 premiers jours d’un compte', () => {
    expect(dailyQuest({ ...ctx, firstDay: SUNDAY }).kind).not.toBe('repos')
    expect(dailyQuest({ ...ctx, firstDay: '2026-10-16' }).kind).not.toBe('repos')
  })
  it('le dimanche ensuite, s’il n’y a pas eu de repos dans la semaine', () => {
    expect(dailyQuest({ ...ctx, firstDay: '2026-10-01' }).kind).toBe('repos')
  })
})
