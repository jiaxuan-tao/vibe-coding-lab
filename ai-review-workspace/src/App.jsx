import { useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { initAuthSync } from './stores'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import StudyPlans from './pages/StudyPlans'
import Notes from './pages/Notes'
import Flashcards from './pages/Flashcards'
import Quiz from './pages/Quiz'
import Demo from './pages/Demo'

function App() {
  // Validate the persisted session against Supabase and keep auth state in sync
  // with token refreshes / cross-tab sign-out.
  useEffect(() => { initAuthSync() }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public demo: no account is needed for the core review flow. */}
          <Route path="/" element={<Navigate to="/demo" replace />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/login" element={<Navigate to="/demo" replace />} />
          <Route path="/signup" element={<Navigate to="/demo" replace />} />
          <Route path="/auth/callback" element={<Navigate to="/demo" replace />} />
          <Route path="/pro" element={<Navigate to="/demo" replace />} />
          <Route path="/pro/success" element={<Navigate to="/demo" replace />} />

          {/* Protected app — Layout renders Outlet for all children */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/home" element={<Home />} />
            <Route path="/study" element={<StudyPlans />} />
            <Route path="/study-plans" element={<StudyPlans />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/assignments" element={<Navigate to="/home" replace />} />
            <Route path="/calendar" element={<Navigate to="/home" replace />} />
            <Route path="/grades" element={<Navigate to="/home" replace />} />
            <Route path="/analytics" element={<Navigate to="/home" replace />} />
            <Route path="/habits" element={<Navigate to="/home" replace />} />
            <Route path="/focus" element={<Navigate to="/home" replace />} />
            <Route path="/leaderboard" element={<Navigate to="/home" replace />} />
            <Route path="/import" element={<Navigate to="/home" replace />} />
            <Route path="/settings" element={<Navigate to="/home" replace />} />
            <Route path="/profile" element={<Navigate to="/home" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
