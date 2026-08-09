import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useNotesStore = create(
  persist(
    (set) => ({
      notes: [],
      addNote: (note) => {
        const id = note.id || createId()
        const now = Date.now()
        set((state) => ({
          notes: [...state.notes, { ...note, id, createdAt: note.createdAt ?? now, updatedAt: note.updatedAt ?? now }],
        }))
        return id
      },
      replaceNotes: (notes) => set({ notes }),
      updateNote: (id, updates) => set((state) => ({
        notes: state.notes.map((note) => (
          note.id === id ? { ...note, ...updates, updatedAt: Date.now() } : note
        )),
      })),
      deleteNote: (id) => set((state) => ({ notes: state.notes.filter((note) => note.id !== id) })),
    }),
    { name: 'ai-review-notes' },
  ),
)

export const useFlashcardsStore = create(
  persist(
    (set) => ({
      decks: [],
      addDeck: (deck) => {
        const id = deck.id || createId()
        set((state) => ({
          decks: [...state.decks, { ...deck, id, cards: deck.cards ?? [], createdAt: deck.createdAt ?? Date.now() }],
        }))
        return id
      },
      replaceDecks: (decks) => set({ decks }),
      deleteDeck: (id) => set((state) => ({ decks: state.decks.filter((deck) => deck.id !== id) })),
    }),
    { name: 'ai-review-flashcards' },
  ),
)

export const useStudyPlansStore = create(
  persist(
    (set) => ({
      plans: [],
      setStudyPlans: (plans) => set({ plans }),
      addStudyPlan: (plan) => {
        const id = plan.id || createId()
        set((state) => ({
          plans: [...state.plans, { ...plan, id, createdAt: plan.createdAt ?? Date.now() }],
        }))
        return id
      },
      deleteStudyPlan: (id) => set((state) => ({ plans: state.plans.filter((plan) => plan.id !== id) })),
    }),
    { name: 'ai-review-study-plans' },
  ),
)

export const useUIStore = create(
  persist(
    (set) => ({
      sidebarMobileOpen: false,
      toasts: [],
      qwenApiKey: '',
      theme: 'dark',
      setQwenApiKey: (qwenApiKey) => set({ qwenApiKey }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      toggleSidebarMobile: () => set((state) => ({ sidebarMobileOpen: !state.sidebarMobileOpen })),
      closeSidebarMobile: () => set({ sidebarMobileOpen: false }),
      addToast: (toast) => {
        const id = toast.id || createId()
        set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }))
        return id
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    }),
    { name: 'ai-review-ui' },
  ),
)
