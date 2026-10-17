import { diffLineArrays, diffStats } from "./diff-core";
import { type CompareOptions, splitLines } from "./normalize";
import { type Granularity, intraChanges } from "./worddiff";
import { t, getLocale } from "./i18n";

export interface ReportInput {
  a: string;
  b: string;
  nameA: string;
  nameB: string;
  options: CompareOptions;
  granularity: Granularity;
  date: Date;
}

const CONTEXT = 3;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Wrap the given ranges of `text` in <tag>, returning one HTML string per line. */
function markLines(text: string, ranges: Array<[number, number]>, tag: "del" | "ins"): string[] {
  const lines: string[] = [""];
  let pos = 0;
  const emit = (s: string, marked: boolean) => {
    s.split("\n").forEach((part, i) => {
      if (i > 0) lines.push("");
      if (part) lines[lines.length - 1] += marked ? `<${tag}>${esc(part)}</${tag}>` : esc(part);
    });
  };
  for (const [from, to] of ranges) {
    if (from > pos) emit(text.slice(pos, from), false);
    if (to > from) emit(text.slice(from, to), true);
    pos = Math.max(pos, to);
  }
  emit(text.slice(pos), false);
  return lines;
}

/** A self-contained HTML redline of the differences, ready to save, send or print. */
export function buildReport(input: ReportInput): string {
  const { a, b, options } = input;
  const la = a === "" ? [] : splitLines(a).map((l) => l.text);
  const lb = b === "" ? [] : splitLines(b).map((l) => l.text);
  const ops = diffLineArrays(la, lb, options);
  const stats = diffStats(a, b, options);

  const rows: string[] = [];
  const line = (cls: string, na: number | "", nb: number | "", sign: string, html: string) =>
    rows.push(`<tr class="${cls}"><td class="n">${na}</td><td class="n">${nb}</td><td class="s">${sign}</td><td class="t">${html || "&nbsp;"}</td></tr>`);

  ops.forEach((op, index) => {
    if (op.type === "equal") {
      const len = op.a1 - op.a0;
      const showHead = index === 0 ? 0 : CONTEXT;
      const showTail = index === ops.length - 1 ? 0 : CONTEXT;
      const eq = (k: number) => line("eq", op.a0 + k + 1, op.b0 + k + 1, "", esc(la[op.a0 + k]));
      if (len <= showHead + showTail + 1) {
        for (let k = 0; k < len; k++) eq(k);
        return;
      }
      for (let k = 0; k < showHead; k++) eq(k);
      const hidden = len - showHead - showTail;
      rows.push(`<tr class="gap"><td colspan="4">${esc(t("{count} unchanged lines", { count: hidden.toLocaleString(getLocale()) }))}</td></tr>`);
      for (let k = len - showTail; k < len; k++) eq(k);
      return;
    }
    const textA = la.slice(op.a0, op.a1).join("\n");
    const textB = lb.slice(op.b0, op.b1).join("\n");
    let htmlA: string[], htmlB: string[];
    if (op.a0 < op.a1 && op.b0 < op.b1) {
      const changes = intraChanges(textA, textB, input.granularity);
      htmlA = markLines(textA, changes.map((c) => [c.fromA, c.toA]), "del");
      htmlB = markLines(textB, changes.map((c) => [c.fromB, c.toB]), "ins");
    } else {
      htmlA = markLines(textA, [], "del");
      htmlB = markLines(textB, [], "ins");
    }
    for (let k = op.a0; k < op.a1; k++) line("del", k + 1, "", "&minus;", htmlA[k - op.a0]);
    for (let k = op.b0; k < op.b1; k++) line("ins", "", k + 1, "+", htmlB[k - op.b0]);
  });

  const nameA = input.nameA || t("Original");
  const nameB = input.nameB || t("Changed");
  const when = input.date.toLocaleString(getLocale() === "en" ? "en-US" : getLocale(), { dateStyle: "long", timeStyle: "short" });
  const pct = Math.round(stats.similarity * 100);
  const summary = stats.identical
    ? t("No differences.")
    : t("{added} lines added, {removed} removed, in {blocks} {places}. {percent}% of lines unchanged.", {
      added: stats.added.toLocaleString(getLocale()), removed: stats.removed.toLocaleString(getLocale()),
      blocks: stats.blocks.toLocaleString(getLocale()), places: t(stats.blocks === 1 ? "place" : "places"), percent: pct === 100 ? ">99" : pct,
    });

  return `<!doctype html>
<html lang="${getLocale()}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t("Comparison: {nameA} and {nameB}", { nameA, nameB }))}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 32px auto; max-width: 1100px; padding: 0 20px; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #18202e; background: #fff; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #566173; margin: 0 0 4px; }
  .summary { margin: 12px 0 20px; font-weight: 600; }
  .legend { color: #566173; font-size: 13px; margin-bottom: 12px; }
  .legend del, .legend ins { padding: 0 4px; }
  table { width: 100%; border-collapse: collapse; font: 12.5px/1.55 ui-monospace, "Cascadia Code", Consolas, monospace; border: 1px solid #dde2ea; }
  td { vertical-align: top; padding: 0 8px; }
  td.n { width: 1%; color: #98a1b0; text-align: right; white-space: nowrap; user-select: none; border-right: 1px solid #eef1f5; }
  td.s { width: 1%; color: #98a1b0; padding: 0 4px; user-select: none; }
  td.t { white-space: pre-wrap; word-break: break-word; }
  tr.del { background: #fdecee; }
  tr.ins { background: #e3f6ec; }
  tr.del td.s { color: #d23a4c; font-weight: 700; }
  tr.ins td.s { color: #1a9c63; font-weight: 700; }
  del { background: #f7b8c0; color: #7a1020; text-decoration: line-through; text-decoration-thickness: 1px; border-radius: 2px; }
  ins { background: #a8e6c5; color: #064d2c; text-decoration: none; border-radius: 2px; }
  tr.gap td { background: #f1f4f8; color: #566173; text-align: center; font: 12px system-ui, sans-serif; padding: 4px; border-block: 1px dashed #dde2ea; }
  footer { margin-top: 20px; color: #98a1b0; font-size: 12px; }
  @media print { body { margin: 0; max-width: none; } tr { break-inside: avoid; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<h1>${esc(t("{nameA} compared with {nameB}", { nameA, nameB }))}</h1>
<p class="meta">${esc(when)}</p>
<p class="summary">${esc(summary)}</p>
${stats.identical ? "" : `<p class="legend"><del>${esc(t("removed text"))}</del> <ins>${esc(t("added text"))}</ins></p>
<table>
${rows.join("\n")}
</table>`}
<footer>${esc(t("Made with text.compare"))}</footer>
</body>
</html>
`;
}
