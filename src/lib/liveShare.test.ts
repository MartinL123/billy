import { describe, expect, it } from 'vitest'
import { activeShare, liveTrack, MAX_TRACK_POINTS, trackShown, tracksToClear, cleanProche, followLink, followSentence, followTokenFromHash, formatSince, isToken, liveExpired, newToken, pushDue, sharesToDelete, updatedSentence, walkLiveStatus, withNames } from './liveShare'

const NOW = Date.parse('2026-10-22T08:30:00+02:00')
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe('jeton et lien', () => {
  it('128 bits aléatoires en base64url', () => {
    const token = newToken()
    expect(token).toHaveLength(22)
    expect(isToken(token)).toBe(true)
    expect(newToken()).not.toBe(token)
    // Les octets 0xFB 0xFF donnent « + » et « / » en base64 : remplacés.
    expect(newToken((b) => b.fill(0xff))).toBe('_____________________w')
  })

  it('le lien part de l’adresse du site (dev, émulateurs, production)', () => {
    expect(followLink('abc', { origin: 'https://martinl123.github.io', pathname: '/billy/', protocol: 'https:' })).toBe('https://martinl123.github.io/billy/#/suivre/abc')
    expect(followLink('abc', { origin: 'http://127.0.0.1:4179', pathname: '/billy/', protocol: 'http:' })).toBe('http://127.0.0.1:4179/billy/#/suivre/abc')
    // Paquet de secours embarqué : le lien vise le site publié.
    expect(followLink('abc', { origin: 'capacitor://localhost', pathname: '/', protocol: 'capacitor:' })).toBe('https://martinl123.github.io/billy/#/suivre/abc')
  })

  it('lit le jeton de l’adresse', () => {
    const token = newToken()
    expect(followTokenFromHash(`#/suivre/${token}`)).toBe(token)
    expect(followTokenFromHash('#/suivre/court')).toBe('court')
    expect(followTokenFromHash('#/suivre/')).toBe('')
    expect(followTokenFromHash('#/balades')).toBeUndefined()
  })
})

describe('les phrases de la page « Suivre »', () => {
  const base = { dogName: 'Billy', startedAt: ago(23 * 60_000), distanceM: 1400, status: 'en cours' as const }
  it('en balade, avec ou sans prénom du maître', () => {
    expect(followSentence({ ...base, ownerName: 'Martin' }, NOW)).toBe('Billy et Martin sont en balade depuis 23 min · 1,4 km')
    expect(followSentence(base, NOW)).toBe('Billy est en balade depuis 23 min · 1,4 km')
    expect(followSentence({ ...base, startedAt: ago(65 * 60_000) }, NOW)).toBe('Billy est en balade depuis 1 h 05 · 1,4 km')
    expect(followSentence({ ...base, status: 'pause' }, NOW)).toBe('Balade en pause · 23 min · 1,4 km')
  })

  it('terminée, avec l’heure', () => {
    expect(followSentence({ ...base, status: 'terminée', endsAt: '2026-10-22T08:44:00+02:00' }, NOW)).toBe('Balade terminée à 8 h 44')
  })

  it('« Mis à jour il y a 40 s »', () => {
    expect(updatedSentence(ago(2000), NOW)).toBe('Mis à jour à l’instant')
    expect(updatedSentence(ago(40_000), NOW)).toBe('Mis à jour il y a 40 s')
    expect(updatedSentence(ago(3 * 60_000), NOW)).toBe('Mis à jour il y a 3 min')
    expect(updatedSentence('2026-10-22T06:12:00+02:00', NOW)).toBe('Mis à jour à 6 h 12')
  })

  it('durées', () => {
    expect(formatSince(59_000)).toBe('0 min')
    expect(formatSince(120 * 60_000)).toBe('2 h 00')
  })

  it('expiré 24 h après la fin', () => {
    expect(liveExpired({ updatedAt: ago(3600_000), endsAt: ago(3600_000) }, NOW)).toBe(false)
    expect(liveExpired({ updatedAt: ago(25 * 3600_000), endsAt: ago(24 * 3600_000) }, NOW)).toBe(true)
    expect(liveExpired({ updatedAt: ago(25 * 3600_000) }, NOW)).toBe(true)
  })
})

describe('les partages du compte', () => {
  const shares = [
    { token: 'a', startedAt: ago(30 * 3600_000), with: ['Coralie'], endedAt: ago(29 * 3600_000) },
    { token: 'b', startedAt: ago(26 * 3600_000), with: ['Paul'] },
    { token: 'c', startedAt: ago(5 * 3600_000), with: ['Coralie'], endedAt: ago(4 * 3600_000) },
    { token: 'd', startedAt: ago(10 * 60_000), with: ['Coralie', 'Paul'] },
  ]
  it('efface après 24 h (fin, ou départ jamais arrêté)', () => {
    expect(sharesToDelete(shares, NOW).map((s) => s.token)).toEqual(['a', 'b'])
    expect(sharesToDelete(undefined, NOW)).toEqual([])
  })

  it('le partage en cours', () => {
    expect(activeShare(shares, NOW)?.token).toBe('d')
    expect(activeShare(shares.slice(0, 3), NOW)).toBeUndefined()
  })

  it('une mise à jour par minute au plus', () => {
    expect(pushDue(undefined, NOW)).toBe(true)
    expect(pushDue(NOW - 14_000, NOW)).toBe(false)
    expect(pushDue(NOW - 15_000, NOW)).toBe(true)
  })

  it('« avec Coralie et Paul »', () => {
    expect(withNames(['Coralie'])).toBe('Coralie')
    expect(withNames(['Coralie', 'Paul'])).toBe('Coralie et Paul')
  })

  it('le statut suit la balade de l’iPhone', () => {
    expect(walkLiveStatus({ active: true, recording: true })).toBe('en cours')
    expect(walkLiveStatus({ active: true, recording: false })).toBe('pause')
    expect(walkLiveStatus({ active: true, recording: false, stopped: true })).toBe('terminée')
    expect(walkLiveStatus({ active: true, recording: false, savedAs: 'e1' })).toBe('terminée')
    expect(walkLiveStatus({ active: false, recording: false })).toBe('terminée')
  })

  it('un proche : un prénom, le reste facultatif', () => {
    expect(cleanProche({ name: '  Coralie ', contact: ' 06 12 34 56 78 ' }, 'p1')).toEqual({ id: 'p1', name: 'Coralie', contact: '06 12 34 56 78' })
    expect(cleanProche({ name: 'Paul', contact: '' }, 'p2')).toEqual({ id: 'p2', name: 'Paul' })
    expect(cleanProche({ name: ' ', contact: 'x@y.fr' }, 'p3')).toBeUndefined()
  })
})

describe('T-123 · le tracé derrière le point', () => {
  /** Une marche vers le nord, un point tous les `m` mètres. */
  const walk = (count: number, m: number) => Array.from({ length: count }, (_, i) => ({ lat: 48.9 + (i * m) / 111_195, lng: 2.333333333 }))

  it('simplifié à 10 m, 5 décimales, du départ au dernier point', () => {
    const t = liveTrack(walk(101, 2))
    // 200 m : un point tous les 10 à 12 m (pas de 2 m), plus le dernier.
    expect(t.lat.length).toBeGreaterThanOrEqual(17)
    expect(t.lat.length).toBeLessThanOrEqual(21)
    expect(t.lng.every((x) => x === 2.33333)).toBe(true)
    expect(t.lat[0]).toBe(48.9)
    expect(t.lat[t.lat.length - 1]).toBeCloseTo(48.9 + 200 / 111_195, 5)
  })

  it('au-delà de 4 000 points : simplifié plus fort ; reste loin de 900 Ko', () => {
    // 3 h de marche, un point par seconde, 1,3 m entre deux : ~14 km.
    const t = liveTrack(walk(10_800, 1.3))
    expect(t.lat.length).toBeLessThanOrEqual(MAX_TRACK_POINTS)
    expect(t.lat.length).toBeGreaterThan(1000)
    expect(JSON.stringify(t).length).toBeLessThan(900_000)
    // Un tracé de 40 km sans pause : toujours sous la limite.
    expect(liveTrack(walk(40_000, 1)).lat.length).toBeLessThanOrEqual(MAX_TRACK_POINTS)
  })

  it('montré pendant la balade, puis 1 h après la fin', () => {
    const track = { lat: [48.9, 48.901], lng: [2.33, 2.33] }
    expect(trackShown({ track, status: 'en cours' }, NOW)).toEqual([[48.9, 2.33], [48.901, 2.33]])
    expect(trackShown({ track, status: 'terminée', endsAt: ago(59 * 60_000) }, NOW)).toHaveLength(2)
    expect(trackShown({ track, status: 'terminée', endsAt: ago(60 * 60_000) }, NOW)).toEqual([])
    expect(trackShown({ status: 'en cours' }, NOW)).toEqual([])
  })

  it('effacé 1 h après la fin, une fois', () => {
    const shares = [
      { token: 'a', startedAt: ago(3 * 3600_000), with: ['Coralie'], endedAt: ago(2 * 3600_000) },
      { token: 'b', startedAt: ago(3 * 3600_000), with: ['Paul'], endedAt: ago(30 * 60_000) },
      { token: 'c', startedAt: ago(3 * 3600_000), with: ['Paul'], endedAt: ago(2 * 3600_000), trackCleared: true },
      { token: 'd', startedAt: ago(600_000), with: ['Paul'] },
    ]
    expect(tracksToClear(shares, NOW).map((s) => s.token)).toEqual(['a'])
  })
})
