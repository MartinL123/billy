import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/** Retour à l'écran précédent, ou à `fallback` si l'app a été ouverte directement sur cet écran. */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}
