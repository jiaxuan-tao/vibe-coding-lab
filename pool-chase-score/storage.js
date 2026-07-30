export const STORAGE_KEYS = Object.freeze({
  root: "pool-chase-score.data.v1",
  corruptBackup: "pool-chase-score.corrupt-backup",
});

function createDefaultData() {
  return {
    version: 1,
    activeSession: null,
    history: [],
    savedPlayers: [],
    ruleTemplates: [],
  };
}

function copy(value) {
  return structuredClone(value);
}

function isSession(value, status) {
  return Boolean(
    value
    && typeof value === "object"
    && value.version === 1
    && typeof value.id === "string"
    && value.status === status
    && Array.isArray(value.players)
    && Array.isArray(value.rules)
    && Array.isArray(value.events),
  );
}

function normalizeData(value) {
  if (!value || typeof value !== "object" || value.version !== 1) {
    throw new Error("unsupported storage version");
  }

  const activeSession = isSession(value.activeSession, "active")
    ? copy(value.activeSession)
    : null;
  const history = Array.isArray(value.history)
    ? value.history.filter((session) => isSession(session, "complete")).slice(0, 50).map(copy)
    : [];
  const savedPlayers = Array.isArray(value.savedPlayers)
    ? value.savedPlayers.filter((player) => (
      player
      && typeof player.id === "string"
      && typeof player.name === "string"
    )).map(copy)
    : [];
  const ruleTemplates = Array.isArray(value.ruleTemplates)
    ? value.ruleTemplates.filter((template) => (
      template
      && typeof template.id === "string"
      && typeof template.name === "string"
      && Array.isArray(template.rules)
    )).map(copy)
    : [];

  return {
    version: 1,
    activeSession,
    history,
    savedPlayers,
    ruleTemplates,
  };
}

function writeData(storage, data) {
  try {
    storage.setItem(STORAGE_KEYS.root, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadAppData(storage = globalThis.localStorage) {
  let raw = null;
  try {
    raw = storage.getItem(STORAGE_KEYS.root);
    if (raw === null) return createDefaultData();
    return normalizeData(JSON.parse(raw));
  } catch {
    if (raw !== null) {
      try {
        storage.setItem(STORAGE_KEYS.corruptBackup, raw);
      } catch {
        // Storage can be unavailable in privacy modes; safe defaults still load.
      }
    }
    return createDefaultData();
  }
}

export function saveActiveSession(storage, session) {
  const data = loadAppData(storage);
  const next = {
    ...data,
    activeSession: copy(session),
  };
  writeData(storage, next);
  return next;
}

export function archiveSession(storage, session) {
  if (!isSession(session, "complete")) {
    throw new Error("只能归档已经结束的今日追分");
  }

  const data = loadAppData(storage);
  const history = [
    copy(session),
    ...data.history.filter((item) => item.id !== session.id),
  ]
    .sort((left, right) => (
      new Date(right.endedAt ?? 0).getTime() - new Date(left.endedAt ?? 0).getTime()
    ))
    .slice(0, 50);
  const next = {
    ...data,
    activeSession: data.activeSession?.id === session.id ? null : data.activeSession,
    history,
  };
  writeData(storage, next);
  return next;
}

export function savePlayerDirectory(storage, players) {
  const data = loadAppData(storage);
  const seenIds = new Set();
  const seenNames = new Set();
  const savedPlayers = players
    .filter((player) => (
      player
      && typeof player.id === "string"
      && typeof player.name === "string"
      && player.name.trim()
      && !seenIds.has(player.id)
      && !seenNames.has(player.name.trim())
    ))
    .map((player) => {
      seenIds.add(player.id);
      seenNames.add(player.name.trim());
      return { ...copy(player), name: player.name.trim() };
    });
  const next = { ...data, savedPlayers };
  writeData(storage, next);
  return next;
}

export function saveRuleTemplates(storage, templates) {
  const data = loadAppData(storage);
  const seen = new Set();
  const ruleTemplates = templates
    .filter((template) => (
      template
      && typeof template.id === "string"
      && typeof template.name === "string"
      && template.name.trim()
      && Array.isArray(template.rules)
      && !seen.has(template.id)
    ))
    .map((template) => {
      seen.add(template.id);
      return { ...copy(template), name: template.name.trim() };
    });
  const next = { ...data, ruleTemplates };
  writeData(storage, next);
  return next;
}

export function deleteHistoryItem(storage, sessionId) {
  const data = loadAppData(storage);
  const next = {
    ...data,
    history: data.history.filter((session) => session.id !== sessionId),
  };
  writeData(storage, next);
  return next;
}

export function clearHistory(storage) {
  const data = loadAppData(storage);
  const next = { ...data, history: [] };
  writeData(storage, next);
  return next;
}
