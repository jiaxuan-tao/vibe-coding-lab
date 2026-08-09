import { useEffect } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { initAuthSync } from './stores'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import Home from './pages/Home'
import StudyPlans from './pages/StudyPlans'
import Notes from './pages/Notes'
import Flashcards from './pages/Flashcards'
import Quiz from './pages/Quiz'
import Demo from './pages/Demo'

function App() {
  useEffect(() => { initAuthSync() }, [])

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public demo: no account is needed for the core review flow. */}
          <Route path="/" element={<Navigate to="/demo" replace />} />
          <Route path="/demo" element={<Demo />} />

          <Route element={<Layout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/study" element={<StudyPlans />} />
            <Route path="/study-plans" element={<StudyPlans />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/quiz" element={<Quiz />} />
          </Route>

          <Route path="*" element={<Navigate to="/demo" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
