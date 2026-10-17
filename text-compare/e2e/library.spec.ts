import { expect, test, type Page } from "@playwright/test";

async function fill(page: Page, a: string, b: string) {
  const editors = page.locator(".cm-content");
  await editors.nth(0).click();
  await page.keyboard.insertText(a);
  await editors.nth(1).click();
  await page.keyboard.insertText(b);
}

test("saves a comparison in this browser and reopens it", async ({ page }) => {
  await page.goto("/");
  await fill(page, "first version\nshared", "second version\nshared");
  await page.click("#save-btn");
  const name = page.locator(".modal-dialog").getByLabel("Name", { exact: true });
  await expect(name).toHaveValue("second version");
  await name.fill("My test comparison");
  await page.locator(".modal-dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("Saved to this browser");

  // clear the page, then reopen from the library
  await page.click("#tools-btn");
  await page.click("[data-action=clear]");
  await page.click("#library-btn");
  const item = page.locator(".library .item", { hasText: "My test comparison" });
  await expect(item).toBeVisible();
  await item.locator(".item-open").click();
  await expect(page.locator(".cm-content").nth(0)).toHaveText("first versionshared");
  await expect(page.locator(".cm-content").nth(1)).toContainText("second version");

  // it survives a reload (IndexedDB)
  await page.reload();
  await page.click("#library-btn");
  await expect(page.locator(".library .item", { hasText: "My test comparison" })).toBeVisible();
});

test("renames and deletes saved comparisons", async ({ page }) => {
  await page.goto("/");
  await fill(page, "a1", "b1");
  await page.keyboard.press("Control+s");
  await page.locator(".modal-dialog").getByRole("button", { name: "Save", exact: true }).click();
  await page.click("#library-btn");
  const item = page.locator(".library .item").first();
  await item.getByRole("button", { name: /Rename/ }).click();
  await page.locator(".modal-dialog").getByLabel("Name", { exact: true }).fill("Renamed");
  await page.locator(".modal-dialog").getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.locator(".library .item-title").first()).toHaveText("Renamed");
  await page.locator(".library .item").first().getByRole("button", { name: /Delete/ }).click();
  await expect(page.locator(".library-empty")).toContainText("Nothing saved yet");
});

test("keeps a history of comparisons, which can be turned off", async ({ page }) => {
  await page.goto("/");
  await fill(page, "history left", "history right");
  await page.waitForTimeout(4600);
  await page.click("#library-btn");
  await page.locator(".library [data-tab=history]").click();
  await expect(page.locator(".library .item", { hasText: "history right" })).toBeVisible();

  await page.locator(".library .dialog-x").click();
  await page.click("#options-btn");
  await page.uncheck("#opt-history");
  await page.keyboard.press("Escape");
  await page.click("#library-btn");
  await page.locator(".library [data-tab=history]").click();
  await expect(page.locator(".library-foot")).toContainText("History is off");
});
