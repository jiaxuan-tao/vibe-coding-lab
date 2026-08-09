import { useState } from 'react'
import { Layers, Plus, ArrowLeft, ArrowRight, RotateCcw, Trash2 } from 'lucide-react'
import { useFlashcardsStore, useUIStore } from '../stores'
import { C, fonts, tint, inputStyle, btnPrimary, btnGhost, iconBox } from '../utils/theme'
import { PageHeader, Empty } from '../components/ui'

function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: tint(C.text, 0.36), backdropFilter: 'blur(3px)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} className="page-enter" style={{
        background: `linear-gradient(180deg, ${C.cardSoft} 0%, ${C.card} 100%)`,
        border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, width: 'min(480px,92vw)',
        boxShadow: `0 24px 64px ${tint(C.text, 0.26)}`,
      }}>
        {children}
      </div>
    </div>
  )
}

export default function Flashcards() {
  const { decks, addDeck, deleteDeck } = useFlashcardsStore()
  const theme = useUIStore(state => state.theme)
  const [studyDeck, setStudyDeck] = useState(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deckName, setDeckName] = useState('')

  const deck = studyDeck ? (decks || []).find(d => d.id === studyDeck) : null
  const cards = deck?.cards || []
  const card = cards[cardIndex]

  const handleAddDeck = () => {
    if (!deckName.trim()) return
    addDeck({ id: Date.now().toString(), name: deckName, cards: [], createdAt: new Date().toISOString() })
    setDeckName('')
    setShowModal(false)
  }

  if (deck) {
    return (
      <div data-theme={theme} style={{ fontFamily: fonts.body, color: C.text, maxWidth: 620, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <button onClick={() => { setStudyDeck(null); setCardIndex(0); setFlipped(false) }} style={{ ...btnGhost, padding: '7px 14px', color: C.textMuted }}>
            <ArrowLeft size={14} /> 返回
          </button>
          <h2 style={{ fontFamily: fonts.heading, fontSize: 20, fontWeight: 700, color: C.text }}>{deck.name}</h2>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textMuted, fontFamily: fonts.heading, fontWeight: 600 }}>
            {cards.length ? `${cardIndex + 1} / ${cards.length}` : '0 张卡片'}
          </span>
        </div>

        {cards.length === 0 ? (
          <div style={{
            background: `linear-gradient(180deg, ${C.cardSoft} 0%, ${C.card} 100%)`,
            border: `1px solid ${C.border}`, borderRadius: 16,
          }}>
            <Empty
              icon={Layers}
              accent={C.purple}
              title="这个卡组还没有卡片"
              description="可以手动补充卡片，或先体验预置的示例卡组。"
            />
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div style={{ height: 5, background: tint(C.blue, 0.1), borderRadius: 3, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{
                height: '100%', width: `${((cardIndex + 1) / cards.length) * 100}%`,
                background: `linear-gradient(90deg, ${C.blue}, ${C.blueDark})`,
                borderRadius: 3, transition: 'width 0.3s ease',
              }} />
            </div>

            {/* Card */}
            <div onClick={() => setFlipped(f => !f)} style={{
              background: `linear-gradient(180deg, ${C.cardSoft} 0%, ${C.card} 100%)`,
              border: `1px solid ${flipped ? tint(C.purple, 0.5) : C.border}`,
              borderRadius: 20, padding: '48px 32px', textAlign: 'center', cursor: 'pointer',
              minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12, marginBottom: 24,
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              boxShadow: flipped ? `0 0 40px ${tint(C.purple, 0.15)}` : '0 8px 24px rgba(0,0,0,0.3)',
              userSelect: 'none',
            }}>
              <div style={{
                fontSize: 11, color: flipped ? C.purple : C.textFaint, fontFamily: fonts.heading,
                fontWeight: 700, letterSpacing: '0.12em', marginBottom: 8,
              }}>
                {flipped ? '答案面' : '问题面'}，点击翻转
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, color: flipped ? C.purple : C.text, lineHeight: 1.5 }}>
                {flipped ? card.back : card.front}
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setCardIndex(i => Math.max(0, i - 1)); setFlipped(false) }}
                disabled={cardIndex === 0}
                style={{ ...btnGhost, color: cardIndex === 0 ? C.textFaint : C.text, cursor: cardIndex === 0 ? 'not-allowed' : 'pointer' }}
              ><ArrowLeft size={14} /> 上一张</button>
              <button onClick={() => setFlipped(false)} style={{ ...btnGhost, color: C.textMuted }}>
                <RotateCcw size={13} /> 翻回问题面
              </button>
              <button
                onClick={() => { setCardIndex(i => Math.min(cards.length - 1, i + 1)); setFlipped(false) }}
                disabled={cardIndex === cards.length - 1}
                style={{ ...btnGhost, color: cardIndex === cards.length - 1 ? C.textFaint : C.text, cursor: cardIndex === cards.length - 1 ? 'not-allowed' : 'pointer' }}
              >下一张 <ArrowRight size={14} /></button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div data-theme={theme} style={{ fontFamily: fonts.body, color: C.text, maxWidth: 920, margin: '0 auto' }}>
      <PageHeader
        icon={Layers}
        accent={C.purple}
        title="记忆卡片"
        subtitle="用简短问答巩固关键知识点"
        actions={
          <button onClick={() => setShowModal(true)} style={btnPrimary}>
            <Plus size={15} /> 新建卡组
          </button>
        }
      />

      {(!decks || decks.length === 0) ? (
        <div style={{
          background: `linear-gradient(180deg, ${C.cardSoft} 0%, ${C.card} 100%)`,
          border: `1px solid ${C.border}`, borderRadius: 16,
        }}>
          <Empty
            icon={Layers}
            accent={C.purple}
            title="还没有记忆卡片"
            description="新建一个卡组，按你的复习主题手动添加卡片。"
            action={() => setShowModal(true)}
            actionLabel="新建第一个卡组"
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 14 }}>
          {decks.map(d => (
            <div key={d.id} className="hover-lift" style={{
              background: `linear-gradient(180deg, ${C.cardSoft} 0%, ${C.card} 100%)`,
              border: `1px solid ${C.border}`, borderRadius: 14, padding: 20,
            }}>
              <div style={{ ...iconBox(C.purple, 42), marginBottom: 14 }}>
                <Layers size={20} strokeWidth={2.2} />
              </div>
              <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>{(d.cards || []).length} 张卡片</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setStudyDeck(d.id); setCardIndex(0); setFlipped(false) }} style={{ ...btnPrimary, flex: 1, padding: '8px 0', fontSize: 12 }}>
                  开始复习
                </button>
                <button onClick={e => { e.stopPropagation(); deleteDeck(d.id) }} aria-label="删除卡组" style={{
                  padding: '8px 11px', borderRadius: 10, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s ease',
                }}
                  onMouseEnter={e => e.currentTarget.style.color = C.pink}
                  onMouseLeave={e => e.currentTarget.style.color = C.textFaint}
                ><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)}>
        <h2 style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 18 }}>新建卡组</h2>
        <label style={{ display: 'block', fontSize: 12, color: C.textMuted, marginBottom: 6, fontWeight: 700 }}>卡组名称</label>
        <input
          value={deckName} onChange={e => setDeckName(e.target.value)}
          placeholder="例如：概率论核心概念"
          onKeyDown={e => e.key === 'Enter' && handleAddDeck()}
          style={{ ...inputStyle, marginBottom: 20 }}
          onFocus={e => { e.target.style.borderColor = C.blueDark }}
          onBlur={e => { e.target.style.borderColor = C.border }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={() => setShowModal(false)} style={{ ...btnGhost, color: C.textMuted }}>取消</button>
          <button onClick={handleAddDeck} style={btnPrimary}>创建卡组</button>
        </div>
      </Modal>
    </div>
  )
}
