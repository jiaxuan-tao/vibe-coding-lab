import { expect, test, type Page } from "@playwright/test";

type Side = "a" | "b";
type Gates = {
  waiting: Record<string, () => void>;
  release: (name: string) => Promise<void>;
};

declare global {
  interface Window {
    fileGates: Gates;
    imageGates: Gates;
    imageUrls: Record<string, string>;
    revokedImageUrls: string[];
  }
}

const textFile = (name: string, text: string) => ({ name, mimeType: "text/plain", buffer: Buffer.from(text) });
const pngFile = (name: string) => ({
  name, mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64"),
});
const content = (page: Page, side: Side) => page.locator(".cm-content").nth(side === "a" ? 0 : 1);

async function expectText(page: Page, side: Side, text: string) {
  await expect.poll(() => content(page, side).evaluate((element) => {
    const copy = element.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".cm-placeholder").forEach((placeholder) => placeholder.remove());
    return copy.textContent;
  })).toBe(text);
}

async function delayFiles(page: Page) {
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    window.fileGates = {
      waiting: {},
      async release(name) {
        this.waiting[name]();
        // Drain the import continuation and its next paint, without a wall-clock sleep.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      },
    };
    File.prototype.arrayBuffer = async function () {
      const bytes = await original.call(this);
      if (this.name.startsWith("slow-")) {
        await new Promise<void>((resolve) => { window.fileGates.waiting[this.name] = resolve; });
      }
      return bytes;
    };
  });
}

async function startSlowFile(page: Page, side: Side, name = "slow-old.txt") {
  await page.setInputFiles(`#file-${side}`, textFile(name, "obsolete imported text"));
  await page.waitForFunction((key) => !!window.fileGates.waiting[key], name);
}

async function toolsAction(page: Page, action: string) {
  await page.click("#tools-btn");
  await page.click(`[data-action=${action}]`);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(content(page, "a")).toBeVisible();
});

test("turning remember off cancels pending document persistence", async ({ page }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.click("#options-btn");
  await page.check("#opt-remember");
  await page.keyboard.press("Escape");
  await content(page, "a").fill("private draft");
  await page.clock.runFor(120);
  await page.click("#options-btn");
  await page.uncheck("#opt-remember");
  expect(await page.evaluate(() => localStorage.getItem("vcl.text-compare:docs"))).toBeNull();
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => localStorage.getItem("vcl.text-compare:docs"))).toBeNull();
  await page.reload();
  await expectText(page, "a", "");
});

for (const side of ["a", "b"] as const) {
  test(`newer ${side}-side file wins over a delayed import`, async ({ page }) => {
    await delayFiles(page);
    await startSlowFile(page, side);
    await page.setInputFiles(`#file-${side}`, textFile("latest.txt", "latest imported text"));
    await expect(content(page, side)).toHaveText("latest imported text");
    await page.evaluate(() => window.fileGates.release("slow-old.txt"));
    await expect(content(page, side)).toHaveText("latest imported text");
    await expect(page.locator(`#name-${side}`)).toHaveValue("latest.txt");
  });

  test(`clearing ${side} invalidates a delayed import even when already empty`, async ({ page }) => {
    await delayFiles(page);
    await startSlowFile(page, side);
    await page.click(`[data-clear=${side}]`);
    await page.evaluate(() => window.fileGates.release("slow-old.txt"));
    await expectText(page, side, "");
    await expect(page.locator(`#name-${side}`)).toHaveValue("");
  });

  test(`direct ${side}-side edits invalidate a delayed import`, async ({ page }) => {
    await delayFiles(page);
    await startSlowFile(page, side);
    await content(page, side).fill("latest typed text");
    await page.evaluate(() => window.fileGates.release("slow-old.txt"));
    await expect(content(page, side)).toHaveText("latest typed text");
    await expect(page.locator(`#name-${side}`)).toHaveValue("");
  });
}

test("independent imports on both sides complete in either order", async ({ page }) => {
  await delayFiles(page);
  await startSlowFile(page, "a", "slow-a.txt");
  await startSlowFile(page, "b", "slow-b.txt");
  await page.evaluate(() => window.fileGates.release("slow-b.txt"));
  await expect(page.locator("#name-b")).toHaveValue("slow-b.txt");
  await page.evaluate(() => window.fileGates.release("slow-a.txt"));
  await expect(page.locator("#name-a")).toHaveValue("slow-a.txt");
  await expect(content(page, "a")).toHaveText("obsolete imported text");
  await expect(content(page, "b")).toHaveText("obsolete imported text");
});

test("a delayed first dropped file cannot postpone the other side's import intent", async ({ page }) => {
  await delayFiles(page);
  await page.evaluate(() => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(["dropped left"], "slow-a.txt", { type: "text/plain" }));
    dataTransfer.items.add(new File(["obsolete dropped right"], "dropped-b.txt", { type: "text/plain" }));
    document.querySelector("#workspace")!.dispatchEvent(new DragEvent("drop", { dataTransfer, bubbles: true }));
  });
  await page.waitForFunction(() => !!window.fileGates.waiting["slow-a.txt"]);
  await page.setInputFiles("#file-b", textFile("latest.txt", "latest right"));
  await expect(content(page, "b")).toHaveText("latest right");
  await page.evaluate(() => window.fileGates.release("slow-a.txt"));
  await expect(content(page, "a")).toHaveText("dropped left");
  await expect(content(page, "b")).toHaveText("latest right");
  await expect(page.locator("#name-b")).toHaveValue("latest.txt");
});

for (const action of ["clear", "swap"]) {
  test(`${action} invalidates delayed imports on both sides`, async ({ page }) => {
    await content(page, "a").fill("original left");
    await content(page, "b").fill("original right");
    await delayFiles(page);
    await startSlowFile(page, "a", "slow-a.txt");
    await startSlowFile(page, "b", "slow-b.txt");
    await toolsAction(page, action);
    await page.evaluate(() => window.fileGates.release("slow-a.txt"));
    await page.evaluate(() => window.fileGates.release("slow-b.txt"));
    await expectText(page, "a", action === "clear" ? "" : "original right");
    await expectText(page, "b", action === "clear" ? "" : "original left");
    await expect(page.locator("#name-a")).toHaveValue("");
    await expect(page.locator("#name-b")).toHaveValue("");
  });
}

test("opening a saved comparison invalidates both pending imports", async ({ page }) => {
  await content(page, "a").fill("saved left");
  await content(page, "b").fill("saved right");
  await page.click("#save-btn");
  await page.locator(".modal-dialog").getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("Saved to this browser");
  await delayFiles(page);
  await startSlowFile(page, "a", "slow-a.txt");
  await startSlowFile(page, "b", "slow-b.txt");
  await page.click("#library-btn");
  await page.locator(".library .item-open").first().click();
  await page.evaluate(() => window.fileGates.release("slow-a.txt"));
  await page.evaluate(() => window.fileGates.release("slow-b.txt"));
  await expect(content(page, "a")).toHaveText("saved left");
  await expect(content(page, "b")).toHaveText("saved right");
  await expect(page.locator("#name-a")).toHaveValue("");
  await expect(page.locator("#name-b")).toHaveValue("");
});

async function delayImages(page: Page) {
  await page.evaluate(() => {
    const create = URL.createObjectURL;
    const revoke = URL.revokeObjectURL;
    const decode = HTMLImageElement.prototype.decode;
    window.imageUrls = {};
    window.revokedImageUrls = [];
    URL.createObjectURL = function (blob) {
      const url = create.call(this, blob);
      if (blob instanceof File) window.imageUrls[blob.name] = url;
      return url;
    };
    URL.revokeObjectURL = function (url) {
      window.revokedImageUrls.push(url);
      revoke.call(this, url);
    };
    window.imageGates = {
      waiting: {},
      async release(name) {
        this.waiting[name]();
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      },
    };
    HTMLImageElement.prototype.decode = async function () {
      await decode.call(this);
      const name = Object.keys(window.imageUrls).find((key) => window.imageUrls[key] === this.src);
      if (name?.startsWith("slow-")) {
        await new Promise<void>((resolve) => { window.imageGates.waiting[name] = resolve; });
      }
    };
  });
}

for (const intent of ["clear", "newer text", "newer image", "edit", "swap"]) {
  test(`${intent} prevents stale image decode from installing state`, async ({ page }) => {
    await delayImages(page);
    await page.setInputFiles("#file-a", pngFile("slow-old.png"));
    await page.waitForFunction(() => !!window.imageGates.waiting["slow-old.png"]);
    if (intent === "clear") await page.click("[data-clear=a]");
    if (intent === "newer text") {
      await page.setInputFiles("#file-a", textFile("latest.txt", "latest text"));
      await expect(content(page, "a")).toHaveText("latest text");
    }
    if (intent === "newer image") {
      await page.setInputFiles("#file-a", pngFile("latest.png"));
      await expect(page.locator(".img-figure img")).toHaveAttribute("alt", "latest.png");
    }
    if (intent === "edit") await content(page, "a").fill("latest typed text");
    if (intent === "swap") await toolsAction(page, "swap");
    await page.evaluate(() => window.imageGates.release("slow-old.png"));
    await expect(page.locator('#img-stage img[alt="slow-old.png"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.revokedImageUrls.includes(window.imageUrls["slow-old.png"]))).toBe(true);
    if (intent === "newer image") {
      await expect(page.locator("#name-a")).toHaveValue("latest.png");
    } else {
      await expect(page.locator("body")).toHaveAttribute("data-mode", "text");
      await expectText(page, "a", intent === "newer text" ? "latest text" : intent === "edit" ? "latest typed text" : "");
      await expect(page.locator("#name-a")).toHaveValue(intent === "newer text" ? "latest.txt" : "");
    }
  });
}

test("closing image mode invalidates an in-flight image replacement", async ({ page }) => {
  await delayImages(page);
  await page.setInputFiles("#file-a", pngFile("current.png"));
  await expect(page.locator("#image-panel")).toBeVisible();
  await page.setInputFiles("#file-a", pngFile("slow-old.png"));
  await page.waitForFunction(() => !!window.imageGates.waiting["slow-old.png"]);
  await page.click("#img-close");
  await page.evaluate(() => window.imageGates.release("slow-old.png"));
  await expect(page.locator("body")).toHaveAttribute("data-mode", "text");
  await expect(page.locator("#img-stage img")).toHaveCount(0);
  expect(await page.evaluate(() => window.revokedImageUrls.includes(window.imageUrls["slow-old.png"]))).toBe(true);
});

test("closing image mode does not cancel an independent text import", async ({ page }) => {
  await page.setInputFiles("#file-a", pngFile("current.png"));
  await expect(page.locator("#image-panel")).toBeVisible();
  await delayFiles(page);
  await startSlowFile(page, "b");
  await page.click("#img-close");
  await page.evaluate(() => window.fileGates.release("slow-old.txt"));
  await expect(content(page, "b")).toHaveText("obsolete imported text");
  await expect(page.locator("#name-b")).toHaveValue("slow-old.txt");
  await expect(page.locator("body")).toHaveAttribute("data-mode", "text");
});

test("language switch preserves pending raw patterns and their eventual effect", async ({ page }) => {
  await content(page, "a").fill("value 123");
  await content(page, "b").fill("value 456");
  await expect(page.locator("#summary")).not.toContainText("identical");
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.click("#options-btn");
  const raw = "  \\d+  \n\n";
  await page.locator("#opt-patterns").fill(raw);
  await page.locator("#ui-locale").focus();
  await page.selectOption("#ui-locale", "zh-CN");
  await expect(page.locator("#opt-patterns")).toHaveValue(raw);
  await page.clock.runFor(650);
  await expect(page.locator("#summary")).toContainText("两侧内容相同");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("vcl.text-compare:prefs")!).options.ignorePatterns)).toEqual(["\\d+"]);
});
