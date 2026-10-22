import { useState, type FormEvent } from 'react'
import { PawIcon } from '../../components/Icons'
import { PasswordField } from '../../components/PasswordField'
import { InstallGuide } from '../account/Install'
import { authErrorMessage, resetPassword, signIn, type AuthMessage } from '../../firebase/auth'
import { APP_NAME, APP_TAGLINE } from '../../appName'
import { isNative } from '../../native'

export function Logo() {
  return (
    <div className="flex size-24 items-center justify-center rounded-[28px] bg-primary shadow-[0_8px_20px_rgba(30,90,80,0.28)]">
      <PawIcon />
    </div>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<AuthMessage | null>(null)
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [installing, setInstalling] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo('')
    if (!email.trim()) return setError({ field: 'email', text: 'Entrez votre adresse e-mail.' })
    if (!password) return setError({ field: 'password', text: 'Entrez votre mot de passe.' })
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err) {
      // L’e-mail saisi est conservé ; seul le message apparaît sous le champ.
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  const forgot = async () => {
    setError(null)
    setInfo('')
    if (!email.trim()) return setError({ field: 'email', text: 'Entrez votre adresse e-mail pour recevoir le lien.' })
    try {
      await resetPassword(email)
      setInfo('Si un compte existe pour cette adresse, un e-mail de réinitialisation vient de partir.')
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }

  if (installing) return <InstallGuide onBack={() => setInstalling(false)} backLabel="Connexion" />

  const fieldClass = (field: AuthMessage['field']) => `field ${error?.field === field ? 'border-danger' : ''}`

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pt-[calc(env(safe-area-inset-top)+72px)] pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo />
        <h1 className="font-display text-[2rem] font-semibold tracking-[-0.5px]">{APP_NAME}</h1>
        <p className="text-base text-muted">{APP_TAGLINE}</p>
      </div>

      <form onSubmit={submit} noValidate className="mt-12 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[0.8824rem] font-semibold">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error?.field === 'email' || undefined}
            aria-describedby={error?.field === 'email' ? 'email-err' : undefined}
            className={fieldClass('email')}
          />
          {error?.field === 'email' && (
            <div id="email-err" role="alert" className="text-sm font-medium text-danger">
              {error.text}
            </div>
          )}
        </div>
        <PasswordField label="Mot de passe" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={error?.field === 'password' ? error.text : undefined} />
        <button type="submit" disabled={busy} aria-busy={busy || undefined} className="btn btn-main mt-2">
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <button type="button" onClick={forgot} className="btn btn-tertiary self-center p-3">
          Mot de passe oublié ?
        </button>
        {info && (
          <p role="status" className="rounded-field bg-info-soft px-3.5 py-3 text-sm leading-snug text-[#1D3F73]">
            {info}
          </p>
        )}
      </form>

      {/* Pas d’inscription : Martin crée les comptes. On explique seulement comment installer l’app. */}
      {/* Dans l’app iOS, elle est déjà installée. */}
      {!isNative() && (
        <button type="button" onClick={() => setInstalling(true)} className="btn btn-tertiary mt-6">
          Comment installer l’app sur mon téléphone ?
        </button>
      )}

      <div className="mt-auto flex flex-col gap-8 pt-8 text-center text-[0.7647rem] leading-snug text-muted">
        <p>Vos données restent privées. Martin, qui gère l’app, peut techniquement y accéder.</p>
        <p>Une seule connexion : l’app reste ouverte ensuite.</p>
      </div>
    </main>
  )
}
