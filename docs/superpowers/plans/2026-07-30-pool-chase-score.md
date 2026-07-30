# 台球追分计分台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a mobile-first, local-only Web/PWA scoreboard for 2–6 billiards players with configurable zero-sum event rules, in-rack scoring, cross-rack accumulation, recovery, history, and shareable summaries.

**Architecture:** Implement a static ES Modules application inside `pool-chase-score/`. Pure functions in `rules.js` and `session.js` own settlement and event-sourced score state; `storage.js` owns versioned persistence; `app.js` renders four views and delegates all mutations to the domain modules. Node's native test runner verifies domain behavior and Playwright verifies real mobile workflows, persistence, accessibility contracts, and visual bounds.

**Tech Stack:** HTML5, CSS, Vanilla JavaScript ES Modules, Canvas 2D, localStorage, Service Worker, Web App Manifest, Node.js 22 native tests, Playwright 1.61.1, GitHub Actions, GitHub Pages.

## Global Constraints

- Product name is `台球追分计分台`; project folder is `pool-chase-score`.
- Support 2–6 players with 3 players as the default.
- Use one shared phone; do not infer the current shooter.
- Rules are configured before `今日追分`, copied into an immutable session snapshot, and reused across every rack.
- Every score event is zero-sum; score is derived from initial values plus active event deltas.
- In-rack events update immediately; terminal events settle and close the current rack.
- Rack completion preserves cumulative score and archives only the rack event view.
- The session ends only through a user action; no score targets or automatic end reminders.
- Keep undo visually secondary while still exposing event edit and delete.
- Persist locally without accounts, backend, remote APIs, location, money conversion, payments, or gambling settlement.
- Build for phone portrait first and keep the scoring console usable inside `100dvh`.
- Preserve unrelated working-tree changes and commit only files belonging to this project.

---

### Task 1: Project Scaffold and Settlement Engine

**Files:**
- Create: `pool-chase-score/package.json`
- Create: `pool-chase-score/rules.js`
- Create: `pool-chase-score/tests/rules.test.js`
- Create: `pool-chase-score/LICENSE`
- Create: `pool-chase-score/THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Produces: `DEFAULT_RULES: Rule[]`
- Produces: `createDefaultRules(): Rule[]`
- Produces: `validateRuleSet(rules: Rule[]): { valid: boolean, errors: string[] }`
- Produces: `calculateSettlement(input: SettlementInput): Record<PlayerId, number>`
- Produces: `resolveRelativePlayer(order: PlayerId[], playerId: PlayerId, direction: "previous" | "next"): PlayerId`
- `Rule` shape:

```js
{
  id: "foul",
  name: "犯规",
  value: 1,
  settlement: "relative-transfer",
  direction: "previous",
  endsRack: false,
  enabled: true
}
```

- `SettlementInput` shape:

```js
{
  rule,
  playerIds: ["p1", "p2", "p3"],
  order: ["p1", "p2", "p3"],
  actorId: "p2",
  counterpartyId: null
}
```

- [ ] **Step 1: Add the test runner and failing settlement tests**

```json
{
  "name": "pool-chase-score",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "test:browser": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1"
  }
}
```

Test cases must assert:

```js
assert.deepEqual(
  calculateSettlement({
    rule: DEFAULT_RULES.find((rule) => rule.id === "foul"),
    playerIds: ["p1", "p2", "p3"],
    order: ["p1", "p2", "p3"],
    actorId: "p1",
    counterpartyId: null,
  }),
  { p1: -1, p2: 0, p3: 1 },
);

assert.deepEqual(
  calculateSettlement({
    rule: DEFAULT_RULES.find((rule) => rule.id === "normal-win"),
    playerIds: ["p1", "p2", "p3"],
    order: ["p1", "p2", "p3"],
    actorId: "p2",
    counterpartyId: "p1",
  }),
  { p1: -4, p2: 4, p3: 0 },
);

assert.deepEqual(
  calculateSettlement({
    rule: DEFAULT_RULES.find((rule) => rule.id === "big-gold"),
    playerIds: ["p1", "p2", "p3"],
    order: ["p1", "p2", "p3"],
    actorId: "p2",
    counterpartyId: null,
  }),
  { p1: -10, p2: 20, p3: -10 },
);
```

Every result must sum to zero. Add 2-player and 6-player cases, cyclic previous/next boundaries, invalid actor, actor-equals-counterparty, integer bounds, duplicate IDs, no terminal event, and disabled rules.

- [ ] **Step 2: Run the rule tests and verify they fail**

Run: `npm test -- --test-name-pattern="settlement|rule"`

Expected: FAIL because `rules.js` exports do not exist.

- [ ] **Step 3: Implement the three settlement types and validation**

Use exact settlement names:

```js
export const SETTLEMENT_TYPES = Object.freeze({
  RELATIVE_TRANSFER: "relative-transfer",
  HEAD_TO_HEAD: "head-to-head",
  COLLECT_FROM_OTHERS: "collect-from-others",
});
```

`calculateSettlement()` must initialize every player delta to zero, reject unknown IDs, apply exactly one rule, assert integer values, and throw if the final sum is not zero. `createDefaultRules()` must return a deep copy of foul 1, normal win 4, small gold 7, big gold 10, and golden nine 4.

- [ ] **Step 4: Run tests and verify the engine passes**

Run: `npm test`

Expected: all `rules.test.js` tests PASS.

- [ ] **Step 5: Add project license notices**

Use the repository's existing MIT license wording with `Copyright (c) 2026 Jiaxuan Tao`. In `THIRD_PARTY_NOTICES.md`, identify Lucide Icons as MIT-licensed and state that no upstream scoreboard runtime code is copied.

- [ ] **Step 6: Commit the settlement engine**

```bash
git add pool-chase-score/package.json pool-chase-score/rules.js pool-chase-score/tests/rules.test.js pool-chase-score/LICENSE pool-chase-score/THIRD_PARTY_NOTICES.md
git commit -m "feat: add pool chase settlement engine"
```

---

### Task 2: Event-Sourced Session State

**Files:**
- Create: `pool-chase-score/session.js`
- Create: `pool-chase-score/tests/session.test.js`

**Interfaces:**
- Consumes: `calculateSettlement`, `validateRuleSet`
- Produces: `createSession(config): Session`
- Produces: `recordScoreEvent(session, input): Session`
- Produces: `undoLastEvent(session): Session`
- Produces: `restoreLastEvent(session): Session`
- Produces: `replaceEvent(session, eventId, input): Session`
- Produces: `deleteEvent(session, eventId): Session`
- Produces: `deriveScores(session): Record<PlayerId, number>`
- Produces: `suggestNextOrder(session, terminalEvent): PlayerId[]`
- Produces: `startNextRack(session, confirmedOrder): Session`
- Produces: `voidCurrentRack(session): Session`
- Produces: `endSession(session, endedAt): Session`

`Session` must contain:

```js
{
  version: 1,
  id: "session-id",
  status: "active",
  startedAt: "2026-07-30T12:00:00.000Z",
  endedAt: null,
  players: [
    { id: "p1", name: "王强", color: "#d7a82f", initialScore: 100 }
  ],
  rules: [],
  rackNumber: 1,
  currentOrder: ["p1", "p2", "p3"],
  rackStatus: "active",
  suggestedOrder: null,
  events: []
}
```

- [ ] **Step 1: Write failing session lifecycle tests**

Tests must cover:

```js
const afterFoul = recordScoreEvent(session, {
  ruleId: "foul",
  actorId: "p1",
  counterpartyId: null,
  occurredAt: "2026-07-30T12:01:00.000Z",
});
assert.deepEqual(deriveScores(afterFoul), { p1: 99, p2: 100, p3: 101 });
assert.equal(afterFoul.rackStatus, "active");

const afterWin = recordScoreEvent(afterFoul, {
  ruleId: "normal-win",
  actorId: "p2",
  counterpartyId: "p1",
  occurredAt: "2026-07-30T12:02:00.000Z",
});
assert.equal(afterWin.rackStatus, "complete");
assert.deepEqual(afterWin.suggestedOrder, ["p2", "p1", "p3"]);
```

Also assert cumulative scores survive `startNextRack`, a terminal event cannot be added twice, undoing the terminal event reopens the rack, replacing/deleting recomputes all scores, a completed session is read-only, and duplicate rapid operations using the same event ID are rejected.

- [ ] **Step 2: Run session tests and verify failure**

Run: `npm test -- --test-name-pattern="session|rack|event"`

Expected: FAIL because `session.js` does not exist.

- [ ] **Step 3: Implement immutable session transitions**

Each exported mutation must return a new serializable object. Events use:

```js
{
  id: "event-id",
  rackNumber: 1,
  ruleId: "foul",
  label: "犯规",
  actorId: "p1",
  counterpartyId: null,
  deltas: { p1: -1, p2: 0, p3: 1 },
  occurredAt: "2026-07-30T12:01:00.000Z",
  status: "active",
  endsRack: false
}
```

Undo marks the most recent active event as `reverted`; restore reactivates only the most recently reverted event when no later mutation invalidates it. Replace marks the original `replaced` and appends a corrected event with `replacesEventId`. Delete marks an event `deleted`. `deriveScores()` only applies `active` events.

- [ ] **Step 4: Run domain tests**

Run: `npm test`

Expected: all rule and session tests PASS.

- [ ] **Step 5: Commit session state**

```bash
git add pool-chase-score/session.js pool-chase-score/tests/session.test.js
git commit -m "feat: add event sourced chase sessions"
```

---

### Task 3: Versioned Local Persistence and Recovery

**Files:**
- Create: `pool-chase-score/storage.js`
- Create: `pool-chase-score/tests/storage.test.js`

**Interfaces:**
- Produces: `STORAGE_KEYS`
- Produces: `loadAppData(storage): AppData`
- Produces: `saveActiveSession(storage, session): void`
- Produces: `archiveSession(storage, session): AppData`
- Produces: `savePlayerDirectory(storage, players): void`
- Produces: `saveRuleTemplates(storage, templates): void`
- Produces: `deleteHistoryItem(storage, sessionId): AppData`
- Produces: `clearHistory(storage): AppData`

`AppData` shape:

```js
{
  version: 1,
  activeSession: null,
  history: [],
  savedPlayers: [],
  ruleTemplates: []
}
```

- [ ] **Step 1: Write failing storage tests**

Use an in-memory storage double implementing `getItem`, `setItem`, and `removeItem`. Assert round-trip persistence, active session recovery, archive ordering newest-first, 50-session retention, history deletion, rule/player independence, and malformed JSON recovery.

Malformed input must be copied to a timestamp-free deterministic backup key for testability:

```js
assert.equal(memory.getItem(STORAGE_KEYS.corruptBackup), "{bad json");
assert.deepEqual(loadAppData(memory), {
  version: 1,
  activeSession: null,
  history: [],
  savedPlayers: [],
  ruleTemplates: [],
});
```

- [ ] **Step 2: Run storage tests and verify failure**

Run: `npm test -- --test-name-pattern="storage|recovery|history"`

Expected: FAIL because storage exports do not exist.

- [ ] **Step 3: Implement storage validation and recovery**

Use one root key `pool-chase-score.data.v1` and one backup key `pool-chase-score.corrupt-backup`. Validate arrays and version before returning data. Archive only sessions with `status === "complete"`, clear `activeSession` when archiving the same ID, and never throw from `loadAppData()`.

- [ ] **Step 4: Run all domain tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit persistence**

```bash
git add pool-chase-score/storage.js pool-chase-score/tests/storage.test.js
git commit -m "feat: persist and recover chase sessions"
```

---

### Task 4: Accessible Application Shell and Visual System

**Files:**
- Create: `pool-chase-score/index.html`
- Create: `pool-chase-score/styles.css`
- Create: `pool-chase-score/icons.js`
- Create: `pool-chase-score/tests/ui-contract.test.js`

**Interfaces:**
- Produces DOM roots: `#home-view`, `#setup-view`, `#score-view`, `#history-view`
- Produces dialogs: `#counterparty-dialog`, `#event-editor-dialog`, `#end-session-dialog`
- Produces panels: `#rack-result-sheet`, `#toast-region`
- Produces CSS state classes: `.is-active`, `.is-selected`, `.is-positive`, `.is-negative`, `.is-disabled`

- [ ] **Step 1: Write failing static UI contract tests**

Read `index.html` and assert:

```js
assert.match(html, /id="score-view"/);
assert.match(html, /id="player-score-list"/);
assert.match(html, /id="in-rack-actions"/);
assert.match(html, /id="terminal-actions"/);
assert.match(html, /id="recent-events"/);
assert.match(html, /id="undo-event"/);
assert.match(html, /aria-live="polite"/);
assert.match(html, /manifest\.webmanifest/);
```

Read `styles.css` and assert `100dvh`, `prefers-reduced-motion`, `44px`, player count states, safe-area insets, and no negative letter spacing.

- [ ] **Step 2: Run UI contracts and verify failure**

Run: `npm test -- --test-name-pattern="UI contract"`

Expected: FAIL because the application shell does not exist.

- [ ] **Step 3: Build semantic HTML and local Lucide sprite**

Use real buttons for all commands, radio inputs for template choice, number inputs for scores, and dialogs for destructive confirmation. `icons.js` must expose `icon(name, size)` using Lucide path data for `play`, `history`, `users`, `settings`, `undo-2`, `rotate-ccw`, `trash-2`, `pencil`, `grip-vertical`, `share-2`, `download`, `more-horizontal`, `x`, and `check`.

- [ ] **Step 4: Implement the responsive visual system**

Define exact tokens:

```css
:root {
  --felt-950: #071d18;
  --felt-900: #0b2d25;
  --felt-800: #12483a;
  --ink: #10211d;
  --paper: #f4f0e5;
  --paper-strong: #fffaf0;
  --brass: #c79a3b;
  --danger: #b5473c;
  --line: rgba(244, 240, 229, 0.18);
  --tap: 44px;
}
```

The score console must use `height: 100dvh`, a fixed-height header, a flexible internally scrollable player region, and a non-shrinking action dock. Cards use at most 8px radius. Text size must use fixed rem values and media queries, not viewport-width font scaling.

- [ ] **Step 5: Run UI contracts**

Run: `npm test`

Expected: all contract and domain tests PASS.

- [ ] **Step 6: Commit the shell**

```bash
git add pool-chase-score/index.html pool-chase-score/styles.css pool-chase-score/icons.js pool-chase-score/tests/ui-contract.test.js
git commit -m "feat: add mobile chase scoreboard shell"
```

---

### Task 5: Setup Flow and Local Visual Assets

**Files:**
- Create: `pool-chase-score/app.js`
- Create: `pool-chase-score/assets/pool-table-home.webp`
- Create: `pool-chase-score/assets/app-icon-192.png`
- Create: `pool-chase-score/assets/app-icon-512.png`
- Create: `pool-chase-score/tests/browser/setup.spec.js`
- Create: `pool-chase-score/playwright.config.js`
- Modify: `pool-chase-score/package-lock.json`

**Interfaces:**
- Consumes: rule, session, storage, and icon exports
- Produces: setup state with `players`, `initialScoreMode`, `rules`, and `order`
- Produces test IDs: `start-session`, `player-name-input`, `add-player`, `setup-next`, `rule-row`, `start-first-rack`

- [ ] **Step 1: Install browser test dependency**

Run: `npm install`

Expected: `package-lock.json` is created and `@playwright/test@1.61.1` is installed.

- [ ] **Step 2: Write failing setup browser tests**

Configure Playwright at `http://127.0.0.1:5177/pool-chase-score/` using:

```js
webServer: {
  command: "python3 -m http.server 5177 --bind 127.0.0.1 --directory ..",
  url: "http://127.0.0.1:5177/pool-chase-score/",
  reuseExistingServer: true,
}
```

Tests must prove:

- Fresh load shows 3 editable players.
- Removing players stops at 2; adding stops at 6.
- Duplicate and blank names block progression with visible feedback.
- All-100, all-0, and custom initial scores work.
- Default rules can be edited within integer bounds.
- Empty template requires at least one enabled terminal rule.
- Drag/reorder controls update first-rack order.
- Starting creates an active session and opens score view.

- [ ] **Step 3: Generate and prepare local visual assets**

Generate a square, realistic top-down billiards visual showing numbered pool balls on deep green felt, with directional light, no text, no logos, and enough dark negative space for UI overlay. Crop/export one WebP home image and two PNG app icons. Verify the balls remain recognizable at 192px.

- [ ] **Step 4: Implement the setup controller**

`app.js` must render from state rather than attaching independent mutable values to cards. Persist common players and custom rule templates only after valid confirmation. Before starting, render a named preview:

```text
犯规示例：王强 -1 · 张伟 +1
大金示例：李明 +20 · 王强 -10 · 张伟 -10
```

- [ ] **Step 5: Run setup browser tests**

Run: `npm run test:browser -- setup.spec.js`

Expected: all setup tests PASS.

- [ ] **Step 6: Commit setup**

```bash
git add pool-chase-score/app.js pool-chase-score/assets pool-chase-score/tests/browser/setup.spec.js pool-chase-score/playwright.config.js pool-chase-score/package-lock.json
git commit -m "feat: build chase session setup"
```

---

### Task 6: Live Scoring, Undo, Editing, and Rack Transitions

**Files:**
- Modify: `pool-chase-score/app.js`
- Modify: `pool-chase-score/styles.css`
- Create: `pool-chase-score/tests/browser/scoring.spec.js`
- Create: `pool-chase-score/tests/browser/layout.spec.js`

**Interfaces:**
- Consumes: session transitions and persistence
- Produces test IDs: `player-row`, `event-action`, `terminal-action`, `counterparty-option`, `undo-event`, `recent-event`, `start-next-rack`, `adjust-order`, `void-rack`

- [ ] **Step 1: Write failing live-scoring tests**

Cover this exact 3-player scenario:

1. Start all players at 100 with order 王强, 李明, 张伟.
2. Select 王强 and record 犯规.
3. Assert scores are 99, 100, 101 and rack stays open.
4. Select 李明, choose 普胜, and choose 王强 as the main loser.
5. Assert scores are 95, 104, 101 and rack result sheet opens.
6. Undo the terminal result and assert the rack reopens at 99, 100, 101.
7. Restore or re-record the result, confirm suggested order 李明, 王强, 张伟.
8. Start rack 2 and assert scores remain 95, 104, 101.

Also test rapid double clicks produce one event, recent-event edit/delete recomputes scores, and voiding a rack does not change cumulative score.

- [ ] **Step 2: Write failing layout tests**

For 390×844, 430×932, 768×1024, and 1440×900, assert:

```js
expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
expect(metrics.actionDockBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
expect(metrics.actionDockTop).toBeGreaterThan(metrics.headerBottom);
expect(metrics.overlappingControls).toEqual([]);
```

Run separate 2-, 3-, and 6-player states. For six players, assert only `#player-score-list` scrolls while the action dock remains visible.

- [ ] **Step 3: Run targeted tests and verify failure**

Run: `npm run test:browser -- scoring.spec.js layout.spec.js`

Expected: FAIL because live scoring handlers and layouts are incomplete.

- [ ] **Step 4: Implement player selection and event actions**

Player selection must change border, size, and `aria-pressed`. Event buttons remain disabled until a player is selected. `head-to-head` rules open the counterparty dialog; other rules apply immediately. Lock the action dock until each mutation is persisted.

- [ ] **Step 5: Implement secondary recovery controls**

Show only the three most recent events in the console. Place `undo-2` beside the section label with subdued paper color. Event details expose edit and delete through a compact menu. Undo must show a 3-second toast with “恢复”; it must not open a confirmation dialog.

- [ ] **Step 6: Implement rack result and next-order confirmation**

Terminal events open `#rack-result-sheet`, not a new page. Render per-player rack deltas, suggested order, drag handles, “开始下一局”, “撤销本局结果”, and “调整顺序”. Start the next rack only after an explicit button press.

- [ ] **Step 7: Run scoring and layout tests**

Run: `npm test && npm run test:browser -- scoring.spec.js layout.spec.js`

Expected: all tests PASS.

- [ ] **Step 8: Commit live scoring**

```bash
git add pool-chase-score/app.js pool-chase-score/styles.css pool-chase-score/tests/browser/scoring.spec.js pool-chase-score/tests/browser/layout.spec.js
git commit -m "feat: add live rack scoring workflow"
```

---

### Task 7: History, Summary Image, and Installable PWA

**Files:**
- Create: `pool-chase-score/share.js`
- Create: `pool-chase-score/manifest.webmanifest`
- Create: `pool-chase-score/sw.js`
- Modify: `pool-chase-score/app.js`
- Modify: `pool-chase-score/index.html`
- Modify: `pool-chase-score/styles.css`
- Create: `pool-chase-score/tests/share.test.js`
- Create: `pool-chase-score/tests/browser/history.spec.js`

**Interfaces:**
- Produces: `buildSessionSummary(session): Summary`
- Produces: `drawSummaryCard(canvas, summary): Promise<Blob>`
- Produces: `shareSummary(blob, filename): Promise<"shared" | "downloaded">`

`Summary` shape:

```js
{
  dateLabel: "2026年7月30日",
  durationLabel: "2小时18分钟",
  rackCount: 12,
  ranking: [
    { playerId: "p2", name: "李明", score: 128, change: 28 }
  ],
  eventCounts: {
    "p2": { "普胜": 3, "小金": 1, "犯规": 2 }
  }
}
```

- [ ] **Step 1: Write failing summary tests**

Assert stable ranking with ties, duration formatting, active-event-only counts, rack count, and no amount/payment fields. Test that the generated filename is `台球追分-YYYY-MM-DD.png`.

- [ ] **Step 2: Write failing history browser tests**

Test manual end confirmation, read-only archived history, refresh persistence, history deletion, a new session starting from configured initial scores, summary canvas dimensions, download fallback, and no network request after the application shell is cached.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --test-name-pattern="summary|share" && npm run test:browser -- history.spec.js`

Expected: FAIL because summary, history UI, and PWA files are missing.

- [ ] **Step 4: Implement summary and Canvas card**

Use a 1080×1350 canvas. Draw the dark felt header, warm paper result area, ranked player rows, total rack/time footer, and a small “台球追分计分台” signature. Use system Chinese fonts and local colors; do not include avatars, amounts, or the full event log.

- [ ] **Step 5: Implement history and session ending**

Ending must archive the event snapshot through `archiveSession()`, make the record read-only, and route to summary. The home page must show the active-session continuation before the new-session action.

- [ ] **Step 6: Add manifest and service worker**

Manifest requirements:

```json
{
  "name": "台球追分计分台",
  "short_name": "台球追分",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#071d18",
  "theme_color": "#0b2d25",
  "orientation": "portrait-primary"
}
```

Cache only the project application shell and local assets. Use a versioned cache name and network-first HTML, cache-first immutable assets. Do not force activation while a scoring page is open.

- [ ] **Step 7: Run all project tests**

Run: `npm test && npm run test:browser`

Expected: all tests PASS.

- [ ] **Step 8: Commit history and PWA**

```bash
git add pool-chase-score/share.js pool-chase-score/manifest.webmanifest pool-chase-score/sw.js pool-chase-score/app.js pool-chase-score/index.html pool-chase-score/styles.css pool-chase-score/tests
git commit -m "feat: add chase history sharing and offline use"
```

---

### Task 8: Documentation, Portfolio Integration, Visual QA, and Deployment

**Files:**
- Create: `pool-chase-score/README.md`
- Create: `pool-chase-score/docs/images/pool-chase-score-preview.png`
- Modify: `README.md`
- Modify: `site/index.html`
- Modify: `.github/workflows/pages.yml`

**Interfaces:**
- Publishes: `https://jiaxuan-tao.github.io/vibe-coding-lab/pool-chase-score/`
- Adds portfolio asset: `_site/assets/pool-chase-score.png`

- [ ] **Step 1: Write the user-facing README**

README sections must be:

1. Product title and one-sentence purpose.
2. Online experience link and preview image.
3. Problem and user scenario.
4. Start, score, finish, and recover instructions.
5. Configurable rule explanation with the default `1 / 4 / 7 / 10` table.
6. Core features.
7. Local privacy.
8. Local run and test commands.
9. Technical architecture.
10. Capability boundaries.
11. Research references and MIT license.

Do not use employment, interview, job-seeking, or self-promotion wording.

- [ ] **Step 2: Update repository and portfolio indexes**

Add:

```markdown
- [Pool Chase Score｜台球追分计分台](pool-chase-score/README.md)
  面向 2–6 名球友共用一台手机的实时追分工具，支持自定义联动规则、局内事件、跨局累计、撤销与本地历史。
  [在线体验](https://jiaxuan-tao.github.io/vibe-coding-lab/pool-chase-score/)
```

Add `PROJECT 06` to `site/index.html` with online and source links.

- [ ] **Step 3: Extend GitHub Pages CI**

Add `pool-chase-score/package-lock.json` to npm caching. Run its unit and browser tests. Copy all HTML, CSS, JS, WebP, PNG, manifest, and service-worker files to `_site/pool-chase-score/`, and copy its preview image to `_site/assets/pool-chase-score.png`.

- [ ] **Step 4: Run complete local verification**

Run:

```bash
cd pool-chase-score
npm test
npm run test:browser
cd ..
git diff --check
```

Expected: tests PASS and `git diff --check` exits 0.

- [ ] **Step 5: Perform real visual QA**

Start the static server and inspect Playwright screenshots at 390×844, 430×932, 768×1024, and 1440×900. Verify:

- No blank assets, horizontal overflow, clipped text, or overlapping controls.
- Two-, three-, and six-player score consoles are usable.
- Selected and disabled states are visually distinct.
- Undo remains visually secondary.
- Setup, score, result sheet, history, and summary share one design language.
- The home asset shows recognizable billiards equipment rather than an abstract decoration.

Fix defects and repeat screenshots until all checks pass.

- [ ] **Step 6: Capture the final preview**

Capture a 1440×900 screenshot showing the 3-player score console after one foul event, with no dialogs open and realistic sample names. Save it to `pool-chase-score/docs/images/pool-chase-score-preview.png`.

- [ ] **Step 7: Commit integration**

```bash
git add pool-chase-score README.md site/index.html .github/workflows/pages.yml
git commit -m "docs: publish pool chase scoreboard"
```

- [ ] **Step 8: Push and verify GitHub Pages**

Run:

```bash
git push origin main
gh run list --workflow pages.yml --limit 1
gh run watch --exit-status
```

Expected: the latest Pages workflow concludes `success`.

Open the deployed URL and verify the home, setup, one scoring event, manifest, service worker, and portfolio card. Report the exact deployed URL and test evidence.
