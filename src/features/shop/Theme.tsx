import { useEffect } from 'react'
import { THEMES } from '../../content/shop'
import { useData } from '../../firebase/store'

/** Applique les couleurs de l’app achetées : seulement le vert principal ; territoires et orange de l’action ne bougent pas. */
export function AppTheme() {
  const { dog } = useData()
  const theme = THEMES[dog.cosmetics?.theme ?? '']
  useEffect(() => {
    const root = document.documentElement.style
    const vars: [string, string | undefined][] = [
      ['--color-primary', theme?.primary],
      ['--color-primary-dark', theme?.dark],
      ['--color-primary-soft', theme?.soft],
    ]
    for (const [name, value] of vars) {
      if (value) root.setProperty(name, value)
      else root.removeProperty(name)
    }
  }, [theme])
  return null
}
