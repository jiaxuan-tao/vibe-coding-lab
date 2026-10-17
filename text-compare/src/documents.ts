import { decodeBytes } from "./files";
import { t } from "./i18n";

export type OpenedFile =
  | { kind: "text"; text: string; encoding: string; document: boolean }
  | { kind: "image"; file: File }
  | { kind: "error"; message: string };

const IMAGE = /\.(png|jpe?g|gif|webp|bmp|svg|avif|ico)$/i;

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE.test(file.name);
}

/** Read any supported file: plain text, PDF, Word, Excel or an image. */
export async function openAnyFile(file: File): Promise<OpenedFile> {
  if (isImageFile(file)) return { kind: "image", file };
  const name = file.name.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      const { extractPdf } = await import("./pdf");
      const text = await extractPdf(bytes);
      if (!text.trim()) return { kind: "error", message: t("{name} has no selectable text. It may be a scanned image.", { name: file.name }) };
      return { kind: "text", text, encoding: t("PDF text"), document: true };
    }
    if (name.endsWith(".docx")) {
      const { extractDocx } = await import("./office");
      return { kind: "text", text: extractDocx(bytes), encoding: t("Word text"), document: true };
    }
    if (name.endsWith(".xlsx")) {
      const { extractXlsx } = await import("./office");
      return { kind: "text", text: extractXlsx(bytes), encoding: t("Excel as CSV"), document: false };
    }
    if (/\.(doc|xls|ppt|pptx|odt|ods)$/.test(name))
      return { kind: "error", message: t("{name}: this format isn't supported. Save it as .docx, .xlsx, .pdf or text and try again.", { name: file.name }) };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? `${file.name}: ${t(e.message)}` : t("{name} couldn't be read.", { name: file.name }) };
  }
  const decoded = decodeBytes(bytes);
  if (!decoded) return { kind: "error", message: t("{name} looks like a binary file, not text.", { name: file.name }) };
  return { kind: "text", text: decoded.text, encoding: decoded.encoding === "UTF-8" ? "" : decoded.encoding, document: false };
}
