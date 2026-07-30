export const SETTLEMENT_TYPES = Object.freeze({
  RELATIVE_TRANSFER: "relative-transfer",
  HEAD_TO_HEAD: "head-to-head",
  COLLECT_FROM_OTHERS: "collect-from-others",
});

const RAW_DEFAULT_RULES = [
  {
    id: "foul",
    name: "犯规",
    value: 1,
    settlement: SETTLEMENT_TYPES.RELATIVE_TRANSFER,
    direction: "previous",
    endsRack: false,
    enabled: true,
  },
  {
    id: "normal-win",
    name: "普胜",
    value: 4,
    settlement: SETTLEMENT_TYPES.HEAD_TO_HEAD,
    direction: null,
    endsRack: true,
    enabled: true,
  },
  {
    id: "small-gold",
    name: "小金",
    value: 7,
    settlement: SETTLEMENT_TYPES.HEAD_TO_HEAD,
    direction: null,
    endsRack: true,
    enabled: true,
  },
  {
    id: "big-gold",
    name: "大金",
    value: 10,
    settlement: SETTLEMENT_TYPES.COLLECT_FROM_OTHERS,
    direction: null,
    endsRack: true,
    enabled: true,
  },
  {
    id: "golden-nine",
    name: "黄金九",
    value: 4,
    settlement: SETTLEMENT_TYPES.COLLECT_FROM_OTHERS,
    direction: null,
    endsRack: true,
    enabled: true,
  },
];

export const DEFAULT_RULES = Object.freeze(
  RAW_DEFAULT_RULES.map((rule) => Object.freeze({ ...rule })),
);

export function createDefaultRules() {
  return DEFAULT_RULES.map((rule) => ({ ...rule }));
}

function validatePlayerContext(playerIds, order) {
  if (!Array.isArray(playerIds) || playerIds.length < 2 || playerIds.length > 6) {
    throw new Error("参与玩家必须为 2 到 6 人");
  }
  if (new Set(playerIds).size !== playerIds.length) {
    throw new Error("玩家标识不能重复");
  }
  if (
    !Array.isArray(order)
    || order.length !== playerIds.length
    || new Set(order).size !== order.length
    || order.some((playerId) => !playerIds.includes(playerId))
  ) {
    throw new Error("玩家顺序必须完整包含所有玩家");
  }
}

export function resolveRelativePlayer(order, playerId, direction) {
  if (!Array.isArray(order) || order.length < 2 || !order.includes(playerId)) {
    throw new Error("无法在当前顺序中找到玩家");
  }
  if (!["previous", "next"].includes(direction)) {
    throw new Error("顺序方向必须是 previous 或 next");
  }

  const index = order.indexOf(playerId);
  const offset = direction === "previous" ? -1 : 1;
  return order[(index + offset + order.length) % order.length];
}

export function validateRuleSet(rules) {
  const errors = [];

  if (!Array.isArray(rules) || rules.length < 1 || rules.length > 12) {
    return { valid: false, errors: ["计分事件必须为 1 到 12 个"] };
  }

  const ids = new Set();
  for (const rule of rules) {
    if (!rule || typeof rule !== "object") {
      errors.push("计分事件格式无效");
      continue;
    }
    if (typeof rule.id !== "string" || !rule.id.trim()) {
      errors.push("事件标识不能为空");
    } else if (ids.has(rule.id)) {
      errors.push("事件标识不能重复");
    } else {
      ids.add(rule.id);
    }
    if (typeof rule.name !== "string" || !rule.name.trim() || rule.name.trim().length > 8) {
      errors.push("事件名称必须为 1 到 8 个字符");
    }
    if (!Number.isInteger(rule.value) || rule.value < 1 || rule.value > 999) {
      errors.push("事件分值必须为 1 到 999 的整数");
    }
    if (!Object.values(SETTLEMENT_TYPES).includes(rule.settlement)) {
      errors.push("事件结算方式无效");
    }
    if (
      rule.settlement === SETTLEMENT_TYPES.RELATIVE_TRANSFER
      && !["previous", "next"].includes(rule.direction)
    ) {
      errors.push("顺序转分事件必须指定上家或下家");
    }
    if (typeof rule.enabled !== "boolean" || typeof rule.endsRack !== "boolean") {
      errors.push("事件状态必须使用布尔值");
    }
  }

  if (!rules.some((rule) => rule?.enabled && rule?.endsRack)) {
    errors.push("至少需要启用一个终局事件");
  }

  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function calculateSettlement({
  rule,
  playerIds,
  order,
  actorId,
  counterpartyId = null,
}) {
  validatePlayerContext(playerIds, order);

  const validation = validateRuleSet([{ ...rule, endsRack: true, enabled: true }]);
  const ruleErrors = validation.errors.filter((error) => error !== "至少需要启用一个终局事件");
  if (ruleErrors.length > 0) {
    throw new Error(ruleErrors[0]);
  }
  if (rule.enabled === false) {
    throw new Error("该计分事件未启用");
  }
  if (!playerIds.includes(actorId)) {
    throw new Error("操作玩家不存在");
  }

  const deltas = Object.fromEntries(playerIds.map((playerId) => [playerId, 0]));

  switch (rule.settlement) {
    case SETTLEMENT_TYPES.RELATIVE_TRANSFER: {
      const receiverId = resolveRelativePlayer(order, actorId, rule.direction);
      deltas[actorId] -= rule.value;
      deltas[receiverId] += rule.value;
      break;
    }
    case SETTLEMENT_TYPES.HEAD_TO_HEAD: {
      if (!playerIds.includes(counterpartyId)) {
        throw new Error("主要负方玩家不存在");
      }
      if (counterpartyId === actorId) {
        throw new Error("得分者和主要负方不能是同一名玩家");
      }
      deltas[actorId] += rule.value;
      deltas[counterpartyId] -= rule.value;
      break;
    }
    case SETTLEMENT_TYPES.COLLECT_FROM_OTHERS: {
      for (const playerId of playerIds) {
        if (playerId === actorId) continue;
        deltas[playerId] -= rule.value;
        deltas[actorId] += rule.value;
      }
      break;
    }
    default:
      throw new Error("不支持的结算方式");
  }

  const total = Object.values(deltas).reduce((sum, value) => sum + value, 0);
  if (total !== 0) {
    throw new Error("结算结果必须保持积分守恒");
  }

  return deltas;
}
