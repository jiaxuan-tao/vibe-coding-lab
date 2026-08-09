import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { KeyRound, Menu, Keyboard, Moon, Sun } from 'lucide-react'
import Sidebar from './Sidebar'
import AISettingsModal from './AISettingsModal'
import ToastContainer from './ToastContainer'
import ShortcutModal from './ShortcutModal'
import { useUIStore } from '../stores'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { applyTheme, C, fonts, tint } from '../utils/theme'

const Layout = () => {
  const { toggleSidebarMobile, theme, toggleTheme } = useUIStore()
  const location = useLocation()
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showAISettings, setShowAISettings] = useState(false)

  applyTheme(theme || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'dark')
  }, [theme])

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.key === '?') setShowShortcuts(s => !s)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useKeyboardShortcuts()

  const today = new Date().toLocaleDateString('zh-CN', { weekday: 'short', month: 'long', day: 'numeric' })

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: C.bg,
      position: 'relative',
    }}>
      {/* Ambient background glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: `
          radial-gradient(600px 400px at 85% -10%, ${tint(C.blueDark, 0.08)}, transparent 70%),
          radial-gradient(500px 350px at -5% 100%, ${tint(C.purpleDark, 0.05)}, transparent 70%)
        `,
      }} />

      {/* Sidebar spacer (desktop) */}
      <div className="sidebar-spacer" style={{ flexShrink: 0, transition: 'width 0.22s ease' }} />

      <Sidebar />

      {/* Main content */}
      <main style={{
        flex: 1,
        minHeight: '100vh',
        overflowY: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 24px', gap: 12,
          background: `linear-gradient(90deg, ${tint(C.purpleDark, 0.16)} 0%, ${tint(C.pink, 0.14)} 100%)`,
          borderBottom: `1px solid ${tint(C.purpleDark, 0.35)}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 600, color: C.purple, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              本地工作台：内容仅保存在当前浏览器
            </span>
          </div>
        </div>

        {/* Topbar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px',
          borderBottom: `1px solid ${C.borderSoft}`,
          background: tint(C.bg, 0.88),
          backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 30,
          flexShrink: 0, gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={toggleSidebarMobile}
              className="mobile-hamburger"
              aria-label="打开菜单"
              style={{
                display: 'none', padding: 7, borderRadius: 9,
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${C.border}`,
                cursor: 'pointer', color: C.text,
              }}
            >
              <Menu size={18} />
            </button>
            <span style={{ fontFamily: fonts.body, fontSize: 13, color: C.textMuted }}>{today}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowAISettings(true)}
              title="AI 设置"
              aria-label="AI 设置"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textMuted, cursor: 'pointer',
              }}
            ><KeyRound size={15} /></button>
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
              aria-label={theme === 'dark' ? '切换浅色模式' : '切换深色模式'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32,
                borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textMuted, cursor: 'pointer',
              }}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              title="快捷键（?）"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${C.border}`,
                color: C.textFaint, cursor: 'pointer',
                fontFamily: fonts.body, fontSize: 11.5,
              }}
            >
              <Keyboard size={13} /> <span className="hide-mobile">快捷键</span> <kbd style={{
                fontFamily: fonts.heading, fontSize: 10, padding: '1px 5px',
                borderRadius: 4, background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.border}`,
              }}>?</kbd>
            </button>
          </div>
        </header>

        <div key={location.pathname} className="page-enter" style={{ padding: '24px 24px 48px', flex: 1 }}>
          <Outlet />
        </div>
      </main>

      <ShortcutModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <AISettingsModal open={showAISettings} onClose={() => setShowAISettings(false)} />
      <ToastContainer />

      <style>{`
        .sidebar-spacer { width: 240px; }
        @media (max-width: 1279px) { .sidebar-spacer { width: 72px; } }
        @media (max-width: 1023px) {
          .sidebar-spacer { display: none; }
          .mobile-hamburger { display: flex !important; }
          .hide-mobile { display: none; }
        }
      `}</style>
    </div>
  )
}

export default Layout
