import { describe, expect, it } from 'vitest'
import { fileKinds } from './fileKinds'

describe('genre des fichiers (R-069)', () => {
  it('pages et miniature d’un document : document ; photos de souvenir et du chien : photo', () => {
    const kinds = fileKinds({
      documents: [{ fileIds: ['p1', 'p2'], thumbFileId: 't1' }],
      entries: [{ photos: [{ fileId: 'f1', thumbFileId: 'f1t' }] }, { photos: [] }, {}],
      dog: { photoFileId: 'd', photoThumbFileId: 'dt' },
    })
    expect(Object.fromEntries(kinds)).toEqual({ p1: 'document', p2: 'document', t1: 'document', f1: 'photo', f1t: 'photo', d: 'photo', dt: 'photo' })
  })

  it('un fichier partagé avec un document reste privé', () => {
    const kinds = fileKinds({ documents: [{ fileIds: ['x'], thumbFileId: 'y' }], entries: [{ photos: [{ fileId: 'x', thumbFileId: 'z' }] }], dog: {} })
    expect(kinds.get('x')).toBe('document')
    expect(kinds.get('z')).toBe('photo')
  })
})
