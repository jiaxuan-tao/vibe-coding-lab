import { Component } from 'react'
import { RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { fallback, inline } = this.props

    if (fallback) return fallback

    if (inline) {
      return (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'rgba(255,77,106,0.08)',
          border: '1px solid rgba(255,77,106,0.3)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontFamily: 'VT323', fontSize: 15, color: '#ff4d6a' }}>
            Component error — refresh to try again
          </span>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff4d6a' }}
          >
            <RefreshCw size={13} />
          </button>
        </div>
      )
    }

    return (
      <div style={{
        minHeight: '100vh', background: '#0b0e14',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16,
        padding: 32,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #ff4d6a, #c44dff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: '#fff', fontSize: 24 }}>栞</span>
        </div>
        <p style={{ fontFamily: '"Press Start 2P"', fontSize: 11, color: '#ff4d6a' }}>
          SOMETHING WENT WRONG
        </p>
        <p style={{ fontFamily: 'VT323', fontSize: 16, color: '#606080', maxWidth: 400, textAlign: 'center' }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
          style={{
            padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
            background: 'rgba(196,77,255,0.15)', border: '1px solid rgba(196,77,255,0.4)',
            color: '#c44dff', fontFamily: '"Press Start 2P"', fontSize: 9,
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <RefreshCw size={12} /> RELOAD APP
        </button>
      </div>
    )
  }
}
