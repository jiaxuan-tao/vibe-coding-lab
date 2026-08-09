import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, FileText, Layers, Puzzle, BookOpen, X,
} from 'lucide-react'
import { useUIStore } from '../stores'
import { C, fonts, tint } from '../utils/theme'

const navSections = [
  {
    label: '复习流程',
    items: [
      { icon: Home, label: '今日复习', path: '/home' },
      { icon: FileText, label: '学习资料', path: '/notes' },
      { icon: BookOpen, label: '复习计划', path: '/study-plans' },
      { icon: Layers, label: '记忆卡片', path: '/flashcards' },
      { icon: Puzzle, label: '知识测验', path: '/quiz' },
    ],
  },
]

const Sidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { sidebarMobileOpen, closeSidebarMobile, theme } = useUIStore()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setCollapsed(mobile ? false : window.innerWidth < 1280)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isActive = (path) => {
    if (path === '/home') return location.pathname === '/home'
    if (path === '/study-plans') return location.pathname.startsWith('/study')
    return location.pathname.startsWith(path)
  }

  const handleNav = (path) => {
    navigate(path)
    closeSidebarMobile()
  }

  const showLabels = !collapsed || isMobile
  const sidebarWidth = showLabels ? 240 : 72

  return (
    <>
      {/* Mobile overlay */}
      {sidebarMobileOpen && (
        <div
          onClick={closeSidebarMobile}
          style={{
            position: 'fixed', inset: 0, background: tint(C.text, 0.28),
            backdropFilter: 'blur(2px)', zIndex: 40,
          }}
        />
      )}

      <aside
        data-theme={theme}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          height: '100%',
          width: sidebarWidth,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          background: C.bgSoft,
          borderRight: `1px solid ${C.borderSoft}`,
          transition: 'width 0.22s ease, transform 0.25s ease',
          transform: isMobile && !sidebarMobileOpen ? 'translateX(-100%)' : 'translateX(0)',
        }}
      >
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '18px 16px',
          borderBottom: `1px solid ${C.borderSoft}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.blue} 0%, ${C.blueDark} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(90,139,255,0.35)',
          }}>
            <span style={{
              color: '#ffffff', fontWeight: 700, fontSize: 17,
              fontFamily: fonts.heading,
            }}>复</span>
          </div>
          {showLabels && (
            <div>
              <div style={{
                fontFamily: fonts.heading, fontWeight: 700, fontSize: 15,
                color: C.text, letterSpacing: '0.06em',
              }}>AI 复习工作台</div>
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: C.textFaint }}>
                从资料到复习反馈
              </div>
            </div>
          )}
          {sidebarMobileOpen && (
            <button
              onClick={closeSidebarMobile}
              aria-label="关闭菜单"
              style={{
                marginLeft: 'auto', background: 'none', border: 'none',
                color: C.textMuted, cursor: 'pointer', padding: 4, display: 'flex',
              }}
            ><X size={18} /></button>
          )}
        </div>

        {/* Nav */}
        <nav className="scrollbar-dense" style={{ flex: 1, overflowY: 'auto', padding: '10px 10px 12px' }}>
          {navSections.map((section) => (
            <div key={section.label} style={{ marginBottom: 10 }}>
              {showLabels && (
                <div style={{
                  fontFamily: fonts.heading, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: C.textFaint, padding: '8px 12px 4px',
                }}>{section.label}</div>
              )}
              {section.items.map((item) => {
                const active = isActive(item.path)
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNav(item.path)}
                    title={!showLabels ? item.label : undefined}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 11,
                      padding: showLabels ? '9px 12px' : '10px 0',
                      justifyContent: showLabels ? 'flex-start' : 'center',
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      marginBottom: 2,
                      background: active ? tint(C.blueDark, 0.14) : 'transparent',
                      color: active ? C.blue : C.textMuted,
                      boxShadow: active ? `inset 2px 0 0 ${C.blueDark}` : 'none',
                      transition: 'background 0.13s ease, color 0.13s ease',
                      fontFamily: fonts.body,
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = tint(C.blue, 0.08)
                        e.currentTarget.style.color = C.text
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = C.textMuted
                      }
                    }}
                  >
                    <Icon size={17} strokeWidth={active ? 2.4 : 2} style={{ flexShrink: 0 }} />
                    {showLabels && <span>{item.label}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
