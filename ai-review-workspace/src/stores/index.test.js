// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  useFlashcardsStore,
  useNotesStore,
  useStudyPlansStore,
  useUIStore,
} from './index'

describe('focused review stores', () => {
  beforeEach(() => {
    localStorage.clear()
    useNotesStore.setState({ notes: [] })
    useFlashcardsStore.setState({ decks: [] })
    useStudyPlansStore.setState({ plans: [] })
    useUIStore.setState({ qwenApiKey: '', theme: 'dark', toasts: [] })
  })

  it('creates and updates browser-local notes', () => {
    const id = useNotesStore.getState().addNote({ title: '测试资料', content: '内容' })
    useNotesStore.getState().updateNote(id, { title: '更新后的资料' })
    expect(useNotesStore.getState().notes[0].title).toBe('更新后的资料')
  })

  it('creates decks and review plans locally', () => {
    const deckId = useFlashcardsStore.getState().addDeck({ name: '关键概念', cards: [{ front: 'Q', back: 'A' }] })
    const planId = useStudyPlansStore.getState().addStudyPlan({ subject: '概率论', weeks: [] })
    expect(useFlashcardsStore.getState().decks[0].id).toBe(deckId)
    expect(useStudyPlansStore.getState().plans[0].id).toBe(planId)
  })
})
