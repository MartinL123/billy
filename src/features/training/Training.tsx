import { PageHeader } from '../../components/PageHeader'

/** Onglet Dressage. L'arbre des boss arrive à l'étape C de docs/spec-v2-dressage.md. */
export default function Training() {
  return (
    <div className="flex flex-col gap-5 px-5">
      <PageHeader title="Dressage" />
      <p className="text-[15px] leading-snug text-muted">Le dressage change de formule : dix objectifs communs à tous les chiens, un chemin adapté à Billy.</p>
    </div>
  )
}
