import { describe, expect, it } from "vitest";
import { diffStats } from "../src/diff-core";
import { compilePatterns, defaultOptions, ignorePresets, normalizeLine, sanitizeOptions } from "../src/normalize";

describe("ignore patterns", () => {
  it("treats text matching a pattern as equal", () => {
    const o = { ...defaultOptions, ignorePatterns: [ignorePresets.timestamps.pattern] };
    const a = "2026-09-24T10:15:00Z started job 7";
    const b = "2026-09-25 08:01:59 started job 7";
    expect(diffStats(a, b, o).identical).toBe(true);
    expect(diffStats(a, b, defaultOptions).identical).toBe(false);
  });

  it("has working presets for GUIDs, hex and numbers", () => {
    const o = (p: keyof typeof ignorePresets) => ({ ...defaultOptions, ignorePatterns: [ignorePresets[p].pattern] });
    expect(normalizeLine("id 3F2504E0-4F89-11D3-9A0C-0305E82C3301 ok", o("guids"))).toBe(normalizeLine("id 00000000-0000-0000-0000-000000000000 ok", o("guids")));
    expect(normalizeLine("at 0x7ffe12", o("hex"))).toBe(normalizeLine("at 0xDEAD", o("hex")));
    expect(normalizeLine("took 12.5 ms", o("numbers"))).toBe(normalizeLine("took 3 ms", o("numbers")));
  });

  it("reports invalid patterns without throwing", () => {
    const { regexes, errors } = compilePatterns(["(unclosed", "ok\\d"]);
    expect(regexes).toHaveLength(1);
    expect(errors).toEqual(["(unclosed"]);
    expect(normalizeLine("abc", { ...defaultOptions, ignorePatterns: ["(unclosed"] })).toBe("abc");
  });

  it("sanitizes pattern lists from untrusted input", () => {
    expect(sanitizeOptions({ ignorePatterns: ["a", 5, null, "b"] }).ignorePatterns).toEqual(["a", "b"]);
    expect(sanitizeOptions({}).ignorePatterns).toEqual([]);
  });
});
