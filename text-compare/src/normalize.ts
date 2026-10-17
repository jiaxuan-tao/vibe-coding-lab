export type WhitespaceMode = "none" | "trailing" | "all";

export interface CompareOptions {
  ignoreCase: boolean;
  whitespace: WhitespaceMode;
  ignoreBlankLines: boolean;
  /** Regular expressions (source text); matching text is treated as equal. */
  ignorePatterns: string[];
}

export const defaultOptions: CompareOptions = Object.freeze({
  ignoreCase: false,
  whitespace: "none",
  ignoreBlankLines: false,
  ignorePatterns: Object.freeze([]) as unknown as string[],
}) as CompareOptions;

/** Ready-made patterns offered in the options panel. */
export const ignorePresets = {
  timestamps: {
    label: "Dates and times",
    pattern:
      "\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2}(?:[.,]\\d+)?)?(?:Z|[+-]\\d{2}:?\\d{2})?)?|\\b\\d{1,2}:\\d{2}(?::\\d{2}(?:[.,]\\d+)?)?(?:\\s?[AaPp][Mm])?\\b",
  },
  guids: {
    label: "GUIDs / UUIDs",
    pattern: "\\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\b",
  },
  hex: { label: "Hex values like 0x1F", pattern: "\\b0[xX][0-9a-fA-F]+\\b" },
  numbers: { label: "All numbers", pattern: "-?\\d+(?:[.,]\\d+)*" },
} as const;

export interface LineInfo {
  /** Line content without the line break (and without a trailing \r). */
  text: string;
  /** Offset of the first character of the line. */
  start: number;
  /** Offset just past the line content (before \r\n or \n). */
  end: number;
}

export function splitLines(text: string): LineInfo[] {
  const lines: LineInfo[] = [];
  let start = 0;
  for (;;) {
    const nl = text.indexOf("\n", start);
    const stop = nl === -1 ? text.length : nl;
    const end = stop > start && text.charCodeAt(stop - 1) === 13 ? stop - 1 : stop;
    lines.push({ text: text.slice(start, end), start, end });
    if (nl === -1) return lines;
    start = nl + 1;
  }
}

let patternCache: { key: string; regexes: RegExp[]; errors: string[] } | null = null;

/** Compile pattern sources, skipping (and reporting) invalid ones. */
export function compilePatterns(sources: readonly string[]): { regexes: RegExp[]; errors: string[] } {
  const key = sources.join("\u0000");
  if (patternCache?.key === key) return patternCache;
  const regexes: RegExp[] = [];
  const errors: string[] = [];
  for (const src of sources) {
    if (!src) continue;
    try {
      const re = new RegExp(src, "g");
      if (re.test("")) continue; // a pattern that matches nothing-at-all would erase everything
      regexes.push(re);
    } catch {
      errors.push(src);
    }
  }
  patternCache = { key, regexes, errors };
  return patternCache;
}

export function normalizeLine(line: string, opts: CompareOptions): string {
  let s = line;
  if (opts.ignorePatterns.length) {
    for (const re of compilePatterns(opts.ignorePatterns).regexes) s = s.replace(re, "\u0001");
  }
  if (opts.whitespace === "all") s = s.replace(/\s+/g, "");
  else if (opts.whitespace === "trailing") s = s.replace(/\s+$/, "");
  if (opts.ignoreCase) s = s.toLowerCase();
  return s;
}

export function isBlank(line: string): boolean {
  return line.trim() === "";
}

export function hasActiveOptions(opts: CompareOptions): boolean {
  return opts.ignoreCase || opts.whitespace !== "none" || opts.ignoreBlankLines || opts.ignorePatterns.length > 0;
}

export function sanitizeOptions(value: unknown): CompareOptions {
  const v = (value ?? {}) as Partial<CompareOptions>;
  return {
    ignoreCase: v.ignoreCase === true,
    whitespace: v.whitespace === "trailing" || v.whitespace === "all" ? v.whitespace : "none",
    ignoreBlankLines: v.ignoreBlankLines === true,
    ignorePatterns: Array.isArray(v.ignorePatterns)
      ? v.ignorePatterns.filter((p): p is string => typeof p === "string" && p.length > 0).slice(0, 50)
      : [],
  };
}
