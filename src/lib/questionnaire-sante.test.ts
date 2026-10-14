import { describe, expect, it } from 'vitest'
import { nextTrainerSession, sterilisationReminder, trainerSession } from './events'

describe('questionnaire : prochaine séance avec l’éducateur', () => {
  const today = '2026-10-14'
  it('crée le rendez-vous dans Santé, avec son nom et l’heure', () => {
    expect(trainerSession([], { date: '2026-10-20', time: '10:30', name: 'Claire' }, today)).toEqual({ title: 'Séance avec Claire', type: 'educateur', date: '2026-10-20', time: '10:30', recurrence: 'none', done: false })
    expect(trainerSession([], { date: '2026-10-20' }, today)?.title).toBe("Séance avec l'éducateur")
  })

  it('rien sans date, pour une date passée, ou si la séance existe déjà', () => {
    expect(trainerSession([], { date: '' }, today)).toBeUndefined()
    expect(trainerSession([], { date: '2026-10-01' }, today)).toBeUndefined()
    expect(trainerSession([{ type: 'educateur', date: '2026-10-20', done: false }], { date: '2026-10-20' }, today)).toBeUndefined()
  })

  it('retrouve la prochaine séance prévue', () => {
    const events = [
      { type: 'educateur', date: '2026-11-02', done: false },
      { type: 'educateur', date: '2026-10-20', time: '10:30', done: false },
      { type: 'educateur', date: '2026-10-01', done: false },
      { type: 'veto', date: '2026-10-15', done: false },
    ]
    expect(nextTrainerSession(events, today)).toMatchObject({ date: '2026-10-20', time: '10:30' })
  })
})

describe('questionnaire : stérilisation « C’est prévu »', () => {
  const today = '2026-10-14'
  it('avec une date : « Stérilisation » ce jour-là', () => {
    expect(sterilisationReminder([], '2026-11-05', '2026-05-13', today)).toEqual({ title: 'Stérilisation', type: 'veto', date: '2026-11-05', recurrence: 'none', done: false })
  })
  it('sans date : prendre rendez-vous à ses 6 mois, ou dans un mois s’il les a déjà', () => {
    expect(sterilisationReminder([], '', '2026-05-13', today)).toMatchObject({ title: 'Prendre rendez-vous pour la stérilisation', date: '2026-11-13' })
    expect(sterilisationReminder([], '', '2025-01-01', today)?.date).toBe('2026-11-13')
    expect(sterilisationReminder([], '', undefined, today)?.date).toBe('2026-11-13')
  })
  it('pas de doublon', () => {
    expect(sterilisationReminder([{ title: 'Stérilisation', done: false }], '', '2026-05-13', today)).toBeUndefined()
    expect(sterilisationReminder([{ title: 'Stérilisation', done: true }], '', '2026-05-13', today)).toBeDefined()
  })
})

