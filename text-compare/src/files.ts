export interface DecodedText {
  text: string;
  encoding: string;
}

/** Decode file bytes as text. Returns null when the bytes look binary. */
export function decodeBytes(bytes: Uint8Array): DecodedText | null {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
    return { text: new TextDecoder("utf-8").decode(bytes.subarray(3)), encoding: "UTF-8 (BOM)" };
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), encoding: "UTF-16 LE" };
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), encoding: "UTF-16 BE" };

  const sample = bytes.subarray(0, 8192);
  if (sample.includes(0)) return null;

  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "UTF-8" };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "Windows-1252" };
  }
}

export async function readTextFile(file: File): Promise<DecodedText | null> {
  return decodeBytes(new Uint8Array(await file.arrayBuffer()));
}

export function downloadText(name: string, text: string, type = "text/plain"): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
