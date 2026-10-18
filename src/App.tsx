import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { TabLayout } from './components/TabBar'
import { ToastProvider } from './components/Toast'
import Login from './features/auth/Login'
import { Splash } from './features/auth/Splash'
import Calendar from './features/calendar/Calendar'
import EventForm from './features/calendar/EventForm'
import EntryForm from './features/journal/EntryForm'
import EntryView from './features/journal/EntryView'
import Billy from './features/billy/Billy'
import Tree from './features/billy/Tree'
import Shop from './features/shop/Shop'
import Explorer from './features/balades/Explorer'
import Ideas from './features/balades/Ideas'
import Walks from './features/balades/Walks'
import ImportStrava from './features/balades/ImportStrava'
import Mission from './features/training/Mission'
import HealthEvents from './features/calendar/HealthEvents'
import HealthWeight from './features/calendar/HealthWeight'
import HealthMeals from './features/calendar/HealthMeals'
import HealthDocuments from './features/calendar/HealthDocuments'
import ImportResult from './features/balades/ImportResult'
import { CommunitySync } from './features/meute/CommunitySync'
import { BonesBackfill } from './features/shop/BonesBackfill'
import { FogBackfill } from './features/balades/FogBackfill'
import DogPublic from './features/meute/DogPublic'
// La carte (Leaflet) n’est chargée qu’en ouvrant l’onglet Meute.
const Meute = lazy(() => import('./features/meute/Meute'))
import { AppTheme } from './features/shop/Theme'
import { InstallGuide } from './features/account/Install'
import { useBack } from './lib/useBack'
import EnCours from './features/billy/EnCours'
import Skill from './features/billy/Skill'
import Noter from './features/journal/Noter'
import DocumentForm from './features/profile/DocumentForm'
import DocumentView from './features/profile/DocumentView'
import Profile, { ProfileEditScreen } from './features/profile/Profile'
import Opening from './features/start/Opening'
import Questionnaire from './features/start/Questionnaire'
import Welcome from './features/start/Welcome'
import Today from './features/today/Today'
import { DressageAwards } from './features/training/DressageAwards'
import Exercise from './features/training/Exercise'
import { watchUser, type User } from './firebase/auth'
import { setClosingAccount } from './firebase/erase'
import { DataProvider } from './firebase/store'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/**
 * L’écran d’ouverture à chaque lancement de l’app (choix de Martin, T-017) : on touche la photo du chien pour entrer.
 * Ouverte sur un écran précis (notification, lien), l’app y va directement. Une seule fois par lancement : quand une
 * nouvelle version recharge l’app (mise à jour automatique), on reste où on était (T-021).
 */
const OPENED_KEY = 'billy.ouverture-montree'
function OpenOnLogo() {
  const navigate = useNavigate()
  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('depuis=rappel')) return
    try {
      if (sessionStorage.getItem(OPENED_KEY)) return
      sessionStorage.setItem(OPENED_KEY, '1')
    } catch {
      // Stockage indisponible : l’écran d’ouverture s’affiche à chaque chargement, comme avant.
    }
    if (hash === '' || hash === '#' || hash === '#/') navigate('/ouverture', { replace: true })
    // Une seule fois, au lancement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function InstallRoute() {
  const back = useBack('/profil')
  return <InstallGuide onBack={back} />
}

export default function App() {
  // undefined = session en cours de restauration
  const [user, setUser] = useState<User | null>()
  useEffect(
    () =>
      watchUser((next) => {
        // Compte supprimé ou déconnecté : le prochain compte repart normalement.
        if (!next) setClosingAccount(false)
        setUser(next)
      }),
    [],
  )

  if (user === undefined) return <Splash />
  if (!user) return <Login />

  return (
    <DataProvider
      key={user.uid}
      fallback={(offline) =>
        offline ? (
          <Splash title="Pas de réseau">Le tout premier lancement a besoin d’Internet pour préparer votre espace.</Splash>
        ) : (
          <Splash />
        )
      }
    >
      <ToastProvider>
        <DressageAwards />
        <AppTheme />
        <CommunitySync />
        <BonesBackfill />
        <FogBackfill />
        <HashRouter>
          <OpenOnLogo />
          <ScrollToTop />
          <Routes>
            <Route element={<TabLayout />}>
              <Route index element={<Today />} />
              <Route path="sante" element={<Calendar />} />
              <Route path="billy" element={<Billy />} />
              <Route path="billy/arbre" element={<Tree />} />
              <Route
                path="meute"
                element={
                  <Suspense fallback={<p className="px-5 text-muted">Chargement…</p>}>
                    <Meute />
                  </Suspense>
                }
              />
              <Route path="territoire" element={<Explorer />} />
              <Route path="journal" element={<Navigate to="/balades" replace />} />
              <Route path="carnet" element={<Navigate to="/balades" replace />} />
            </Route>
            <Route path="ouverture" element={<Opening />} />
            <Route path="questionnaire" element={<Questionnaire />} />
            <Route path="bienvenue" element={<Welcome />} />
            <Route path="noter" element={<Noter />} />
            <Route path="raconter" element={<Navigate to="/noter" replace />} />
            <Route path="competence/:id" element={<Skill />} />
            <Route path="en-cours" element={<EnCours />} />
            <Route path="boutique" element={<Shop />} />
            <Route path="meute/chien/:id" element={<DogPublic />} />
            <Route path="territoire/idees" element={<Ideas />} />
            <Route path="balades" element={<Walks />} />
            <Route path="exploration" element={<Navigate to="/territoire" replace />} />
            <Route path="ajouter-balade" element={<Navigate to="/territoire" replace />} />
            <Route path="importer" element={<ImportStrava />} />
            <Route path="importer/resultat" element={<ImportResult />} />
            <Route path="installer" element={<InstallRoute />} />
            <Route path="profil" element={<Profile />} />
            <Route path="profil/modifier" element={<ProfileEditScreen />} />
            {/* Anciennes adresses : rien n’est perdu, tout a une nouvelle place. */}
            <Route path="calendrier" element={<Navigate to="/sante" replace />} />
            <Route path="dressage" element={<Navigate to="/billy" replace />} />
            <Route path="boss/:id" element={<Navigate to="/billy" replace />} />
            <Route path="exposition" element={<Navigate to="/noter" replace />} />
            <Route path="evenement/nouveau" element={<EventForm />} />
            <Route path="evenement/:id" element={<EventForm />} />
            <Route path="souvenir/nouveau" element={<Navigate to="/noter" replace />} />
            <Route path="souvenir/:id" element={<EntryView />} />
            <Route path="souvenir/:id/modifier" element={<EntryForm />} />
            <Route path="exercice" element={<Exercise />} />
            <Route path="mission" element={<Mission />} />
            <Route path="sante/evenements" element={<HealthEvents />} />
            <Route path="sante/poids" element={<HealthWeight />} />
            <Route path="sante/repas" element={<HealthMeals />} />
            <Route path="sante/documents" element={<HealthDocuments />} />
            <Route path="seance" element={<Navigate to="/exercice" replace />} />
            <Route path="document/nouveau" element={<DocumentForm />} />
            <Route path="document/:id" element={<DocumentView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </DataProvider>
  )
}
