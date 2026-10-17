import { expect, test, type Browser, type Page } from "@playwright/test";
import { strToU8, zipSync } from "fflate";

async function fill(page: Page, a: string, b: string) {
  const editors = page.locator(".cm-content");
  await editors.nth(0).click();
  await page.keyboard.insertText(a);
  await editors.nth(1).click();
  await page.keyboard.insertText(b);
}

async function makePdf(browser: Browser, text: string): Promise<Buffer> {
  const p = await browser.newPage();
  await p.setContent(`<p style="font:16px sans-serif">${text}</p>`);
  const pdf = await p.pdf({ format: "A6" });
  await p.close();
  return pdf;
}

async function makePng(browser: Browser, color: string): Promise<Buffer> {
  const p = await browser.newPage({ viewport: { width: 120, height: 80 } });
  await p.setContent(`<body style="margin:0;background:#fff"><div style="margin:20px;width:40px;height:40px;background:${color}"></div></body>`);
  const png = await p.screenshot();
  await p.close();
  return png;
}

const docx = (paragraphs: string[]) =>
  Buffer.from(zipSync({
    "word/document.xml": strToU8(
      `<w:document xmlns:w="w"><w:body>${paragraphs.map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`,
    ),
  }));

const xlsx = (rows: string[][]) =>
  Buffer.from(zipSync({
    "xl/workbook.xml": strToU8('<workbook xmlns:r="r"><sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    "xl/_rels/workbook.xml.rels": strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
    "xl/worksheets/sheet1.xml": strToU8(
      "<worksheet><sheetData>" +
        rows.map((r, i) => `<row r="${i + 1}">${r.map((v, j) => `<c r="${"ABC"[j]}${i + 1}" t="inlineStr"><is><t>${v}</t></is></c>`).join("")}</row>`).join("") +
        "</sheetData></worksheet>",
    ),
  }));

test("moved blocks are marked and the tag jumps to the other side", async ({ page }) => {
  await page.goto("/");
  const block = "function one() {\n  return 1;\n}";
  await fill(page, `start\n${block}\nmiddle a\nmiddle b\nmiddle c\nend`, `start\nmiddle a\nmiddle b\nmiddle c\n${block}\nend`);
  await expect(page.locator("#summary")).toContainText("1 moved");
  await expect(page.locator(".cm-moveTag").first()).toContainText("Moved to line 5");
  await expect(page.locator(".cm-movedLine")).toHaveCount(6);
  await expect(page.locator(".changemap .mark-move").first()).toBeVisible();
});

test("character mode highlights single characters", async ({ page }) => {
  await page.goto("/");
  await fill(page, "the quick fox", "the quack fox");
  await expect(page.locator(".cm-changedText").first()).toHaveText("quick");
  await page.click("#options-btn");
  await page.check("input[name=gran][value=char]");
  await expect(page.locator(".cm-changedText").first()).toHaveText("i");
});

test("ignore patterns hide timestamp differences", async ({ page }) => {
  await page.goto("/");
  await fill(page, "2026-01-01 10:00:00 job ok", "2026-02-02 11:11:11 job ok");
  await expect(page.locator("#summary")).not.toContainText("identical");
  await page.click("#options-btn");
  await page.getByLabel("Dates and times").check();
  await expect(page.locator("#summary")).toContainText("identical");
  await page.locator("#opt-patterns").fill("(broken");
  await expect(page.locator("#patterns-error")).toContainText("(broken");
});

test("data view compares JSON by structure", async ({ page }) => {
  await page.goto("/");
  await fill(page, '{"b": 1, "a": {"x": true}}', '{"a": {"x": false}, "b": 1, "c": [1]}');
  await page.click("[data-view=data]");
  const panel = page.locator("#data-panel");
  await expect(panel).toContainText("1 addition");
  await expect(panel).toContainText("1 changed value");
  await expect(panel.locator("tr.dk-changed .path")).toHaveText("a.x");
});

test("data view compares CSV rows by key", async ({ page }) => {
  await page.goto("/");
  await fill(page, "id,name\n1,Ann\n2,Bob", "id,name\n2,Rob\n1,Ann\n3,Cy");
  await page.click("[data-view=data]");
  const panel = page.locator("#data-panel");
  await expect(panel).toContainText("Rows matched by id");
  await expect(panel.locator(".cell-changed ins")).toHaveText("Rob");
  await expect(panel.locator("tr.dk-added")).toHaveCount(1);
});

test("opens PDF files as text and turns on document mode", async ({ page, browser }) => {
  await page.goto("/");
  await page.setInputFiles("#file-a", { name: "a.pdf", mimeType: "application/pdf", buffer: await makePdf(browser, "The first draft of the contract.") });
  await page.setInputFiles("#file-b", { name: "b.pdf", mimeType: "application/pdf", buffer: await makePdf(browser, "The final draft of the contract.") });
  await expect(page.locator(".cm-content").nth(0)).toContainText("first draft");
  await expect(page.locator(".cm-changedText").first()).toHaveText("first");
  await expect(page.locator("body")).toHaveClass(/prose/);
});

test("opens Word and Excel files", async ({ page }) => {
  await page.goto("/");
  await page.setInputFiles("#file-a", { name: "a.docx", mimeType: "application/octet-stream", buffer: docx(["Hello", "World"]) });
  await expect(page.locator(".cm-content").nth(0)).toContainText("World");
  await page.setInputFiles("#file-b", { name: "b.xlsx", mimeType: "application/octet-stream", buffer: xlsx([["id", "v"], ["1", "x"]]) });
  await expect(page.locator(".cm-content").nth(1)).toContainText("id,v");
  await expect(page.locator("#meta-b")).toContainText("Excel as CSV");
});

test("compares images with a pixel difference view", async ({ page, browser }) => {
  await page.goto("/");
  await page.setInputFiles("#file-a", { name: "a.png", mimeType: "image/png", buffer: await makePng(browser, "#d00") });
  await page.setInputFiles("#file-b", { name: "b.png", mimeType: "image/png", buffer: await makePng(browser, "#00d") });
  await expect(page.locator("#image-panel")).toBeVisible();
  await expect(page.locator(".img-figure img")).toHaveCount(2);
  await page.click("[data-img-mode=diff]");
  await expect(page.locator("#img-info")).toContainText("of pixels differ");
  await page.click("[data-img-mode=slider]");
  await expect(page.locator(".slider-handle")).toBeVisible();
  await page.click("#img-close");
  await expect(page.locator("#editor-row")).toBeVisible();
});

test("exports a report", async ({ page }) => {
  await page.goto("/");
  await fill(page, "one\ntwo", "one\n2");
  await page.click("#export-btn");
  const download = page.waitForEvent("download");
  await page.click("[data-action=report]");
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/comparison\.html$/);
  const html = await (await file.createReadStream()).toArray().then((c) => Buffer.concat(c).toString());
  expect(html).toContain("<del>two</del>");
});

test("footer links to the code and the author", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".site-footer a", { hasText: "Source code" })).toHaveAttribute("href", "https://github.com/jiaxuan-tao/vibe-coding-lab/tree/main/text-compare");
  await expect(page.locator(".site-footer a", { hasText: "James Patton" })).toHaveAttribute("href", "https://jamesclaypatton.com");
});
