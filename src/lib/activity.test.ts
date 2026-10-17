import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { frenchName, ignoredLabel, importKey, isGpxFile, isWalk, parisDay, parisMinutes, parseActivity, readActivityFile, toImported, walkDistance } from './activity'

// Un GPX inventé, au format d'un export Strava (aucun vrai fichier de balade : le dépôt est public).
const STRAVA = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="StravaGPX" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
 <metadata><time>2026-10-12T14:00:00Z</time></metadata>
 <trk>
  <name>Afternoon Walk</name>
  <type>walking</type>
  <trkseg>
   <trkpt lat="45.0000000" lon="1.0000000"><ele>12.4</ele><time>2026-10-12T14:00:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>98</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
   <trkpt lat="45.0000100" lon="1.0000000"><ele>12.5</ele><time>2026-10-12T14:00:05Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>99</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
   <trkpt lat="45.0009000" lon="1.0000000"><ele>13.0</ele><time>2026-10-12T14:01:00Z</time></trkpt>
   <trkpt lat="45.0018000" lon="1.0000000"><ele>13.2</ele><time>2026-10-12T14:24:00Z</time></trkpt>
  </trkseg>
 </trk>
</gpx>`

describe('lecture des fichiers Strava', () => {
  it('lit le nom, le type, les points et leur heure, sans rythme cardiaque ni altitude', () => {
    const activity = parseActivity(STRAVA)
    expect(activity.name).toBe('Afternoon Walk')
    expect(activity.type).toBe('walking')
    expect(activity.points).toHaveLength(4)
    expect(activity.points[0]).toEqual({ lat: 45, lng: 1, time: '2026-10-12T14:00:00Z' })
    expect(JSON.stringify(activity)).not.toMatch(/hr|ele|98|12\.4/)
  })

  it('garde un trajet allégé, la distance (sauts du GPS ignorés), la durée et la date à Paris', () => {
    const walk = toImported(parseActivity(STRAVA))!
    expect(walk.name).toBe('Balade de l’après-midi')
    expect(walk.date).toBe('2026-10-12')
    expect(walk.durationMin).toBe(24)
    // ~200 m vers le nord ; le saut de 1 m à l'arrêt n'est pas compté.
    expect(walk.distanceM).toBeGreaterThan(195)
    expect(walk.distanceM).toBeLessThan(205)
    expect(walk.points.length).toBeLessThanOrEqual(200)
    expect(JSON.stringify(walk.points)).not.toMatch(/T14/)
  })

  it('traduit les noms par défaut, garde les autres', () => {
    expect(frenchName('Morning Walk')).toBe('Balade du matin')
    expect(frenchName('Lunch Walk')).toBe('Balade de midi')
    expect(frenchName('Evening Hike')).toBe('Randonnée du soir')
    expect(frenchName('Night Walk')).toBe('Balade de nuit')
    expect(frenchName('Tour du phare avec Billy')).toBe('Tour du phare avec Billy')
    expect(frenchName(undefined, 'hiking')).toBe('Randonnée')
  })

  it('garde les marches et randonnées, compte le reste', () => {
    expect(isWalk('walking')).toBe(true)
    expect(isWalk('hiking')).toBe(true)
    expect(isWalk(undefined)).toBe(true)
    expect(isWalk('cycling')).toBe(false)
    expect(ignoredLabel('cycling')).toBe('à vélo')
    expect(ignoredLabel('running')).toBe('en course à pied')
  })

  it('clé de doublon : départ + premier point', () => {
    const points = parseActivity(STRAVA).points
    expect(importKey(points)).toBe('2026-10-12T14:00:00Z_45.0000_1.0000')
    expect(importKey(points)).toBe(importKey(parseActivity(STRAVA).points))
  })

  it('distance : un point compte s’il est à 8 m ou plus du précédent', () => {
    const jitter = Array.from({ length: 50 }, (_, i) => ({ lat: 45 + (i % 2) * 0.00002, lng: 1 }))
    expect(walkDistance(jitter)).toBe(0)
  })

  it('heure et jour de Paris', () => {
    expect(parisDay('2026-10-12T22:30:00Z')).toBe('2026-10-13')
    expect(parisMinutes('2026-10-12T14:00:00Z')).toBe(16 * 60)
  })

  it('décompresse les fichiers .gz de l’archive', async () => {
    const gz = new Blob([gzipSync(Buffer.from(STRAVA))])
    const text = await readActivityFile(Object.assign(gz, { name: '1234.gpx.gz' }))
    expect(parseActivity(text).name).toBe('Afternoon Walk')
    expect(isGpxFile('1234.gpx.gz')).toBe(true)
    expect(isGpxFile('activities.csv')).toBe(false)
  })
})
