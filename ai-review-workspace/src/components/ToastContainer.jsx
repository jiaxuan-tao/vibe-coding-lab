import { motion, AnimatePresence } from 'framer-motion'
import { useUIStore } from '../stores'
import { C } from '../utils/theme'

const STYLES = {
  success: { color: C.greenDark, border: 'rgba(77,255,145,0.4)', icon: '✓' },
  error:   { color: C.pink,      border: 'rgba(255,107,157,0.4)', icon: '✕' },
  warning: { color: C.orange,    border: 'rgba(255,214,160,0.4)', icon: '⚠' },
  info:    { color: C.blue,      border: 'rgba(175,198,255,0.4)', icon: 'ℹ' },
}

const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore()
  if (!toasts || toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
      <AnimatePresence>
        {toasts.map((toast) => {
          const s = STYLES[toast.type] || STYLES.info
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: C.card, border: `1px solid ${s.border}`,
                borderRadius: 12, padding: '12px 14px',
                boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
                fontFamily: "'Manrope', sans-serif", fontSize: 13, color: C.text,
              }}
            >
              <span style={{ color: s.color, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <p style={{ flex: 1, margin: 0, lineHeight: 1.45 }}>{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ flexShrink: 0, background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13, padding: 0 }}
              >✕</button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export default ToastContainer
