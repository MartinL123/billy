// Rappel du soir : lancé toutes les 15 minutes par .github/workflows/rappel-soir.yml.
// Lit les abonnements push dont c'est l'heure (fuseau de l'abonnement), n'envoie rien si un moment a déjà été
// noté aujourd'hui, et une seule notification par jour et par appareil.
//
// Secrets attendus : FIREBASE_SERVICE_ACCOUNT (JSON du compte de service), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import webpush from 'web-push'
import { isDue, localParts, reminderText } from '../src/lib/reminder.ts'

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

for (const device of devices.docs) {
  const settings = device.data()
  if (!settings.subscription || !isDue(settings, now)) continue
  const user = device.ref.parent.parent
  if (!user) continue
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
  try {
    await webpush.sendNotification(settings.subscription, JSON.stringify(text))
    await device.ref.update({ lastSent: today, lastSentAt: FieldValue.serverTimestamp() })
    sent++
  } catch (error) {
    // Abonnement expiré ou révoqué : on le supprime.
    if (error.statusCode === 404 || error.statusCode === 410) await device.ref.delete()
    else console.error('Envoi impossible', error.statusCode ?? error.message)
  }
}

console.log(`${devices.size} appareil(s), ${sent} notification(s) envoyée(s).`)
