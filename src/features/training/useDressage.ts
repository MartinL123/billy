import { useMemo } from 'react'
import { BOSSES } from '../../content/training'
import { useData } from '../../firebase/store'
import { levelsAcquired, starsEarned } from '../../lib/bossProgress'
import { addDays } from '../../lib/dates'
import { featuredBosses } from '../../lib/traits'
import { useToday } from '../../lib/useToday'
import { bossReactions, weather, type Weather } from '../../lib/weather'
import { globalLevel, rank, totalXp, xpByStat } from '../../lib/xp'

/** Tout ce qui se calcule à partir des données du dressage : rien de tout cela n'est stocké. */
export function useDressage() {
  const { dog, sessions, exposures, bossProgress, xpLog } = useData()
  const today = useToday()
  return useMemo(() => {
    const xp = totalXp(xpLog)
    const records = [...sessions, ...exposures]
    const weatherByBoss: Record<string, Weather | undefined> = {}
    for (const boss of BOSSES) if (boss.fear) weatherByBoss[boss.id] = weather(bossReactions(records, boss.id))
    return {
      xp,
      level: globalLevel(xp),
      rank: rank(levelsAcquired(bossProgress), starsEarned(bossProgress)),
      levelsAcquired: levelsAcquired(bossProgress),
      statsNow: xpByStat(xpLog),
      statsBefore: xpByStat(xpLog, addDays(today, -30)),
      weatherByBoss,
      featured: featuredBosses(dog.traits ?? []),
    }
  }, [dog.traits, sessions, exposures, bossProgress, xpLog, today])
}
