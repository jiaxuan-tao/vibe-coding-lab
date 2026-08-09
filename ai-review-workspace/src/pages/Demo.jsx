import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { initializeDemoWorkspace } from './demoWorkspace'
import { fonts } from '../utils/theme'

export default function Demo() {
  const navigate = useNavigate()

  useEffect(() => {
    initializeDemoWorkspace()
    navigate('/home', { replace: true })
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0b0e14', color: '#e8ebf4', fontFamily: fonts.body, fontSize: 15,
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
