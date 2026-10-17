import { strFromU8, unzipSync } from "fflate";
import { t } from "./i18n";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e] ?? m;
  });
}

function read(files: Record<string, Uint8Array>, name: string): string | null {
  const f = files[name];
  return f ? strFromU8(f) : null;
}

function unzip(bytes: Uint8Array, what: string): Record<string, Uint8Array> {
  try {
    return unzipSync(bytes);
  } catch {
    throw new Error(t("This file isn't a valid {format}.", { format: t(what) }));
  }
}

/** Plain text of a .docx: one line per paragraph. */
export function extractDocx(bytes: Uint8Array): string {
  const files = unzip(bytes, "Word document");
  const xml = read(files, "word/document.xml");
  if (!xml) throw new Error(t("This file isn't a Word document (.docx)."));
  const body = xml.replace(/<w:p\b[^>]*\/>/g, "<w:p></w:p>");
  const paragraphs = body.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) ?? [];
  const lines = paragraphs.map((p) =>
    decodeXml(
      p
        .replace(/<w:tab\/>/g, "\t")
        .replace(/<w:(br|cr)\b[^>]*\/>/g, "\n")
        .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g, "\u0002$1\u0003")
        .replace(/<[^>]+>/g, "")
        .replace(/\u0002|\u0003/g, ""),
    ),
  );
  return lines.join("\n") + "\n";
}

function columnIndex(ref: string): number {
  const letters = ref.replace(/\d+$/, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function csvField(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** An .xlsx workbook as CSV. Several sheets are labelled "# Sheet: name". */
export function extractXlsx(bytes: Uint8Array): string {
  const files = unzip(bytes, "Excel workbook");
  const workbook = read(files, "xl/workbook.xml");
  if (!workbook) throw new Error(t("This file isn't an Excel workbook (.xlsx)."));

  const shared = (read(files, "xl/sharedStrings.xml")?.match(/<si\b[^>]*>[\s\S]*?<\/si>/g) ?? []).map((si) =>
    decodeXml((si.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join("")),
  );
  const rels = new Map<string, string>();
  for (const m of (read(files, "xl/_rels/workbook.xml.rels") ?? "").matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) rels.set(id, target.replace(/^\/?(xl\/)?/, "xl/"));
  }
  const sheets = Array.from(workbook.matchAll(/<sheet\b[^>]*>/g)).map((m, i) => ({
    name: decodeXml(/name="([^"]*)"/.exec(m[0])?.[1] ?? `Sheet${i + 1}`),
    path: rels.get(/r:id="([^"]+)"/.exec(m[0])?.[1] ?? "") ?? `xl/worksheets/sheet${i + 1}.xml`,
  }));

  const renderSheet = (xml: string) => {
    const grid: string[][] = [];
    let width = 0;
    for (const row of xml.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) ?? []) {
      const r = Number(/\br="(\d+)"/.exec(row)?.[1] ?? grid.length + 1) - 1;
      const cells: string[] = [];
      let next = 0;
      for (const c of row.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) ?? []) {
        const ref = /\br="([A-Z]+\d+)"/.exec(c)?.[1];
        const col = ref ? columnIndex(ref) : next;
        next = col + 1;
        const type = /\bt="(\w+)"/.exec(c)?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(c)?.[1];
        let value = "";
        if (type === "s" && v !== undefined) value = shared[Number(v)] ?? "";
        else if (type === "inlineStr") value = decodeXml((c.match(/<t\b[^>]*>([\s\S]*?)<\/t>/g) ?? []).map((t) => t.replace(/<[^>]+>/g, "")).join(""));
        else if (type === "b") value = v === "1" ? "TRUE" : "FALSE";
        else if (v !== undefined) value = decodeXml(v);
        cells[col] = value;
      }
      grid[r] = cells;
      width = Math.max(width, cells.length);
    }
    const lines: string[] = [];
    for (let r = 0; r < grid.length; r++) {
      const cells = grid[r] ?? [];
      lines.push(Array.from({ length: width }, (_, c) => csvField(cells[c] ?? "")).join(","));
    }
    return lines.join("\n") + "\n";
  };

  const rendered = sheets.map((s) => ({ name: s.name, csv: renderSheet(read(files, s.path) ?? "") }));
  if (rendered.length === 1) return rendered[0].csv;
  return rendered.map((s) => `# Sheet: ${s.name}\n${s.csv}`).join("\n");
}
