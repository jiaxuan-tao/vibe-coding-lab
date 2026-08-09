// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { useFlashcardsStore, useNotesStore, useStudyPlansStore } from '../stores'
import { DEMO_DECKS, DEMO_NOTES, DEMO_STUDY_PLANS } from '../utils/demoData'
import { getReviewFeedback, saveReviewFeedback } from '../utils/reviewFeedback'
import { initializeDemoWorkspace } from './demoWorkspace'

describe('demo workspace initialization', () => {
  beforeEach(() => {
    localStorage.clear()
    useNotesStore.setState({ notes: [] })
    useFlashcardsStore.setState({ decks: [] })
    useStudyPlansStore.setState({ plans: [] })
  })

  it('preserves existing local collections and review feedback', () => {
    const notes = [{ id: 'local-note', title: '本地资料', content: '内容' }]
    const decks = [{ id: 'local-deck', name: '本地卡片组', cards: [] }]
    const plans = [{ id: 'local-plan', subject: '本地计划', weeks: [] }]
    const feedback = { score: 2, total: 3, completedAt: 1234 }
    useNotesStore.getState().replaceNotes(notes)
    useFlashcardsStore.getState().replaceDecks(decks)
    useStudyPlansStore.getState().setStudyPlans(plans)
    saveReviewFeedback(feedback)

    initializeDemoWorkspace()

    expect(useNotesStore.getState().notes).toEqual(notes)
    expect(useFlashcardsStore.getState().decks).toEqual(decks)
    expect(useStudyPlansStore.getState().plans).toEqual(plans)
    expect(getReviewFeedback()).toEqual(feedback)
  })

  it('fills empty local collections with demo data', () => {
    initializeDemoWorkspace()

    expect(useNotesStore.getState().notes).toEqual(DEMO_NOTES)
    expect(useFlashcardsStore.getState().decks).toEqual(DEMO_DECKS)
    expect(useStudyPlansStore.getState().plans).toEqual(DEMO_STUDY_PLANS)
  })
})
