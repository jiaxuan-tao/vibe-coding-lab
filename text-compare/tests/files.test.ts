import { describe, expect, it } from "vitest";
import { decodeBytes } from "../src/files";

const bytes = (...n: number[]) => new Uint8Array(n);

describe("decodeBytes", () => {
  it("decodes UTF-8 and strips a BOM", () => {
    const enc = new TextEncoder().encode("héllo");
    expect(decodeBytes(enc)).toEqual({ text: "héllo", encoding: "UTF-8" });
    expect(decodeBytes(new Uint8Array([0xef, 0xbb, 0xbf, ...enc]))).toEqual({ text: "héllo", encoding: "UTF-8 (BOM)" });
  });

  it("decodes UTF-16 LE with a BOM", () => {
    expect(decodeBytes(bytes(0xff, 0xfe, 0x68, 0x00, 0x69, 0x00))).toEqual({ text: "hi", encoding: "UTF-16 LE" });
  });

  it("falls back to Windows-1252 for invalid UTF-8", () => {
    expect(decodeBytes(bytes(0x63, 0x61, 0x66, 0xe9))).toEqual({ text: "café", encoding: "Windows-1252" });
  });

  it("rejects binary files", () => {
    expect(decodeBytes(bytes(0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x01))).toBeNull();
  });
});
