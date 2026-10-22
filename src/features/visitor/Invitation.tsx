import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { claimInvite } from '../../firebase/viewer'
import { Splash } from '../auth/Splash'

/** Reprend l’app au départ : le prochain lancement ouvre le compte regardé (ou le sien). */
export function restartApp() {
  window.location.replace(`${window.location.pathname}#/`)
  window.location.reload()
}

/** Le lien d’invitation (T-048) ouvert par un proche connecté : il devient visiteur, en lecture seule. */
export default function Invitation() {
  const { code = '' } = useParams()
  const [state, setState] = useState<'ask' | 'busy' | 'error'>('ask')
  const [error, setError] = useState('')

  const accept = async () => {
    setState('busy')
    try {
      await claimInvite(code)
      restartApp()
    } catch (e) {
      setError(e instanceof Error && e.message === 'C’est votre propre invitation' ? 'C’est votre propre invitation : envoyez ce lien à un proche.' : 'Ce lien ne marche plus. Demandez-en un nouveau.')
      setState('error')
    }
  }

  return (
    <Splash title={state === 'error' ? 'Invitation impossible' : 'Une invitation'}>
      <div className="flex flex-col gap-4">
        <p>{state === 'error' ? error : 'On vous invite à suivre un chien : ses balades, ses souvenirs, sa santé et ses progrès. Vous regardez, sans rien modifier.'}</p>
        {state !== 'error' && (
          <button type="button" onClick={accept} disabled={state === 'busy'} className="btn btn-main min-h-[54px]">
            {state === 'busy' ? 'Un instant…' : 'Accepter'}
          </button>
        )}
        <Link to="/" className="btn-text self-center px-4">
          {state === 'error' ? 'Retour' : 'Plus tard'}
        </Link>
      </div>
    </Splash>
  )
}
