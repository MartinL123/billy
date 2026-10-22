import { APP_NAME } from '../../appName'
import { loadFile } from '../../firebase/files'
import { POSTCARD_H, POSTCARD_W, projectRoute } from '../../lib/postcard'
import type { RoutePoint } from '../../lib/route'
import { canDrawMiniMaps, miniMapImage } from './miniMap'

/**
 * Le dessin de la carte postale (spec V6 § 8.4) : 1080 × 1350, le tracé (déjà coupé de ses deux bouts) sur le fond de
 * carte de la mini-carte cachée, puis un bandeau blanc avec la photo du chien, le nom de la balade, les chiffres et la
 * date. Sans fond de carte (hors ligne, pas de WebGL), le tracé seul sur un fond vert pâle.
 */

const MAP_H = 1040
const DISPLAY = '"Bricolage Grotesque Variable", system-ui, sans-serif'
const SANS = '"Figtree Variable", system-ui, sans-serif'
const C = { text: '#18201E', muted: '#5A6662', primary: '#1E5A50', primaryDark: '#143F38', primarySoft: '#DCEBE6', route: '#2F8F6B', paper: '#FFFFFF', pale: '#E8EFE9' }

export interface PostcardInput {
  /** Le tracé déjà coupé (privacyCut) ; vide pour une balade trop courte. */
  points: RoutePoint[]
  title: string
  line: string
  dateLine: string
  dogName: string
  dogPhotoFileId?: string
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image illisible'))
    img.src = url
  })

/** Dessine l’image au format « cover » dans un rectangle. */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / scale
  const sh = h / scale
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
}

/** Le texte sur une ligne : la police rapetisse jusqu’à `min`, puis le texte se coupe avec « … ». */
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, max: number, min: number, width: number): string {
  let size = max
  ctx.font = `${weight} ${size}px ${family}`
  while (size > min && ctx.measureText(text).width > width) {
    size -= 2
    ctx.font = `${weight} ${size}px ${family}`
  }
  if (ctx.measureText(text).width <= width) return text
  let cut = text
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > width) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

function drawRoute(ctx: CanvasRenderingContext2D, points: RoutePoint[]) {
  const px = projectRoute(points, { x: 0, y: 0, w: POSTCARD_W, h: MAP_H }, 0.14)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const [color, width] of [[C.paper, 18], [C.route, 10]] as const) {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.beginPath()
    px.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
    ctx.stroke()
  }
}

async function dogImage(fileId: string | undefined): Promise<HTMLImageElement | undefined> {
  if (!fileId) return undefined
  try {
    const url = URL.createObjectURL(await loadFile(fileId))
    try {
      return await loadImage(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch {
    return undefined
  }
}

export async function drawPostcard(input: PostcardInput): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = POSTCARD_W
  canvas.height = POSTCARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponible')
  // Les polices de l’app, avant d’écrire (sinon le canvas prend celle du système).
  await Promise.all([document.fonts?.load(`700 64px ${DISPLAY}`), document.fonts?.load(`600 40px ${SANS}`)].map((p) => p?.catch(() => undefined)))

  // 1. La carte, ou un fond calme.
  ctx.fillStyle = C.pale
  ctx.fillRect(0, 0, POSTCARD_W, POSTCARD_H)
  const hasRoute = input.points.length >= 2
  if (hasRoute) {
    // La mini-carte dessine en double densité : 540 px d’écran font une image de 1080 px.
    const mapUrl = canDrawMiniMaps() ? await miniMapImage(input.points, [], POSTCARD_W / 2, { startDot: false }) : null
    const mapImg = mapUrl ? await loadImage(mapUrl).catch(() => undefined) : undefined
    if (mapImg) {
      cover(ctx, mapImg, 0, 0, POSTCARD_W, MAP_H)
      // Attribution du fond de carte (OpenStreetMap), en bas à droite de la carte.
      ctx.font = `500 22px ${SANS}`
      const credit = '© OpenStreetMap'
      const w = ctx.measureText(credit).width + 20
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillRect(POSTCARD_W - w - 16, MAP_H - 50, w, 34)
      ctx.fillStyle = C.muted
      ctx.fillText(credit, POSTCARD_W - w - 6, MAP_H - 25)
    } else drawRoute(ctx, input.points)
  } else {
    // Balade trop courte : pas de tracé du tout (domicile), seulement les chiffres en grand.
    ctx.fillStyle = C.primary
    ctx.font = `700 92px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText(fitText(ctx, input.line.split(' · ')[0] ?? '', 700, DISPLAY, 140, 80, POSTCARD_W - 160), POSTCARD_W / 2, MAP_H / 2 + 20)
    ctx.font = `600 40px ${SANS}`
    ctx.fillStyle = C.primaryDark
    ctx.fillText(`Une balade avec ${input.dogName}`, POSTCARD_W / 2, MAP_H / 2 + 100)
    ctx.textAlign = 'left'
  }

  // 2. Le bandeau.
  ctx.fillStyle = C.paper
  ctx.fillRect(0, MAP_H, POSTCARD_W, POSTCARD_H - MAP_H)

  // 3. La photo du chien (ou l’initiale), à cheval sur la carte et le bandeau.
  const r = 104
  const cx = 64 + r
  const cy = MAP_H
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r + 10, 0, Math.PI * 2)
  ctx.fillStyle = C.paper
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  const photo = await dogImage(input.dogPhotoFileId)
  if (photo) cover(ctx, photo, cx - r, cy - r, 2 * r, 2 * r)
  else {
    ctx.fillStyle = C.primarySoft
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r)
    ctx.fillStyle = C.primaryDark
    ctx.font = `600 ${Math.round(r * 0.9)}px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(input.dogName.charAt(0).toUpperCase(), cx, cy + 4)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  }
  ctx.restore()

  // 4. Les textes : le surtitre à droite de la photo, puis le nom, les chiffres et la date sur toute la largeur.
  const left = 64
  const width = POSTCARD_W - 2 * left
  ctx.fillStyle = C.primary
  ctx.font = `700 30px ${SANS}`
  ctx.fillText(fitText(ctx, `Balade avec ${input.dogName}`.toUpperCase(), 700, SANS, 30, 22, POSTCARD_W - (cx + r + 32) - left), cx + r + 32, MAP_H + 56)
  ctx.fillStyle = C.text
  ctx.fillText(fitText(ctx, input.title, 700, DISPLAY, 66, 46, width), left, MAP_H + 162)
  ctx.fillStyle = C.text
  ctx.fillText(fitText(ctx, input.line, 600, SANS, 40, 30, width), left, MAP_H + 222)
  ctx.fillStyle = C.muted
  ctx.fillText(fitText(ctx, input.dateLine, 500, SANS, 34, 26, width - 140), left, MAP_H + 278)
  ctx.fillStyle = C.primary
  ctx.font = `700 34px ${DISPLAY}`
  ctx.textAlign = 'right'
  ctx.fillText(APP_NAME, POSTCARD_W - left, MAP_H + 278)
  ctx.textAlign = 'left'

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('image vide'))), 'image/jpeg', 0.9))
}
