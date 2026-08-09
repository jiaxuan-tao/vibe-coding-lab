import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'
import { SHORTCUT_HELP } from '../hooks/useKeyboardShortcuts'
import { C, fonts, tint } from '../utils/theme'

const extra = [{ key: '?', label: '打开快捷键说明' }]

export default function ShortcutModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              zIndex: 301, width: 'min(520px, 92vw)',
              background: tint(C.bg, 0.98),
              border: `1px solid ${tint(C.blue, 0.2)}`,
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${C.borderSoft}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Keyboard size={16} style={{ color: C.blue }} />
                <span style={{ fontFamily: fonts.heading, fontSize: 12, fontWeight: 700, color: C.blue }}>快捷键</span>
              </div>
              <button onClick={onClose} aria-label="关闭快捷键" style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textFaint, padding: 4 }}>
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
              <p style={{ fontFamily: fonts.heading, fontSize: 10, color: C.textFaint, letterSpacing: '0.08em', marginBottom: 10 }}>页面跳转</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 20 }}>
                {SHORTCUT_HELP.map(({ key, label }) => (
                  <ShortcutRow key={key} keyStr={key} label={label} />
                ))}
              </div>

              <p style={{ fontFamily: fonts.heading, fontSize: 10, color: C.textFaint, letterSpacing: '0.08em', marginBottom: 10 }}>通用</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {extra.map(({ key, label }) => (
                  <ShortcutRow key={key} keyStr={key} label={label} />
                ))}
              </div>
            </div>

            <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.borderSoft}`, textAlign: 'center' }}>
              <span style={{ fontFamily: fonts.body, fontSize: 12, color: C.textFaint }}>按 Esc 或点击遮罩关闭</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ShortcutRow({ keyStr, label }) {
  const keys = keyStr.split('+')
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 8, background: tint(C.text, 0.035) }}>
      <span style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMuted }}>{label}</span>
      <div style={{ display: 'flex', gap: 3 }}>
        {keys.map((k, i) => (
          <kbd key={i} style={{
            padding: '2px 7px', borderRadius: 5,
            background: tint(C.blue, 0.1), border: `1px solid ${tint(C.blue, 0.2)}`,
            fontFamily: 'monospace', fontSize: 11, color: C.blue,
          }}>{k}</kbd>
        ))}
      </div>
    </div>
  )
}
