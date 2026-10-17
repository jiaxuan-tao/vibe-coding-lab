import { describe, expect, it } from "vitest";
import { formatJson } from "../src/format";

describe("formatJson", () => {
  it("pretty-prints with sorted keys at every depth", () => {
    expect(formatJson('{"b":1,"a":{"d":[{"z":1,"y":2}],"c":null}}')).toBe(
      '{\n  "a": {\n    "c": null,\n    "d": [\n      {\n        "y": 2,\n        "z": 1\n      }\n    ]\n  },\n  "b": 1\n}\n',
    );
  });

  it("throws on invalid JSON", () => {
    expect(() => formatJson("{nope")).toThrow();
  });
});
