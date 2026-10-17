import { describe, expect, it } from "vitest";
import { defaultOptions, hasActiveOptions, normalizeLine, splitLines } from "../src/normalize";

describe("splitLines", () => {
  it("returns line text with offsets", () => {
    expect(splitLines("ab\ncd")).toEqual([
      { text: "ab", start: 0, end: 2 },
      { text: "cd", start: 3, end: 5 },
    ]);
  });

  it("treats a trailing newline as an empty last line", () => {
    expect(splitLines("a\n").map((l) => l.text)).toEqual(["a", ""]);
  });

  it("strips carriage returns from CRLF lines but keeps offsets", () => {
    expect(splitLines("a\r\nb")).toEqual([
      { text: "a", start: 0, end: 1 },
      { text: "b", start: 3, end: 4 },
    ]);
  });
});

describe("normalizeLine", () => {
  it("is identity with default options", () => {
    expect(normalizeLine("  A b ", defaultOptions)).toBe("  A b ");
  });

  it("ignores case", () => {
    expect(normalizeLine("HeLLo", { ...defaultOptions, ignoreCase: true })).toBe("hello");
  });

  it("trims trailing whitespace only", () => {
    expect(normalizeLine("  a b \t", { ...defaultOptions, whitespace: "trailing" })).toBe("  a b");
  });

  it("removes all whitespace", () => {
    expect(normalizeLine(" a  b\t c ", { ...defaultOptions, whitespace: "all" })).toBe("abc");
  });
});

describe("hasActiveOptions", () => {
  it("is false for defaults and true when anything is set", () => {
    expect(hasActiveOptions(defaultOptions)).toBe(false);
    expect(hasActiveOptions({ ...defaultOptions, ignoreBlankLines: true })).toBe(true);
  });
});
