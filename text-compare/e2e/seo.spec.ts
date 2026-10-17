import { expect, test } from "@playwright/test";

const landing = ["", "json-compare/", "pdf-compare/", "word-compare/", "excel-compare/", "image-compare/", "code-compare/"];

for (const path of landing) {
  test(`page /${path} has correct canonical URL and a working tool`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
    });
    await page.goto("/" + path);
    await expect(page.locator('.brand')).toHaveText('Text Compare');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://jiaxuan-tao.github.io/vibe-coding-lab/text-compare/${path}`);
    expect(await page.title()).toContain("Text Compare");
    await expect(page.locator(".topbar")).toBeVisible();
    await expect(page.locator('.site-footer a[href*="jamesclaypatton.com"]')).toBeVisible();
    await expect(page.locator('.site-footer a[href*="vibe-coding-lab/tree/main/text-compare"]')).toBeVisible();
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
}

test("landing pages start the tool in the right mode", async ({ page }) => {
  await page.goto("/image-compare/");
  await expect(page.locator("#image-panel")).toBeVisible();
  await page.goto("/json-compare/");
  await expect(page.locator("#lang")).toHaveValue("JSON");
  await expect(page.locator("#summary")).toContainText("No comparison yet");
});

test("sitemap and robots.txt list every page", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of landing) expect(sitemap).toContain(`<loc>https://jiaxuan-tao.github.io/vibe-coding-lab/text-compare/${path}</loc>`);
});
