import { Navigate, useLocation } from 'react-router'
import { useAuthStore } from '../stores'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isDemo, _hasHydrated } = useAuthStore()
  const location = useLocation()

  // Demo users bypass the hydration wait — enterDemoMode() sets state synchronously
  if (isDemo) return children

  if (isLoading || !_hasHydrated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0e14' }}>
        <div style={{
          width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #ff6b9d 0%, #c44dff 100%)',
          clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
        }}>
          <span style={{ color: 'white', fontWeight: 'bold', fontSize: 24, fontFamily: 'serif' }}>栞</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/demo" state={{ from: location }} replace />
  }

  return children
}

export default ProtectedRoute
