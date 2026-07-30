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
  { width: 720, height: 405, players: 3 },
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
    expect(dimensions.scoreWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.scoreHeight).toBe(dimensions.viewportHeight);
    expect(dimensions.dockBottom).toBe(dimensions.viewportHeight);
    await expect(page.locator("#terminal-actions")).toBeVisible();
    await page.locator(".player-row").first().click();
    await expect(page.locator(".player-row").first()).toHaveAttribute("aria-pressed", "true");
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

for (const viewport of [
  { width: 390, height: 844, asset: "pool-table-home-v2-mobile.webp" },
  { width: 1440, height: 900, asset: "pool-table-home-v2.webp" },
]) {
  test(`home hero stays focused inside ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("./");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await expect(page.locator("#home-history")).toBeVisible();
    await expect(page.locator("#open-history")).toHaveCount(0);
    await expect(page.locator("#start-session")).toBeVisible();
    await expect(page.locator(".home-visual img")).toBeVisible();
    expect(await page.locator(".home-visual img").evaluate(async (image, asset) => {
      await image.decode();
      return new URL(image.currentSrc).pathname.endsWith(asset) && image.naturalWidth > 0;
    }, viewport.asset)).toBe(true);

    const dimensions = await page.evaluate(() => ({
      width: document.body.scrollWidth,
      height: document.body.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
    expect(dimensions.width).toBe(dimensions.viewportWidth);
    expect(dimensions.height).toBe(dimensions.viewportHeight);
  });
}

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
