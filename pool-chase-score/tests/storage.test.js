import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultRules } from "../rules.js";
import { createSession, endSession } from "../session.js";
import {
  STORAGE_KEYS,
  archiveSession,
  clearHistory,
  deleteHistoryItem,
  loadAppData,
  saveActiveSession,
  savePlayerDirectory,
  saveRuleTemplates,
} from "../storage.js";

function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

function makeSession(id = "session-1") {
  return createSession({
    id,
    startedAt: "2026-07-30T12:00:00.000Z",
    players: [
      { id: "p1", name: "王强", color: "#d7a82f", initialScore: 100 },
      { id: "p2", name: "李明", color: "#4f8f86", initialScore: 100 },
    ],
    rules: createDefaultRules(),
    order: ["p1", "p2"],
  });
}

test("storage: active sessions round-trip through the root record", () => {
  const memory = createMemoryStorage();
  const session = makeSession();
  saveActiveSession(memory, session);

  assert.deepEqual(loadAppData(memory).activeSession, session);
});

test("storage: malformed JSON is backed up and returns safe defaults", () => {
  const memory = createMemoryStorage({
    [STORAGE_KEYS.root]: "{bad json",
  });

  assert.deepEqual(loadAppData(memory), {
    version: 1,
    activeSession: null,
    history: [],
    savedPlayers: [],
    ruleTemplates: [],
  });
  assert.equal(memory.getItem(STORAGE_KEYS.corruptBackup), "{bad json");
});

test("storage: archiving clears the matching active session and sorts newest first", () => {
  const memory = createMemoryStorage();
  const active = makeSession("active");
  saveActiveSession(memory, active);

  const older = endSession(makeSession("older"), "2026-07-30T13:00:00.000Z");
  const newer = endSession(active, "2026-07-30T14:00:00.000Z");
  archiveSession(memory, older);
  const data = archiveSession(memory, newer);

  assert.equal(data.activeSession, null);
  assert.deepEqual(data.history.map((session) => session.id), ["active", "older"]);
});

test("storage: history keeps only the latest fifty sessions", () => {
  const memory = createMemoryStorage();
  for (let index = 0; index < 55; index += 1) {
    archiveSession(
      memory,
      endSession(
        makeSession(`session-${index}`),
        new Date(Date.UTC(2026, 6, 30, 12, index)).toISOString(),
      ),
    );
  }

  const data = loadAppData(memory);
  assert.equal(data.history.length, 50);
  assert.equal(data.history[0].id, "session-54");
  assert.equal(data.history.at(-1).id, "session-5");
});

test("storage: saved players and rule templates survive history deletion", () => {
  const memory = createMemoryStorage();
  savePlayerDirectory(memory, [{ id: "friend-1", name: "老周" }]);
  saveRuleTemplates(memory, [{ id: "rules-1", name: "周末规则", rules: createDefaultRules() }]);
  archiveSession(memory, endSession(makeSession(), "2026-07-30T14:00:00.000Z"));

  deleteHistoryItem(memory, "session-1");
  let data = loadAppData(memory);
  assert.equal(data.history.length, 0);
  assert.equal(data.savedPlayers[0].name, "老周");
  assert.equal(data.ruleTemplates[0].name, "周末规则");

  archiveSession(memory, endSession(makeSession("session-2"), "2026-07-30T15:00:00.000Z"));
  data = clearHistory(memory);
  assert.equal(data.history.length, 0);
  assert.equal(data.savedPlayers.length, 1);
  assert.equal(data.ruleTemplates.length, 1);
});

test("storage: unavailable storage never prevents the app from loading", () => {
  const unavailable = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() => loadAppData(unavailable));
  assert.equal(loadAppData(unavailable).activeSession, null);
  assert.doesNotThrow(() => saveActiveSession(unavailable, makeSession()));
});
