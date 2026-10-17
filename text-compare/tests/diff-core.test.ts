import { describe, expect, it } from "vitest";
import { diffLines, diffStats, unifiedPatch } from "../src/diff-core";
import { defaultOptions } from "../src/normalize";

describe("diffLines", () => {
  it("finds a replaced line between equal lines", () => {
    const ops = diffLines("a\nb\nc", "a\nx\nc", defaultOptions);
    expect(ops).toEqual([
      { type: "equal", a0: 0, a1: 1, b0: 0, b1: 1 },
      { type: "change", a0: 1, a1: 2, b0: 1, b1: 2 },
      { type: "equal", a0: 2, a1: 3, b0: 2, b1: 3 },
    ]);
  });

  it("treats CRLF and LF text as identical", () => {
    expect(diffStats("a\r\nb\r\n", "a\nb\n", defaultOptions).identical).toBe(true);
  });

  it("ignores blank lines when asked", () => {
    expect(diffStats("a\n\n\nb", "a\nb", { ...defaultOptions, ignoreBlankLines: true }).identical).toBe(true);
    expect(diffStats("a\n\n\nb", "a\nb", defaultOptions).identical).toBe(false);
  });

  it("ignores whitespace and case when asked", () => {
    const o = { ...defaultOptions, ignoreCase: true, whitespace: "all" as const };
    expect(diffStats("Hello  World", "hello world", o).identical).toBe(true);
  });

  it("handles large inputs quickly", () => {
    const a = Array.from({ length: 20000 }, (_, i) => `line ${i}`).join("\n");
    const b = Array.from({ length: 20000 }, (_, i) => (i % 7 === 0 ? `changed ${i}` : `line ${i}`)).join("\n");
    const t = Date.now();
    const s = diffStats(a, b, defaultOptions);
    expect(Date.now() - t).toBeLessThan(3000);
    expect(s.removed).toBe(2858);
    expect(s.added).toBe(2858);
  });

  it("stays fast when the two texts share nothing", () => {
    const a = Array.from({ length: 30000 }, (_, i) => `a${i}`).join("\n");
    const b = Array.from({ length: 30000 }, (_, i) => `b${i}`).join("\n");
    const t = Date.now();
    const s = diffStats(a, b, defaultOptions);
    expect(Date.now() - t).toBeLessThan(3000);
    expect(s).toMatchObject({ added: 30000, removed: 30000 });
  });
});

describe("diffStats", () => {
  it("counts added, removed, blocks and similarity", () => {
    const s = diffStats("a\nb\nc\nd", "a\nB\nc\nd\ne", defaultOptions);
    expect(s).toMatchObject({ added: 2, removed: 1, blocks: 2, identical: false });
    expect(s.similarity).toBeCloseTo((2 * 3) / 9);
  });

  it("handles empty sides without crashing", () => {
    expect(diffStats("", "", defaultOptions)).toMatchObject({ identical: true, similarity: 1 });
    expect(diffStats("", "a\nb", defaultOptions)).toMatchObject({ added: 2, removed: 0, similarity: 0 });
  });
});

describe("unifiedPatch", () => {
  it("produces a git-style patch with context", () => {
    const a = "1\n2\n3\n4\n5\n6\n7\n8\n9\n";
    const b = "1\n2\n3\n4\nfive\n6\n7\n8\n9\n";
    expect(unifiedPatch(a, b, "old.txt", "new.txt")).toBe(
      ["--- a/old.txt", "+++ b/new.txt", "@@ -2,7 +2,7 @@", " 2", " 3", " 4", "-5", "+five", " 6", " 7", " 8", ""].join("\n"),
    );
  });

  it("emits a header for an empty original", () => {
    expect(unifiedPatch("", "a\nb\n", "x", "y")).toBe("--- a/x\n+++ b/y\n@@ -0,0 +1,2 @@\n+a\n+b\n");
  });

  it("marks a missing newline at end of file", () => {
    expect(unifiedPatch("a\n", "a", "x", "x")).toBe("--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+a\n\\ No newline at end of file\n");
  });

  it("returns an empty string when texts are identical", () => {
    expect(unifiedPatch("a\n", "a\n", "x", "x")).toBe("");
  });

  it("splits distant changes into separate hunks", () => {
    const a = Array.from({ length: 20 }, (_, i) => String(i)).join("\n") + "\n";
    const b = a.replace("\n2\n", "\ntwo\n").replace("\n17\n", "\nseventeen\n");
    expect(unifiedPatch(a, b, "f", "f").match(/^@@/gm)).toHaveLength(2);
  });
});
