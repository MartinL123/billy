import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { TabLayout } from './components/TabBar'
import { ToastProvider } from './components/Toast'
import Login from './features/auth/Login'
import { Splash } from './features/auth/Splash'
import Calendar from './features/calendar/Calendar'
import EventForm from './features/calendar/EventForm'
import EntryForm from './features/journal/EntryForm'
import Billy from './features/billy/Billy'
import EnCours from './features/billy/EnCours'
import Skill from './features/billy/Skill'
import Journal from './features/journal/Journal'
import Noter from './features/journal/Noter'
import DocumentForm from './features/profile/DocumentForm'
import DocumentView from './features/profile/DocumentView'
import Profile, { ProfileEditScreen } from './features/profile/Profile'
import Opening from './features/start/Opening'
import Questionnaire from './features/start/Questionnaire'
import Today from './features/today/Today'
import { DressageAwards } from './features/training/DressageAwards'
import Exercise from './features/training/Exercise'
import Session from './features/training/Session'
import { watchUser, type User } from './firebase/auth'
import { DataProvider } from './firebase/store'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** À chaque lancement de l'app, on commence par l'écran d'ouverture. */
function OpenOnLogo() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate('/ouverture', { replace: true })
    // Une seule fois, au lancement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

export default function App() {
  // undefined = session en cours de restauration
  const [user, setUser] = useState<User | null>()
  useEffect(() => watchUser(setUser), [])

  if (user === undefined) return <Splash />
  if (!user) return <Login />

  return (
    <DataProvider
      key={user.uid}
      fallback={(offline) =>
        offline ? (
          <Splash title="Pas de réseau">Le tout premier lancement a besoin d'Internet pour préparer le profil de Billy.</Splash>
        ) : (
          <Splash />
        )
      }
    >
      <ToastProvider>
        <DressageAwards />
        <HashRouter>
          <OpenOnLogo />
          <ScrollToTop />
          <Routes>
            <Route element={<TabLayout />}>
              <Route index element={<Today />} />
              <Route path="sante" element={<Calendar />} />
              <Route path="billy" element={<Billy />} />
              <Route path="carnet" element={<Journal />} />
              <Route path="journal" element={<Navigate to="/carnet" replace />} />
            </Route>
            <Route path="ouverture" element={<Opening />} />
            <Route path="questionnaire" element={<Questionnaire />} />
            <Route path="noter" element={<Noter />} />
            <Route path="raconter" element={<Navigate to="/noter" replace />} />
            <Route path="competence/:id" element={<Skill />} />
            <Route path="en-cours" element={<EnCours />} />
            <Route path="profil" element={<Profile />} />
            <Route path="profil/modifier" element={<ProfileEditScreen />} />
            {/* Anciennes adresses : rien n'est perdu, tout a une nouvelle place. */}
            <Route path="calendrier" element={<Navigate to="/sante" replace />} />
            <Route path="dressage" element={<Navigate to="/billy" replace />} />
            <Route path="boss/:id" element={<Navigate to="/billy" replace />} />
            <Route path="exposition" element={<Navigate to="/noter" replace />} />
            <Route path="evenement/nouveau" element={<EventForm />} />
            <Route path="evenement/:id" element={<EventForm />} />
            <Route path="souvenir/nouveau" element={<Navigate to="/noter" replace />} />
            <Route path="souvenir/:id" element={<EntryForm />} />
            <Route path="exercice" element={<Exercise />} />
            <Route path="seance" element={<Session />} />
            <Route path="document/nouveau" element={<DocumentForm />} />
            <Route path="document/:id" element={<DocumentView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </DataProvider>
  )
}
