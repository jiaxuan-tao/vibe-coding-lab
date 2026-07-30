import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("UI contract: shell exposes all primary views and score controls", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  for (const id of [
    "home-view",
    "setup-view",
    "score-view",
    "history-view",
    "player-score-list",
    "in-rack-actions",
    "terminal-actions",
    "recent-events",
    "undo-event",
    "counterparty-dialog",
    "event-editor-dialog",
    "end-session-dialog",
    "rack-result-sheet",
    "toast-region",
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /type="module" src="app\.js"/);
});

test("UI contract: home keeps one history entry and no redundant captions", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.equal((html.match(/id="home-history"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /id="open-history"/);
  assert.doesNotMatch(html, /一台手机 · 2–6 人 · 实时联动/);
  assert.doesNotMatch(html, /无需登录 · 数据仅保存在这台设备/);
  assert.match(html, /assets\/pool-table-home-v2\.webp/);
});

test("UI contract: icon-only controls have accessible labels and tooltips", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const iconButtons = [...html.matchAll(/<button[^>]+class="[^"]*icon-button[^"]*"[^>]*>/g)]
    .map((match) => match[0]);
  assert.ok(iconButtons.length >= 5);
  for (const button of iconButtons) {
    assert.match(button, /aria-label="[^"]+"/);
    assert.match(button, /title="[^"]+"/);
  }
});

test("UI contract: mobile CSS protects the viewport and accessibility states", async () => {
  const css = await readFile(new URL("styles.css", root), "utf8");
  assert.match(css, /100dvh/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /--tap:\s*44px/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.player-score-list/);
  assert.match(css, /\.player-row\.is-selected/);
  assert.match(css, /\.score-view\[data-player-count="6"\]/);
  assert.doesNotMatch(css, /letter-spacing:\s*-\d/);
});

test("UI contract: runtime resources are local", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
  assert.doesNotMatch(html, /<script[^>]+src="\/\/|<link[^>]+href="\/\//);
});
