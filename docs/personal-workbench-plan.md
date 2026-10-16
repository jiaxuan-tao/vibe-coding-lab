# Personal Workbench Implementation Plan

**Goal:** Reproduce the selected TMJ97-10/workbench as a browser-local personal workbench inside Vibe Coding Lab, with a Codex-inspired monochrome palette.

**Architecture:** Retain the upstream buildless ES-module views and layout. Replace GitHub synchronization with namespaced browser storage and validated JSON backup/restore. Use a scoped static production build for the existing GitHub Pages pipeline.

**Tech Stack:** HTML, CSS, browser JavaScript, Node test runner; Playwright for browser acceptance.

## Approved Scope

- Existing repository only; top-level `personal-workbench/`.
- Retain tasks/calendar, work plans/logs, notes, ideas, prompt/tool collection, ledger, learning, information and stock records.
- Latest palette requirement: white, black and neutral gray, not teal/orange. Preserve familiar upstream layout, no marketing hero.
- Local data plus export/import; no GitHub Token input, automatic repository creation, cloud sync or AI API credentials.
- No claim of background reminders or integrated AI inference. External information must expose unavailable/stale states.
- Respect upstream reproduction permission supplied by the project owner; retain third-party notices. Do not label upstream source wholly original or relicense it under a new blanket license.
- Preserve unrelated working-tree changes (`AGENTS.md`, `docs/SKILLS_WORKFLOW.md`).

## Task 1: Local Data Safety

- [x] Import selected upstream source without its Git history, cloud connector or private runtime data; record source commit.
- [x] Add failing tests for namespaced storage, malformed backup rejection, rich-text safety, numeric limits and write failure.
- [x] Replace store sync with local-only transactional persistence; normalize supported backup fields and avoid prototype pollution.
- [x] Harden shared form validation and imported/displayed rich text; keep cancel/save/focus behavior intact.
- [x] Run new tests and independent stock/formatting baseline cases.

## Task 2: Monochrome Interface and Complete Flows

- [x] Replace default theme and theme controls with light/dark monochrome variants; neutral semantic states also use words/icons.
- [x] Replace cloud UI with save status and local backup controls; scope all localStorage keys and service worker caches.
- [x] Check each retained module's add/edit/delete and empty/error states, mobile navigation, keyboard dialogs and data persistence.
- [x] Make weather city user-selected, with no automatic location permission; retain honest network fallback.
- [x] Record boundaries for external news/quotes, no API-key AI, no closed-page reminders.

## Task 3: Verification and Delivery

- [x] Add reproducible browser acceptance coverage for navigation, core CRUD, backup round-trip, invalid inputs, hostile rich text, local-only network behavior and 320/390/768/1440px layouts.
- [x] Capture actual desktop/mobile UI assets after visual inspection.
- [x] Add user-facing README, source/third-party notices and verification record.
- [x] Update root README, project index, showcase and Pages workflow without removing existing entries.
- [x] Run Node tests, browser tests, production build and production-directory checks.
- [x] Review changes, commit only scoped files, push and confirm Pages deployment and live URL.

Published application revision: `04b23e3`. [Successful Pages run](https://github.com/jiaxuan-tao/vibe-coding-lab/actions/runs/38863039080). Live smoke checks: 15/15 passed; the showcase entry and application were also opened directly.
