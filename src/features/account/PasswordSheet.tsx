import { useState } from 'react'
import { PasswordField } from '../../components/PasswordField'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { authErrorMessage, changePassword, currentEmail, MIN_PASSWORD } from '../../firebase/auth'
import { updateDog } from '../../firebase/db'

/** Changer son mot de passe : l’ancien, puis le nouveau (8 caractères au moins). */
export function PasswordSheet({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState<{ field: 'current' | 'next'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (busy) return
    if (!current) return setError({ field: 'current', text: 'Entrez votre mot de passe actuel.' })
    if (next.length < MIN_PASSWORD) return setError({ field: 'next', text: `Le nouveau mot de passe doit faire ${MIN_PASSWORD} caractères au moins.` })
    if (next === current) return setError({ field: 'next', text: 'Choisissez un mot de passe différent de l’actuel.' })
    setBusy(true)
    setError(null)
    try {
      await changePassword(current, next)
      updateDog({ passwordPromptDone: true })
      toast('Mot de passe changé')
      onClose()
    } catch (err) {
      const message = authErrorMessage(err, true)
      setError({ field: message.text.includes('trop court') ? 'next' : 'current', text: message.text })
      setBusy(false)
    }
  }

  return (
    <Sheet label="Changer mon mot de passe" onClose={busy ? () => undefined : onClose}>
      <h2 className="mt-1 font-display text-[1.4118rem] font-extrabold">Changer mon mot de passe</h2>
      {/* Un vrai formulaire avec l’identifiant caché : le trousseau iCloud propose et met à jour le bon mot de passe (R-067). */}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
        className="flex flex-col gap-3"
      >
        <input type="text" name="username" autoComplete="username" value={currentEmail()} readOnly hidden />
        <PasswordField label="Mot de passe actuel" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={error?.field === 'current' ? error.text : undefined} />
        <PasswordField label="Nouveau mot de passe (8 caractères au moins)" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={error?.field === 'next' ? error.text : undefined} />
        <button type="submit" disabled={busy} aria-busy={busy || undefined} className="btn btn-main mt-1">
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
      <button type="button" onClick={onClose} disabled={busy} className="btn btn-outline">
        Annuler
      </button>
    </Sheet>
  )
}
