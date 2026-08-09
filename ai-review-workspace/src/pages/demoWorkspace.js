import { DEMO_DECKS, DEMO_NOTES, DEMO_STUDY_PLANS } from '../utils/demoData'

export function getDemoWorkspaceSeeds({ notes, decks, plans }) {
  return {
    notes: notes.length === 0 ? DEMO_NOTES : null,
    decks: decks.length === 0 ? DEMO_DECKS : null,
    plans: plans.length === 0 ? DEMO_STUDY_PLANS : null,
  }
}
