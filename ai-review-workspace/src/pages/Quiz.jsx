import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, CircleCheck, Puzzle, Sparkles, Trophy, ThumbsUp, X } from 'lucide-react'
import { C, fonts, tint, btnPrimary, btnGhost } from '../utils/theme'
import { PageHeader, Card } from '../components/ui'
import { clearReviewFeedback, saveReviewFeedback } from '../utils/reviewFeedback'
import { generateQuiz } from '../utils/aiService'
import { useNotesStore, useUIStore } from '../stores'

export default function Quiz() {
  const navigate = useNavigate()
  const { theme, qwenApiKey, addToast } = useUIStore()
  const { notes } = useNotesStore()
  const [phase, setPhase] = useState('setup')
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(false)

  const startQuiz = async () => {
    clearReviewFeedback()
    setLoading(true)
    const note = notes?.[0] || { title: '概率分布与期望', content: '离散型随机变量、数学期望、方差与标准差。' }
    const result = await generateQuiz(note)
    setQuestions(result.data)
    setPhase('quiz')
    setCurrent(0)
    setAnswers([])
    setSelected(null)
    setLoading(false)
    if (result.source === 'sample') addToast({ type: 'info', message: qwenApiKey ? 'AI 暂不可用，已使用本地样例测验' : '未配置 AI Key，已使用本地样例测验' })
    else addToast({ type: 'success', message: '已根据学习资料生成 AI 测验' })
  }

  const completeQuiz = (finalAnswers) => {
    const weakPoints = finalAnswers
      .filter(answer => !answer.correct)
      .map(answer => questions[answer.q])
      .map(question => ({ topic: question.topic, recommendation: question.recommendation, path: '/notes' }))

    saveReviewFeedback({
      score: finalAnswers.filter(answer => answer.correct).length,
      total: questions.length,
      weakPoints,
      completedAt: Date.now(),
    })
    setPhase('results')
  }

  const handleAnswer = (index) => {
    if (selected !== null) return
    setSelected(index)
    setTimeout(() => {
      const answer = { q: current, selected: index, correct: index === questions[current].ans }
      const nextAnswers = [...answers, answer]
      setAnswers(nextAnswers)
      if (current + 1 < questions.length) {
        setCurrent(value => value + 1)
        setSelected(null)
      } else {
        completeQuiz(nextAnswers)
      }
    }, 650)
  }

  const score = answers.filter(answer => answer.correct).length
  const weakQuestions = answers.filter(answer => !answer.correct).map(answer => questions[answer.q])

  if (phase === 'results') {
    const perfect = score === questions.length
    const good = score >= questions.length / 2
    const ResultIcon = perfect ? Trophy : good ? ThumbsUp : BookOpen
    const resultColor = perfect ? C.yellow : good ? C.green : C.blue
    return (
      <div data-theme={theme} className="page-enter" style={{ fontFamily: fonts.body, color: C.text, maxWidth: 620, margin: '0 auto', textAlign: 'center' }}>
        <Card style={{ padding: 36 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, margin: '0 auto 18px', background: tint(resultColor, 0.12), border: `1px solid ${tint(resultColor, 0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: resultColor, boxShadow: `0 0 40px ${tint(resultColor, 0.18)}` }}><ResultIcon size={34} strokeWidth={1.8} /></div>
          <h2 style={{ fontFamily: fonts.heading, fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 8 }}>{score} / {questions.length}</h2>
          <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 20 }}>{perfect ? '本轮知识点掌握稳定，可以继续下一组复习。' : good ? '基础已经掌握，建议优先回看下面的薄弱点。' : '先补齐薄弱点，再做一次测验会更有效。'}</p>

          <div style={{ textAlign: 'left', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: fonts.heading, fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}><CircleCheck size={15} color={resultColor} /> {weakQuestions.length ? '需要回看的知识点' : '本轮反馈'}</div>
            {weakQuestions.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {weakQuestions.map(question => (
                  <div key={question.topic} style={{ padding: '11px 13px', borderRadius: 10, background: tint(C.orange, 0.08), border: `1px solid ${tint(C.orange, 0.22)}` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, marginBottom: 3 }}>{question.topic}</div>
                    <div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.6 }}>{question.recommendation}</div>
                  </div>
                ))}
              </div>
            ) : <p style={{ padding: '11px 13px', borderRadius: 10, background: tint(C.green, 0.08), border: `1px solid ${tint(C.green, 0.22)}`, fontSize: 12.5, color: C.textMuted, lineHeight: 1.6 }}>没有发现需要回看的示例知识点。下一轮可以继续通过记忆卡片巩固。</p>}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/home')} style={btnGhost}>查看下一步建议 <ArrowRight size={14} /></button>
            <button onClick={startQuiz} style={btnPrimary}>再做一次</button>
          </div>
        </Card>
      </div>
    )
  }

  if (phase === 'quiz') {
    const question = questions[current]
    return (
      <div data-theme={theme} style={{ fontFamily: fonts.body, color: C.text, maxWidth: 560, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: C.textMuted, fontFamily: fonts.heading, fontWeight: 600 }}>第 {current + 1} 题，共 {questions.length} 题</span>
          <button onClick={() => setPhase('setup')} style={{ ...btnGhost, padding: '5px 12px', fontSize: 12, color: C.textMuted }}><X size={12} /> 退出</button>
        </div>
        <div style={{ height: 5, background: tint(C.blue, 0.1), borderRadius: 3, overflow: 'hidden', marginBottom: 24 }}><div style={{ height: '100%', width: `${((current + 1) / questions.length) * 100}%`, background: `linear-gradient(90deg, ${C.blue}, ${C.blueDark})`, borderRadius: 3, transition: 'width 0.3s' }} /></div>
        <Card style={{ padding: '24px 28px', marginBottom: 16 }}><p style={{ fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.6 }}>{question?.q}</p></Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(question?.opts || []).map((option, index) => {
            let background = C.card
            let border = C.border
            let color = C.text
            if (selected !== null) {
              if (index === question.ans) { background = tint(C.greenDark, 0.12); border = tint(C.greenDark, 0.5); color = C.green }
              else if (index === selected && selected !== question.ans) { background = tint(C.pink, 0.12); border = tint(C.pink, 0.5); color = C.pink }
            }
            return <button key={index} onClick={() => handleAnswer(index)} className={selected === null ? 'hover-lift' : ''} style={{ padding: '14px 18px', borderRadius: 12, border: `1px solid ${border}`, background, color, cursor: selected !== null ? 'default' : 'pointer', textAlign: 'left', fontSize: 14, fontFamily: fonts.body, fontWeight: 500, transition: 'all 0.2s' }}>{option}</button>
          })}
        </div>
      </div>
    )
  }

  return (
    <div data-theme={theme} style={{ fontFamily: fonts.body, color: C.text, maxWidth: 560, margin: '0 auto' }}>
      <PageHeader icon={Puzzle} accent={C.purple} title="知识测验" subtitle="用一组示例题检查本轮复习情况" />
      <Card style={{ padding: 28 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: tint(C.blue, 0.08), border: `1px solid ${tint(C.blue, 0.25)}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
          <BookOpen size={15} color={C.blue} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>{qwenApiKey ? '将根据第一条学习资料生成 3 道测验题；请求失败时自动使用本地样例。' : '本轮包含 3 道“概率分布与期望”示例题。配置个人 AI Key 后，可根据学习资料生成测验。'}</p>
        </div>
        <button onClick={startQuiz} disabled={loading} style={{ ...btnPrimary, width: '100%', padding: '13px', fontSize: 15, opacity: loading ? 0.65 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}><Sparkles size={16} /> {loading ? '生成中…' : '开始测验'}</button>
      </Card>
    </div>
  )
}
