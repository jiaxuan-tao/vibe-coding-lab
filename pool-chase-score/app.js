import { icon } from "./icons.js";
import {
  SETTLEMENT_TYPES,
  calculateSettlement,
  createDefaultRules,
  validateRuleSet,
} from "./rules.js";
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
} from "./session.js";
import {
  archiveSession,
  clearHistory,
  deleteHistoryItem,
  loadAppData,
  saveActiveSession,
  savePlayerDirectory,
} from "./storage.js";

const PLAYER_COLORS = ["#d8ad43", "#e35d4d", "#58a887", "#60a7c2", "#c58cc4", "#e8903e"];
const SETTLEMENT_LABELS = {
  [SETTLEMENT_TYPES.RELATIVE_TRANSFER]: "转给上家",
  [SETTLEMENT_TYPES.HEAD_TO_HEAD]: "一对一转分",
  [SETTLEMENT_TYPES.COLLECT_FROM_OTHERS]: "其余玩家各付",
};
const STEP_META = [
  { title: "选择球友", label: "本次参与" },
  { title: "设置底分", label: "初始积分" },
  { title: "确认规则", label: "计分规则" },
  { title: "确定顺序", label: "第一局顺序" },
];

let appData = loadAppData(localStorage);
let activeSession = appData.activeSession;
let setupStep = 1;
let selectedPlayerId = null;
let pendingAction = null;
let editingEventId = null;
let nextRackOrder = [];
let toastTimer = null;

const setupState = {
  players: createSetupPlayers(appData.savedPlayers),
  rules: createDefaultRules(),
  order: ["p1", "p2", "p3"],
  scorePreset: "100",
};

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return [...document.querySelectorAll(selector)];
}

function createSetupPlayers(savedPlayers) {
  const defaults = ["玩家 1", "玩家 2", "玩家 3"];
  return defaults.map((name, index) => ({
    id: `p${index + 1}`,
    name: savedPlayers[index]?.name || name,
    initialScore: 100,
    color: savedPlayers[index]?.color || PLAYER_COLORS[index],
  }));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatSigned(value) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function elapsedTime(startedAt, endedAt = new Date().toISOString()) {
  const milliseconds = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime());
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} 小时 ${minutes} 分` : `${minutes} 分钟`;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    const name = node.dataset.icon;
    try {
      node.innerHTML = icon(name);
    } catch {
      node.textContent = "";
    }
  });
}

function showView(id) {
  $all(".view").forEach((view) => {
    view.hidden = view.id !== id;
  });
  $("#score-more-menu").hidden = true;
  window.scrollTo({ top: 0, behavior: "instant" });
}

function showToast(message, action = null) {
  clearTimeout(toastTimer);
  const region = $("#toast-region");
  region.innerHTML = `
    <div class="toast">
      <span>${escapeHtml(message)}</span>
      ${action ? `<button type="button" data-toast-action="${escapeHtml(action.id)}">${escapeHtml(action.label)}</button>` : ""}
    </div>
  `;
  toastTimer = setTimeout(() => {
    region.innerHTML = "";
  }, 4200);
}

function persistSession() {
  if (!activeSession) return;
  appData = saveActiveSession(localStorage, activeSession);
  const indicator = $("#save-indicator");
  indicator.textContent = "已保存";
}

function renderHome() {
  appData = loadAppData(localStorage);
  activeSession = appData.activeSession;
  const hasActive = Boolean(activeSession);
  $("#continue-session").hidden = !hasActive;
  $("#start-session").hidden = hasActive;
  $("#active-session-summary").hidden = !hasActive;
  if (hasActive) {
    $("#active-session-summary").innerHTML = `
      <strong>第 ${activeSession.rackNumber} 局进行中</strong>
      <span>${activeSession.players.map((player) => escapeHtml(player.name)).join(" · ")}</span>
    `;
  }
  showView("home-view");
}

function resetSetup() {
  setupStep = 1;
  setupState.players = createSetupPlayers(appData.savedPlayers);
  setupState.rules = createDefaultRules();
  setupState.order = setupState.players.map((player) => player.id);
  setupState.scorePreset = "100";
  renderSetup();
}

function renderSetup() {
  const meta = STEP_META[setupStep - 1];
  $("#setup-step-label").textContent = `STEP ${setupStep} / 4`;
  $("#setup-title").textContent = meta.title;
  $("#setup-progress-value").textContent = `${setupStep}/4`;
  $("#setup-progress-bar").style.width = `${setupStep * 25}%`;
  $all(".setup-step").forEach((section) => {
    section.hidden = Number(section.dataset.step) !== setupStep;
  });
  $("#setup-next").hidden = setupStep === 4;
  $("#start-first-rack").hidden = setupStep !== 4;
  $("#setup-error").textContent = "";

  renderPlayerInputs();
  renderScoreInputs();
  renderRuleRows();
  renderOrderList("#setup-order-list", setupState.order, "setup");
  syncRadio("score-preset", setupState.scorePreset);
  syncRadio("rule-template", setupState.rules.length ? "14710" : "blank");
  hydrateIcons($("#setup-view"));
  showView("setup-view");
}

function renderPlayerInputs() {
  $("#player-input-list").innerHTML = setupState.players.map((player, index) => `
    <div class="player-input-row" data-player-id="${player.id}">
      <span class="player-color" style="--player-color:${player.color}"></span>
      <input
        class="text-input"
        data-testid="player-name-input"
        type="text"
        maxlength="10"
        value="${escapeHtml(player.name)}"
        aria-label="玩家 ${index + 1} 名称"
      />
      <button
        class="icon-button icon-button--quiet"
        data-testid="remove-player"
        data-action="remove-player"
        type="button"
        aria-label="移除${escapeHtml(player.name)}"
        title="移除玩家"
        ${setupState.players.length <= 2 ? "disabled" : ""}
      ><span data-icon="x"></span></button>
    </div>
  `).join("");
  $("#player-count-label").textContent = `${setupState.players.length} / 6 人`;
  $("#add-player").disabled = setupState.players.length >= 6;
}

function renderScoreInputs() {
  $("#initial-score-list").innerHTML = setupState.players.map((player) => `
    <label class="initial-score-row" data-player-id="${player.id}">
      <span class="player-color" style="--player-color:${player.color}"></span>
      <span>${escapeHtml(player.name)}</span>
      <input
        class="number-input"
        data-testid="initial-score-input"
        type="number"
        min="-9999"
        max="9999"
        step="1"
        value="${player.initialScore}"
        ${setupState.scorePreset === "custom" ? "" : "readonly"}
        aria-label="${escapeHtml(player.name)}初始积分"
      />
    </label>
  `).join("");
}

function renderRuleRows() {
  $("#rule-list").innerHTML = setupState.rules.map((rule, index) => `
    <div class="rule-row" data-testid="rule-row" data-setup-rule-id="${rule.id}">
      <label class="switch-control" title="启用或停用">
        <input data-rule-field="enabled" type="checkbox" ${rule.enabled ? "checked" : ""} />
        <span>${String(index + 1).padStart(2, "0")}</span>
      </label>
      <input
        class="text-input"
        data-rule-field="name"
        type="text"
        maxlength="8"
        value="${escapeHtml(rule.name)}"
        aria-label="事件名称"
      />
      <input
        class="number-input"
        data-testid="rule-value"
        data-rule-field="value"
        type="number"
        min="1"
        max="999"
        step="1"
        value="${rule.value}"
        aria-label="${escapeHtml(rule.name)}分值"
      />
      <button class="icon-button icon-button--quiet" data-action="remove-rule" type="button" aria-label="删除${escapeHtml(rule.name)}" title="删除事件">
        <span data-icon="trash-2"></span>
      </button>
      <select class="rule-select" data-rule-field="settlement" aria-label="${escapeHtml(rule.name)}结算方式">
        <option value="${SETTLEMENT_TYPES.RELATIVE_TRANSFER}" ${rule.settlement === SETTLEMENT_TYPES.RELATIVE_TRANSFER ? "selected" : ""}>转给上家</option>
        <option value="${SETTLEMENT_TYPES.HEAD_TO_HEAD}" ${rule.settlement === SETTLEMENT_TYPES.HEAD_TO_HEAD ? "selected" : ""}>一对一转分</option>
        <option value="${SETTLEMENT_TYPES.COLLECT_FROM_OTHERS}" ${rule.settlement === SETTLEMENT_TYPES.COLLECT_FROM_OTHERS ? "selected" : ""}>其余玩家各付</option>
      </select>
      <label class="rule-copy">
        <input data-rule-field="endsRack" type="checkbox" ${rule.endsRack ? "checked" : ""} />
        触发后结束本局
      </label>
    </div>
  `).join("");
  renderSettlementPreview();
}

function renderSettlementPreview() {
  if (setupState.rules.length === 0) {
    $("#settlement-preview").textContent = "添加事件后，这里会显示 3 人局的联动结算示例。";
    return;
  }
  const rule = setupState.rules[0];
  try {
    const deltas = calculateSettlement({
      rule: { ...rule, enabled: true },
      playerIds: ["a", "b", "c"],
      order: ["a", "b", "c"],
      actorId: "a",
      counterpartyId: "b",
    });
    $("#settlement-preview").innerHTML = `
      <strong>${escapeHtml(rule.name || "事件")}示例：</strong>
      玩家 A ${formatSigned(deltas.a)}，玩家 B ${formatSigned(deltas.b)}，玩家 C ${formatSigned(deltas.c)}
      <br><span>${escapeHtml(SETTLEMENT_LABELS[rule.settlement] || "")} · 三人总分保持不变</span>
    `;
  } catch {
    $("#settlement-preview").textContent = "请补全事件名称、分值与结算方式。";
  }
}

function renderOrderList(selector, order, context) {
  const sessionPlayers = context === "setup" ? setupState.players : activeSession.players;
  const playerMap = new Map(sessionPlayers.map((player) => [player.id, player]));
  $(selector).innerHTML = order.map((playerId, index) => {
    const player = playerMap.get(playerId);
    return `
      <li class="order-row" data-player-id="${playerId}">
        <span class="player-order">${String(index + 1).padStart(2, "0")}</span>
        <span data-testid="order-name">${escapeHtml(player.name)}</span>
        <span class="order-controls">
          <button class="icon-button icon-button--quiet" data-order-context="${context}" data-order-direction="up" type="button" aria-label="${escapeHtml(player.name)}上移" ${index === 0 ? "disabled" : ""}>
            <span data-icon="chevron" class="icon-up"></span>
          </button>
          <button class="icon-button icon-button--quiet" data-order-context="${context}" data-order-direction="down" type="button" aria-label="${escapeHtml(player.name)}下移" ${index === order.length - 1 ? "disabled" : ""}>
            <span data-icon="chevron" class="icon-down"></span>
          </button>
        </span>
      </li>
    `;
  }).join("");
}

function syncRadio(name, value) {
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (input) input.checked = true;
}

function validateSetupStep() {
  if (setupStep === 1) {
    const names = setupState.players.map((player) => player.name.trim());
    if (names.some((name) => !name)) return "玩家名称不能为空";
    if (new Set(names).size !== names.length) return "玩家名称不能重复";
  }
  if (setupStep === 2) {
    if (setupState.players.some((player) => (
      !Number.isInteger(player.initialScore)
      || player.initialScore < -9999
      || player.initialScore > 9999
    ))) {
      return "初始积分需为 -9999 到 9999 的整数";
    }
  }
  if (setupStep === 3) {
    const result = validateRuleSet(setupState.rules);
    if (!result.valid) {
      if (!setupState.rules.some((rule) => rule.enabled && rule.endsRack)) {
        return "至少需要一个启用的终局事件";
      }
      return result.errors[0];
    }
  }
  return "";
}

function moveOrder(context, playerId, direction) {
  const order = context === "setup" ? setupState.order : nextRackOrder;
  const index = order.indexOf(playerId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= order.length) return;
  [order[index], order[target]] = [order[target], order[index]];
  if (context === "setup") {
    renderOrderList("#setup-order-list", order, "setup");
  } else {
    renderOrderList("#next-order-list", order, "next");
  }
  hydrateIcons(context === "setup" ? $("#setup-order-list") : $("#next-order-list"));
}

function startFirstRack() {
  const error = validateSetupStep();
  if (error) {
    $("#setup-error").textContent = error;
    return;
  }
  try {
    activeSession = createSession({
      players: setupState.players,
      rules: setupState.rules,
      order: setupState.order,
    });
    appData = savePlayerDirectory(localStorage, setupState.players);
    persistSession();
    selectedPlayerId = null;
    renderScore();
  } catch (caught) {
    $("#setup-error").textContent = caught.message;
  }
}

function playerById(playerId, session = activeSession) {
  return session?.players.find((player) => player.id === playerId);
}

function currentRackEvents() {
  return activeSession.events.filter((event) => (
    event.rackNumber === activeSession.rackNumber && event.status === "active"
  ));
}

function renderScore() {
  if (!activeSession) {
    renderHome();
    return;
  }
  const scores = deriveScores(activeSession);
  const rackEvents = currentRackEvents();
  $("#score-view").dataset.playerCount = String(activeSession.players.length);
  $("#rack-number").textContent = activeSession.rackNumber;
  $("#session-time").textContent = `今日追分 · ${elapsedTime(activeSession.startedAt)}`;
  $("#player-score-list").innerHTML = activeSession.currentOrder.map((playerId, index) => {
    const player = playerById(playerId);
    const delta = scores[player.id] - player.initialScore;
    return `
      <button
        class="player-row ${selectedPlayerId === player.id ? "is-selected" : ""}"
        data-player-id="${player.id}"
        type="button"
        aria-pressed="${selectedPlayerId === player.id}"
      >
        <span class="player-order">${String(index + 1).padStart(2, "0")}</span>
        <span class="player-name">${escapeHtml(player.name)}</span>
        <span class="player-score-block">
          <strong class="player-total">${scores[player.id]}</strong>
          <span class="player-change ${delta > 0 ? "is-positive" : delta < 0 ? "is-negative" : ""}">${formatSigned(delta)}</span>
        </span>
      </button>
    `;
  }).join("");

  const enabledRules = activeSession.rules.filter((rule) => rule.enabled);
  const inRackRules = enabledRules.filter((rule) => !rule.endsRack);
  const terminalRules = enabledRules.filter((rule) => rule.endsRack);
  $("#in-rack-actions").innerHTML = inRackRules.length
    ? inRackRules.map((rule) => eventButton(rule, false)).join("")
    : '<span class="empty-inline">无局内事件</span>';
  $("#terminal-actions").innerHTML = terminalRules.map((rule) => eventButton(rule, true)).join("");
  $("#selection-hint").textContent = selectedPlayerId
    ? `已选择 ${playerById(selectedPlayerId).name}，点击事件完成计分`
    : "先点一名玩家，再选择计分事件";
  $("#recent-events").innerHTML = rackEvents.length
    ? rackEvents.slice(-3).reverse().map((event) => `
      <li class="recent-event">
        <button type="button" data-event-id="${event.id}">
          ${escapeHtml(event.label)} · ${escapeHtml(playerById(event.actorId)?.name || "系统")}
        </button>
      </li>
    `).join("")
    : '<li class="recent-event">本局尚无记录</li>';
  $("#undo-event").disabled = rackEvents.length === 0;
  showView("score-view");
  hydrateIcons($("#score-view"));

  if (activeSession.rackStatus === "complete") {
    renderRackResult();
  } else {
    $("#rack-result-sheet").hidden = true;
  }
}

function eventButton(rule, terminal) {
  return `
    <button
      class="event-button ${terminal ? "event-button--terminal" : ""}"
      data-rule-id="${rule.id}"
      type="button"
      ${selectedPlayerId ? "" : "disabled"}
    >
      ${escapeHtml(rule.name)}
      <small>${rule.value}</small>
    </button>
  `;
}

function requestScore(ruleId) {
  if (!selectedPlayerId || activeSession.rackStatus !== "active") return;
  const rule = activeSession.rules.find((candidate) => candidate.id === ruleId);
  if (!rule) return;
  pendingAction = { ruleId, actorId: selectedPlayerId };

  if (rule.settlement === SETTLEMENT_TYPES.HEAD_TO_HEAD) {
    const others = activeSession.players.filter((player) => player.id !== selectedPlayerId);
    $("#counterparty-options").innerHTML = others.map((player) => `
      <button class="command-button command-button--secondary" data-counterparty-id="${player.id}" type="button">
        ${escapeHtml(player.name)}
      </button>
    `).join("");
    $("#counterparty-dialog").showModal();
    return;
  }
  applyScoreEvent({ ...pendingAction, counterpartyId: null });
}

function applyScoreEvent(input) {
  try {
    activeSession = recordScoreEvent(activeSession, input);
    persistSession();
    pendingAction = null;
    selectedPlayerId = null;
    renderScore();
  } catch (caught) {
    showToast(caught.message);
  }
}

function describeEvent(event) {
  const actor = playerById(event.actorId)?.name || "系统";
  const parts = activeSession.players
    .filter((player) => event.deltas[player.id])
    .map((player) => `${player.name} ${formatSigned(event.deltas[player.id])}`);
  return `${event.label} · ${actor} · ${parts.join("，")}`;
}

function renderRackResult() {
  const scores = deriveScores(activeSession);
  const terminalEvent = [...currentRackEvents()].reverse().find((event) => event.endsRack);
  nextRackOrder = [...(activeSession.suggestedOrder || activeSession.currentOrder)];
  $("#rack-result-title").textContent = terminalEvent
    ? `${playerById(terminalEvent.actorId)?.name || ""} · ${terminalEvent.label}`
    : "本局结算";
  $("#rack-result-scores").innerHTML = activeSession.players.map((player) => `
    <div class="result-score-row">
      <span>${escapeHtml(player.name)}</span>
      <strong>${scores[player.id]}</strong>
    </div>
  `).join("");
  renderOrderList("#next-order-list", nextRackOrder, "next");
  $("#rack-result-sheet").hidden = false;
  hydrateIcons($("#rack-result-sheet"));
}

function handleUndo() {
  try {
    activeSession = undoLastEvent(activeSession);
    persistSession();
    renderScore();
    showToast("已撤销上一步", { id: "restore-event", label: "恢复" });
  } catch (caught) {
    showToast(caught.message);
  }
}

function openEventEditor(eventId) {
  const event = activeSession.events.find((candidate) => candidate.id === eventId);
  if (!event || event.rackNumber !== activeSession.rackNumber || event.status !== "active") return;
  editingEventId = eventId;
  $("#event-editor-content").innerHTML = `
    <p class="event-editor-summary">${escapeHtml(describeEvent(event))}</p>
    <div class="event-editor-actions">
      ${activeSession.rules.filter((rule) => rule.enabled).map((rule) => `
        <button class="command-button command-button--secondary" data-replacement-rule="${rule.id}" type="button">
          改为${escapeHtml(rule.name)}
        </button>
      `).join("")}
      <button class="command-button command-button--danger" data-action="delete-event" type="button">删除这条记录</button>
    </div>
  `;
  $("#event-editor-dialog").showModal();
}

function replaceEditingEvent(ruleId) {
  const original = activeSession.events.find((event) => event.id === editingEventId);
  const rule = activeSession.rules.find((candidate) => candidate.id === ruleId);
  if (!original || !rule) return;
  pendingAction = { ruleId, actorId: original.actorId, replacing: true };
  if (rule.settlement === SETTLEMENT_TYPES.HEAD_TO_HEAD) {
    $("#event-editor-dialog").close();
    const others = activeSession.players.filter((player) => player.id !== original.actorId);
    $("#counterparty-options").innerHTML = others.map((player) => `
      <button class="command-button command-button--secondary" data-counterparty-id="${player.id}" type="button">
        ${escapeHtml(player.name)}
      </button>
    `).join("");
    $("#counterparty-dialog").showModal();
    return;
  }
  performReplacement(null);
}

function performReplacement(counterpartyId) {
  try {
    activeSession = replaceEvent(activeSession, editingEventId, {
      ruleId: pendingAction.ruleId,
      actorId: pendingAction.actorId,
      counterpartyId,
    });
    persistSession();
    pendingAction = null;
    editingEventId = null;
    $("#event-editor-dialog").close();
    renderScore();
    showToast("计分记录已修改");
  } catch (caught) {
    showToast(caught.message);
  }
}

function beginNextRack() {
  try {
    activeSession = startNextRack(activeSession, nextRackOrder);
    persistSession();
    selectedPlayerId = null;
    $("#rack-result-sheet").hidden = true;
    renderScore();
  } catch (caught) {
    showToast(caught.message);
  }
}

function renderHistory() {
  appData = loadAppData(localStorage);
  $("#history-detail").hidden = true;
  $("#history-list").hidden = false;
  $("#clear-history").disabled = appData.history.length === 0;
  $("#history-list").innerHTML = appData.history.length
    ? appData.history.map((session) => {
      const scores = deriveScores(session);
      const leader = [...session.players].sort((a, b) => scores[b.id] - scores[a.id])[0];
      return `
        <button class="history-row" data-history-id="${session.id}" type="button">
          <span>
            <strong>${escapeHtml(formatTime(session.startedAt))}</strong>
            <small>${session.players.length} 人 · ${session.rackNumber} 局 · ${escapeHtml(elapsedTime(session.startedAt, session.endedAt))}</small>
          </span>
          <span>${escapeHtml(leader.name)} ${scores[leader.id]}</span>
        </button>
      `;
    }).join("")
    : '<div class="empty-state"><strong>还没有历史记录</strong><span>结束一次“今日追分”后会保存在这里。</span></div>';
  showView("history-view");
}

function renderHistoryDetail(sessionId) {
  const session = appData.history.find((candidate) => candidate.id === sessionId);
  if (!session) return;
  const scores = deriveScores(session);
  const sorted = [...session.players].sort((a, b) => scores[b.id] - scores[a.id]);
  $("#history-list").hidden = true;
  $("#history-detail").hidden = false;
  $("#history-detail").innerHTML = `
    <div class="history-detail-heading">
      <button class="text-command" data-action="history-list" type="button"><span data-icon="chevron" class="icon-flip"></span>返回记录</button>
      <button class="icon-button icon-button--quiet" data-action="delete-history" data-history-id="${session.id}" type="button" aria-label="删除这次记录" title="删除记录"><span data-icon="trash-2"></span></button>
    </div>
    <p class="overline">${escapeHtml(formatTime(session.startedAt))} · ${escapeHtml(elapsedTime(session.startedAt, session.endedAt))}</p>
    <h3>最终积分</h3>
    <ol class="final-ranking">
      ${sorted.map((player, index) => `
        <li><span>${index + 1}</span><strong>${escapeHtml(player.name)}</strong><b>${scores[player.id]}</b></li>
      `).join("")}
    </ol>
    <p>${session.rackNumber} 局 · ${session.events.filter((event) => event.status === "active").length} 条有效计分</p>
    <button class="command-button command-button--primary" data-action="share-result" data-history-id="${session.id}" type="button"><span data-icon="share-2"></span>分享成绩</button>
  `;
  hydrateIcons($("#history-detail"));
}

async function shareResult(sessionId) {
  const session = appData.history.find((candidate) => candidate.id === sessionId);
  if (!session) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  const scores = deriveScores(session);
  const sorted = [...session.players].sort((a, b) => scores[b.id] - scores[a.id]);
  context.fillStyle = "#0b2d25";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#c79a3b";
  context.fillRect(72, 72, 936, 10);
  context.fillStyle = "#f4f0e5";
  context.font = "700 72px sans-serif";
  context.fillText("台球追分计分台", 72, 190);
  context.font = "38px sans-serif";
  context.fillStyle = "#bfc9c1";
  context.fillText(`${formatTime(session.startedAt)} · ${session.rackNumber} 局`, 72, 255);
  sorted.forEach((player, index) => {
    const y = 410 + index * 135;
    context.fillStyle = player.color || PLAYER_COLORS[index];
    context.fillRect(72, y - 48, 16, 78);
    context.fillStyle = "#f4f0e5";
    context.font = "700 48px sans-serif";
    context.fillText(`${index + 1}. ${player.name}`, 120, y);
    context.textAlign = "right";
    context.font = "800 58px monospace";
    context.fillText(String(scores[player.id]), 1008, y);
    context.textAlign = "left";
  });
  context.fillStyle = "#bfc9c1";
  context.font = "30px sans-serif";
  context.fillText("数据由事件联动结算 · 仅保存在本机", 72, 1360);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const file = new File([blob], "台球追分成绩.png", { type: "image/png" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "台球追分成绩" });
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(link.href);
      showToast("成绩图片已生成");
    }
  } catch (caught) {
    if (caught.name !== "AbortError") showToast("分享失败，请稍后再试");
  }
}

function closeDialogs() {
  $all("dialog[open]").forEach((dialog) => dialog.close());
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.id === "start-session") {
    resetSetup();
  } else if (target.id === "continue-session") {
    activeSession = loadAppData(localStorage).activeSession;
    renderScore();
  } else if (target.id === "home-history") {
    renderHistory();
  } else if (target.id === "history-back") {
    renderHome();
  } else if (target.id === "setup-back") {
    if (setupStep === 1) renderHome();
    else {
      setupStep -= 1;
      renderSetup();
    }
  } else if (target.id === "add-player") {
    if (setupState.players.length >= 6) return;
    const nextNumber = Math.max(0, ...setupState.players.map((player) => Number(player.id.slice(1)) || 0)) + 1;
    setupState.players.push({
      id: `p${nextNumber}`,
      name: `玩家 ${setupState.players.length + 1}`,
      initialScore: setupState.scorePreset === "0" ? 0 : 100,
      color: PLAYER_COLORS[setupState.players.length],
    });
    setupState.order = setupState.players.map((player) => player.id);
    renderPlayerInputs();
    hydrateIcons($("#setup-players"));
  } else if (target.dataset.action === "remove-player") {
    if (setupState.players.length <= 2) return;
    const row = target.closest("[data-player-id]");
    setupState.players = setupState.players.filter((player) => player.id !== row.dataset.playerId);
    setupState.order = setupState.order.filter((playerId) => playerId !== row.dataset.playerId);
    renderPlayerInputs();
    hydrateIcons($("#setup-players"));
  } else if (target.id === "setup-next") {
    const error = validateSetupStep();
    if (error) {
      $("#setup-error").textContent = error;
      return;
    }
    setupStep = Math.min(4, setupStep + 1);
    renderSetup();
  } else if (target.id === "start-first-rack") {
    startFirstRack();
  } else if (target.id === "add-rule") {
    const suffix = Date.now().toString(36);
    setupState.rules.push({
      id: `custom-${suffix}`,
      name: "自定义结果",
      value: 1,
      settlement: SETTLEMENT_TYPES.HEAD_TO_HEAD,
      direction: null,
      endsRack: true,
      enabled: true,
    });
    renderRuleRows();
    hydrateIcons($("#setup-rules"));
  } else if (target.dataset.action === "remove-rule") {
    const row = target.closest("[data-setup-rule-id]");
    setupState.rules = setupState.rules.filter((rule) => rule.id !== row.dataset.setupRuleId);
    renderRuleRows();
    hydrateIcons($("#setup-rules"));
  } else if (target.dataset.orderDirection) {
    moveOrder(target.dataset.orderContext, target.closest("[data-player-id]").dataset.playerId, target.dataset.orderDirection);
  } else if (target.classList.contains("player-row")) {
    selectedPlayerId = target.dataset.playerId;
    renderScore();
  } else if (target.dataset.ruleId) {
    requestScore(target.dataset.ruleId);
  } else if (target.dataset.counterpartyId) {
    $("#counterparty-dialog").close();
    if (pendingAction?.replacing) performReplacement(target.dataset.counterpartyId);
    else applyScoreEvent({ ...pendingAction, counterpartyId: target.dataset.counterpartyId });
  } else if (target.id === "undo-event") {
    handleUndo();
  } else if (target.dataset.eventId) {
    openEventEditor(target.dataset.eventId);
  } else if (target.dataset.replacementRule) {
    replaceEditingEvent(target.dataset.replacementRule);
  } else if (target.dataset.action === "delete-event") {
    try {
      activeSession = deleteEvent(activeSession, editingEventId);
      persistSession();
      $("#event-editor-dialog").close();
      renderScore();
      showToast("计分记录已删除");
    } catch (caught) {
      showToast(caught.message);
    }
  } else if (target.id === "undo-rack-result") {
    handleUndo();
  } else if (target.id === "start-next-rack") {
    beginNextRack();
  } else if (target.id === "score-menu") {
    $("#score-more-menu").hidden = !$("#score-more-menu").hidden;
  } else if (target.id === "void-rack") {
    try {
      activeSession = voidCurrentRack(activeSession);
      persistSession();
      renderScore();
    } catch (caught) {
      showToast(caught.message);
    }
  } else if (target.id === "request-end-session") {
    $("#score-more-menu").hidden = true;
    $("#end-session-dialog").showModal();
  } else if (target.id === "cancel-end-session") {
    $("#end-session-dialog").close();
  } else if (target.id === "confirm-end-session") {
    const completed = endSession(activeSession);
    appData = archiveSession(localStorage, completed);
    activeSession = null;
    $("#end-session-dialog").close();
    renderHistory();
    renderHistoryDetail(completed.id);
  } else if (target.classList.contains("dialog-close")) {
    target.closest("dialog").close();
  } else if (target.dataset.historyId && target.classList.contains("history-row")) {
    renderHistoryDetail(target.dataset.historyId);
  } else if (target.dataset.action === "history-list") {
    renderHistory();
  } else if (target.dataset.action === "delete-history") {
    appData = deleteHistoryItem(localStorage, target.dataset.historyId);
    renderHistory();
    showToast("历史记录已删除");
  } else if (target.id === "clear-history") {
    appData = clearHistory(localStorage);
    renderHistory();
    showToast("历史记录已清空");
  } else if (target.dataset.action === "share-result") {
    shareResult(target.dataset.historyId);
  } else if (target.dataset.toastAction === "restore-event") {
    try {
      activeSession = restoreLastEvent(activeSession);
      persistSession();
      $("#toast-region").innerHTML = "";
      renderScore();
    } catch (caught) {
      showToast(caught.message);
    }
  }
});

document.addEventListener("input", (event) => {
  const row = event.target.closest("[data-player-id]");
  if (event.target.matches('[data-testid="player-name-input"]') && row) {
    const player = setupState.players.find((candidate) => candidate.id === row.dataset.playerId);
    player.name = event.target.value;
    setupState.order = setupState.players.map((candidate) => candidate.id);
    $("#setup-error").textContent = "";
  } else if (event.target.matches('[data-testid="initial-score-input"]') && row) {
    const player = setupState.players.find((candidate) => candidate.id === row.dataset.playerId);
    player.initialScore = Number(event.target.value);
  } else if (event.target.dataset.ruleField) {
    const ruleRow = event.target.closest("[data-setup-rule-id]");
    const rule = setupState.rules.find((candidate) => candidate.id === ruleRow.dataset.setupRuleId);
    const field = event.target.dataset.ruleField;
    if (field === "value") rule.value = Number(event.target.value);
    else if (field === "enabled" || field === "endsRack") rule[field] = event.target.checked;
    else rule[field] = event.target.value;
    if (field === "settlement") {
      rule.direction = rule.settlement === SETTLEMENT_TYPES.RELATIVE_TRANSFER ? "previous" : null;
    }
    renderSettlementPreview();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.name === "score-preset") {
    setupState.scorePreset = event.target.value;
    if (event.target.value !== "custom") {
      const score = Number(event.target.value);
      setupState.players.forEach((player) => {
        player.initialScore = score;
      });
    }
    renderScoreInputs();
  } else if (event.target.name === "rule-template") {
    setupState.rules = event.target.value === "blank" ? [] : createDefaultRules();
    renderRuleRows();
    hydrateIcons($("#setup-rules"));
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeDialogs();
});

hydrateIcons();
renderHome();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The app remains fully usable when installation is unavailable.
    });
  });
}
