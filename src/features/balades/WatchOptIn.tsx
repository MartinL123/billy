import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { APP_NAME } from '../../appName'
import { isNative } from '../../native'
import { optInWatch, watchLooksBlocked, watchOptedIn } from './watchImport'

/**
 * R-079 (app iOS) : l’accès à Santé n’est demandé qu’ici, au moment où la personne le choisit, après une explication
 * courte. Refusé (rien n’arrive) : comment l’activer dans Réglages. Rien sur le web.
 */
export function WatchOptIn({ compact = false }: { compact?: boolean }) {
  const [opted, setOpted] = useState(watchOptedIn)
  const [asking, setAsking] = useState(false)
  if (!isNative()) return null
  if (opted) {
    return watchLooksBlocked() ? (
      <p className="text-[0.8824rem] leading-snug text-[#3F4946]">
        Aucune marche de la montre n’arrive : autorisez {APP_NAME} dans Réglages › Santé › Accès aux données et appareils.
      </p>
    ) : compact ? null : (
      <p className="text-[0.8824rem] leading-snug text-[#3F4946]">Les marches de votre Apple Watch arrivent seules dans {APP_NAME}.</p>
    )
  }
  return (
    <>
      <button type="button" onClick={() => setAsking(true)} className="btn btn-tertiary min-h-12">
        Retrouver les balades de ma montre
      </button>
      {asking && (
        <Sheet label="Les balades de votre montre" onClose={() => setAsking(false)}>
          <h2 className="title-section mt-1">Les balades de votre montre</h2>
          <p className="text-[0.9412rem] leading-snug text-[#3F4946]">
            Quand vous lancez une séance « Marche » sur votre Apple Watch, la balade arrive seule dans {APP_NAME}, avec son tracé.
          </p>
          <p className="text-[0.9412rem] leading-snug text-[#3F4946]">
            iOS va vous demander l’accès à Santé. {APP_NAME} lit seulement vos séances de marche et leur parcours, rien d’autre, et n’écrit rien.
          </p>
          <button
            type="button"
            onClick={() => {
              optInWatch()
              setOpted(true)
              setAsking(false)
            }}
            className="btn btn-main min-h-14"
          >
            Continuer
          </button>
          <button type="button" onClick={() => setAsking(false)} className="btn-text self-center px-4">
            Plus tard
          </button>
        </Sheet>
      )}
    </>
  )
}
