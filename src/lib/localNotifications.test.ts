import { describe, expect, it } from 'vitest'
import { DEFAULT_NOTIFICATION_PREFS, MAX_PENDING, notificationId, planNotifications, readPrefs } from './localNotifications'
import { DEFAULT_WALK_TIMES } from './walks'

// Lundi 19 octobre 2026, 10 h (heure du téléphone).
const now = new Date(2026, 9, 19, 10, 0)
const base = { now, dogName: 'Oslo', events: [], times: DEFAULT_WALK_TIMES, doneToday: {}, prefs: DEFAULT_NOTIFICATION_PREFS }
const local = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`

describe('notifications locales de l’app iOS (T-042)', () => {
  it('un soin : la veille à 18 h, « Vermifuge demain »', () => {
    const events = [
      { id: 'v', title: 'Vermifuge', type: 'vermifuge', date: '2026-10-22', done: false },
      { id: 'r', title: 'RDV vétérinaire', type: 'veto', date: '2026-10-25', done: false, time: '09:30' },
      { id: 'fait', title: 'Vaccin', type: 'vaccin', date: '2026-10-23', done: true },
      { id: 'loin', title: 'Vaccin', type: 'vaccin', date: '2026-12-01', done: false },
      { id: 'etape', title: '6 mois', type: 'etape', date: '2026-10-24', done: false },
    ]
    const plan = planNotifications({ ...base, events })
    expect(plan.map((n) => [n.kind, local(n.at), n.title, n.body])).toEqual([
      ['soin', '2026-10-21 18:00', 'Vermifuge demain', 'Pour Oslo.'],
      ['soin', '2026-10-24 18:00', 'RDV vétérinaire demain', 'Pour Oslo, à 9 h 30.'],
      ['recap', '2026-10-25 18:00', 'La semaine d’Oslo', 'Ses balades, ses progrès et ses souvenirs de la semaine.'],
      ['recap', '2026-11-01 18:00', 'La semaine d’Oslo', 'Ses balades, ses progrès et ses souvenirs de la semaine.'],
    ])
  })

  it('un soin de demain dont la veille 18 h est déjà passée n’est pas annoncé', () => {
    const late = new Date(2026, 9, 19, 19, 0)
    const plan = planNotifications({ ...base, now: late, events: [{ id: 'v', title: 'Vermifuge', type: 'vermifuge', date: '2026-10-20', done: false }] })
    expect(plan.filter((n) => n.kind === 'soin')).toEqual([])
  })

  it('les sorties : 15 min avant, jamais une sortie déjà notée, coupées par défaut', () => {
    expect(planNotifications(base).some((n) => n.kind === 'sortie')).toBe(false)
    const plan = planNotifications({ ...base, prefs: { ...DEFAULT_NOTIFICATION_PREFS, sortie: true }, doneToday: { midi: '12:50' } })
    const today = plan.filter((n) => n.kind === 'sortie' && n.at.getDate() === 19)
    // Le matin (7 h 45) est passé, midi est déjà notée : reste le soir.
    expect(today.map((n) => [local(n.at), n.title, n.body])).toEqual([['2026-10-19 18:45', 'La sortie du soir, dans 15\u00a0min', 'C’est bientôt l’heure de sortir avec Oslo.']])
  })

  it('jamais plus de 64 en attente (limite d’iOS), les plus proches d’abord', () => {
    const plan = planNotifications({ ...base, prefs: { soin: true, sortie: true, recap: true } })
    expect(plan.length).toBeLessThanOrEqual(MAX_PENDING)
    for (let i = 1; i < plan.length; i++) expect(plan[i]!.at.getTime()).toBeGreaterThanOrEqual(plan[i - 1]!.at.getTime())
  })

  it('aucun texte culpabilisant', () => {
    const plan = planNotifications({ ...base, prefs: { soin: true, sortie: true, recap: true }, events: [{ id: 'v', title: 'Vaccin', type: 'vaccin', date: '2026-10-21', done: false }] })
    for (const n of plan) expect(`${n.title} ${n.body}`).not.toMatch(/vous n’avez pas|oubli|retard|toujours pas/i)
  })

  it('identifiants entiers et stables ; réglages par défaut', () => {
    expect(notificationId('soin:v:2026-10-22')).toBe(notificationId('soin:v:2026-10-22'))
    expect(Number.isInteger(notificationId('x'))).toBe(true)
    expect(readPrefs({ sortie: true })).toEqual({ soin: true, sortie: true, recap: true })
    expect(readPrefs()).toEqual(DEFAULT_NOTIFICATION_PREFS)
  })
})
