// Crée les comptes de test dans l'émulateur Auth (jamais dans le vrai projet).
// Usage : npm run emulators, puis npm run emulators:user
export const TEST_USER = { email: 'test@billy.test', password: 'billy-emulateur' }
// Un proche, pour essayer le mode visiteur (T-048) : il ouvre le lien d'invitation du compte de test.
export const VISITOR_USER = { email: 'proche@billy.test', password: 'billy-emulateur' }

for (const user of [TEST_USER, VISITOR_USER]) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...user, returnSecureToken: true }),
  })
  const body = await response.json()
  if (response.ok) console.log(`Compte de test créé : ${user.email}`)
  else if (body.error?.message === 'EMAIL_EXISTS') console.log(`Le compte ${user.email} existe déjà.`)
  else {
    console.error('Échec :', body.error?.message ?? response.status)
    process.exit(1)
  }
}
