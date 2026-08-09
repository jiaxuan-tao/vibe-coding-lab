// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { generateQuiz, generateStudyPlan } from './aiService'

describe('AI service fallbacks', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns sample study plans and quizzes when no browser key is configured', async () => {
    const plan = await generateStudyPlan({ subject: '概率论', examDate: '' })
    const quiz = await generateQuiz({ title: '概率分布', content: '概率分布基础内容' })

    expect(plan).toMatchObject({ source: 'sample' })
    expect(plan.data.weeks).not.toHaveLength(0)
    expect(quiz).toMatchObject({ source: 'sample' })
    expect(quiz.data).not.toHaveLength(0)
  })
})
