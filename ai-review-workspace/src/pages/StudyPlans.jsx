import { useState } from 'react'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { useStudyPlansStore, useUIStore } from '../stores'
import { C, fonts, tint, inputStyle, btnPrimary, btnGhost } from '../utils/theme'
import { PageHeader, Card, Empty } from '../components/ui'
import { generateStudyPlan } from '../utils/aiService'

export default function StudyPlans() {
  const { plans, addStudyPlan, deleteStudyPlan } = useStudyPlansStore()
  const { theme, qwenApiKey, addToast } = useUIStore()
  const [form, setForm] = useState({ subject: '', examDate: '' })
  const [activePlan, setActivePlan] = useState(null)
  const [loading, setLoading] = useState(false)

  const createPlan = async () => {
    if (!form.subject.trim()) return
    setLoading(true)
    const result = await generateStudyPlan({ subject: form.subject.trim(), examDate: form.examDate })
    const plan = { ...result.data, id: Date.now().toString() }
    const id = addStudyPlan(plan)
    setActivePlan(id)
    setForm({ subject: '', examDate: '' })
    setLoading(false)
    if (result.source === 'sample') addToast({ type: 'info', message: qwenApiKey ? 'AI 暂不可用，已使用本地样例计划' : '未配置 AI Key，已使用本地样例计划' })
    else addToast({ type: 'success', message: '已生成 AI 复习计划' })
  }

  const shown = activePlan ? plans.find(p => p.id === activePlan) : (plans.length > 0 ? plans[0] : null)

  return (
    <div data-theme={theme} style={{ fontFamily: fonts.body, color: C.text, maxWidth: 820, margin: '0 auto' }}>
      <PageHeader icon={BookOpen} accent={C.blue} title="复习计划" subtitle="把复习主题拆成可执行的周任务" />

      <Card style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ fontFamily: fonts.heading, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>新建一份复习计划</div>
        <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6, marginBottom: 16 }}>{qwenApiKey ? '将根据主题生成 AI 复习计划；请求失败时会自动使用本地样例。' : '未配置 AI Key 时会创建本地样例计划，不影响体验。'}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="输入复习主题，例如：概率论期末" style={{ ...inputStyle, flex: 2, minWidth: 200, width: 'auto' }} />
          <input type="date" value={form.examDate} onChange={e => setForm(f => ({ ...f, examDate: e.target.value }))} style={{ ...inputStyle, flex: 1, minWidth: 140, width: 'auto' }} />
          <button onClick={createPlan} disabled={!form.subject.trim() || loading} style={{ ...btnPrimary, opacity: form.subject.trim() && !loading ? 1 : 0.5, cursor: form.subject.trim() && !loading ? 'pointer' : 'not-allowed' }}><Plus size={14} /> {loading ? '生成中…' : '创建计划'}</button>
        </div>
      </Card>

      {plans.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {plans.map(p => {
            const isActive = activePlan === p.id || (!activePlan && plans[0]?.id === p.id)
            return <button key={p.id} onClick={() => setActivePlan(p.id)} style={{ padding: '6px 16px', borderRadius: 999, border: `1px solid ${isActive ? tint(C.blue, 0.4) : C.border}`, background: isActive ? tint(C.blue, 0.12) : 'transparent', color: isActive ? C.blue : C.textMuted, cursor: 'pointer', fontFamily: fonts.heading, fontSize: 12, fontWeight: 600 }}>{p.subject || p.title}</button>
          })}
        </div>
      )}

      {shown ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12 }}>
            <div>
              <h2 style={{ fontFamily: fonts.heading, fontSize: 18, fontWeight: 700, color: C.text }}>{shown.subject || shown.title}</h2>
              {shown.examDate && <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>目标日期：{shown.examDate}</p>}
            </div>
            <button onClick={() => { deleteStudyPlan(shown.id); setActivePlan(null) }} style={{ ...btnGhost, padding: '6px 12px', fontSize: 12, color: C.textMuted }}><Trash2 size={12} /> 删除</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(shown.weeks || []).map(w => (
              <Card key={w.week} className="hover-lift" style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${C.blue}, ${C.blueDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.heading, fontWeight: 700, fontSize: 12, color: '#0b0e14', flexShrink: 0 }}>{w.week}周</div>
                  <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 15, color: C.text }}>{w.topic}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {(w.tasks || []).map((task, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: C.textMuted }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: C.blue, flexShrink: 0 }} /> {task}</div>)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card style={{ padding: 0 }}><Empty icon={BookOpen} accent={C.blue} title="还没有复习计划" description="输入一个复习主题，创建一份本地样例计划。" /></Card>
      )}
    </div>
  )
}
