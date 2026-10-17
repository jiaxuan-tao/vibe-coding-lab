import { Change } from "@codemirror/merge";
import { diffLineArrays } from "./diff-core";
import { type CompareOptions, type LineInfo, splitLines } from "./normalize";
import { type Granularity, intraChanges } from "./worddiff";

/** Blocks bigger than this are marked as a whole instead of word by word. */
const MAX_INTRA = 20000;

/**
 * A diff function for CodeMirror's merge views that honours the comparison
 * options: lines are matched on their normalized form, and only lines that
 * still differ get character-level changes.
 */
export function makeDiffOverride(opts: CompareOptions, granularity: Granularity = "word"): (a: string, b: string) => readonly Change[] {
  return (a, b) => {
    const la = splitLines(a), lb = splitLines(b);
    const ops = diffLineArrays(la.map((l) => l.text), lb.map((l) => l.text), opts);
    const out: Change[] = [];
    for (const op of ops) {
      if (op.type !== "change") continue;
      if (op.a0 === op.a1) {
        const [pos, from, to] = pureRange(la, op.a0, lb, op.b0, op.b1, b.length, a.length);
        out.push(new Change(pos, pos, from, to));
      } else if (op.b0 === op.b1) {
        const [pos, from, to] = pureRange(lb, op.b0, la, op.a0, op.a1, a.length, b.length);
        out.push(new Change(from, to, pos, pos));
      } else {
        const fromA = la[op.a0].start, toA = la[op.a1 - 1].end;
        const fromB = lb[op.b0].start, toB = lb[op.b1 - 1].end;
        if (toA - fromA + toB - fromB > MAX_INTRA) {
          out.push(new Change(fromA, toA, fromB, toB));
          continue;
        }
        for (const c of intraChanges(a.slice(fromA, toA), b.slice(fromB, toB), granularity)) {
          const ca = c.fromA + fromA, ta = c.toA + fromA, cb = c.fromB + fromB, tb = c.toB + fromB;
          if (granularity === "char") pushPieces(out, a, b, ca, ta, cb, tb);
          else out.push(new Change(ca, ta, cb, tb));
        }
      }
    }
    return out;
  };
}

/**
 * Lines [s0, s1) of `src` exist only on that side and go in before line
 * `at` of `dst`. Returns [position in dst, from, to in src], with the range
 * covering the line breaks that belong to the inserted lines.
 */
function pureRange(
  dst: LineInfo[], at: number, src: LineInfo[], s0: number, s1: number, srcLen: number, dstLen: number,
): [number, number, number] {
  if (at < dst.length && s1 < src.length) return [dst[at].start, src[s0].start, src[s1].start];
  // appended after the last line: take the preceding line break instead
  return [dstLen, s0 > 0 ? src[s0 - 1].end : 0, srcLen];
}

/**
 * CodeMirror widens any replacement inside a word to the whole word, but
 * leaves deletions and insertions of up to 3 characters alone (and merges
 * adjacent ones afterwards). Emitting a change as such pieces keeps
 * character mode precise.
 */
function pushPieces(out: Change[], a: string, b: string, fromA: number, toA: number, fromB: number, toB: number): void {
  const cuts = (s: string, from: number, to: number) => {
    const points: number[] = [from];
    let pos = from;
    while (pos < to) {
      let next = Math.min(pos + 3, to);
      const code = s.charCodeAt(next - 1);
      if (next < to && code >= 0xd800 && code <= 0xdbff) next--; // don't split a surrogate pair
      pos = next;
      points.push(pos);
    }
    return points;
  };
  const da = cuts(a, fromA, toA);
  for (let i = 1; i < da.length; i++) out.push(new Change(da[i - 1], da[i], fromB, fromB));
  const ib = cuts(b, fromB, toB);
  for (let i = 1; i < ib.length; i++) out.push(new Change(toA, toA, ib[i - 1], ib[i]));
}
