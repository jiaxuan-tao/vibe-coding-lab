function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

/** Pretty-print JSON with keys sorted at every depth. Throws on invalid JSON. */
export function formatJson(text: string): string {
  return JSON.stringify(sortKeys(JSON.parse(text)), null, 2) + "\n";
}
