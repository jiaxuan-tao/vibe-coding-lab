import LZString from "lz-string";
import { type CompareOptions, sanitizeOptions } from "./normalize";

export interface ShareState {
  l: string;
  r: string;
  ln?: string;
  rn?: string;
  lang?: string;
  o?: CompareOptions;
  view?: "split" | "unified";
}

const PREFIX = "v1:";

export function encodeShare(state: ShareState): string {
  return PREFIX + LZString.compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeShare(hash: string): ShareState | null {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!h.startsWith(PREFIX)) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(h.slice(PREFIX.length));
    if (!json) return null;
    const v = JSON.parse(json);
    if (!v || typeof v !== "object" || typeof v.l !== "string" || typeof v.r !== "string") return null;
    const s: ShareState = { l: v.l, r: v.r };
    if (typeof v.ln === "string") s.ln = v.ln;
    if (typeof v.rn === "string") s.rn = v.rn;
    if (typeof v.lang === "string") s.lang = v.lang;
    if (v.o !== undefined) s.o = sanitizeOptions(v.o);
    if (v.view === "split" || v.view === "unified") s.view = v.view;
    return s;
  } catch {
    return null;
  }
}
