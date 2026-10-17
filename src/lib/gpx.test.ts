import { describe, expect, it } from 'vitest'
import { parseGpx } from './gpx'

const GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="Montre">
  <wpt lat="1" lon="1"><name>Ignoré</name></wpt>
  <trk><trkseg>
    <trkpt lat="48.8566" lon="2.3522"><ele>35</ele></trkpt>
    <trkpt lon="2.3530" lat='48.8570'/>
    <trkpt lat="abc" lon="2.3"></trkpt>
  </trkseg></trk>
  <rte><rtept lat="48.8580" lon="2.3540"/></rte>
</gpx>`

describe('import GPX', () => {
  it('lit les points de trace et d’itinéraire, dans l’ordre, sans les points isolés', () => {
    expect(parseGpx(GPX)).toEqual([
      [48.8566, 2.3522],
      [48.857, 2.353],
      [48.858, 2.354],
    ])
  })

  it('rien si ce n’est pas un trajet', () => {
    expect(parseGpx('<html>bonjour</html>')).toEqual([])
  })

})
