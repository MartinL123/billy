import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { TabLayout } from './components/TabBar'
import { ToastProvider } from './components/Toast'
import Login from './features/auth/Login'
import { Splash } from './features/auth/Splash'
import Calendar from './features/calendar/Calendar'
import EventForm from './features/calendar/EventForm'
import EntryForm from './features/journal/EntryForm'
import Journal from './features/journal/Journal'
import Raconter from './features/journal/Raconter'
import DocumentForm from './features/profile/DocumentForm'
import DocumentView from './features/profile/DocumentView'
import Profile from './features/profile/Profile'
import Opening from './features/start/Opening'
import Questionnaire from './features/start/Questionnaire'
import Today from './features/today/Today'
import BossSheet from './features/training/BossSheet'
import { DressageAwards } from './features/training/DressageAwards'
import ExposureForm from './features/training/ExposureForm'
import Session from './features/training/Session'
import Training from './features/training/Training'
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
              <Route path="calendrier" element={<Calendar />} />
              <Route path="carnet" element={<Journal />} />
              <Route path="journal" element={<Navigate to="/carnet" replace />} />
              <Route path="dressage" element={<Training />} />
            </Route>
            <Route path="ouverture" element={<Opening />} />
            <Route path="questionnaire" element={<Questionnaire />} />
            <Route path="raconter" element={<Raconter />} />
            <Route path="profil" element={<Profile />} />
            <Route path="evenement/nouveau" element={<EventForm />} />
            <Route path="evenement/:id" element={<EventForm />} />
            <Route path="souvenir/nouveau" element={<Navigate to="/raconter" replace />} />
            <Route path="souvenir/:id" element={<EntryForm />} />
            <Route path="boss/:id" element={<BossSheet />} />
            <Route path="seance" element={<Session />} />
            <Route path="exposition" element={<ExposureForm />} />
            <Route path="document/nouveau" element={<DocumentForm />} />
            <Route path="document/:id" element={<DocumentView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </ToastProvider>
    </DataProvider>
  )
}
