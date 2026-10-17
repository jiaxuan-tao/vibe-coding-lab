import type { RevertDirection, ViewMode } from "./editor";
import { type CompareOptions, defaultOptions, sanitizeOptions } from "./normalize";
import type { Granularity } from "./worddiff";

export type ThemePref = "system" | "light" | "dark";

export interface Prefs {
  view: ViewMode;
  /** Show the structured Data view instead of the editors. */
  data: boolean;
  granularity: Granularity;
  moves: boolean;
  /** Document mode: wrapped, proportional text for prose. */
  prose: boolean;
  options: CompareOptions;
  collapse: boolean;
  wrap: boolean;
  revert: RevertDirection;
  theme: ThemePref;
  /** Language picker value: "" = auto-detect, "none" = plain text, else a language name. */
  lang: string;
  remember: boolean;
  /** Keep a history of comparisons in the library. */
  history: boolean;
}

export interface SavedDocs {
  a: string;
  b: string;
  nameA: string;
  nameB: string;
}

const PREFS_KEY = "vcl.text-compare:prefs";
const DOCS_KEY = "vcl.text-compare:docs";

export const defaultPrefs: Prefs = {
  view: "split",
  data: false,
  granularity: "word",
  moves: true,
  prose: false,
  options: { ...defaultOptions },
  collapse: false,
  wrap: false,
  revert: "a-to-b",
  theme: "system",
  lang: "",
  remember: false,
  history: true,
};

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: preferences just won't persist */
  }
}

export function loadPrefs(): Prefs {
  const v = (read(PREFS_KEY) ?? {}) as Partial<Prefs>;
  return {
    view: v.view === "unified" ? "unified" : "split",
    data: v.data === true,
    granularity: v.granularity === "char" ? "char" : "word",
    moves: v.moves !== false,
    prose: v.prose === true,
    options: sanitizeOptions(v.options),
    collapse: v.collapse === true,
    wrap: v.wrap === true,
    revert: v.revert === "b-to-a" ? "b-to-a" : "a-to-b",
    theme: v.theme === "light" || v.theme === "dark" ? v.theme : "system",
    lang: typeof v.lang === "string" ? v.lang : "",
    remember: v.remember === true,
    history: v.history !== false,
  };
}

export function savePrefs(p: Prefs): void {
  write(PREFS_KEY, p);
}

export function loadDocs(): SavedDocs | null {
  const v = read(DOCS_KEY) as Partial<SavedDocs> | null;
  if (!v || typeof v.a !== "string" || typeof v.b !== "string") return null;
  return { a: v.a, b: v.b, nameA: String(v.nameA ?? ""), nameB: String(v.nameB ?? "") };
}

export function saveDocs(d: SavedDocs | null): void {
  write(DOCS_KEY, d);
}
