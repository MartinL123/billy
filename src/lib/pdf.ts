import type { PDFDocumentProxy } from 'pdfjs-dist'
import { compressDrawable, THUMBNAIL } from './image'

// pdf.js est lourd : chargé seulement quand un PDF est importé ou ouvert.
async function pdfjs() {
  const [lib, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ])
  lib.GlobalWorkerOptions.workerSrc = worker.default
  return lib
}

export async function openPdf(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const lib = await pdfjs()
  // Copie : pdf.js transfère le tampon à son worker.
  return lib.getDocument({ data: bytes.slice() }).promise
}

export async function renderPdfPage(pdf: PDFDocumentProxy, pageNumber: number, targetWidth: number): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: targetWidth / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  await page.render({ canvas, viewport }).promise
  return canvas
}

/** Nombre de pages et miniature de la première page. */
export async function inspectPdf(bytes: Uint8Array): Promise<{ pageCount: number; thumb: Blob }> {
  const pdf = await openPdf(bytes)
  try {
    const canvas = await renderPdfPage(pdf, 1, 800)
    return { pageCount: pdf.numPages, thumb: await compressDrawable(canvas, THUMBNAIL) }
  } finally {
    void pdf.loadingTask.destroy()
  }
}
