import type { ReactNode } from 'react'

interface FilePickerProps {
  /** `image/*` ouvre la photothèque ; avec `application/pdf`, iOS propose aussi Fichiers. */
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  className?: string
  children: ReactNode
}

/**
 * Import depuis la photothèque ou l'app Fichiers. Jamais d'attribut `capture` :
 * l'app n'ouvre pas l'appareil photo.
 */
export function FilePicker({ accept, multiple = true, onFiles, className, children }: FilePickerProps) {
  return (
    <label className={`relative cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${className ?? ''}`}>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length) onFiles(files)
        }}
      />
      {children}
    </label>
  )
}
