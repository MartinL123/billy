// Rappels push : lancé toutes les 15 minutes par .github/workflows/rappel-soir.yml.
// 1. Sorties (Profil › Sorties) : à l'heure de chaque sortie pas encore cochée, une notification par créneau et par jour.
// 2. Rappel du soir : lit les abonnements dont c'est l'heure (fuseau de l'abonnement), n'envoie rien si un moment a
//    déjà été noté aujourd'hui, et une seule notification par jour et par appareil.
//
// Secrets attendus : FIREBASE_SERVICE_ACCOUNT (JSON du compte de service), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import webpush from 'web-push'
import { isDue, localParts, reminderText } from '../src/lib/reminder.ts'
import { dueWalkSlots, walkReminderText, walkTimes } from '../src/lib/walks.ts'

const { FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env
if (!FIREBASE_SERVICE_ACCOUNT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.log('Rappel du soir non configuré (secrets manquants) : rien à faire.')
  process.exit(0)
}

initializeApp({ credential: cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT)) })
const db = getFirestore()
webpush.setVapidDetails(VAPID_SUBJECT || 'https://martinl123.github.io/billy/', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const now = new Date()
const devices = await db.collectionGroup('push').get()
let sent = 0

/** Envoie une notification ; un abonnement expiré ou révoqué est supprimé. Renvoie false s'il n'existe plus. */
async function push(device, subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    sent++
    return true
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await device.ref.delete()
      return false
    }
    console.error('Envoi impossible', error.statusCode ?? error.message)
    return true
  }
}

for (const device of devices.docs) {
  const settings = device.data()
  if (!settings.subscription) continue
  const user = device.ref.parent.parent
  if (!user) continue

  // Sorties du jour.
  if (settings.walks === true) {
    const local = localParts(now, settings.timeZone || 'Europe/Paris')
    const dog = (await user.collection('dog').doc('billy').get()).data()
    const times = walkTimes(dog?.walkTimes)
    const done = (await user.collection('walks').doc(local.date).get()).data()?.done ?? {}
    const sentToday = settings.walkSent?.date === local.date ? settings.walkSent.slots ?? [] : []
    const due = dueWalkSlots(times, done, sentToday, local.minutes)
    let alive = true
    for (const slot of due) {
      alive = await push(device, settings.subscription, walkReminderText(dog?.name ?? '', slot, times[slot]))
      if (!alive) break
    }
    if (!alive) continue
    if (due.length) await device.ref.update({ walkSent: { date: local.date, slots: [...sentToday, ...due] } })
  }

  // Rappel du soir (absent = activé : abonnements d'avant les sorties).
  if (settings.evening === false || !isDue(settings, now)) continue
  const today = localParts(now, settings.timeZone || 'Europe/Paris').date

  // Déjà noté aujourd'hui : pas de notification. On retient le jour pour ne pas reposer la question toutes les 15 minutes.
  const noted = await user.collection('entries').where('date', '==', today).limit(1).get()
  const rest = (await user.collection('xpLog').doc(`repos-${today}`).get()).exists
  if (!noted.empty && !rest) {
    await device.ref.update({ lastSent: today })
    continue
  }
  // Journée de repos : un seul moment « Jour de repos. » existe, on propose d'ajouter un mot sur la balade.
  if (rest && noted.docs.some((d) => !d.id.startsWith('repos-'))) {
    await device.ref.update({ lastSent: today })
    continue
  }

  const dog = (await user.collection('dog').doc('billy').get()).data()
  const text = reminderText(dog?.name ?? '', rest)
  if (await push(device, settings.subscription, text)) await device.ref.update({ lastSent: today, lastSentAt: FieldValue.serverTimestamp() })
}

console.log(`${devices.size} appareil(s), ${sent} notification(s) envoyée(s).`)
