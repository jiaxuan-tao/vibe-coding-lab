import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultRules } from "../rules.js";
import {
  createSession,
  deleteEvent,
  deriveScores,
  endSession,
  recordScoreEvent,
  replaceEvent,
  restoreLastEvent,
  startNextRack,
  undoLastEvent,
  voidCurrentRack,
} from "../session.js";

function makeSession() {
  return createSession({
    id: "session-1",
    startedAt: "2026-07-30T12:00:00.000Z",
    players: [
      { id: "p1", name: "王强", color: "#d7a82f", initialScore: 100 },
      { id: "p2", name: "李明", color: "#4f8f86", initialScore: 100 },
      { id: "p3", name: "张伟", color: "#c95d4d", initialScore: 100 },
    ],
    rules: createDefaultRules(),
    order: ["p1", "p2", "p3"],
  });
}

test("session: in-rack and terminal events update scores and rack state", () => {
  const session = makeSession();
  const afterFoul = recordScoreEvent(session, {
    id: "event-1",
    ruleId: "foul",
    actorId: "p1",
    counterpartyId: null,
    occurredAt: "2026-07-30T12:01:00.000Z",
  });

  assert.deepEqual(deriveScores(afterFoul), { p1: 99, p2: 100, p3: 101 });
  assert.equal(afterFoul.rackStatus, "active");

  const afterWin = recordScoreEvent(afterFoul, {
    id: "event-2",
    ruleId: "normal-win",
    actorId: "p2",
    counterpartyId: "p1",
    occurredAt: "2026-07-30T12:02:00.000Z",
  });

  assert.deepEqual(deriveScores(afterWin), { p1: 95, p2: 104, p3: 101 });
  assert.equal(afterWin.rackStatus, "complete");
  assert.deepEqual(afterWin.suggestedOrder, ["p2", "p1", "p3"]);
  assert.equal(session.events.length, 0);
});

test("session: starting the next rack preserves cumulative score", () => {
  const completed = recordScoreEvent(makeSession(), {
    id: "event-1",
    ruleId: "big-gold",
    actorId: "p2",
    occurredAt: "2026-07-30T12:02:00.000Z",
  });
  const next = startNextRack(completed, ["p2", "p1", "p3"]);

  assert.equal(next.rackNumber, 2);
  assert.equal(next.rackStatus, "active");
  assert.deepEqual(next.currentOrder, ["p2", "p1", "p3"]);
  assert.deepEqual(deriveScores(next), { p1: 90, p2: 120, p3: 90 });
});

test("event: undo and restore a terminal event reopen and reclose the rack", () => {
  const completed = recordScoreEvent(makeSession(), {
    id: "event-1",
    ruleId: "normal-win",
    actorId: "p2",
    counterpartyId: "p1",
    occurredAt: "2026-07-30T12:02:00.000Z",
  });
  const undone = undoLastEvent(completed);

  assert.deepEqual(deriveScores(undone), { p1: 100, p2: 100, p3: 100 });
  assert.equal(undone.rackStatus, "active");
  assert.equal(undone.events[0].status, "reverted");

  const restored = restoreLastEvent(undone);
  assert.deepEqual(deriveScores(restored), { p1: 96, p2: 104, p3: 100 });
  assert.equal(restored.rackStatus, "complete");
});

test("event: replacing and deleting recompute scores from active deltas", () => {
  const afterFoul = recordScoreEvent(makeSession(), {
    id: "event-1",
    ruleId: "foul",
    actorId: "p1",
    occurredAt: "2026-07-30T12:01:00.000Z",
  });
  const replaced = replaceEvent(afterFoul, "event-1", {
    id: "event-2",
    ruleId: "foul",
    actorId: "p2",
    occurredAt: "2026-07-30T12:01:30.000Z",
  });

  assert.deepEqual(deriveScores(replaced), { p1: 101, p2: 99, p3: 100 });
  assert.equal(replaced.events[0].status, "replaced");
  assert.equal(replaced.events[1].replacesEventId, "event-1");

  const deleted = deleteEvent(replaced, "event-2");
  assert.deepEqual(deriveScores(deleted), { p1: 100, p2: 100, p3: 100 });
  assert.equal(deleted.events[1].status, "deleted");
});

test("rack: voiding removes current rack effects and closes it", () => {
  const afterFoul = recordScoreEvent(makeSession(), {
    id: "event-1",
    ruleId: "foul",
    actorId: "p1",
    occurredAt: "2026-07-30T12:01:00.000Z",
  });
  const voided = voidCurrentRack(afterFoul, {
    id: "void-1",
    occurredAt: "2026-07-30T12:03:00.000Z",
  });

  assert.deepEqual(deriveScores(voided), { p1: 100, p2: 100, p3: 100 });
  assert.equal(voided.rackStatus, "complete");
  assert.equal(voided.events[0].status, "voided");
  assert.equal(voided.events[1].ruleId, "__void__");
});

test("session: duplicate events and mutations after completion are rejected", () => {
  const first = recordScoreEvent(makeSession(), {
    id: "event-1",
    ruleId: "foul",
    actorId: "p1",
    occurredAt: "2026-07-30T12:01:00.000Z",
  });
  assert.throws(
    () => recordScoreEvent(first, {
      id: "event-1",
      ruleId: "foul",
      actorId: "p1",
      occurredAt: "2026-07-30T12:01:01.000Z",
    }),
    /重复/,
  );

  const ended = endSession(first, "2026-07-30T14:00:00.000Z");
  assert.equal(ended.status, "complete");
  assert.throws(
    () => recordScoreEvent(ended, {
      id: "event-2",
      ruleId: "foul",
      actorId: "p2",
      occurredAt: "2026-07-30T14:01:00.000Z",
    }),
    /已经结束/,
  );
});

test("session: validates player count, names, scores, and order", () => {
  const config = {
    id: "bad",
    startedAt: "2026-07-30T12:00:00.000Z",
    players: [
      { id: "p1", name: "同名", color: "#fff", initialScore: 100 },
      { id: "p2", name: "同名", color: "#000", initialScore: 100 },
    ],
    rules: createDefaultRules(),
    order: ["p1", "p2"],
  };
  assert.throws(() => createSession(config), /姓名不能重复/);

  assert.throws(
    () => createSession({
      ...config,
      players: [
        { id: "p1", name: "一", color: "#fff", initialScore: 10000 },
        { id: "p2", name: "二", color: "#000", initialScore: 100 },
      ],
    }),
    /-9999 到 9999/,
  );
});
