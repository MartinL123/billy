import { CheckIcon } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { newId, saveSession } from '../../firebase/db'
import type { ISODate } from '../../lib/dates'
import { GAMES, gameSessionId, XP, type Game } from '../../lib/gamification'

interface GamesProps {
  gameOfDay: Game
  /** Identifiants de séance des jeux déjà joués aujourd'hui. */
  playedToday: Set<string>
  /** Nombre de parties par jeu, depuis le début. */
  plays: Map<string, number>
  onOpen: (game: Game) => void
}

/** Catalogue de jeux, défilement horizontal, le jeu du jour en premier. */
export function Games({ gameOfDay, playedToday, plays, onOpen }: GamesProps) {
  const ordered = [gameOfDay, ...GAMES.filter((g) => g.id !== gameOfDay.id)]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-5 text-[19px] font-bold">Jeux</h2>
      <div className="flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {ordered.map((game) => {
          const played = playedToday.has(gameSessionId(game))
          const count = plays.get(gameSessionId(game)) ?? 0
          const isDaily = game.id === gameOfDay.id
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => onOpen(game)}
              className={`flex w-[168px] shrink-0 snap-start flex-col gap-2 rounded-[20px] border-0 p-4 text-left shadow-card ${isDaily ? 'bg-milestone-soft' : 'bg-surface'}`}
            >
              <span className={`text-[12px] font-bold tracking-[0.5px] uppercase ${isDaily ? 'text-milestone-dark' : 'text-muted'}`}>
                {isDaily ? 'Jeu du jour' : `${game.minutes} min`}
              </span>
              <span className="text-[17px] leading-tight font-bold text-text">{game.name}</span>
              <span className="text-[13px] text-muted">{game.skill}</span>
              <span className={`mt-auto flex items-center gap-1 pt-1 text-[13px] font-semibold ${played ? 'text-primary' : 'text-muted'}`}>
                {played ? (
                  <>
                    <CheckIcon size={16} />
                    Joué aujourd'hui
                  </>
                ) : count > 0 ? (
                  `Joué ${count} fois`
                ) : (
                  'Jamais essayé'
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** Règles du jeu, puis un tap pour le compter. */
export function GameSheet({ game, today, onClose }: { game: Game; today: ISODate; onClose: () => void }) {
  const played = () => {
    saveSession(newId('sessions'), { date: today, exerciseId: gameSessionId(game), result: 'reussi', createdAt: new Date().toISOString() })
    onClose()
  }
  return (
    <Sheet label={`Jeu : ${game.name}`} onClose={onClose}>
      <div className="mt-1 flex flex-col gap-1">
        <h2 className="font-display text-2xl font-bold">{game.name}</h2>
        <p className="text-sm text-muted">
          {game.minutes} minutes · fait travailler : {game.skill}
        </p>
      </div>
      <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
        {game.steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-dark">{i + 1}</span>
            <span className="pt-0.5 text-[15px] leading-snug">{step}</span>
          </li>
        ))}
      </ol>
      <p className="rounded-field bg-info-soft px-3.5 py-3 text-sm leading-snug text-[#1D3F73]">
        Prends les croquettes sur sa ration du jour, et arrête tant qu'il s'amuse encore.
      </p>
      <button type="button" onClick={played} className="mt-1 h-[54px] rounded-full border-0 bg-primary text-[17px] font-bold text-white">
        On a joué ! +{XP.game} XP
      </button>
    </Sheet>
  )
}
