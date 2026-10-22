import { FileImage } from '../../components/FileImage'
import { useData } from '../../firebase/store'
import { Worn } from './Art'

/**
 * La photo ronde du chien, avec ce qu’il porte (boutique). Utilisée partout où sa photo apparaît.
 * `tryOn` : un objet essayé dans la boutique, à la place de celui qu’il porte.
 */
export function DogPhoto({ size, className = '', alt = '', tryOn }: { size: number; className?: string; alt?: string; tryOn?: { accessory?: string; frame?: string } }) {
  const { dog } = useData()
  const accessory = tryOn?.accessory ?? dog.cosmetics?.accessory
  const frame = tryOn?.frame ?? dog.cosmetics?.frame
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }}>
      <span className="flex size-full items-center justify-center overflow-hidden rounded-full bg-primary-soft font-display font-semibold text-primary-dark" style={{ fontSize: size * 0.4 }}>
        {dog.photoThumbFileId ? <FileImage fileId={dog.photoThumbFileId} alt={alt} className="size-full" eager /> : dog.name.charAt(0).toUpperCase()}
      </span>
      <Worn accessory={accessory} frame={frame} />
    </span>
  )
}
