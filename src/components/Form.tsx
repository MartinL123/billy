import { useId, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { pickerText } from '../lib/dates'

interface FormScreenProps {
  title: string
  submitLabel: string
  onCancel: () => void
  onSubmit: () => void
  busy?: boolean
  children: ReactNode
}

/** Formulaire plein écran : « Annuler » en haut à gauche, titre centré, bouton fixé en bas. */
export function FormScreen({ title, submitLabel, onCancel, onSubmit, busy, children }: FormScreenProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!busy) onSubmit()
  }
  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-bg px-2 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={onCancel} className="btn btn-quiet my-1.5 min-h-12 px-4">
          Annuler
        </button>
        <h1 className="text-[1rem] font-bold">{title}</h1>
        <div className="w-[92px]" />
      </header>
      <div className="flex flex-col gap-5 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+120px)]">{children}</div>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-divider bg-bg">
        <div className="mx-auto max-w-[430px] px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <button type="submit" disabled={busy} aria-busy={busy || undefined} className="btn btn-main w-full">
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}

export function Optional() {
  return <span className="font-normal text-muted"> (option)</span>
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode
  error?: string
}

export function TextField({ label, error, className = '', ...input }: TextFieldProps) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.8824rem] font-semibold">
        {label}
      </label>
      {input.type === 'date' || input.type === 'time' ? (
        <NativePickerInput id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : undefined} className={`field ${error ? 'border-danger' : ''} ${className}`} {...input} type={input.type as 'date' | 'time'} value={String(input.value ?? '')} />
      ) : (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className={`field ${error ? 'border-danger' : ''} ${className}`}
          {...input}
        />
      )}
      {error && (
        <div id={`${id}-err`} className="text-sm font-medium text-danger">
          {error}
        </div>
      )}
    </div>
  )
}

interface SegmentedProps<T extends string> {
  legend: ReactNode
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  hint?: ReactNode
}

/** Choix exclusif court (récurrence, catégorie). */
export function Segmented<T extends string>({ legend, options, value, onChange, hint }: SegmentedProps<T>) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="mb-2.5 p-0 text-[0.8824rem] font-semibold">{legend}</legend>
      <div className="grid gap-1 rounded-field bg-placeholder p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => {
          const active = option.value === value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={`min-h-12 rounded-[10px] border-0 px-1 text-[1rem] ${active ? 'bg-primary font-bold text-white' : 'bg-transparent font-semibold text-[#3F4946]'}`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {hint && <div className="mt-2 text-[0.7647rem] text-muted">{hint}</div>}
    </fieldset>
  )
}

/** Bouton secondaire à contour, pleine largeur. */
export const outlineButton =
  'btn btn-outline w-full'

interface NativePickerInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  type: 'date' | 'time'
  value: string
  /** Texte affiché sans valeur. */
  placeholder?: string
}

/**
 * Un champ date ou heure (R-050, R-051) : le sélecteur natif (la roue de l'iPhone) reste, mais invisible, posé sur un
 * affichage à la française (« 19 h 30 », « 19 octobre 2026 »), quelle que soit la langue de l'appareil.
 */
export function NativePickerInput({ type, value, placeholder, className = '', ...input }: NativePickerInputProps) {
  const shown = pickerText(type, value, placeholder ?? (type === 'time' ? 'Choisir une heure' : 'Choisir une date'))
  return (
    <span className={`relative flex items-center overflow-hidden focus-within:ring-2 focus-within:ring-primary ${className}`}>
      <span aria-hidden="true" className={`pointer-events-none truncate ${value ? '' : 'text-muted'}`}>
        {shown}
      </span>
      <input {...input} type={type} value={value} className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0" />
    </span>
  )
}
