import { afterEach, describe, expect, it, vi } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { buildReport } from "../src/report";
import { openAnyFile } from "../src/documents";
import { extractDocx, extractXlsx } from "../src/office";
import { DeviceLibrary } from "../src/library/library";
import { idb } from "../src/library/idb";
import { defaultOptions } from "../src/normalize";
import { renderDataPanel } from "../src/ui/datapanel";
import { ago } from "../src/ui/dom";
import { extraZh } from "../src/i18n-extra";

const state = vi.hoisted(() => ({ locale: "zh-CN" as "zh-CN" | "en", pdfError: null as Error | null }));
vi.mock("../src/pdf", () => ({ extractPdf: async () => { if (state.pdfError) throw state.pdfError; return ""; } }));
// Keep the module contract independent of the concurrently implemented core.
vi.mock("../src/i18n", async () => {
  const { extraZh } = await import("../src/i18n-extra");
  return {
    getLocale: () => state.locale,
    onLocaleChange: () => () => {},
    t: (key: string, values: Record<string, string | number> = {}) =>
      (state.locale === "zh-CN" ? extraZh[key] ?? key : key).replace(/\{(\w+)\}/g, (m, k) => String(values[k] ?? m)),
  };
});

afterEach(() => { state.locale = "zh-CN"; state.pdfError = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const base = { nameA: "Original", nameB: "Changed", options: defaultOptions, granularity: "word" as const, date: new Date("2026-09-24T12:00:00Z") };
const file = (name: string, bytes = new Uint8Array()) => ({ name, type: "", arrayBuffer: async () => bytes.buffer } as File);

describe("localized modules", () => {
  it("localizes report chrome while preserving user names and escaping text", () => {
    const html = buildReport({ ...base, a: "<old>", b: "<new>", nameB: 'Changed<script>"' });
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("使用 text.compare 制作");
    expect(html).toContain("删除的文字");
    expect(html).toContain("新增的文字");
    expect(html).toContain('Original');
    expect(html).toContain("Changed&lt;script&gt;&quot;");
    expect(html).not.toContain("<script>");
  });
  it("localizes identical reports and collapsed line labels", () => {
    expect(buildReport({ ...base, a: "same", b: "same" })).toContain("没有差异。");
    const lines = Array.from({ length: 40 }, (_, i) => String(i));
    expect(buildReport({ ...base, a: lines.join("\n"), b: lines.map((s, i) => i === 20 ? "new" : s).join("\n") })).toContain("17 行未更改");
  });
  it("preserves the English report contract", () => {
    state.locale = "en";
    const html = buildReport({ ...base, a: "a", b: "b" });
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("1 lines added, 1 removed, in 1 place.");
    expect(html).toContain("Made with text.compare");
  });
  it("localizes unsupported and binary file errors without translating file names", async () => {
    expect(await openAnyFile(file("Original.doc"))).toMatchObject({ kind: "error", message: expect.stringContaining("不支持此格式") });
    const result = await openAnyFile(file("Original.bin", new Uint8Array([0, 0, 0, 0])));
    expect(result).toMatchObject({ kind: "error", message: expect.stringContaining("Original.bin") });
    expect(result).toMatchObject({ message: expect.stringContaining("二进制文件") });
  });
  it("localizes built-in Office errors but never translates workbook data", () => {
    const invalid = zipSync({ "x.txt": strToU8("x") });
    expect(() => extractDocx(invalid)).toThrow("此文件不是 Word 文档 (.docx)。");
    expect(() => extractXlsx(invalid)).toThrow("此文件不是 Excel 工作簿 (.xlsx)。");
    expect(() => extractDocx(new Uint8Array([1, 2, 3]))).toThrow("此文件不是有效的 Word 文档。");
    expect(extractDocx(zipSync({ "word/document.xml": strToU8("<w:p><w:t>Save Original</w:t></w:p>") }))).toBe("Save Original\n");
  });
  it("localizes empty and invalid PDF errors without translating the file name", async () => {
    expect(await openAnyFile(file("Original.pdf"))).toMatchObject({ message: "Original.pdf 没有可选择的文字，可能是扫描图片。" });
    state.pdfError = new Error("Invalid PDF structure.");
    expect(await openAnyFile(file("Original.pdf"))).toMatchObject({ message: "Original.pdf: PDF 文件结构无效。" });
    state.locale = "en";
    expect(await openAnyFile(file("Original.pdf"))).toMatchObject({ message: "Original.pdf: Invalid PDF structure." });
  });
  it("localizes a missing saved comparison", async () => {
    vi.spyOn(idb, "get").mockResolvedValue(undefined);
    await expect(new DeviceLibrary().load("missing")).rejects.toThrow("此对比记录已不存在。");
  });
  it("localizes data labels without translating JSON values or paths", () => {
    const el = { innerHTML: "" } as HTMLElement;
    renderDataPanel(el, '{"Original":"Save"}', '{"Original":"Changed"}');
    expect(el.innerHTML).toContain("路径");
    expect(el.innerHTML).toContain(">Original</code>");
    expect(el.innerHTML).toContain("&quot;Save&quot;");
    expect(el.innerHTML).toContain("&quot;Changed&quot;");
  });
  it("localizes relative dates", () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-09-24T12:00:00Z").getTime());
    expect(ago("2026-09-24T11:57:00Z")).toBe("3 分钟前");
  });
  it("escapes translated report labels, not only user text", () => {
    const original = extraZh["removed text"];
    try {
      extraZh["removed text"] = '<img src=x onerror="bad()">';
      const html = buildReport({ ...base, a: "a", b: "b" });
      expect(html).toContain("&lt;img src=x onerror=&quot;bad()&quot;&gt;");
      expect(html).not.toContain("<img");
    } finally { extraZh["removed text"] = original; }
  });
  it("uses a namespaced database and localizes asynchronous storage errors", async () => {
    const error = new DOMException("native quota message", "QuotaExceededError");
    const open = vi.fn(() => {
      const request = { error } as IDBOpenDBRequest;
      queueMicrotask(() => request.onerror?.(new Event("error")));
      return request;
    });
    vi.stubGlobal("indexedDB", { open });
    await expect(idb.all("items")).rejects.toThrow("浏览器存储空间已满");
    expect(open).toHaveBeenCalledWith("vcl-text-compare-library-v1", 1);
    state.locale = "en";
    await expect(idb.all("items")).rejects.toBe(error);
  });
  it("localizes synchronous browser storage permission errors", async () => {
    vi.stubGlobal("indexedDB", { open: () => { throw new DOMException("Denied", "SecurityError"); } });
    await expect(idb.all("items")).rejects.toThrow("无法访问浏览器存储");
  });
});
