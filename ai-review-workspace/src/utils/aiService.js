import { DEMO_REVIEW_QUIZ } from './demoData'
import { callQwenClient, hasQwenClientKey } from './qwen'
import { createQuizPrompt, createStudyPlanPrompt } from './prompts'

const SAMPLE_PLAN_WEEKS = [
  { week: 1, topic: '梳理核心概念', tasks: ['通读已有资料', '整理关键定义与公式', '标记尚未理解的内容'] },
  { week: 2, topic: '用卡片加强记忆', tasks: ['创建或补充记忆卡片', '完成一轮卡片复习', '记录易混淆知识点'] },
  { week: 3, topic: '通过练习检验掌握', tasks: ['完成知识测验', '回看答错的概念', '补充一条复习笔记'] },
  { week: 4, topic: '综合回顾', tasks: ['按薄弱点回看资料', '再做一次测验', '整理考前速记清单'] },
]

const clone = (value) => JSON.parse(JSON.stringify(value))

function parseJson(text) {
  if (!text) return null
  const objectMatch = text.match(/\{[\s\S]*\}/)
  const arrayMatch = text.match(/\[[\s\S]*\]/)
  const firstArray = text.indexOf('[')
  const firstObject = text.indexOf('{')
  const candidate = firstArray >= 0 && (firstObject < 0 || firstArray < firstObject) ? arrayMatch?.[0] : objectMatch?.[0]
  try { return candidate ? JSON.parse(candidate) : null } catch { return null }
}

function isValidPlan(value) {
  return value && typeof value.subject === 'string' && Array.isArray(value.weeks) && value.weeks.length > 0 && value.weeks.every((week, index) => (
    Number.isInteger(week.week) && week.week === index + 1 && typeof week.topic === 'string' && Array.isArray(week.tasks) && week.tasks.length > 0
  ))
}

function isValidQuiz(value) {
  return Array.isArray(value) && value.length > 0 && value.every(question => (
    typeof question.q === 'string' && Array.isArray(question.opts) && question.opts.length === 4 &&
    Number.isInteger(question.ans) && question.ans >= 0 && question.ans < question.opts.length &&
    typeof question.topic === 'string' && typeof question.recommendation === 'string'
  ))
}

export function createSampleStudyPlan(subject, examDate = '') {
  return { subject, examDate, weeks: clone(SAMPLE_PLAN_WEEKS) }
}

export async function generateStudyPlan(input) {
  const fallback = createSampleStudyPlan(input.subject, input.examDate)
  if (!hasQwenClientKey()) return { data: fallback, source: 'sample', reason: 'missing-key' }

  const text = await callQwenClient(createStudyPlanPrompt(input), { temperature: 0.45, maxOutputTokens: 1600 })
  const parsed = parseJson(text)
  if (!isValidPlan(parsed)) return { data: fallback, source: 'sample', reason: 'invalid-response' }

  return {
    data: { ...parsed, subject: input.subject, examDate: input.examDate },
    source: 'ai',
  }
}

export async function generateQuiz(note) {
  const fallback = clone(DEMO_REVIEW_QUIZ)
  if (!hasQwenClientKey()) return { data: fallback, source: 'sample', reason: 'missing-key' }

  const text = await callQwenClient(createQuizPrompt(note), { temperature: 0.35, maxOutputTokens: 1600 })
  const parsed = parseJson(text)
  if (!isValidQuiz(parsed)) return { data: fallback, source: 'sample', reason: 'invalid-response' }

  return { data: parsed, source: 'ai' }
}
