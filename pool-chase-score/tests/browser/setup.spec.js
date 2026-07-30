import { expect, test } from "@playwright/test";

async function openFresh(page) {
  await page.goto("./");
  await page.evaluate(() => {
    localStorage.clear();
    navigator.serviceWorker?.getRegistrations().then((items) => items.forEach((item) => item.unregister()));
  });
  await page.reload();
}

async function goToRules(page) {
  await page.locator("#start-session").click();
  await page.locator("#setup-next").click();
  await page.locator("#setup-next").click();
  await expect(page.locator("#setup-rules")).toBeVisible();
}

test("setup starts with three editable players and enforces the 2–6 range", async ({ page }) => {
  await openFresh(page);
  await page.locator("#start-session").click();

  await expect(page.getByTestId("player-name-input")).toHaveCount(3);
  await expect(page.locator("#player-count-label")).toContainText("3 / 6");

  await page.getByTestId("remove-player").first().click();
  await expect(page.getByTestId("player-name-input")).toHaveCount(2);
  await expect(page.getByTestId("remove-player").first()).toBeDisabled();

  for (let index = 0; index < 4; index += 1) {
    await page.locator("#add-player").click();
  }
  await expect(page.getByTestId("player-name-input")).toHaveCount(6);
  await expect(page.locator("#add-player")).toBeDisabled();
});

test("setup blocks duplicate names and supports score presets", async ({ page }) => {
  await openFresh(page);
  await page.locator("#start-session").click();
  const names = page.getByTestId("player-name-input");
  await names.nth(0).fill("老周");
  await names.nth(1).fill("老周");
  await page.locator("#setup-next").click();
  await expect(page.locator("#setup-error")).toContainText("不能重复");
  await expect(page.locator("#setup-players")).toBeVisible();

  await names.nth(1).fill("阿明");
  await page.locator("#setup-next").click();
  await expect(page.locator("#setup-scores")).toBeVisible();
  await expect(page.getByTestId("initial-score-input").first()).toHaveValue("100");

  await page.locator('input[name="score-preset"][value="0"]').check();
  await expect(page.getByTestId("initial-score-input").first()).toHaveValue("0");
  await page.locator('input[name="score-preset"][value="custom"]').check();
  await page.getByTestId("initial-score-input").first().fill("88");
  await expect(page.getByTestId("initial-score-input").first()).toHaveValue("88");
});

test("default rules are editable and blank rules require a terminal event", async ({ page }) => {
  await openFresh(page);
  await goToRules(page);

  await expect(page.getByTestId("rule-row")).toHaveCount(5);
  await expect(page.getByTestId("rule-value").nth(0)).toHaveValue("1");
  await page.getByTestId("rule-value").nth(0).fill("2");
  await expect(page.locator("#settlement-preview")).toContainText("-2");

  await page.locator('input[name="rule-template"][value="blank"]').check();
  await expect(page.getByTestId("rule-row")).toHaveCount(0);
  await page.locator("#setup-next").click();
  await expect(page.locator("#setup-error")).toContainText("终局事件");

  await page.locator("#add-rule").click();
  await expect(page.getByTestId("rule-row")).toHaveCount(1);
  await page.locator("#setup-next").click();
  await expect(page.locator("#setup-order")).toBeVisible();
});

test("first-rack order can be changed and starting persists an active session", async ({ page }) => {
  await openFresh(page);
  await page.locator("#start-session").click();
  const names = page.getByTestId("player-name-input");
  await names.nth(0).fill("王强");
  await names.nth(1).fill("李明");
  await names.nth(2).fill("张伟");
  await page.locator("#setup-next").click();
  await page.locator("#setup-next").click();
  await page.locator("#setup-next").click();

  await expect(page.getByTestId("order-name").first()).toHaveText("王强");
  await page.getByRole("button", { name: "王强下移" }).click();
  await expect(page.getByTestId("order-name").first()).toHaveText("李明");

  await page.locator("#start-first-rack").click();
  await expect(page.locator("#score-view")).toBeVisible();
  await expect(page.locator("#rack-number")).toHaveText("1");

  const persisted = await page.evaluate(() => (
    JSON.parse(localStorage.getItem("pool-chase-score.data.v1"))
  ));
  expect(persisted.activeSession.status).toBe("active");
  expect(persisted.activeSession.currentOrder).toEqual(["p2", "p1", "p3"]);
});
