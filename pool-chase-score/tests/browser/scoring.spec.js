import { expect, test } from "@playwright/test";

async function openFresh(page) {
  await page.goto("./");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function startDefaultSession(page) {
  await openFresh(page);
  await page.locator("#start-session").click();
  await page.locator("#setup-next").click();
  await page.locator("#setup-next").click();
  await page.locator("#setup-next").click();
  await page.locator("#start-first-rack").click();
  await expect(page.locator("#score-view")).toBeVisible();
}

function playerRow(page, name) {
  return page.locator(".player-row").filter({ hasText: name });
}

test("an in-rack foul updates both players and can be undone and restored", async ({ page }) => {
  await startDefaultSession(page);

  await playerRow(page, "玩家 1").click();
  await page.locator('[data-rule-id="foul"]').click();

  await expect(playerRow(page, "玩家 1").locator(".player-total")).toHaveText("99");
  await expect(playerRow(page, "玩家 3").locator(".player-total")).toHaveText("101");
  await expect(page.locator("#recent-events")).toContainText("犯规");

  await page.locator("#undo-event").click();
  await expect(playerRow(page, "玩家 1").locator(".player-total")).toHaveText("100");
  await page.getByRole("button", { name: "恢复" }).click();
  await expect(playerRow(page, "玩家 1").locator(".player-total")).toHaveText("99");
});

test("a terminal head-to-head result closes the rack and carries scores forward", async ({ page }) => {
  await startDefaultSession(page);

  await playerRow(page, "玩家 1").click();
  await page.locator('[data-rule-id="normal-win"]').click();
  await expect(page.locator("#counterparty-dialog")).toBeVisible();
  await page.getByRole("button", { name: "玩家 2", exact: true }).click();

  await expect(page.locator("#rack-result-sheet")).toBeVisible();
  await expect(playerRow(page, "玩家 1").locator(".player-total")).toHaveText("104");
  await expect(playerRow(page, "玩家 2").locator(".player-total")).toHaveText("96");
  await expect(page.locator("#next-order-list").getByTestId("order-name").first()).toHaveText("玩家 1");

  await page.locator("#start-next-rack").click();
  await expect(page.locator("#rack-number")).toHaveText("2");
  await expect(page.locator("#rack-result-sheet")).toBeHidden();
  await expect(playerRow(page, "玩家 1").locator(".player-total")).toHaveText("104");
});

test("a current-rack event can be deleted from the quiet record editor", async ({ page }) => {
  await startDefaultSession(page);
  await playerRow(page, "玩家 2").click();
  await page.locator('[data-rule-id="foul"]').click();

  await page.locator("#recent-events button").click();
  await expect(page.locator("#event-editor-dialog")).toBeVisible();
  await page.getByRole("button", { name: "删除这条记录" }).click();

  await expect(page.locator("#event-editor-dialog")).toBeHidden();
  await expect(playerRow(page, "玩家 2").locator(".player-total")).toHaveText("100");
  await expect(page.locator("#recent-events")).toContainText("尚无记录");
});

test("an active session survives refresh and a completed session is archived", async ({ page }) => {
  await startDefaultSession(page);
  await playerRow(page, "玩家 3").click();
  await page.locator('[data-rule-id="big-gold"]').click();
  await expect(page.locator("#rack-result-sheet")).toBeVisible();

  await page.reload();
  await expect(page.locator("#continue-session")).toBeVisible();
  await page.locator("#continue-session").click();
  await expect(page.locator("#rack-result-sheet")).toBeVisible();
  await expect(playerRow(page, "玩家 3").locator(".player-total")).toHaveText("120");

  await page.locator("#score-menu").click();
  await page.locator("#request-end-session").click();
  await page.locator("#confirm-end-session").click();
  await expect(page.locator("#history-detail")).toBeVisible();
  await expect(page.locator(".final-ranking").getByText("玩家 3")).toBeVisible();

  const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("pool-chase-score.data.v1")));
  expect(persisted.activeSession).toBeNull();
  expect(persisted.history).toHaveLength(1);
  expect(persisted.history[0].status).toBe("complete");
});
