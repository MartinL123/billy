import { updateDoc } from 'firebase/firestore'
import { useEffect } from 'react'
import { send, userDoc } from '../../firebase/paths'
import { useData } from '../../firebase/store'
import { birthdayFix } from '../../lib/milestones'

/** R-074 (propriétaire seulement) : l’anniversaire annuel ne tombe plus le même jour que « … a 1 an ». Rien n’est supprimé. */
export function MilestonesFix() {
  const { events } = useData()
  const fix = birthdayFix(events)
  useEffect(() => {
    if (fix) send(updateDoc(userDoc('events', fix.id), { date: fix.date }))
  }, [fix?.id, fix?.date]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
