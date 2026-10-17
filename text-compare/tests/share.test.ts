import { describe, expect, it } from "vitest";
import LZString from "lz-string";
import { decodeShare, encodeShare } from "../src/share";
import { defaultOptions } from "../src/normalize";

describe("share links", () => {
  it("round-trips unicode, emoji and options", () => {
    const state = {
      l: "héllo 👋\r\nworld",
      r: "日本語\n",
      ln: "a.txt",
      rn: "b.txt",
      lang: "JSON",
      o: { ...defaultOptions, ignoreCase: true },
      view: "unified" as const,
    };
    const hash = encodeShare(state);
    expect(hash.startsWith("v1:")).toBe(true);
    expect(decodeShare("#" + hash)).toEqual(state);
  });

  it("returns null for damaged or foreign hashes", () => {
    expect(decodeShare("#v1:!!!")).toBeNull();
    expect(decodeShare("#v9:abc")).toBeNull();
    expect(decodeShare("")).toBeNull();
    expect(decodeShare("#section-2")).toBeNull();
  });

  it("rejects payloads with the wrong shape", () => {
    const wrong = LZString.compressToEncodedURIComponent(JSON.stringify({ l: 5 }));
    expect(decodeShare("#v1:" + wrong)).toBeNull();
  });
});
