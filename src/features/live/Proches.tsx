import { useState } from 'react'
import { useToast } from '../../components/Toast'
import { geocodeAddress } from '../../lib/street'
import { isNative } from '../../native'
import { TextField, Optional } from '../../components/Form'
import type { Proche } from '../../lib/liveShare'
import { updateLivePrivate } from '../../firebase/live'
import { ProcheForm } from './LiveShare'
import { useLivePrivate } from './useLivePrivate'

/**
 * Profil › Mes proches (T-087) : les personnes à qui partager une balade en direct (prénom + numéro ou e-mail), et le
 * prénom du maître montré sur la page de suivi. Flair n’écrit jamais à ces personnes : c’est vous qui envoyez le lien.
 */
export function ProchesSection() {
  const priv = useLivePrivate()
  // Le champ prend la valeur enregistrée une fois lue, puis on la modifie librement.
  return priv ? <Proches key="lu" saved={priv} /> : null
}

function Proches({ saved }: { saved: { proches?: Proche[]; ownerName?: string } }) {
  const proches = saved.proches ?? []
  const [adding, setAdding] = useState(false)
  const [ownerName, setOwnerName] = useState(saved.ownerName ?? '')
  const saveOwnerName = () => {
    const name = ownerName.trim().slice(0, 40)
    if (name !== (saved.ownerName ?? '')) updateLivePrivate({ ownerName: name })
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
                {isNative() && <ProcheAddress proche={p} proches={proches} />}
              </span>
              <button type="button" onClick={() => updateLivePrivate({ proches: proches.filter((x) => x.id !== p.id) })} aria-label={`Retirer ${p.name}`} className="btn-text min-h-11 px-3 text-[0.8824rem] text-danger">
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding || proches.length === 0 ? (
        <div className="card p-4">
          <ProcheForm proches={saved.proches} onAdded={() => setAdding(false)} withAddress={isNative()} />
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

/**
 * T-124 (app iOS) : « Son adresse », facultative. Géocodée une fois (Nominatim), gardée dans les données privées, jamais
 * dans live/ : pendant une balade, « Vous passez près de chez Coralie. Le prévenir ? ».
 */
function ProcheAddress({ proche, proches }: { proche: Proche; proches: Proche[] }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(proche.address ?? '')
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  const save = async () => {
    const address = value.trim().slice(0, 160)
    setBusy(true)
    const home = address ? await geocodeAddress(address) : undefined
    setBusy(false)
    if (address && !home) return toast('Adresse introuvable. Essayez avec la ville.')
    const rest = { ...proche }
    delete rest.address
    delete rest.home
    updateLivePrivate({ proches: proches.map((x) => (x.id === proche.id ? { ...rest, ...(address ? { address } : {}), ...(home ? { home } : {}) } : x)) })
    setEditing(false)
  }
  if (!editing)
    return (
      <button type="button" onClick={() => setEditing(true)} aria-label={proche.address ? `Modifier l’adresse de ${proche.name}` : `Ajouter l’adresse de ${proche.name}`} className="btn-text -ml-1 min-h-11 self-start truncate px-1 text-left text-[0.8235rem]">
        {proche.address ? `${proche.address}${proche.home ? '' : ' (introuvable)'}` : '+ Son adresse'}
      </button>
    )
  return (
    <span className="flex flex-col gap-2 py-1">
      <TextField label={<>Son adresse<Optional /></>} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" maxLength={160} />
      <button type="button" disabled={busy} onClick={() => void save()} className="btn btn-tertiary min-h-11 self-start px-4">
        {busy ? 'Recherche…' : 'Enregistrer'}
      </button>
    </span>
  )
}

