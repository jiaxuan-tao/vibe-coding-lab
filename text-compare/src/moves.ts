import type { LineOp } from "./diff-core";
import { type CompareOptions, isBlank, normalizeLine } from "./normalize";

/** A block of lines deleted at [a0, a1) in the original that reappears at [b0, b1). */
export interface Move {
  a0: number;
  a1: number;
  b0: number;
  b1: number;
}

const MIN_SINGLE_LINE = 30; // a lone line must be this long (ignoring spaces) to count as moved
const MAX_CANDIDATES = 50;
const MAX_LINES = 50000;

/** Find removed blocks that were inserted elsewhere, based on a line diff. */
export function detectMoves(la: string[], lb: string[], ops: LineOp[], opts: CompareOptions): Move[] {
  const delA = new Uint8Array(la.length);
  const insB = new Uint8Array(lb.length);
  let changed = 0;
  for (const op of ops) {
    if (op.type !== "change") continue;
    for (let i = op.a0; i < op.a1; i++) delA[i] = 1;
    for (let j = op.b0; j < op.b1; j++) insB[j] = 1;
    changed += op.a1 - op.a0 + op.b1 - op.b0;
  }
  if (changed === 0 || changed > MAX_LINES) return [];

  const keyA = la.map((l) => normalizeLine(l, opts));
  const keyB = lb.map((l) => normalizeLine(l, opts));
  const where = new Map<string, number[]>();
  for (let j = 0; j < lb.length; j++) {
    if (!insB[j] || isBlank(lb[j])) continue;
    const list = where.get(keyB[j]);
    if (!list) where.set(keyB[j], [j]);
    else if (list.length < MAX_CANDIDATES) list.push(j);
  }

  const moves: Move[] = [];
  for (let i = 0; i < la.length; ) {
    if (!delA[i] || isBlank(la[i])) {
      i++;
      continue;
    }
    let best = 0, bestAt = -1;
    for (const j of where.get(keyA[i]) ?? []) {
      if (!insB[j]) continue;
      let n = 0;
      while (i + n < la.length && j + n < lb.length && delA[i + n] && insB[j + n] && keyA[i + n] === keyB[j + n]) n++;
      // don't end a block on blank lines
      while (n > 1 && isBlank(la[i + n - 1])) n--;
      if (n > best) {
        best = n;
        bestAt = j;
      }
    }
    const content = best === 1 ? la[i].replace(/\s+/g, "").length : Infinity;
    const nonBlank = la.slice(i, i + best).filter((l) => !isBlank(l)).length;
    if (bestAt >= 0 && (nonBlank >= 2 || content >= MIN_SINGLE_LINE)) {
      moves.push({ a0: i, a1: i + best, b0: bestAt, b1: bestAt + best });
      for (let k = 0; k < best; k++) {
        delA[i + k] = 0;
        insB[bestAt + k] = 0;
      }
      i += best;
    } else i++;
  }
  return moves;
}
