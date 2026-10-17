import { describe, expect, it } from "vitest";
import { Chunk } from "@codemirror/merge";
import { Text } from "@codemirror/state";
import { makeDiffOverride } from "../src/merge-override";
import { defaultOptions } from "../src/normalize";

const chunks = (a: string, b: string, o = defaultOptions) =>
  Chunk.build(Text.of(a.split("\n")), Text.of(b.split("\n")), { override: makeDiffOverride(o) });

describe("makeDiffOverride", () => {
  it("hides lines that only differ by case when ignoring case", () => {
    expect(chunks("Hello\nworld", "hello\nworld", { ...defaultOptions, ignoreCase: true })).toHaveLength(0);
    expect(chunks("Hello\nworld", "hello\nworld", defaultOptions)).toHaveLength(1);
  });

  it("hides whitespace-only differences when ignoring whitespace", () => {
    expect(chunks("a  b\nc", "a b\nc  ", { ...defaultOptions, whitespace: "all" })).toHaveLength(0);
  });

  it("hides extra blank lines when ignoring blank lines", () => {
    expect(chunks("a\n\n\nb", "a\nb", { ...defaultOptions, ignoreBlankLines: true })).toHaveLength(0);
  });

  // When the options don't hide anything, blocks must match CodeMirror's own diff.
  const ranges = (cs: readonly Chunk[]) => cs.map((c) => [c.fromA, c.toA, c.fromB, c.toB]);
  const native = (a: string, b: string) => ranges(Chunk.build(Text.of(a.split("\n")), Text.of(b.split("\n"))));
  const opts = { ...defaultOptions, ignoreCase: true };

  it.each([
    ["changed line and appended line", "one\ntwo\nthree", "one\ntwo!\nthree\nfour"],
    ["inserted first line, deleted last line", "b\nc\nd", "a\nb\nc"],
    ["pure insertion in the middle", "a\nb\nc\nd\ne\nf", "a\nb\nc\nnew\nd\ne\nf"],
    ["pure deletion in the middle", "a\nb\nc\nold\nd\ne\nf", "a\nb\nc\nd\ne\nf"],
    ["everything replaced", "x\ny", "p\nq\nr"],
    ["empty original", "", "a\nb"],
  ])("matches native ranges: %s", (_name, a, b) => {
    expect(ranges(chunks(a, b, opts))).toEqual(native(a, b));
  });

  it("keeps character-level changes small in character mode", () => {
    const a = "the quick fox", b = "the quack fox";
    const build = (g: "word" | "char") =>
      Chunk.build(Text.of([a]), Text.of([b]), { override: makeDiffOverride(defaultOptions, g) })[0].changes.map((c) => [a.slice(c.fromA, c.toA), b.slice(c.fromB, c.toB)]);
    expect(build("char")).toEqual([["i", "a"]]);
    expect(build("word")).toEqual([["quick", "quack"]]);
  });

  it("keeps longer in-word changes precise in character mode", () => {
    const a = "prefix-abcdefgh-suffix", b = "prefix-aXYZWVUh-suffix";
    const cs = Chunk.build(Text.of([a]), Text.of([b]), { override: makeDiffOverride(defaultOptions, "char") })[0].changes;
    expect(cs.map((c) => [a.slice(c.fromA, c.toA), b.slice(c.fromB, c.toB)])).toEqual([["bcdefg", "XYZWVU"]]);
  });
});
