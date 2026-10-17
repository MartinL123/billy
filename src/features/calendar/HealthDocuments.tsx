import { DocumentsSection } from '../profile/DocumentsSection'
import { SubScreen } from './SubScreen'

/** Carnet de santé, ordonnances, comptes rendus. */
export default function HealthDocuments() {
  return (
    <SubScreen title="Documents" titleInContent>
      <DocumentsSection />
    </SubScreen>
  )
}
