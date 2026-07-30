import {
  calculateSettlement,
  validateRuleSet,
} from "./rules.js";

function createId(prefix) {
  const token = globalThis.crypto?.randomUUID?.()
    ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${token}`;
}

function copy(value) {
  return structuredClone(value);
}

function assertActiveSession(session) {
  if (!session || session.status !== "active") {
    throw new Error("今日追分已经结束，不能继续计分");
  }
}

function assertActiveRack(session) {
  if (session.rackStatus !== "active") {
    throw new Error("当前局已经结束");
  }
}

function validatePlayers(players, order) {
  if (!Array.isArray(players) || players.length < 2 || players.length > 6) {
    throw new Error("参与玩家必须为 2 到 6 人");
  }

  const ids = players.map((player) => player.id);
  const names = players.map((player) => player.name?.trim());
  if (ids.some((id) => typeof id !== "string" || !id) || new Set(ids).size !== ids.length) {
    throw new Error("玩家标识不能为空或重复");
  }
  if (names.some((name) => !name || name.length > 10)) {
    throw new Error("玩家姓名必须为 1 到 10 个字符");
  }
  if (new Set(names).size !== names.length) {
    throw new Error("玩家姓名不能重复");
  }
  if (
    players.some((player) => (
      !Number.isInteger(player.initialScore)
      || player.initialScore < -9999
      || player.initialScore > 9999
    ))
  ) {
    throw new Error("初始积分必须为 -9999 到 9999 的整数");
  }
  if (
    !Array.isArray(order)
    || order.length !== ids.length
    || new Set(order).size !== order.length
    || order.some((id) => !ids.includes(id))
  ) {
    throw new Error("玩家顺序必须完整包含所有玩家");
  }
}

export function createSession({
  id = createId("session"),
  startedAt = new Date().toISOString(),
  players,
  rules,
  order,
}) {
  validatePlayers(players, order);
  const ruleValidation = validateRuleSet(rules);
  if (!ruleValidation.valid) {
    throw new Error(ruleValidation.errors[0]);
  }

  return {
    version: 1,
    id,
    status: "active",
    startedAt,
    endedAt: null,
    players: players.map((player) => ({
      ...copy(player),
      name: player.name.trim(),
    })),
    rules: copy(rules),
    rackNumber: 1,
    currentOrder: [...order],
    rackStatus: "active",
    suggestedOrder: null,
    events: [],
    lastUndoEventId: null,
  };
}

export function deriveScores(session) {
  const scores = Object.fromEntries(
    session.players.map((player) => [player.id, player.initialScore]),
  );

  for (const event of session.events) {
    if (event.status !== "active") continue;
    for (const [playerId, delta] of Object.entries(event.deltas)) {
      if (playerId in scores) scores[playerId] += delta;
    }
  }
  return scores;
}

export function suggestNextOrder(session, terminalEvent) {
  const winnerId = terminalEvent.actorId;
  if (!winnerId || !session.currentOrder.includes(winnerId)) {
    return [...session.currentOrder];
  }

  const suggestion = [winnerId];
  if (
    terminalEvent.counterpartyId
    && terminalEvent.counterpartyId !== winnerId
    && session.currentOrder.includes(terminalEvent.counterpartyId)
  ) {
    suggestion.push(terminalEvent.counterpartyId);
  }

  for (const playerId of session.currentOrder) {
    if (!suggestion.includes(playerId)) suggestion.push(playerId);
  }
  return suggestion;
}

export function recordScoreEvent(session, {
  id = createId("event"),
  ruleId,
  actorId,
  counterpartyId = null,
  occurredAt = new Date().toISOString(),
  replacesEventId = null,
}) {
  assertActiveSession(session);
  assertActiveRack(session);
  if (session.events.some((event) => event.id === id)) {
    throw new Error("检测到重复计分事件");
  }

  const rule = session.rules.find((candidate) => candidate.id === ruleId && candidate.enabled);
  if (!rule) {
    throw new Error("计分规则不存在或未启用");
  }

  const playerIds = session.players.map((player) => player.id);
  const deltas = calculateSettlement({
    rule,
    playerIds,
    order: session.currentOrder,
    actorId,
    counterpartyId,
  });
  const event = {
    id,
    rackNumber: session.rackNumber,
    ruleId: rule.id,
    label: rule.name,
    actorId,
    counterpartyId,
    deltas,
    occurredAt,
    status: "active",
    endsRack: rule.endsRack,
    replacesEventId,
  };
  const next = {
    ...copy(session),
    events: [...copy(session.events), event],
    lastUndoEventId: null,
  };

  if (rule.endsRack) {
    next.rackStatus = "complete";
    next.suggestedOrder = suggestNextOrder(next, event);
  }
  return next;
}

export function undoLastEvent(session) {
  assertActiveSession(session);
  const index = session.events.findLastIndex((event) => event.status === "active");
  if (index < 0) {
    throw new Error("没有可以撤销的事件");
  }

  const next = copy(session);
  const event = next.events[index];
  event.status = "reverted";
  next.lastUndoEventId = event.id;
  if (event.endsRack && event.rackNumber === next.rackNumber) {
    next.rackStatus = "active";
    next.suggestedOrder = null;
  }
  return next;
}

export function restoreLastEvent(session) {
  assertActiveSession(session);
  if (!session.lastUndoEventId) {
    throw new Error("没有可以恢复的事件");
  }
  const next = copy(session);
  const event = next.events.find((candidate) => (
    candidate.id === next.lastUndoEventId && candidate.status === "reverted"
  ));
  if (!event) {
    throw new Error("撤销记录已经失效");
  }

  event.status = "active";
  next.lastUndoEventId = null;
  if (event.endsRack && event.rackNumber === next.rackNumber) {
    next.rackStatus = "complete";
    next.suggestedOrder = suggestNextOrder(next, event);
  }
  return next;
}

export function replaceEvent(session, eventId, input) {
  assertActiveSession(session);
  const original = session.events.find((event) => event.id === eventId && event.status === "active");
  if (!original || original.rackNumber !== session.rackNumber) {
    throw new Error("只能修改当前局内的有效事件");
  }

  const next = copy(session);
  const target = next.events.find((event) => event.id === eventId);
  target.status = "replaced";
  next.lastUndoEventId = null;
  if (target.endsRack) {
    next.rackStatus = "active";
    next.suggestedOrder = null;
  }
  return recordScoreEvent(next, { ...input, replacesEventId: eventId });
}

export function deleteEvent(session, eventId) {
  assertActiveSession(session);
  const index = session.events.findIndex((event) => event.id === eventId);
  if (index < 0 || session.events[index].status !== "active") {
    throw new Error("事件不存在或已经失效");
  }
  if (session.events[index].rackNumber !== session.rackNumber) {
    throw new Error("只能删除当前局内的事件");
  }

  const next = copy(session);
  const event = next.events[index];
  event.status = "deleted";
  next.lastUndoEventId = null;
  if (event.endsRack) {
    next.rackStatus = "active";
    next.suggestedOrder = null;
  }
  return next;
}

function validateOrder(session, order) {
  const playerIds = session.players.map((player) => player.id);
  if (
    !Array.isArray(order)
    || order.length !== playerIds.length
    || new Set(order).size !== order.length
    || order.some((playerId) => !playerIds.includes(playerId))
  ) {
    throw new Error("下一局顺序必须完整包含所有玩家");
  }
}

export function startNextRack(session, confirmedOrder) {
  assertActiveSession(session);
  if (session.rackStatus !== "complete") {
    throw new Error("当前局尚未结束");
  }
  validateOrder(session, confirmedOrder);

  return {
    ...copy(session),
    rackNumber: session.rackNumber + 1,
    currentOrder: [...confirmedOrder],
    rackStatus: "active",
    suggestedOrder: null,
    lastUndoEventId: null,
  };
}

export function voidCurrentRack(session, {
  id = createId("void"),
  occurredAt = new Date().toISOString(),
} = {}) {
  assertActiveSession(session);
  assertActiveRack(session);

  const next = copy(session);
  for (const event of next.events) {
    if (event.rackNumber === next.rackNumber && event.status === "active") {
      event.status = "voided";
    }
  }

  const deltas = Object.fromEntries(next.players.map((player) => [player.id, 0]));
  next.events.push({
    id,
    rackNumber: next.rackNumber,
    ruleId: "__void__",
    label: "本局作废",
    actorId: null,
    counterpartyId: null,
    deltas,
    occurredAt,
    status: "active",
    endsRack: true,
    replacesEventId: null,
  });
  next.rackStatus = "complete";
  next.suggestedOrder = [...next.currentOrder];
  next.lastUndoEventId = null;
  return next;
}

export function endSession(session, endedAt = new Date().toISOString()) {
  assertActiveSession(session);
  return {
    ...copy(session),
    status: "complete",
    endedAt,
    lastUndoEventId: null,
  };
}
