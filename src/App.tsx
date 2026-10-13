import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { TabLayout } from './components/TabBar'
import { ToastProvider } from './components/Toast'
import Login from './features/auth/Login'
import { Splash } from './features/auth/Splash'
import Calendar from './features/calendar/Calendar'
import EventForm from './features/calendar/EventForm'
import EntryForm from './features/journal/EntryForm'
import Journal from './features/journal/Journal'
import DocumentForm from './features/profile/DocumentForm'
import DocumentView from './features/profile/DocumentView'
import Profile from './features/profile/Profile'
import Today from './features/today/Today'
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
        <HashRouter>
          <ScrollToTop />
          <Routes>
            <Route element={<TabLayout />}>
              <Route index element={<Today />} />
              <Route path="calendrier" element={<Calendar />} />
              <Route path="journal" element={<Journal />} />
              <Route path="dressage" element={<Training />} />
            </Route>
            <Route path="profil" element={<Profile />} />
            <Route path="evenement/nouveau" element={<EventForm />} />
            <Route path="evenement/:id" element={<EventForm />} />
            <Route path="souvenir/nouveau" element={<EntryForm />} />
            <Route path="souvenir/:id" element={<EntryForm />} />
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
