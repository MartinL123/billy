import { useState } from 'react'
import { TextField, Optional } from '../../components/Form'
import { updateDog } from '../../firebase/db'
import { useData } from '../../firebase/store'
import { ProcheForm } from './LiveShare'

/**
 * Profil › Mes proches (T-087) : les personnes à qui partager une balade en direct (prénom + numéro ou e-mail), et le
 * prénom du maître montré sur la page de suivi. Flair n’écrit jamais à ces personnes : c’est vous qui envoyez le lien.
 */
export function ProchesSection() {
  const { dog } = useData()
  const proches = dog.proches ?? []
  const [adding, setAdding] = useState(false)
  const [ownerName, setOwnerName] = useState(dog.ownerName ?? '')
  const saveOwnerName = () => {
    const name = ownerName.trim().slice(0, 40)
    if (name !== (dog.ownerName ?? '')) updateDog({ ownerName: name })
  }

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="title-section">Mes proches</h2>
      <p className="text-[0.8824rem] leading-snug text-[#3F4946]">Pendant une balade, « Partager en direct » leur envoie un lien pour voir où vous êtes. Jamais automatique, jamais à la meute.</p>
      {proches.length > 0 && (
        <ul className="card m-0 flex list-none flex-col px-4 py-1">
          {proches.map((p, i) => (
            <li key={p.id} className={`flex min-h-14 items-center gap-3 py-2 ${i ? 'border-t border-divider' : ''}`}>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-base font-semibold">{p.name}</span>
                {p.contact && <span className="truncate text-[0.7647rem] text-muted">{p.contact}</span>}
              </span>
              <button type="button" onClick={() => updateDog({ proches: proches.filter((x) => x.id !== p.id) })} aria-label={`Retirer ${p.name}`} className="btn btn-quiet min-h-11 px-3 text-[0.8824rem] text-danger">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding || proches.length === 0 ? (
        <div className="card p-4">
          <ProcheForm proches={dog.proches} onAdded={() => setAdding(false)} />
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="btn-text self-start -ml-1">
          Ajouter un proche
        </button>
      )}
      <TextField label={<>Votre prénom, vu par vos proches<Optional /></>} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} onBlur={saveOwnerName} autoComplete="given-name" maxLength={40} />
    </section>
  )
}
