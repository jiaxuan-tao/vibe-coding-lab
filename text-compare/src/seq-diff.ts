// Myers' O(ND) difference algorithm in linear space (middle-snake bisection),
// operating on arrays of integers. Gives up and reports a whole-range
// replacement once the time budget is spent, so pathological inputs stay responsive.

export type Edit = { type: "equal" | "delete" | "insert"; count: number };

export function diffSequences(a: ArrayLike<number>, b: ArrayLike<number>, budgetMs = 1500): Edit[] {
  const out: Edit[] = [];
  const deadline = Date.now() + budgetMs;
  const push = (type: Edit["type"], count: number) => {
    if (count <= 0) return;
    const last = out[out.length - 1];
    if (last && last.type === type) last.count += count;
    else out.push({ type, count });
  };

  const solve = (a0: number, a1: number, b0: number, b1: number): void => {
    // common prefix
    let pre = 0;
    while (a0 + pre < a1 && b0 + pre < b1 && a[a0 + pre] === b[b0 + pre]) pre++;
    // common suffix
    let suf = 0;
    while (a1 - suf > a0 + pre && b1 - suf > b0 + pre && a[a1 - 1 - suf] === b[b1 - 1 - suf]) suf++;
    push("equal", pre);
    const s0 = a0 + pre, s1 = a1 - suf, t0 = b0 + pre, t1 = b1 - suf;
    if (s0 === s1) push("insert", t1 - t0);
    else if (t0 === t1) push("delete", s1 - s0);
    else {
      const split = bisect(a, s0, s1, b, t0, t1, deadline);
      if (!split) {
        push("delete", s1 - s0);
        push("insert", t1 - t0);
      } else {
        solve(s0, split[0], t0, split[1]);
        solve(split[0], s1, split[1], t1);
      }
    }
    push("equal", suf);
  };

  solve(0, a.length, 0, b.length);
  return out;
}

/** Returns the split point [x, y] of the middle snake, or null to give up. */
function bisect(
  a: ArrayLike<number>, a0: number, a1: number,
  b: ArrayLike<number>, b0: number, b1: number,
  deadline: number,
): [number, number] | null {
  const n = a1 - a0, m = b1 - b0;
  const maxD = Math.ceil((n + m) / 2);
  const off = maxD, len = 2 * maxD + 2;
  const v1 = new Int32Array(len).fill(-1);
  const v2 = new Int32Array(len).fill(-1);
  v1[off + 1] = 0;
  v2[off + 1] = 0;
  const delta = n - m;
  const front = (delta & 1) !== 0;
  let k1start = 0, k1end = 0, k2start = 0, k2end = 0;

  for (let d = 0; d < maxD; d++) {
    if ((d & 31) === 0 && Date.now() > deadline) return null;
    for (let k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      const k1o = off + k1;
      let x1 = k1 === -d || (k1 !== d && v1[k1o - 1] < v1[k1o + 1]) ? v1[k1o + 1] : v1[k1o - 1] + 1;
      let y1 = x1 - k1;
      while (x1 < n && y1 < m && a[a0 + x1] === b[b0 + y1]) { x1++; y1++; }
      v1[k1o] = x1;
      if (x1 > n) k1end += 2;
      else if (y1 > m) k1start += 2;
      else if (front) {
        const k2o = off + delta - k1;
        if (k2o >= 0 && k2o < len && v2[k2o] !== -1 && x1 >= n - v2[k2o]) return [a0 + x1, b0 + y1];
      }
    }
    for (let k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      const k2o = off + k2;
      let x2 = k2 === -d || (k2 !== d && v2[k2o - 1] < v2[k2o + 1]) ? v2[k2o + 1] : v2[k2o - 1] + 1;
      let y2 = x2 - k2;
      while (x2 < n && y2 < m && a[a1 - x2 - 1] === b[b1 - y2 - 1]) { x2++; y2++; }
      v2[k2o] = x2;
      if (x2 > n) k2end += 2;
      else if (y2 > m) k2start += 2;
      else if (!front) {
        const k1o = off + delta - k2;
        if (k1o >= 0 && k1o < len && v1[k1o] !== -1) {
          const x1 = v1[k1o];
          const y1 = off + x1 - k1o;
          if (x1 >= n - x2) return [a0 + x1, b0 + y1];
        }
      }
    }
  }
  return null;
}
