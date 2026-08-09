# Task 3 Report: GitHub Pages Nested Path Migration

## Scope completed

- Added `ai-review-workspace/vite.config.js` with base path `/vibe-coding-lab/ai-review-workspace/` and jsdom test defaults.
- Replaced active `react-router-dom` imports with `react-router` and changed the application router from `BrowserRouter` to `HashRouter`.
- Kept only the focused review routes: `/`, `/demo`, `/home`, `/study`, `/study-plans`, `/notes`, `/flashcards`, `/quiz`, and the catch-all redirect.
- Removed the root `/sw.js` service worker registration. `public/sw.js`, `public/sitemap.xml`, and `public/robots.txt` were not present, so no legacy static files required deletion.
- Updated metadata and manifest paths for the Pages base path and changed public URLs to `https://jiaxuan-tao.github.io/vibe-coding-lab/ai-review-workspace/`.
- Updated the runtime baseline: Node `>=22.22.0`, React and React DOM `^19.2.7`, React Router `^8.3.0`, Vite `^7.2.4`, and React plugin `^5.1.1`. The Pages workflow now uses Node `22.22.0`.
- Refreshed `package-lock.json` with `npm install`.

## Regression coverage

- Added configuration, routing, and static-entrypoint regression tests.
- TDD evidence:
  - The Vite configuration test initially failed because `vite.config.js` did not exist.
  - The routing test initially failed because the app still used `BrowserRouter` and `react-router-dom`.
  - The static-entrypoint test initially failed because index metadata still used root paths and the old Vercel URL.

## Verification

| Check | Result |
| --- | --- |
| `npm install` | Passed; lockfile refreshed |
| `npm test` | Passed: 7 test files, 11 tests |
| `npm run build` | Passed with Vite 7.3.6 |
| `npm audit --omit=dev` | Passed: 0 vulnerabilities |
| Dist asset paths | `dist/index.html` references `/vibe-coding-lab/ai-review-workspace/assets/` |
| Legacy-service scan | No matches in `dist/` for old domains, `/api/`, Supabase, Stripe, Google OAuth, GitHub OAuth, `react-router-dom`, service workers, or `/sw.js` |
| Legacy public files | `sw.js`, `sitemap.xml`, and `robots.txt` absent |
| `git diff --check` | Passed |

The first sandboxed `npm audit --omit=dev` attempt could not resolve `registry.npmjs.org`. A retry in the approved network environment completed successfully with zero vulnerabilities.

## Follow-up boundary

This task updates the Pages workflow Node baseline only. The later integration task remains responsible for adding the application's install/test/build/copy steps to the Pages artifact assembly.
