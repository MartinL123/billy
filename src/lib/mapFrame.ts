// Les marges du cadrage de la carte : les boutons du haut et le panneau du bas couvrent la carte, on cadre dans ce qui
// reste visible. Sur un petit écran (iPhone SE), les marges voulues dépasseraient la hauteur de la carte : MapLibre
// abandonnerait alors le cadrage et la carte resterait sur le monde entier. On les réduit pour laisser au moins
// 30 % de la carte libre.

export interface Padding {
  top: number
  bottom: number
  left: number
  right: number
}

const FREE = 0.3

/** Les marges voulues, réduites dans les mêmes proportions si elles ne laissent pas assez de place. */
export function fitPadding(wanted: Padding, width: number, height: number): Padding {
  const scale = (a: number, b: number, size: number) => (size > 0 && a + b > size * (1 - FREE) ? (size * (1 - FREE)) / (a + b) : 1)
  const v = scale(wanted.top, wanted.bottom, height)
  const h = scale(wanted.left, wanted.right, width)
  return { top: Math.floor(wanted.top * v), bottom: Math.floor(wanted.bottom * v), left: Math.floor(wanted.left * h), right: Math.floor(wanted.right * h) }
}
