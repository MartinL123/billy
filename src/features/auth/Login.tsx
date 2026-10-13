import { useState, type FormEvent } from 'react'
import { PawIcon } from '../../components/Icons'
import { authErrorMessage, resetPassword, signIn, type AuthMessage } from '../../firebase/auth'

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

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo('')
    if (!email.trim()) return setError({ field: 'email', text: 'Entre ton adresse e-mail.' })
    if (!password) return setError({ field: 'password', text: 'Entre ton mot de passe.' })
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err) {
      // L'e-mail saisi est conservé ; seul le message apparaît sous le champ.
      setError(authErrorMessage(err))
      setBusy(false)
    }
  }

  const forgot = async () => {
    setError(null)
    setInfo('')
    if (!email.trim()) return setError({ field: 'email', text: 'Entre ton adresse e-mail pour recevoir le lien.' })
    try {
      await resetPassword(email)
      setInfo('Si un compte existe pour cette adresse, un e-mail de réinitialisation vient de partir.')
    } catch (err) {
      setError(authErrorMessage(err))
    }
  }

  const fieldClass = (field: AuthMessage['field']) => `field ${error?.field === field ? 'border-danger' : ''}`

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-6 pt-[calc(env(safe-area-inset-top)+72px)] pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <div className="flex flex-col items-center gap-4 text-center">
        <Logo />
        <h1 className="font-display text-[34px] font-bold tracking-[-0.5px]">Billy</h1>
        <p className="text-base text-muted">Son calendrier, ses souvenirs, ses papiers.</p>
      </div>

      <form onSubmit={submit} noValidate className="mt-12 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[15px] font-semibold">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mdp" className="text-[15px] font-semibold">
            Mot de passe
          </label>
          <input
            id="mdp"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error?.field === 'password' || undefined}
            aria-describedby={error?.field === 'password' ? 'mdp-err' : undefined}
            className={fieldClass('password')}
          />
          {error?.field === 'password' && (
            <div id="mdp-err" role="alert" className="text-sm font-medium text-danger">
              {error.text}
            </div>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn btn-main mt-2 disabled:opacity-60">
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
        <button type="button" onClick={forgot} className="btn btn-outline self-center p-3">
          Mot de passe oublié ?
        </button>
        {info && (
          <p role="status" className="rounded-field bg-info-soft px-3.5 py-3 text-sm leading-snug text-[#1D3F73]">
            {info}
          </p>
        )}
      </form>

      <p className="mt-auto pt-8 text-center text-[13px] text-muted">Une seule connexion : l'app reste ouverte ensuite.</p>
    </main>
  )
}
