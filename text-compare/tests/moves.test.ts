import { describe, expect, it } from "vitest";
import { diffLineArrays } from "../src/diff-core";
import { detectMoves } from "../src/moves";
import { defaultOptions } from "../src/normalize";

const moves = (a: string, b: string, o = defaultOptions) => {
  const la = a.split("\n"), lb = b.split("\n");
  return detectMoves(la, lb, diffLineArrays(la, lb, o), o);
};

describe("detectMoves", () => {
  it("finds a block that moved down", () => {
    const a = "header\nfunction one() {\n  return 1;\n}\nmiddle 1\nmiddle 2\nmiddle 3\nfooter";
    const b = "header\nmiddle 1\nmiddle 2\nmiddle 3\nfunction one() {\n  return 1;\n}\nfooter";
    const m = moves(a, b);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ a1: m[0].a0 + 3, b1: m[0].b0 + 3 });
    expect(a.split("\n").slice(m[0].a0, m[0].a1)).toEqual(b.split("\n").slice(m[0].b0, m[0].b1));
  });

  it("finds a single long moved paragraph", () => {
    const p = "This paragraph is long enough to count as a moved block on its own.";
    const m = moves(`intro\n${p}\nalpha\nbeta\ngamma`, `intro\nalpha\nbeta\ngamma\n${p}`);
    expect(m).toHaveLength(1);
    expect(m[0].a1 - m[0].a0).toBe(1);
  });

  it("ignores short single lines and plain edits", () => {
    expect(moves("a\n}\nb\nc", "a\nb\nc\n}")).toEqual([]);
    expect(moves("one\ntwo\nthree", "one\nTWO\nthree")).toEqual([]);
  });

  it("respects comparison options", () => {
    const a = "x\nLine One Here\nLine Two Here\ny\nz\nw";
    const b = "x\ny\nz\nw\nline one here\nline two here";
    expect(moves(a, b)).toEqual([]);
    expect(moves(a, b, { ...defaultOptions, ignoreCase: true })).toHaveLength(1);
  });
});
