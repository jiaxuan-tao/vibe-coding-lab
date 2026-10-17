import { diffLineArrays } from "./diff-core";
import { defaultOptions } from "./normalize";

// ------------------------------------------------------------------ JSON

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export type DataChange =
  | { path: string; kind: "changed"; before: unknown; after: unknown }
  | { path: string; kind: "added"; after: unknown }
  | { path: string; kind: "removed"; before: unknown };

const ID_KEYS = ["id", "key", "_id", "uuid", "code", "name"];
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const kindOf = (v: unknown) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);

function joinKey(path: string, key: string): string {
  if (/^[A-Za-z_$][\w$]*$/.test(key)) return path ? `${path}.${key}` : key;
  return `${path}[${JSON.stringify(key)}]`;
}

/** Field that identifies every item in both arrays uniquely, if there is one. */
function arrayIdKey(a: unknown[], b: unknown[]): string | null {
  const all = [...a, ...b];
  if (all.length === 0 || !all.every(isObject)) return null;
  for (const k of ID_KEYS) {
    const ok = [a, b].every((arr) => {
      const seen = new Set<unknown>();
      for (const item of arr as Record<string, unknown>[]) {
        const v = item[k];
        if (v === undefined || (typeof v === "object" && v !== null) || seen.has(v)) return false;
        seen.add(v);
      }
      return true;
    });
    if (ok) return k;
  }
  return null;
}

/** Structural differences between two parsed JSON values. Key order never matters. */
export function jsonDiff(a: unknown, b: unknown, path = ""): DataChange[] {
  const out: DataChange[] = [];
  const walk = (x: unknown, y: unknown, p: string) => {
    if (kindOf(x) !== kindOf(y)) {
      out.push({ path: p || "(root)", kind: "changed", before: x, after: y });
      return;
    }
    if (Array.isArray(x) && Array.isArray(y)) {
      const idKey = arrayIdKey(x, y);
      if (idKey) {
        const byId = new Map((y as Record<string, unknown>[]).map((item) => [item[idKey], item]));
        const seen = new Set<unknown>();
        for (const item of x as Record<string, unknown>[]) {
          const id = item[idKey];
          const seg = `${p}[${idKey}=${typeof id === "string" ? id : JSON.stringify(id)}]`;
          seen.add(id);
          if (byId.has(id)) walk(item, byId.get(id), seg);
          else out.push({ path: seg, kind: "removed", before: item });
        }
        for (const item of y as Record<string, unknown>[]) {
          const id = item[idKey];
          if (!seen.has(id)) out.push({ path: `${p}[${idKey}=${typeof id === "string" ? id : JSON.stringify(id)}]`, kind: "added", after: item });
        }
        return;
      }
      const n = Math.max(x.length, y.length);
      for (let i = 0; i < n; i++) {
        const seg = `${p}[${i}]`;
        if (i >= y.length) out.push({ path: seg, kind: "removed", before: x[i] });
        else if (i >= x.length) out.push({ path: seg, kind: "added", after: y[i] });
        else walk(x[i], y[i], seg);
      }
      return;
    }
    if (isObject(x) && isObject(y)) {
      const keys = Array.from(new Set([...Object.keys(x), ...Object.keys(y)])).sort();
      for (const k of keys) {
        const seg = joinKey(p, k);
        if (!(k in y)) out.push({ path: seg, kind: "removed", before: x[k] });
        else if (!(k in x)) out.push({ path: seg, kind: "added", after: y[k] });
        else walk(x[k], y[k], seg);
      }
      return;
    }
    if (x !== y) out.push({ path: p || "(root)", kind: "changed", before: x, after: y });
  };
  walk(a, b, path);
  return out;
}

// ------------------------------------------------------------------ delimited tables

const DELIMITERS = ["\t", ",", ";", "|"];

/** Parse CSV-style text (RFC 4180 quoting). */
export function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = 0;
  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else field += c;
      i++;
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === delimiter) endField();
    else if (c === "\n") endRow();
    else if (c === "\r") {
      if (text[i + 1] !== "\n") endRow();
    } else field += c;
    i++;
  }
  if (field !== "" || row.length) endRow();
  return rows;
}

/** Count delimiters outside quotes on one line. */
function countOutsideQuotes(line: string, d: string): number {
  let n = 0, q = false;
  for (const c of line) {
    if (c === '"') q = !q;
    else if (c === d && !q) n++;
  }
  return n;
}

export function detectDelimiter(text: string): string | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "").slice(0, 25);
  if (lines.length < 2) return null;
  let best: string | null = null, bestCount = 0;
  for (const d of DELIMITERS) {
    const counts = lines.map((l) => countOutsideQuotes(l, d));
    if (counts.some((c) => c === 0)) continue;
    const first = counts[0];
    const consistent = counts.filter((c) => c === first).length / counts.length;
    if (consistent >= 0.8 && first > bestCount) {
      best = d;
      bestCount = first;
    }
  }
  return best;
}

export type Structure =
  | { kind: "json"; value: unknown }
  | { kind: "table"; delimiter: string; rows: string[][] };

/** What kind of structured data a text holds, if any. */
export function structureOf(text: string): Structure | null {
  const t = text.trim();
  if (!t) return null;
  if (t[0] === "{" || t[0] === "[") {
    try {
      return { kind: "json", value: JSON.parse(t) };
    } catch {
      /* not JSON */
    }
  }
  const d = detectDelimiter(t);
  if (!d) return null;
  const rows = parseDelimited(t, d);
  return rows.length >= 2 && rows[0].length >= 2 ? { kind: "table", delimiter: d, rows } : null;
}

export type RowDiff =
  | { kind: "changed"; key: string; before: string[]; after: string[]; changedColumns: number[] }
  | { kind: "removed"; key: string; before: string[] }
  | { kind: "added"; key: string; after: string[] };

export interface TableDiff {
  delimiter: string;
  /** Column names of the changed table (added columns included). */
  columns: string[];
  /** Column names of the original table. */
  columnsBefore: string[];
  columnsAdded: string[];
  columnsRemoved: string[];
  keyColumn: string | null;
  rows: RowDiff[];
  rowCountA: number;
  rowCountB: number;
}

/** Compare two delimited tables by header name, matching rows by a key column when possible. */
export function csvDiff(a: string, b: string): TableDiff {
  const delimiter = detectDelimiter(a) ?? detectDelimiter(b) ?? ",";
  const ra = parseDelimited(a.trim(), delimiter);
  const rb = parseDelimited(b.trim(), delimiter);
  const ha = ra[0] ?? [], hb = rb[0] ?? [];
  const da = ra.slice(1), db = rb.slice(1);

  const common = hb.filter((h) => ha.includes(h));
  const colA = common.map((h) => ha.indexOf(h));
  const colB = common.map((h) => hb.indexOf(h));
  const columnsAdded = hb.filter((h) => !ha.includes(h));
  const columnsRemoved = ha.filter((h) => !hb.includes(h));

  const changedCols = (x: string[], y: string[]) => {
    const out: number[] = [];
    common.forEach((_, i) => {
      if ((x[colA[i]] ?? "") !== (y[colB[i]] ?? "")) out.push(colB[i]);
    });
    return out;
  };

  const uniqueKey = (rows: string[][], col: number) => {
    const seen = new Set<string>();
    for (const r of rows) {
      const v = r[col];
      if (!v || seen.has(v)) return false;
      seen.add(v);
    }
    return true;
  };
  const key = ha[0] !== undefined && hb.includes(ha[0]) && uniqueKey(da, 0) && uniqueKey(db, hb.indexOf(ha[0])) ? ha[0] : null;

  const rows: RowDiff[] = [];
  if (key !== null) {
    const kb = hb.indexOf(key);
    const byKey = new Map(db.map((r) => [r[kb], r]));
    const seen = new Set<string>();
    for (const r of da) {
      const k = r[0];
      seen.add(k);
      const other = byKey.get(k);
      if (!other) rows.push({ kind: "removed", key: k, before: r });
      else {
        const cols = changedCols(r, other);
        if (cols.length) rows.push({ kind: "changed", key: k, before: r, after: other, changedColumns: cols });
      }
    }
    for (const r of db) if (!seen.has(r[kb])) rows.push({ kind: "added", key: r[kb], after: r });
  } else {
    const project = (r: string[], cols: number[]) => JSON.stringify(cols.map((c) => r[c] ?? ""));
    const ops = diffLineArrays(da.map((r) => project(r, colA)), db.map((r) => project(r, colB)), defaultOptions);
    for (const op of ops) {
      if (op.type !== "change") continue;
      const pairs = Math.min(op.a1 - op.a0, op.b1 - op.b0);
      for (let k = 0; k < pairs; k++) {
        const x = da[op.a0 + k], y = db[op.b0 + k];
        rows.push({ kind: "changed", key: `row ${op.b0 + k + 2}`, before: x, after: y, changedColumns: changedCols(x, y) });
      }
      for (let i = op.a0 + pairs; i < op.a1; i++) rows.push({ kind: "removed", key: `row ${i + 2}`, before: da[i] });
      for (let j = op.b0 + pairs; j < op.b1; j++) rows.push({ kind: "added", key: `row ${j + 2}`, after: db[j] });
    }
  }

  return { delimiter, columns: hb, columnsBefore: ha, columnsAdded, columnsRemoved, keyColumn: key, rows, rowCountA: da.length, rowCountB: db.length };
}
