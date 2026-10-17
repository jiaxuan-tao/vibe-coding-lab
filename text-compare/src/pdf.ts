import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

/** Text of a PDF, page by page, with a blank line between pages. */
export async function extractPdf(bytes: Uint8Array): Promise<string> {
  const task = getDocument({ data: bytes, useSystemFonts: true });
  const doc = await task.promise;
  try {
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (!("str" in item)) continue;
        text += item.str;
        if (item.hasEOL) text += "\n";
      }
      pages.push(text.replace(/[ \t]+\n/g, "\n").trimEnd());
      page.cleanup();
    }
    return pages.join("\n\n") + "\n";
  } finally {
    await task.destroy();
  }
}
