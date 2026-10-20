import { useId, useState, type InputHTMLAttributes } from 'react'

/** Champ mot de passe avec un bouton (œil) pour l’afficher. */
export function PasswordField({ label, error, ...input }: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8824rem] font-semibold">
        {label}
      </label>
      <span className="relative flex">
        <input id={id} type={shown ? 'text' : 'password'} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} className={`field w-full pr-14 ${error ? 'border-danger' : ''}`} {...input} />
        <button
          type="button"
          aria-pressed={shown}
          aria-label={shown ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          onClick={() => setShown(!shown)}
          className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-transparent text-muted"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
            <circle cx="12" cy="12" r="2.5" />
            {shown && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </span>
      {error && (
        <div id={`${id}-err`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </div>
      )}
    </div>
  )
}
