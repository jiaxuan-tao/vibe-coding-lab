import { describe, expect, it } from "vitest";
import { csvDiff, detectDelimiter, jsonDiff, parseDelimited, structureOf } from "../src/structure";

describe("jsonDiff", () => {
  it("reports added, removed and changed paths", () => {
    const d = jsonDiff({ a: 1, b: { c: true, d: "x" }, gone: 1 }, { a: 2, b: { c: true, d: "x", e: null }, "odd key": 1 });
    expect(d).toEqual([
      { path: "a", kind: "changed", before: 1, after: 2 },
      { path: "b.e", kind: "added", after: null },
      { path: "gone", kind: "removed", before: 1 },
      { path: '["odd key"]', kind: "added", after: 1 },
    ]);
  });

  it("ignores key order", () => {
    expect(jsonDiff({ a: 1, b: 2 }, { b: 2, a: 1 })).toEqual([]);
  });

  it("matches array items by id when every item has one", () => {
    const a = [{ id: 1, n: "one" }, { id: 2, n: "two" }];
    const b = [{ id: 2, n: "TWO" }, { id: 1, n: "one" }, { id: 3, n: "three" }];
    expect(jsonDiff(a, b)).toEqual([
      { path: "[id=2].n", kind: "changed", before: "two", after: "TWO" },
      { path: "[id=3]", kind: "added", after: { id: 3, n: "three" } },
    ]);
  });

  it("compares other arrays by position and reports type changes", () => {
    expect(jsonDiff({ x: [1, 2, 3] }, { x: [1, 5] })).toEqual([
      { path: "x[1]", kind: "changed", before: 2, after: 5 },
      { path: "x[2]", kind: "removed", before: 3 },
    ]);
    expect(jsonDiff({ x: { y: 1 } }, { x: [1] })).toEqual([{ path: "x", kind: "changed", before: { y: 1 }, after: [1] }]);
  });
});

describe("delimited text", () => {
  it("parses quotes, escaped quotes and embedded newlines", () => {
    expect(parseDelimited('a,"b,c","say ""hi""","line\nbreak"\n1,2,3,4\n', ",")).toEqual([
      ["a", "b,c", 'say "hi"', "line\nbreak"],
      ["1", "2", "3", "4"],
    ]);
  });

  it("detects the delimiter", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a,b\n1,2")).toBe(",");
    expect(detectDelimiter("just some prose, with a comma\nand another line")).toBeNull();
  });
});

describe("structureOf", () => {
  it("recognises JSON, tables and neither", () => {
    expect(structureOf('{"a":1}')?.kind).toBe("json");
    expect(structureOf("id,name\n1,Ann\n2,Bob")?.kind).toBe("table");
    expect(structureOf("hello world")).toBeNull();
  });
});

describe("csvDiff", () => {
  it("matches rows by a unique first column and finds cell changes", () => {
    const a = "id,name,city\n1,Ann,Oslo\n2,Bob,Rome\n3,Cy,Lima";
    const b = "id,name,city\n2,Bob,Paris\n1,Ann,Oslo\n4,Di,Kyiv";
    const d = csvDiff(a, b);
    expect(d.keyColumn).toBe("id");
    expect(d.rows).toEqual([
      { kind: "changed", key: "2", before: ["2", "Bob", "Rome"], after: ["2", "Bob", "Paris"], changedColumns: [2] },
      { kind: "removed", key: "3", before: ["3", "Cy", "Lima"] },
      { kind: "added", key: "4", after: ["4", "Di", "Kyiv"] },
    ]);
  });

  it("matches columns by header name and reports added and removed columns", () => {
    const d = csvDiff("id,a,b\n1,x,y", "id,b,c\n1,y,z");
    expect(d.columnsAdded).toEqual(["c"]);
    expect(d.columnsRemoved).toEqual(["a"]);
    expect(d.rows).toEqual([]);
  });

  it("falls back to row order when there is no unique key", () => {
    const d = csvDiff("k,v\nx,1\nx,2", "k,v\nx,1\nx,3");
    expect(d.keyColumn).toBeNull();
    expect(d.rows).toEqual([{ kind: "changed", key: "row 3", before: ["x", "2"], after: ["x", "3"], changedColumns: [1] }]);
  });
});
