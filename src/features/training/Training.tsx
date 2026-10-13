import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHeader } from '../../components/PageHeader'
import { useToast } from '../../components/Toast'
import { useData } from '../../firebase/store'
import { levelInfo, totalXp, xpByDay } from '../../lib/gamification'
import { streak } from '../../lib/training'
import { useToday } from '../../lib/useToday'
import { ExercisesTab } from './ExercisesTab'
import { ExposureSheet } from './ExposureSheet'
import { ProgressTab } from './ProgressTab'
import { TodayTab } from './TodayTab'

type Tab = 'jour' | 'exercices' | 'progres'

const TABS: { value: Tab; label: string }[] = [
  { value: 'jour', label: 'Du jour' },
  { value: 'exercices', label: 'Exercices' },
  { value: 'progres', label: 'Progrès' },
]

export default function Training() {
  const { dog, sessions, exposures, entries } = useData()
  const today = useToday()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('jour')
  const [exposureSheet, setExposureSheet] = useState<{ trigger?: string } | null>(null)

  const progress = useMemo(() => {
    const byDay = xpByDay(sessions, exposures)
    const xp = totalXp(byDay)
    return { byDay, xp, level: levelInfo(xp) }
  }, [sessions, exposures])

  // Gain d'expérience et passage de niveau annoncés au moment où ils arrivent.
  const previousXp = useRef(progress.xp)
  useEffect(() => {
    const before = previousXp.current
    previousXp.current = progress.xp
    if (progress.xp <= before) return
    const levelBefore = levelInfo(before).level
    toast(
      progress.level.level > levelBefore
        ? `Niveau ${progress.level.level} ! ${dog.name} devient « ${progress.level.title} ».`
        : `+${progress.xp - before} XP pour ${dog.name}`,
    )
  }, [progress, dog.name, toast])

  const streakDays = streak([...sessions.map((s) => s.date), ...exposures.map((e) => e.date)], today)

  return (
    <div className="flex flex-col gap-5 px-5">
      <PageHeader title="Dressage" />

      <div role="tablist" aria-label="Parties du dressage" className="grid grid-cols-3 gap-1 rounded-field bg-placeholder p-1">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`h-11 rounded-[10px] border-0 text-[15px] ${tab === value ? 'bg-surface font-bold text-text shadow-[0_1px_3px_rgba(24,32,30,0.12)]' : 'bg-transparent font-medium text-[#3F4946]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'jour' && (
        <TodayTab
          dogName={dog.name}
          today={today}
          sessions={sessions}
          exposures={exposures}
          level={progress.level}
          streakDays={streakDays}
          onFearDetails={(trigger) => setExposureSheet({ trigger })}
          onSeeAll={() => setTab('exercices')}
        />
      )}
      {tab === 'exercices' && <ExercisesTab today={today} sessions={sessions} exposures={exposures} onExposure={(trigger) => setExposureSheet({ trigger })} />}
      {tab === 'progres' && (
        <ProgressTab
          dogName={dog.name}
          today={today}
          sessions={sessions}
          exposures={exposures}
          entries={entries}
          level={progress.level}
          xp={progress.xp}
          todayXp={progress.byDay.get(today) ?? 0}
          streakDays={streakDays}
        />
      )}

      {exposureSheet && <ExposureSheet today={today} exposures={exposures} trigger={exposureSheet.trigger} onClose={() => setExposureSheet(null)} />}
    </div>
  )
}
