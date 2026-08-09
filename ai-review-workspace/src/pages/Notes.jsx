import { useState, useMemo } from 'react'
import { FileText, Plus, Search, Eye, Pencil, Trash2 } from 'lucide-react'
import { useNotesStore, useUIStore } from '../stores'
import { C, fonts, tint, btnPrimary } from '../utils/theme'

export default function Notes() {
  const { notes, addNote, updateNote, deleteNote } = useNotesStore()
  const theme = useUIStore(state => state.theme)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return (notes || []).filter(n =>
      (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
    )
  }, [notes, search])

  const active = selected ? (notes || []).find(n => n.id === selected) : null

  const handleNew = () => {
    const n = { id: Date.now().toString(), title: '未命名资料', content: '', createdAt: new Date().toISOString() }
    addNote(n)
    setSelected(n.id)
  }

  const panel = {
    background: `linear-gradient(180deg, ${C.cardSoft} 0%, ${C.card} 100%)`,
    borderRadius: 16, border: `1px solid ${C.border}`,
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  }

  return (
    <div data-theme={theme} className="notes-workspace" style={{ fontFamily: fonts.body, color: C.text, display: 'flex', height: 'calc(100vh - 150px)', minHeight: 420 }}>
      {/* Left panel */}
      <div className="notes-list-panel" style={{ ...panel, width: 300, flexShrink: 0, marginRight: 16 }}>
        <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid ${C.borderSoft}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: C.text }}>
              <FileText size={15} color={C.purple} /> 学习资料
            </h2>
            <button onClick={handleNew} style={{ ...btnPrimary, padding: '5px 12px', fontSize: 11 }}>
              <Plus size={12} /> 新建
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={13} color={C.textFaint} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索资料…"
              style={{
                width: '100%', padding: '8px 10px 8px 30px', borderRadius: 9,
                background: C.bg, border: `1px solid ${C.border}`,
                color: C.text, fontSize: 12.5, fontFamily: fonts.body,
                boxSizing: 'border-box', outline: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = C.blueDark }}
              onBlur={e => { e.target.style.borderColor = C.border }}
            />
          </div>
        </div>
        <div className="scrollbar-dense" style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: C.textMuted, fontSize: 13 }}>
              {search ? '没有匹配的资料。' : '还没有学习资料，先新建一条。'}
            </div>
          ) : filtered.map(n => (
            <div key={n.id} onClick={() => setSelected(n.id)} style={{
              padding: '12px 14px', cursor: 'pointer',
              borderBottom: `1px solid ${C.borderSoft}`,
              background: selected === n.id ? tint(C.blueDark, 0.1) : 'transparent',
              boxShadow: selected === n.id ? `inset 3px 0 0 ${C.blueDark}` : 'none',
              transition: 'background 0.13s ease',
            }}
              onMouseEnter={e => { if (selected !== n.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (selected !== n.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3 }}>
                {n.title || '未命名资料'}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                {(n.content || '').slice(0, 50)}{(n.content || '').length > 50 ? '…' : ''}
              </div>
              <div style={{ fontSize: 10, color: C.textFaint, marginTop: 4 }}>
                {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor panel */}
      <div className="notes-editor-panel" style={{ ...panel, flex: 1 }}>
        {!active ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18,
              background: tint(C.purple, 0.1), border: `1px solid ${tint(C.purple, 0.25)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.purple,
            }}>
              <FileText size={28} strokeWidth={1.8} />
            </div>
            <p style={{ color: C.textMuted, fontSize: 14 }}>选择一条资料，或新建一条资料</p>
            <button onClick={handleNew} style={btnPrimary}>
              <Plus size={14} /> 新建资料
            </button>
          </div>
        ) : (
          <>
            {/* Editor toolbar */}
            <div style={{
              padding: '12px 16px', borderBottom: `1px solid ${C.borderSoft}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <input
                value={active.title || ''}
                onChange={e => updateNote(active.id, { title: e.target.value })}
                placeholder="资料标题…"
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  color: C.text, fontSize: 16, fontWeight: 700,
                  fontFamily: fonts.heading,
                  outline: 'none', minWidth: 0,
                }}
              />
              <button onClick={() => setPreview(p => !p)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 8,
                border: `1px solid ${preview ? tint(C.blue, 0.4) : C.border}`,
                background: preview ? tint(C.blue, 0.1) : 'transparent',
                color: preview ? C.blue : C.textMuted,
                cursor: 'pointer', fontSize: 11, fontFamily: fonts.heading, fontWeight: 600,
              }}>
                {preview ? <><Pencil size={11} /> 编辑</> : <><Eye size={11} /> 预览</>}
              </button>
              <button onClick={() => { deleteNote(active.id); setSelected(null) }} aria-label="删除资料" style={{
                padding: '6px 9px', borderRadius: 8, border: `1px solid ${C.border}`,
                background: 'transparent', color: C.textFaint, cursor: 'pointer', display: 'flex',
                transition: 'color 0.15s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.color = C.pink}
                onMouseLeave={e => e.currentTarget.style.color = C.textFaint}
              ><Trash2 size={13} /></button>
            </div>

            {preview ? (
              <div style={{
                flex: 1, padding: '16px 20px', overflowY: 'auto',
                fontSize: 14, lineHeight: 1.8, color: C.text,
                whiteSpace: 'pre-wrap', fontFamily: fonts.body,
              }}>
                {active.content || <span style={{ color: C.textFaint }}>暂无可预览内容。</span>}
              </div>
            ) : (
              <textarea
                value={active.content || ''}
                onChange={e => updateNote(active.id, { content: e.target.value })}
                placeholder="开始记录学习资料…（支持 Markdown）"
                style={{
                  flex: 1, padding: '16px 20px',
                  background: 'transparent', border: 'none',
                  color: C.text, fontSize: 14, lineHeight: 1.8,
                  fontFamily: fonts.body,
                  resize: 'none', outline: 'none',
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
