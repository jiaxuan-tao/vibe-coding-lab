import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RULES,
  calculateSettlement,
  createDefaultRules,
  resolveRelativePlayer,
  validateRuleSet,
} from "../rules.js";

const playerIds = ["p1", "p2", "p3"];
const order = ["p1", "p2", "p3"];

function getRule(id) {
  return DEFAULT_RULES.find((rule) => rule.id === id);
}

test("settlement: foul transfers one point to the previous player cyclically", () => {
  assert.deepEqual(
    calculateSettlement({
      rule: getRule("foul"),
      playerIds,
      order,
      actorId: "p1",
      counterpartyId: null,
    }),
    { p1: -1, p2: 0, p3: 1 },
  );
});

test("settlement: a head-to-head result transfers points from loser to winner", () => {
  assert.deepEqual(
    calculateSettlement({
      rule: getRule("normal-win"),
      playerIds,
      order,
      actorId: "p2",
      counterpartyId: "p1",
    }),
    { p1: -4, p2: 4, p3: 0 },
  );
});

test("settlement: collect-from-others takes the configured value from every opponent", () => {
  assert.deepEqual(
    calculateSettlement({
      rule: getRule("big-gold"),
      playerIds,
      order,
      actorId: "p2",
      counterpartyId: null,
    }),
    { p1: -10, p2: 20, p3: -10 },
  );
});

test("settlement: every default rule remains zero-sum for two and six players", () => {
  for (const ids of [["p1", "p2"], ["p1", "p2", "p3", "p4", "p5", "p6"]]) {
    for (const rule of DEFAULT_RULES) {
      const deltas = calculateSettlement({
        rule,
        playerIds: ids,
        order: ids,
        actorId: ids[0],
        counterpartyId: rule.settlement === "head-to-head" ? ids[1] : null,
      });
      assert.equal(Object.values(deltas).reduce((sum, value) => sum + value, 0), 0);
    }
  }
});

test("rule: relative player lookup wraps at both ends", () => {
  assert.equal(resolveRelativePlayer(order, "p1", "previous"), "p3");
  assert.equal(resolveRelativePlayer(order, "p3", "next"), "p1");
  assert.equal(resolveRelativePlayer(order, "p2", "previous"), "p1");
});

test("rule: default rules are returned as independent copies", () => {
  const first = createDefaultRules();
  const second = createDefaultRules();
  first[0].name = "修改";
  assert.equal(second[0].name, "犯规");
  assert.equal(DEFAULT_RULES[0].name, "犯规");
});

test("rule: validates integer bounds, unique ids, and a terminal rule", () => {
  assert.equal(validateRuleSet(createDefaultRules()).valid, true);

  const duplicate = createDefaultRules();
  duplicate[1].id = duplicate[0].id;
  assert.match(validateRuleSet(duplicate).errors.join(" "), /事件标识不能重复/);

  const invalidValue = createDefaultRules();
  invalidValue[0].value = 0;
  assert.match(validateRuleSet(invalidValue).errors.join(" "), /1 到 999/);

  const noTerminal = createDefaultRules().map((rule) => ({ ...rule, endsRack: false }));
  assert.match(validateRuleSet(noTerminal).errors.join(" "), /终局事件/);
});

test("settlement: rejects unknown actors and invalid counterparties", () => {
  assert.throws(
    () => calculateSettlement({
      rule: getRule("foul"),
      playerIds,
      order,
      actorId: "missing",
      counterpartyId: null,
    }),
    /玩家不存在/,
  );

  assert.throws(
    () => calculateSettlement({
      rule: getRule("normal-win"),
      playerIds,
      order,
      actorId: "p1",
      counterpartyId: "p1",
    }),
    /不能是同一名玩家/,
  );
});
