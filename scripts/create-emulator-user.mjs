// Crée le compte de test dans l'émulateur Auth (jamais dans le vrai projet).
// Usage : npm run emulators, puis npm run emulators:user
export const TEST_USER = { email: 'test@billy.test', password: 'billy-emulateur' }

const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...TEST_USER, returnSecureToken: true }),
})
const body = await response.json()
if (response.ok) console.log(`Compte de test créé : ${TEST_USER.email}`)
else if (body.error?.message === 'EMAIL_EXISTS') console.log('Le compte de test existe déjà.')
else {
  console.error('Échec :', body.error?.message ?? response.status)
  process.exit(1)
}
