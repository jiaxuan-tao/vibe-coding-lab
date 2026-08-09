# AI Review Workspace Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the focused Chinese AI review workspace as a self-contained project inside `vibe-coding-lab`, with accurate Shiori attribution and a working nested GitHub Pages deployment.

**Architecture:** Extract only the active React review flow from `jiaxuan-tao/ai-review-workspace` into `ai-review-workspace/`, replace the legacy Supabase-heavy state layer with browser-local Zustand stores, and deploy the Vite build below the Lab Pages base path. Keep the original standalone repository as the historical record and make it private only after the migrated deployment passes verification.

**Tech Stack:** React 18, Vite 6, React Router 6, Zustand 5, Framer Motion, Lucide React, Vitest, Playwright smoke checks, GitHub Actions, GitHub Pages.

## Global Constraints

- The target directory is exactly `ai-review-workspace/` at the repository root.
- Keep only the notes, study-plan, flashcard, quiz, feedback, theme, and browser-local Qwen flows.
- Do not migrate OAuth, Supabase, Google integrations, Stripe, Express APIs, Chrome extension, MCP server, or upstream marketing files.
- Preserve the upstream MIT license and document `kaorii-ako/Shiori-v1` in `THIRD_PARTY_NOTICES.md` and the project README.
- The public URL is `https://jiaxuan-tao.github.io/vibe-coding-lab/ai-review-workspace/`.
- Do not change unrelated projects or overwrite existing local user changes.
- Make `jiaxuan-tao/ai-review-workspace` private only after the Pages deployment is verified; do not delete it or its Vercel deployment.

---

### Task 1: Extract The Active Review Application

**Files:**
- Create: `ai-review-workspace/index.html`
- Create: `ai-review-workspace/package.json`
- Create: `ai-review-workspace/public/favicon.svg`
- Create: `ai-review-workspace/public/manifest.json`
- Create: `ai-review-workspace/public/og-image.svg`
- Create: `ai-review-workspace/src/App.jsx`
- Create: `ai-review-workspace/src/main.jsx`
- Create: `ai-review-workspace/src/components/AISettingsModal.jsx`
- Create: `ai-review-workspace/src/components/ErrorBoundary.jsx`
- Create: `ai-review-workspace/src/components/Layout.jsx`
- Create: `ai-review-workspace/src/components/ProtectedRoute.jsx`
- Create: `ai-review-workspace/src/components/ShortcutModal.jsx`
- Create: `ai-review-workspace/src/components/Sidebar.jsx`
- Create: `ai-review-workspace/src/components/ToastContainer.jsx`
- Create: `ai-review-workspace/src/components/ui.jsx`
- Create: `ai-review-workspace/src/hooks/useKeyboardShortcuts.js`
- Create: `ai-review-workspace/src/pages/Demo.jsx`
- Create: `ai-review-workspace/src/pages/Flashcards.jsx`
- Create: `ai-review-workspace/src/pages/Home.jsx`
- Create: `ai-review-workspace/src/pages/Notes.jsx`
- Create: `ai-review-workspace/src/pages/Quiz.jsx`
- Create: `ai-review-workspace/src/pages/StudyPlans.jsx`
- Create: `ai-review-workspace/src/styles/index.css`
- Create: `ai-review-workspace/src/utils/aiService.js`
- Create: `ai-review-workspace/src/utils/demoData.js`
- Create: `ai-review-workspace/src/utils/prompts.js`
- Create: `ai-review-workspace/src/utils/qwen.js`
- Create: `ai-review-workspace/src/utils/reviewFeedback.js`
- Create: `ai-review-workspace/src/utils/theme.js`

**Interfaces:**
- Consumes: the current public source tree from `jiaxuan-tao/ai-review-workspace` at commit `69c1b1cb5b69c2fc3dfe3f7b389d4ea603f20569`.
- Produces: a focused Vite source tree whose imports do not reference `api/`, `server/`, `lib/supabase.js`, `lib/classroom.js`, or disabled pages.

- [ ] **Step 1: Copy the active source files mechanically**

Use the verified standalone checkout at `/tmp/ai-review-workspace-current` and copy only the explicit files above. Preserve file contents at this stage; do not copy `.git`, `api`, `server`, `extension`, `mcp`, `supabase`, or disabled pages.

```bash
SOURCE=/tmp/ai-review-workspace-current
mkdir -p ai-review-workspace/{public,src/{components,hooks,pages,stores,styles,utils}}
cp "$SOURCE/client/index.html" ai-review-workspace/index.html
cp "$SOURCE/client/public/"{favicon.svg,manifest.json,og-image.svg} ai-review-workspace/public/
cp "$SOURCE/client/src/"{App.jsx,main.jsx} ai-review-workspace/src/
cp "$SOURCE/client/src/components/"{AISettingsModal,ErrorBoundary,Layout,ProtectedRoute,ShortcutModal,Sidebar,ToastContainer,ui}.jsx ai-review-workspace/src/components/
cp "$SOURCE/client/src/hooks/useKeyboardShortcuts.js" ai-review-workspace/src/hooks/
cp "$SOURCE/client/src/pages/"{Demo,Flashcards,Home,Notes,Quiz,StudyPlans}.jsx ai-review-workspace/src/pages/
cp "$SOURCE/client/src/styles/index.css" ai-review-workspace/src/styles/
cp "$SOURCE/client/src/utils/"{aiService,demoData,prompts,qwen,reviewFeedback,theme}.js ai-review-workspace/src/utils/
```

Expected: `find ai-review-workspace/src -type f | wc -l` prints `24` before the focused store and tests are added.

- [ ] **Step 2: Create the focused package manifest**

Create `ai-review-workspace/package.json` with no Supabase, Axios, jsPDF, Canvas Confetti, backend, or workspace dependency:

```json
{
  "name": "ai-review-workspace",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "vitest run",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "framer-motion": "^12.6.0",
    "lucide-react": "^0.469.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^26.1.0",
    "vite": "^6.0.7",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 3: Install dependencies and create the lock file**

Run:

```bash
cd ai-review-workspace
npm install
```

Expected: `package-lock.json` exists and `npm audit --omit=dev` reports no unresolved production vulnerability that blocks publication.

---

### Task 2: Replace Legacy State And Add Contract Tests

**Files:**
- Create: `ai-review-workspace/src/stores/index.js`
- Create: `ai-review-workspace/src/stores/index.test.js`
- Create: `ai-review-workspace/src/utils/aiService.test.js`
- Modify: `ai-review-workspace/src/utils/demoData.js`
- Modify: `ai-review-workspace/src/App.jsx`

**Interfaces:**
- Consumes: active pages that call `useAuthStore`, `useNotesStore`, `useFlashcardsStore`, `useStudyPlansStore`, and `useUIStore`.
- Produces: browser-local stores with the same active method names and no external authentication or database dependency.

- [ ] **Step 1: Write state contract tests**

Test these exact behaviors in `src/stores/index.test.js`:

```js
import { beforeEach, describe, expect, it } from 'vitest'
import {
  useAuthStore,
  useFlashcardsStore,
  useNotesStore,
  useStudyPlansStore,
  useUIStore,
} from './index'

describe('focused review stores', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ user: null, isAuthenticated: false, isDemo: false, isLoading: false, _hasHydrated: true })
    useNotesStore.setState({ notes: [] })
    useFlashcardsStore.setState({ decks: [] })
    useStudyPlansStore.setState({ plans: [] })
    useUIStore.setState({ qwenApiKey: '', theme: 'dark', toasts: [] })
  })

  it('enters demo mode without external authentication', () => {
    useAuthStore.getState().enterDemoMode()
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, isDemo: true })
    expect(useAuthStore.getState().user.name).toBe('演示同学')
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
```

- [ ] **Step 2: Run the tests and confirm the missing store failure**

Run: `npm test -- src/stores/index.test.js`

Expected: FAIL because the focused `src/stores/index.js` has not been created.

- [ ] **Step 3: Implement the focused Zustand stores**

Implement these exact public interfaces in `src/stores/index.js`:

```text
useAuthStore: user, isAuthenticated, isDemo, isLoading, _hasHydrated, enterDemoMode()
useNotesStore: notes, addNote(), replaceNotes(), updateNote(), deleteNote()
useFlashcardsStore: decks, addDeck(), replaceDecks(), deleteDeck()
useStudyPlansStore: plans, setStudyPlans(), addStudyPlan(), deleteStudyPlan()
useUIStore: sidebarMobileOpen, toasts, qwenApiKey, theme, setQwenApiKey(), toggleTheme(), toggleSidebarMobile(), closeSidebarMobile(), addToast(), removeToast()
initAuthSync(): mark hydration complete without contacting an external service
```

Use `create()` and `persist()` from Zustand. Use stable storage names `ai-review-auth`, `ai-review-notes`, `ai-review-flashcards`, `ai-review-study-plans`, and `ai-review-ui`. Generate IDs with `crypto.randomUUID()` when available and a timestamp/random fallback otherwise. `addDeck()` must preserve supplied cards rather than replacing them with an empty array.

- [ ] **Step 4: Trim demo data to active exports**

Keep only `DEMO_USER`, `DEMO_NOTES`, `DEMO_DECKS`, `DEMO_QUIZ_HISTORY`, `DEMO_STUDY_PLANS`, and `DEMO_REVIEW_QUIZ`. Set the demo user's display name to `演示同学` and remove course, grade, assignment, event, leaderboard, and other unreachable sample data.

- [ ] **Step 5: Add AI fallback tests**

Create `src/utils/aiService.test.js` that clears `localStorage`, calls `generateStudyPlan({ subject: '概率论', examDate: '' })` and `generateQuiz({ title: '概率分布', content: '概率分布基础内容' })`, then asserts both return `source: 'sample'` with non-empty data.

- [ ] **Step 6: Run focused tests**

Run: `npm test`

Expected: all store and fallback tests pass.

---

### Task 3: Make The App Work Under The Nested Pages Path

**Files:**
- Create: `ai-review-workspace/vite.config.js`
- Modify: `ai-review-workspace/src/App.jsx`
- Modify: `ai-review-workspace/src/main.jsx`
- Modify: `ai-review-workspace/index.html`
- Modify: `ai-review-workspace/public/manifest.json`
- Delete: `ai-review-workspace/public/sw.js` if it was copied accidentally
- Delete: `ai-review-workspace/public/sitemap.xml` if it was copied accidentally
- Delete: `ai-review-workspace/public/robots.txt` if it was copied accidentally

**Interfaces:**
- Consumes: the focused Vite application from Tasks 1-2.
- Produces: a static build whose entry assets and client navigation work at `/vibe-coding-lab/ai-review-workspace/`.

- [ ] **Step 1: Configure the Pages base path**

Create `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/vibe-coding-lab/ai-review-workspace/',
  plugins: [react()],
  test: { environment: 'jsdom' },
})
```

- [ ] **Step 2: Switch to hash routing and remove dead redirects**

Replace `BrowserRouter` with `HashRouter`. Keep only `/`, `/demo`, `/home`, `/study`, `/study-plans`, `/notes`, `/flashcards`, `/quiz`, and the catch-all redirect. Do not retain routes for login, OAuth, billing, assignments, grades, analytics, habits, focus, leaderboard, import, settings, or profile.

- [ ] **Step 3: Remove the legacy service worker registration**

Delete the service-worker registration block from `src/main.jsx`. The migrated project must not register root-level `/sw.js`, which would conflict with the Lab Pages site.

- [ ] **Step 4: Correct static metadata and relative asset paths**

Use `%BASE_URL%favicon.svg`, `%BASE_URL%manifest.json`, and `%BASE_URL%og-image.svg` where Vite should resolve nested assets. Replace old Vercel and `shiorii.tech` URLs with the new Pages URL. Update the manifest `start_url` to `./#/home`, icon paths to `./favicon.svg`, and shortcut URLs to `./#/notes`, `./#/flashcards`, and `./#/quiz`.

- [ ] **Step 5: Run the production build**

Run: `npm run build`

Expected: Vite exits `0`; `dist/index.html` references `/vibe-coding-lab/ai-review-workspace/assets/`; no output references `shiorii.tech`, `ai-review-workspace.vercel.app`, `/api/`, Supabase, Stripe, Google OAuth, or GitHub OAuth.

---

### Task 4: Write Project Documentation And Repository Navigation

**Files:**
- Create: `ai-review-workspace/README.md`
- Create: `ai-review-workspace/LICENSE`
- Create: `ai-review-workspace/THIRD_PARTY_NOTICES.md`
- Modify: `README.md`
- Modify: `projects/README.md`
- Modify: `site/index.html`

**Interfaces:**
- Consumes: the verified project scope and final public URL.
- Produces: a project page and Lab navigation that accurately describe the migrated implementation.

- [ ] **Step 1: Preserve license and attribution**

Copy the upstream MIT `LICENSE` unchanged. Write `THIRD_PARTY_NOTICES.md` with the upstream repository URL, original copyright, MIT license reference, source commit lineage, and a concise list of the Chinese workflow, UI, local state, Qwen BYOK, routing, and deployment changes.

- [ ] **Step 2: Write the project README in the Lab format**

Use this section order:

```markdown
# AI 复习工作台 📚

[在线体验] · [使用方法] · [隐私与能力边界]

## 产品预览
## 它解决什么问题
## 使用方法
## 核心功能
## AI 与本地数据
## 本地运行
## 技术实现
## 项目结构
## 能力边界
## Vibe Coding 迭代说明
## 开源参考
## 开源许可
```

Describe only the active review loop. State that the Qwen key is optional, stored in the current browser, and sent only to Alibaba Cloud DashScope when AI generation is explicitly used. State that the sample fallback works without an API key. Do not claim accounts, cloud sync, Classroom, payments, or other excluded features.

- [ ] **Step 3: Add minimal root navigation entries**

Add one entry to root `README.md` with the project title, focused-loop description, and live Pages URL. Add one `ai-review-workspace/` entry to `projects/README.md`. Preserve all existing entries and wording.

- [ ] **Step 4: Add the seventh showcase card**

Append `PROJECT 07` to `site/index.html`, using `assets/ai-review-workspace.png`, the live path `ai-review-workspace/`, and the source path `https://github.com/jiaxuan-tao/vibe-coding-lab/tree/main/ai-review-workspace`.

- [ ] **Step 5: Check local Markdown links**

Run a local-link checker across root `README.md`, `projects/README.md`, and `ai-review-workspace/README.md`.

Expected: every relative path exists and resolves from the containing Markdown file.

---

### Task 5: Integrate CI, Capture Evidence, And Publish

**Files:**
- Modify: `.github/workflows/pages.yml`
- Create: `ai-review-workspace/docs/images/ai-review-workspace-preview.png`
- Modify: `site/index.html`

**Interfaces:**
- Consumes: the tested Vite project and documentation.
- Produces: a deployable Pages artifact, verified public URL, and private historical standalone repository.

- [ ] **Step 1: Extend the Pages workflow**

Add `ai-review-workspace/package-lock.json` to the npm cache dependency paths. Add install, test, and build steps in `ai-review-workspace`. Extend assembly to create `_site/ai-review-workspace`, copy `ai-review-workspace/dist/.` there, and copy the final screenshot to `_site/assets/ai-review-workspace.png`.

- [ ] **Step 2: Run complete local verification**

Run:

```bash
cd ai-review-workspace
npm ci
npm test
npm run build
```

Expected: all commands exit `0`.

- [ ] **Step 3: Run browser acceptance**

Serve `dist/` below a local `/vibe-coding-lab/ai-review-workspace/` path. With Playwright, verify desktop `1440x900` and mobile `390x844` viewports, then exercise home → notes → study plan → flashcards → quiz → feedback navigation. Confirm refresh works on a hash route, assets load without 404 responses, and no console error blocks interaction.

- [ ] **Step 4: Capture and install the project screenshot**

Capture the migrated home view at desktop width. Save it to `ai-review-workspace/docs/images/ai-review-workspace-preview.png`, then ensure the workflow publishes the same file as `_site/assets/ai-review-workspace.png`.

- [ ] **Step 5: Run repository safety checks**

Run `git diff --check`, a strict secret-pattern scan, the Markdown link checker, and searches for excluded legacy terms and files. Confirm no `.env`, token, `node_modules`, `dist`, test result, or Playwright report is tracked.

- [ ] **Step 6: Commit the migration**

Stage only the migrated project and required Lab integration files. Commit with:

```bash
git commit -m "feat: migrate AI review workspace into lab"
```

- [ ] **Step 7: Push and verify GitHub Pages**

Push the intended branch, integrate it into `main` using the repository's approved workflow, wait for the `Deploy Vibe Coding Lab` action, and verify the public URL and nested assets after the workflow succeeds.

- [ ] **Step 8: Make the historical repository private**

Only after Step 7 succeeds, change `jiaxuan-tao/ai-review-workspace` visibility to private. Re-open its GitHub page while authenticated and confirm it is marked Private. Do not archive or delete it, and do not modify the old Vercel deployment.
