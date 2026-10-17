import { describe, expect, it } from "vitest";
import { intraChanges, tokenize } from "../src/worddiff";

const show = (a: string, b: string, g: "word" | "char") =>
  intraChanges(a, b, g).map((c) => [a.slice(c.fromA, c.toA), b.slice(c.fromB, c.toB)]);

describe("tokenize", () => {
  it("splits words, spaces and punctuation", () => {
    expect(tokenize("Hi, you  there_1!")).toEqual(["Hi", ",", " ", "you", "  ", "there_1", "!"]);
  });

  it("keeps accented and non-Latin letters inside words", () => {
    expect(tokenize("café 日本")).toEqual(["café", " ", "日本"]);
  });
});

describe("intraChanges", () => {
  it("highlights whole words in word mode", () => {
    expect(show("the quick brown fox", "the quack brown fox", "word")).toEqual([["quick", "quack"]]);
  });

  it("highlights single characters in character mode", () => {
    expect(show("the quick brown fox", "the quack brown fox", "char")).toEqual([["i", "a"]]);
  });

  it("reports pure insertions and deletions", () => {
    expect(show("a b", "a new b", "word")).toEqual([["", "new "]]);
    expect(show("a old b", "a b", "word")).toEqual([["old ", ""]]);
  });

  it("does not split emoji surrogate pairs in character mode", () => {
    const [c] = intraChanges("x👋y", "x🎉y", "char");
    expect(c).toMatchObject({ fromA: 1, toA: 3, fromB: 1, toB: 3 });
  });
});
