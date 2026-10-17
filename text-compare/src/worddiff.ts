import { diffSequences } from "./seq-diff";

export type Granularity = "word" | "char";

export interface IntraChange {
  fromA: number;
  toA: number;
  fromB: number;
  toB: number;
}

const TOKEN = /[\p{L}\p{M}\p{N}_]+|\s+|[\s\S]/gu;

/** Split text into words, whitespace runs and single other characters (code points). */
export function tokenize(text: string): string[] {
  return text.match(TOKEN) ?? [];
}

/** Character ranges that differ between two short texts, at word or character level. */
export function intraChanges(a: string, b: string, granularity: Granularity): IntraChange[] {
  const ta = granularity === "word" ? tokenize(a) : Array.from(a);
  const tb = granularity === "word" ? tokenize(b) : Array.from(b);
  const ids = new Map<string, number>();
  const id = (t: string) => {
    let v = ids.get(t);
    if (v === undefined) ids.set(t, (v = ids.size));
    return v;
  };
  const edits = diffSequences(Int32Array.from(ta, id), Int32Array.from(tb, id), 300);

  const out: IntraChange[] = [];
  let ia = 0, ib = 0, pa = 0, pb = 0; // token index and char offset
  const advance = (tokens: string[], from: number, count: number) => {
    let len = 0;
    for (let k = 0; k < count; k++) len += tokens[from + k].length;
    return len;
  };
  for (const e of edits) {
    if (e.type === "equal") {
      pa += advance(ta, ia, e.count);
      pb += advance(tb, ib, e.count);
      ia += e.count;
      ib += e.count;
      continue;
    }
    const la = e.type === "delete" ? advance(ta, ia, e.count) : 0;
    const lb = e.type === "insert" ? advance(tb, ib, e.count) : 0;
    const last = out[out.length - 1];
    if (last && last.toA === pa && last.toB === pb) {
      last.toA += la;
      last.toB += lb;
    } else out.push({ fromA: pa, toA: pa + la, fromB: pb, toB: pb + lb });
    if (e.type === "delete") {
      ia += e.count;
      pa += la;
    } else {
      ib += e.count;
      pb += lb;
    }
  }
  return out;
}
