import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const SHORTCUTS = [
  { key: 'gh', label: '前往今日复习', path: '/home' },
  { key: 'gn', label: '前往学习资料', path: '/notes' },
  { key: 'gs', label: '前往复习计划', path: '/study' },
  { key: 'gf', label: '前往记忆卡片', path: '/flashcards' },
  { key: 'gq', label: '前往知识测验', path: '/quiz' },
]

export const SHORTCUT_HELP = SHORTCUTS

export const useKeyboardShortcuts = () => {
  const navigate = useNavigate()
  const sequenceRef = useRef('')
  const timerRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      if (e.metaKey || e.ctrlKey) return

      const key = e.key.toLowerCase()
      if (!/^[a-z]$/.test(key)) return

      sequenceRef.current += key
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { sequenceRef.current = '' }, 600)

      const match = SHORTCUTS.find(s => s.key === sequenceRef.current)
      if (match) {
        sequenceRef.current = ''
        clearTimeout(timerRef.current)
        navigate(match.path)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      clearTimeout(timerRef.current)
    }
  }, [navigate])
}
