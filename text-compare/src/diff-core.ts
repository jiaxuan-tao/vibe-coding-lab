import { type CompareOptions, defaultOptions, isBlank, normalizeLine, splitLines } from "./normalize";
import { diffSequences } from "./seq-diff";

/** A run of lines: equal on both sides, or a changed block (either side may be empty). */
export interface LineOp {
  type: "equal" | "change";
  a0: number;
  a1: number;
  b0: number;
  b1: number;
}

export interface DiffStats {
  added: number;
  removed: number;
  blocks: number;
  /** 0..1, share of lines that are unchanged. */
  similarity: number;
  identical: boolean;
}

/** Lines of a text for comparison purposes; an empty text has no lines. */
export function linesOf(text: string): string[] {
  return text === "" ? [] : splitLines(text).map((l) => l.text);
}

/** Diff two arrays of line strings, honouring the comparison options. */
export function diffLineArrays(la: string[], lb: string[], opts: CompareOptions): LineOp[] {
  const ids = new Map<string, number>();
  const id = (s: string) => {
    let v = ids.get(s);
    if (v === undefined) ids.set(s, (v = ids.size));
    return v;
  };
  const pick = (lines: string[]) => {
    const idx: number[] = [];
    const keys: number[] = [];
    lines.forEach((line, i) => {
      if (opts.ignoreBlankLines && isBlank(line)) return;
      idx.push(i);
      keys.push(id(normalizeLine(line, opts)));
    });
    return { idx, keys };
  };
  const A = pick(la);
  const B = pick(lb);

  // matched line pairs, in original line indexes
  const pairs: Array<[number, number]> = [];
  let i = 0, j = 0;
  for (const e of diffSequences(Int32Array.from(A.keys), Int32Array.from(B.keys))) {
    if (e.type === "equal") for (let k = 0; k < e.count; k++) pairs.push([A.idx[i + k], B.idx[j + k]]);
    if (e.type !== "insert") i += e.count;
    if (e.type !== "delete") j += e.count;
  }

  const ops: LineOp[] = [];
  const onlyBlank = (lines: string[], from: number, to: number) => {
    for (let k = from; k < to; k++) if (!isBlank(lines[k])) return false;
    return true;
  };
  let pa = 0, pb = 0;
  const gap = (ta: number, tb: number) => {
    if (ta === pa && tb === pb) return;
    if (opts.ignoreBlankLines && onlyBlank(la, pa, ta) && onlyBlank(lb, pb, tb)) return;
    ops.push({ type: "change", a0: pa, a1: ta, b0: pb, b1: tb });
  };
  for (const [x, y] of pairs) {
    gap(x, y);
    const last = ops[ops.length - 1];
    if (last && last.type === "equal" && last.a1 === x && last.b1 === y) {
      last.a1++;
      last.b1++;
    } else ops.push({ type: "equal", a0: x, a1: x + 1, b0: y, b1: y + 1 });
    pa = x + 1;
    pb = y + 1;
  }
  gap(la.length, lb.length);
  return ops;
}

export function diffLines(a: string, b: string, opts: CompareOptions): LineOp[] {
  return diffLineArrays(linesOf(a), linesOf(b), opts);
}

export function diffStats(a: string, b: string, opts: CompareOptions): DiffStats {
  const la = linesOf(a), lb = linesOf(b);
  return statsFromOps(diffLineArrays(la, lb, opts), la, lb, opts);
}

export function statsFromOps(ops: LineOp[], la: string[], lb: string[], opts: CompareOptions): DiffStats {
  let added = 0, removed = 0, blocks = 0, same = 0;
  for (const op of ops) {
    if (op.type === "equal") same += op.a1 - op.a0;
    else {
      blocks++;
      added += op.b1 - op.b0;
      removed += op.a1 - op.a0;
    }
  }
  const count = (lines: string[]) => (opts.ignoreBlankLines ? lines.filter((l) => !isBlank(l)).length : lines.length);
  const total = count(la) + count(lb);
  return { added, removed, blocks, similarity: total === 0 ? 1 : (2 * same) / total, identical: blocks === 0 };
}

interface PatchLine {
  t: " " | "-" | "+";
  text: string;
  a: number; // line index in a (for " " and "-")
  b: number; // line index in b (for " " and "+")
}

/** A standard unified diff (as produced by `diff -u` / git), compared exactly. */
export function unifiedPatch(a: string, b: string, nameA: string, nameB: string, context = 3): string {
  const split = (s: string) => {
    if (s === "") return { lines: [] as string[], noEol: false };
    const lines = s.split("\n");
    const noEol = !s.endsWith("\n");
    if (!noEol) lines.pop();
    return { lines, noEol };
  };
  const A = split(a), B = split(b);
  // The final line without a newline must not match the same text with one.
  const keyed = (x: { lines: string[]; noEol: boolean }) =>
    x.lines.map((l, i) => (x.noEol && i === x.lines.length - 1 ? l + "\u0000" : l));
  const ops = diffLineArrays(keyed(A), keyed(B), defaultOptions);

  const recs: PatchLine[] = [];
  for (const op of ops) {
    if (op.type === "equal") {
      for (let k = 0; k < op.a1 - op.a0; k++) recs.push({ t: " ", text: A.lines[op.a0 + k], a: op.a0 + k, b: op.b0 + k });
    } else {
      for (let k = op.a0; k < op.a1; k++) recs.push({ t: "-", text: A.lines[k], a: k, b: -1 });
      for (let k = op.b0; k < op.b1; k++) recs.push({ t: "+", text: B.lines[k], a: -1, b: k });
    }
  }

  const changed = recs.flatMap((r, i) => (r.t === " " ? [] : [i]));
  if (changed.length === 0) return "";

  const groups: Array<[number, number]> = [];
  for (const i of changed) {
    const g = groups[groups.length - 1];
    if (g && i - g[1] - 1 <= 2 * context) g[1] = i;
    else groups.push([i, i]);
  }

  const out = [`--- a/${nameA}`, `+++ b/${nameB}`];
  const range = (start: number, len: number) => (len === 1 ? `${start}` : `${len === 0 ? start - 1 : start},${len}`);
  for (const [first, last] of groups) {
    const from = Math.max(0, first - context);
    const to = Math.min(recs.length - 1, last + context);
    let aBefore = 0, bBefore = 0;
    for (let i = 0; i < from; i++) {
      if (recs[i].t !== "+") aBefore++;
      if (recs[i].t !== "-") bBefore++;
    }
    let aLen = 0, bLen = 0;
    const body: string[] = [];
    for (let i = from; i <= to; i++) {
      const r = recs[i];
      if (r.t !== "+") aLen++;
      if (r.t !== "-") bLen++;
      body.push(r.t + r.text);
      const endA = r.t !== "+" && A.noEol && r.a === A.lines.length - 1;
      const endB = r.t !== "-" && B.noEol && r.b === B.lines.length - 1;
      if (endA || endB) body.push("\\ No newline at end of file");
    }
    out.push(`@@ -${range(aBefore + 1, aLen)} +${range(bBefore + 1, bLen)} @@`, ...body);
  }
  return out.join("\n") + "\n";
}
