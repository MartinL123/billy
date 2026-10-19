import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '../../components/Icons'
import { watchFeed, watchMarks, watchMembers, watchSpots, type FeedItem, type Mark, type Member, type Spot, type WithId } from '../../firebase/community'
import { formatAgeShort } from '../../lib/age'
import { formatShort } from '../../lib/dates'
import { useBack } from '../../lib/useBack'
import { useToday } from '../../lib/useToday'
import { FeedPhoto } from './FeedPhoto'
import { MemberAvatar } from './MemberAvatar'

/** Le profil public d’un chien de la meute : photo, âge, race, niveau, badges, territoire. Ni santé, ni documents, ni Carnet privé. */
export default function DogPublic() {
  const { id } = useParams()
  const back = useBack('/meute')
  const today = useToday()
  const [member, setMember] = useState<WithId<Member>>()
  const [marks, setMarks] = useState<WithId<Mark>[]>([])
  const [spots, setSpots] = useState<WithId<Spot>[]>([])
  const [feed, setFeed] = useState<WithId<FeedItem>[]>([])
  useEffect(() => {
    const stops = [watchMembers((all) => setMember(all.find((m) => m.id === id))), watchMarks(setMarks), watchSpots(setSpots), watchFeed(setFeed)]
    return () => stops.forEach((stop) => stop())
  }, [id])

  if (!member) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[17px] text-muted">Ce chien n’est pas (ou plus) dans la meute.</p>
        <button type="button" onClick={back} className="btn btn-main">
          Retour à la meute
        </button>
      </main>
    )
  }
  const territory = [...new Set(marks.filter((m) => m.uid === id).map((m) => m.spotId))].map((sid) => spots.find((s) => s.id === sid)?.name).filter(Boolean)
  const shared = feed.filter((f) => f.uid === id).sort((a, b) => b.date.localeCompare(a.date))
  return (
    <div className="mx-auto min-h-dvh max-w-[430px]">
      <header className="sticky top-0 z-10 flex items-center bg-bg px-3 pt-[calc(env(safe-area-inset-top)+6px)] pb-1.5">
        <button type="button" onClick={back} className="btn btn-quiet min-h-12 px-4">
          <ChevronLeftIcon size={20} />
          La meute
        </button>
      </header>
      <main className="flex flex-col gap-5 px-5 pt-1 pb-[calc(env(safe-area-inset-bottom)+40px)]">
        <div className="flex flex-col items-center gap-2 text-center">
          <MemberAvatar member={member} size={112} />
          <h1 className="font-display text-[30px] font-extrabold">{member.dogName}</h1>
          <p className="text-[15px] text-muted">{[member.birthDate ? formatAgeShort(member.birthDate, today) : '', member.breed].filter(Boolean).join(' · ')}</p>
        </div>
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">Son territoire</h2>
          <p className="text-[17px]">{territory.length ? `${territory.length} spot${territory.length > 1 ? 's' : ''} marqué${territory.length > 1 ? 's' : ''} : ${territory.join(', ')}` : 'Aucun spot marqué pour l’instant.'}</p>
        </section>
        {shared.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-bold">Moments partagés</h2>
            {shared.map((f) => (
              <div key={f.id} className="card flex flex-col gap-2 p-4">
                <span className="text-sm font-semibold text-muted">{formatShort(f.date)}</span>
                <span className="text-[17px] leading-snug">{f.text}</span>
                {f.photo && <FeedPhoto photo={f.photo} size={160} />}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  )
}
