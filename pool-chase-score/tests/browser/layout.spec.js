import { expect, test } from "@playwright/test";

async function startSession(page, playerCount = 3) {
  await page.goto("./");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#start-session").click();
  for (let index = 3; index < playerCount; index += 1) {
    await page.locator("#add-player").click();
  }
  await page.locator("#setup-next").click();
  await page.locator("#setup-next").click();
  await page.locator("#setup-next").click();
  await page.locator("#start-first-rack").click();
}

for (const viewport of [
  { width: 390, height: 844, players: 3 },
  { width: 320, height: 568, players: 6 },
]) {
  test(`score table stays inside ${viewport.width}x${viewport.height} with ${viewport.players} players`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await startSession(page, viewport.players);

    const dimensions = await page.evaluate(() => {
      const dock = document.querySelector(".action-dock").getBoundingClientRect();
      const score = document.querySelector("#score-view");
      return {
        bodyWidth: document.body.scrollWidth,
        bodyHeight: document.body.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        scoreWidth: score.scrollWidth,
        scoreHeight: score.scrollHeight,
        dockBottom: Math.round(dock.bottom),
      };
    });

    expect(dimensions.bodyWidth).toBe(dimensions.viewportWidth);
    expect(dimensions.bodyHeight).toBe(dimensions.viewportHeight);
    expect(dimensions.scoreWidth).toBe(dimensions.viewportWidth);
    expect(dimensions.scoreHeight).toBe(dimensions.viewportHeight);
    expect(dimensions.dockBottom).toBe(dimensions.viewportHeight);
    await expect(page.locator("#terminal-actions")).toBeVisible();
  });
}

test("all icon-only controls expose an accessible name", async ({ page }) => {
  await page.goto("./");
  const unnamed = await page.locator("button.icon-button").evaluateAll((buttons) => (
    buttons
      .filter((button) => !button.getAttribute("aria-label"))
      .map((button) => button.id || button.outerHTML)
  ));
  expect(unnamed).toEqual([]);
});

test("the installed app shell reloads without a network connection", async ({ page, context }) => {
  await page.goto("./");
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.state === "activated";
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#home-title")).toHaveText("台球追分计分台");
});
