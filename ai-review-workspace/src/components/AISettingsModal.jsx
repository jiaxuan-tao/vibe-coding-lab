import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, Trash2, X } from 'lucide-react'
import { useUIStore } from '../stores'
import { C, fonts, tint, inputStyle, btnPrimary, btnGhost } from '../utils/theme'

export default function AISettingsModal({ open, onClose }) {
  const { qwenApiKey, setQwenApiKey } = useUIStore()
  const [value, setValue] = useState(qwenApiKey || '')
  const [show, setShow] = useState(false)

  useEffect(() => { if (open) setValue(qwenApiKey || '') }, [open, qwenApiKey])
  if (!open) return null

  const save = () => {
    setQwenApiKey(value.trim())
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: tint(C.text, 0.34), backdropFilter: 'blur(3px)' }}>
      <div onClick={event => event.stopPropagation()} style={{ width: 'min(500px, 100%)', background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: `0 24px 64px ${tint(C.text, 0.26)}`, padding: 24, fontFamily: fonts.body, color: C.text }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: tint(C.blue, 0.12), color: C.blue }}><KeyRound size={18} /></div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: fonts.heading, fontSize: 17, fontWeight: 700 }}>AI 设置</h2>
            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>可选配置，不影响本地样例体验。</p>
          </div>
          <button onClick={onClose} aria-label="关闭 AI 设置" style={{ padding: 5, border: 'none', background: 'transparent', color: C.textFaint, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 7 }}>Qwen API 密钥</label>
        <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.6, marginBottom: 10 }}>密钥仅保存在当前浏览器，并由浏览器直接发送给 Qwen；不要填入团队或项目私钥。</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input type={show ? 'text' : 'password'} value={value} onChange={event => setValue(event.target.value)} placeholder="sk-..." style={{ ...inputStyle, flex: 1, width: 'auto' }} />
          <button onClick={() => setShow(current => !current)} title={show ? '隐藏密钥' : '显示密钥'} aria-label={show ? '隐藏密钥' : '显示密钥'} style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>{show ? <EyeOff size={15} /> : <Eye size={15} />}</button>
        </div>
        <a href="https://bailian.console.aliyun.com/" target="_blank" rel="noreferrer" style={{ display: 'inline-block', color: C.blue, fontSize: 12, marginBottom: 20, textDecoration: 'none' }}>打开阿里云百炼控制台</a>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button onClick={() => { setValue(''); setQwenApiKey('') }} style={{ ...btnGhost, color: C.textMuted, padding: '9px 12px' }}><Trash2 size={14} /> 清除</button>
          <div style={{ display: 'flex', gap: 8 }}><button onClick={onClose} style={{ ...btnGhost, color: C.textMuted }}>取消</button><button onClick={save} style={btnPrimary}>保存</button></div>
        </div>
      </div>
    </div>
  )
}
