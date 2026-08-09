import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { BookOpen, CalendarCheck, CheckCircle2, CircleAlert, FileText, Layers, Puzzle, ArrowRight, Target } from 'lucide-react'
import { useFlashcardsStore, useNotesStore, useStudyPlansStore, useUIStore } from '../stores'
import { C, fonts, tint } from '../utils/theme'
import { Card, SectionTitle, StatCard } from '../components/ui'
import { getReviewFeedback } from '../utils/reviewFeedback'

export default function Home() {
  const navigate = useNavigate()
  const { notes } = useNotesStore()
  const { decks } = useFlashcardsStore()
  const { plans } = useStudyPlansStore()
  const theme = useUIStore(state => state.theme)
  const feedback = getReviewFeedback()

  const name = '同学'
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })
  const cardCount = useMemo(() => (decks || []).reduce((total, deck) => total + (deck.cards || []).length, 0), [decks])
  const reviewTasks = [
    { step: '01', title: '阅读学习资料', description: '先回顾概率分布与期望的关键定义与公式。', path: '/notes', icon: FileText, color: C.blue },
    { step: '02', title: '查看复习计划', description: '确认本周任务顺序，再安排今天的复习时间。', path: '/study-plans', icon: BookOpen, color: C.purple },
    { step: '03', title: '复习记忆卡片', description: '用简短的问答巩固容易混淆的知识点。', path: '/flashcards', icon: Layers, color: C.green },
    { step: '04', title: '完成知识测验', description: feedback ? `已完成 ${feedback.score}/${feedback.total}，查看反馈决定下一步。` : '用一组示例题检查本轮复习是否有效。', path: '/quiz', icon: Puzzle, color: C.orange, done: Boolean(feedback) },
  ]
  const primaryWeakPoint = feedback?.weakPoints?.[0]
  const focusTitle = primaryWeakPoint ? `优先回看：${primaryWeakPoint.topic}` : '先巩固公式，再做测验'
  const focusDescription = primaryWeakPoint ? primaryWeakPoint.recommendation : '示例内容把“E(aX+b)”和“方差与标准差”标为容易混淆的点，建议完成卡片后再进入测验。'
  const focusAction = primaryWeakPoint ? '查看对应资料' : '开始复习卡片'
  const focusPath = primaryWeakPoint ? primaryWeakPoint.path : '/flashcards'

  return (
    <div data-theme={theme} style={{ fontFamily: fonts.body, color: C.text, maxWidth: 1020, margin: '0 auto' }}>
      <div style={{ marginBottom: 26 }}>
        <h1 style={{ fontFamily: fonts.heading, fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 6 }}>{name}，开始今天的复习</h1>
        <p style={{ fontSize: 13, color: C.textMuted }}>{today}</p>
      </div>

      <Card style={{ padding: '18px 20px', marginBottom: 20, borderColor: tint(C.blue, 0.28) }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, flexShrink: 0, background: tint(C.blue, 0.12), color: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Target size={21} /></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, marginBottom: 5 }}>本轮复习目标：概率分布与期望</div>
            <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.65 }}>按“资料、计划、卡片、测验”的顺序完成一轮，重点检查期望公式和方差的理解。</p>
          </div>
          <button onClick={() => navigate('/notes')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 13px', borderRadius: 9, border: `1px solid ${tint(C.blue, 0.35)}`, background: tint(C.blue, 0.08), color: C.blue, cursor: 'pointer', fontFamily: fonts.heading, fontSize: 12, fontWeight: 700 }}>查看资料 <ArrowRight size={13} /></button>
        </div>
      </Card>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <StatCard icon={FileText} label="学习资料" value={notes?.length || 0} color={C.purple} />
        <StatCard icon={CalendarCheck} label="复习计划" value={plans?.length || 0} color={C.blue} />
        <StatCard icon={Layers} label="待复习卡片" value={cardCount} color={C.green} />
        <StatCard icon={CheckCircle2} label="本轮测验" value={feedback ? `${feedback.score}/${feedback.total}` : '未开始'} color={feedback ? C.green : C.orange} />
      </div>

      <div className="grid-2">
        <Card>
          <SectionTitle icon={CalendarCheck} color={C.blue}>今日任务</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {reviewTasks.map((task) => {
              const Icon = task.icon
              return <button key={task.path} onClick={() => navigate(task.path)} className="hover-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 8px', margin: '0 -8px', border: 'none', borderBottom: `1px solid ${C.borderSoft}`, background: 'transparent', color: C.text, cursor: 'pointer', textAlign: 'left', fontFamily: fonts.body }}>
                <span style={{ fontFamily: fonts.heading, fontSize: 11, fontWeight: 700, color: task.color }}>{task.done ? '完成' : task.step}</span>
                <span style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: task.color, background: tint(task.color, 0.1), borderRadius: 8 }}><Icon size={15} /></span>
                <span style={{ flex: 1, minWidth: 0 }}><span style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{task.title}</span><span style={{ display: 'block', fontSize: 11.5, lineHeight: 1.5, color: C.textFaint }}>{task.description}</span></span>
                <ArrowRight size={15} color={C.textFaint} />
              </button>
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={primaryWeakPoint ? CircleAlert : Target} color={primaryWeakPoint ? C.orange : C.orange}>{feedback ? '测验反馈' : '本轮重点'}</SectionTitle>
          <div style={{ padding: '4px 0 12px' }}>
            <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 7 }}>{focusTitle}</div>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7, marginBottom: 16 }}>{focusDescription}</p>
            <button onClick={() => navigate(focusPath)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 13px', border: `1px solid ${tint(primaryWeakPoint ? C.orange : C.green, 0.3)}`, borderRadius: 9, background: tint(primaryWeakPoint ? C.orange : C.green, 0.08), color: primaryWeakPoint ? C.orange : C.green, cursor: 'pointer', fontFamily: fonts.heading, fontSize: 12, fontWeight: 700 }}>{primaryWeakPoint ? <FileText size={14} /> : <Layers size={14} />} {focusAction}</button>
          </div>
        </Card>
      </div>
    </div>
  )
}
