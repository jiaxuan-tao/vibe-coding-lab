import { describe, expect, it } from "vitest";
import { buildReport } from "../src/report";
import { defaultOptions } from "../src/normalize";

const base = { nameA: "old.txt", nameB: "new.txt", options: defaultOptions, granularity: "word" as const, date: new Date("2026-09-24T12:00:00Z") };

describe("buildReport", () => {
  it("produces a standalone HTML page with word-level redlines", () => {
    const html = buildReport({ ...base, a: "keep\nthe quick fox\nkeep", b: "keep\nthe slow fox\nkeep" });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<del>quick</del>");
    expect(html).toContain("<ins>slow</ins>");
    expect(html).toContain("old.txt");
    expect(html).not.toMatch(/<script|<link|https?:\/\//);
  });

  it("escapes HTML in the compared text", () => {
    const html = buildReport({ ...base, a: "<b>x</b>", b: "<i>x</i>" });
    expect(html).toContain("&lt;");
    expect(html).not.toContain("<b>x</b>");
    expect(html).not.toContain("<i>x</i>");
  });

  it("collapses long unchanged stretches", () => {
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i}`);
    const html = buildReport({ ...base, a: lines.join("\n"), b: lines.map((l, i) => (i === 20 ? "changed" : l)).join("\n") });
    expect(html).toMatch(/17 unchanged lines/);
    expect(html).not.toContain(">line 5<");
  });

  it("says when the texts are identical", () => {
    expect(buildReport({ ...base, a: "same", b: "same" })).toContain("No differences");
  });
});
