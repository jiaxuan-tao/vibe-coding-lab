import { languages } from "@codemirror/language-data";
import { LanguageDescription } from "@codemirror/language";

/** Names shown first in the language picker. */
export const commonLanguages = [
  "JavaScript", "TypeScript", "JSX", "TSX", "JSON", "HTML", "CSS", "Markdown", "Python", "SQL",
  "YAML", "XML", "C#", "Java", "Go", "Rust", "C++", "C", "PHP", "Ruby", "Shell", "PowerShell",
];

export function allLanguageNames(): string[] {
  return languages.map((l) => l.name).sort((x, y) => x.localeCompare(y));
}

export function findLanguage(name: string | null | undefined): LanguageDescription | null {
  if (!name) return null;
  return languages.find((l) => l.name === name) ?? null;
}

/** Best guess at a language: from the file name, then from the content. */
export function detectLanguage(fileName: string | undefined, text: string): string | null {
  if (fileName) {
    const byName = LanguageDescription.matchFilename(languages, fileName);
    if (byName) return byName.name;
  }
  return guessFromContent(text);
}

function guessFromContent(raw: string): string | null {
  const t = raw.slice(0, 20000).trim();
  if (!t) return null;
  if (/^[[{]/.test(t)) {
    try {
      JSON.parse(t);
      return "JSON";
    } catch {
      /* not JSON */
    }
  }
  if (/^<\?xml\b/i.test(t)) return "XML";
  if (/^<!doctype html|<html[\s>]|<(div|head|body|script|p|span)[\s>]/i.test(t)) return "HTML";
  if (/^<[a-z][\w:-]*[\s>/]/i.test(t) && /<\/[a-z][\w:-]*>|\/>/i.test(t)) return "XML";
  if (/^#!.*\b(bash|sh|zsh)\b/.test(t)) return "Shell";
  if (/^#!.*\bpython/.test(t)) return "Python";
  if (/^\s*(def|class) \w+.*:\s*$/m.test(t) || /^\s*(from \w[\w.]* )?import \w+/m.test(t) && /:\s*$/m.test(t)) return "Python";
  if (/^\s*using System|\bnamespace [\w.]+\s*[{;]|\bpublic (partial |static )?class \w+/m.test(t)) return "C#";
  if (/^package \w+\s*$/m.test(t) && /\bfunc \w*\(/.test(t)) return "Go";
  if (/\bfn \w+\s*\(|\blet mut \b|\bimpl\b.*\{/.test(t)) return "Rust";
  if (/^\s*(select|insert into|update|delete from|create table|alter table|with)\b[\s\S]*\b(from|values|set|table|as)\b/i.test(t)) return "SQL";
  if (/\b(interface|type) \w+\s*[={]|:\s*(string|number|boolean)\b/.test(t) && /\b(const|let|function|export)\b/.test(t)) return "TypeScript";
  if (/\b(const|let|var|function)\b[\s\S]*(=>|\(|=)/.test(t) && /[;{}]/.test(t)) return "JavaScript";
  if (/^[\w.#:\[\]*>~+ -]+\{[^}]*:[^}]*;?[^}]*\}/m.test(t) && !/\bfunction\b/.test(t)) return "CSS";
  if (/^#{1,6} \S/m.test(t) || /\[[^\]]+\]\([^)]+\)/.test(t) || /^```/m.test(t)) return "Markdown";
  const yamlLines = t.split("\n").filter((l) => /^\s*(- )?[\w"'-]+:(\s|$)/.test(l) || /^\s*- /.test(l)).length;
  if (yamlLines >= 2 && !/[{};]/.test(t)) return "YAML";
  return null;
}
