import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, useNotesStore, useFlashcardsStore, useStudyPlansStore } from '../stores'
import { DEMO_NOTES, DEMO_DECKS, DEMO_QUIZ_HISTORY, DEMO_STUDY_PLANS } from '../utils/demoData'
import { clearReviewFeedback } from '../utils/reviewFeedback'

export default function Demo() {
  const navigate = useNavigate()
  const { enterDemoMode, isAuthenticated, isDemo } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && !isDemo) {
      navigate('/home', { replace: true })
      return
    }
    enterDemoMode()
    useNotesStore.getState().replaceNotes(DEMO_NOTES)
    useFlashcardsStore.getState().replaceDecks(DEMO_DECKS)
    useStudyPlansStore.getState().setStudyPlans(DEMO_STUDY_PLANS)
    localStorage.setItem('shiori-quiz-history', JSON.stringify(DEMO_QUIZ_HISTORY))
    clearReviewFeedback()
    navigate('/home', { replace: true })
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0b0e14', color: '#e8ebf4', fontFamily: "'Space Grotesk', sans-serif", fontSize: 15,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="pulse" style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 18px',
          background: 'linear-gradient(135deg, #9db8ff 0%, #5a8bff 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, color: '#0b0e14',
          boxShadow: '0 8px 32px rgba(90,139,255,0.4)',
        }}>复</div>
        <div style={{ color: '#9aa1b5' }}>正在准备复习工作台…</div>
      </div>
    </div>
  )
}
