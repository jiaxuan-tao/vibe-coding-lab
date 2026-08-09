import { describe, expect, it } from 'vitest'
import { DEMO_DECKS, DEMO_NOTES, DEMO_STUDY_PLANS } from '../utils/demoData'
import { getDemoWorkspaceSeeds } from './demoWorkspace'

describe('demo workspace initialization', () => {
  it('keeps all existing local workspace collections unchanged', () => {
    const notes = [{ id: 'local-note', title: '本地资料' }]
    const decks = [{ id: 'local-deck', name: '本地卡片组' }]
    const plans = [{ id: 'local-plan', subject: '本地计划' }]

    const seeds = getDemoWorkspaceSeeds({ notes, decks, plans })

    expect(seeds.notes).toBeNull()
    expect(seeds.decks).toBeNull()
    expect(seeds.plans).toBeNull()
    expect(notes).toEqual([{ id: 'local-note', title: '本地资料' }])
    expect(decks).toEqual([{ id: 'local-deck', name: '本地卡片组' }])
    expect(plans).toEqual([{ id: 'local-plan', subject: '本地计划' }])
  })

  it('supplies demo data only for empty local collections', () => {
    const seeds = getDemoWorkspaceSeeds({ notes: [], decks: [], plans: [] })

    expect(seeds.notes).toBe(DEMO_NOTES)
    expect(seeds.decks).toBe(DEMO_DECKS)
    expect(seeds.plans).toBe(DEMO_STUDY_PLANS)
  })

  it('fills an empty collection without replacing the other local collections', () => {
    const notes = [{ id: 'local-note', title: '本地资料' }]
    const decks = [{ id: 'local-deck', name: '本地卡片组' }]
    const seeds = getDemoWorkspaceSeeds({ notes, decks, plans: [] })

    expect(seeds.notes).toBeNull()
    expect(seeds.decks).toBeNull()
    expect(seeds.plans).toBe(DEMO_STUDY_PLANS)
    expect(notes).toEqual([{ id: 'local-note', title: '本地资料' }])
    expect(decks).toEqual([{ id: 'local-deck', name: '本地卡片组' }])
  })
})
