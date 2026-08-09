import { DEMO_DECKS, DEMO_NOTES, DEMO_STUDY_PLANS } from '../utils/demoData'
import { useFlashcardsStore, useNotesStore, useStudyPlansStore } from '../stores'

export function getDemoWorkspaceSeeds({ notes, decks, plans }) {
  return {
    notes: notes.length === 0 ? DEMO_NOTES : null,
    decks: decks.length === 0 ? DEMO_DECKS : null,
    plans: plans.length === 0 ? DEMO_STUDY_PLANS : null,
  }
}

export function initializeDemoWorkspace() {
  const seeds = getDemoWorkspaceSeeds({
    notes: useNotesStore.getState().notes,
    decks: useFlashcardsStore.getState().decks,
    plans: useStudyPlansStore.getState().plans,
  })

  if (seeds.notes) useNotesStore.getState().replaceNotes(seeds.notes)
  if (seeds.decks) useFlashcardsStore.getState().replaceDecks(seeds.decks)
  if (seeds.plans) useStudyPlansStore.getState().setStudyPlans(seeds.plans)
}
