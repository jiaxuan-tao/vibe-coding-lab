import { describe, expect, it } from "vitest";
import { detectLanguage } from "../src/lang";

describe("detectLanguage", () => {
  it("uses the file name first", () => {
    expect(detectLanguage("main.py", "")).toBe("Python");
    expect(detectLanguage("App.tsx", "")).toBe("TSX");
    expect(detectLanguage("Program.cs", "")).toBe("C#");
  });

  it("guesses from content", () => {
    expect(detectLanguage(undefined, '{"a": 1, "b": [true]}')).toBe("JSON");
    expect(detectLanguage(undefined, "<!doctype html>\n<html><body></body></html>")).toBe("HTML");
    expect(detectLanguage(undefined, '<?xml version="1.0"?>\n<a/>')).toBe("XML");
    expect(detectLanguage(undefined, "def foo(x):\n    return x\n")).toBe("Python");
    expect(detectLanguage(undefined, "SELECT id, name FROM users WHERE id = 1;")).toBe("SQL");
    expect(detectLanguage(undefined, "# Title\n\nSome *text* and a [link](x).")).toBe("Markdown");
    expect(detectLanguage(undefined, "const x = () => 1;\nfunction y() {}")).toBe("JavaScript");
    expect(detectLanguage(undefined, "name: app\nversion: 2\nitems:\n  - a\n")).toBe("YAML");
  });

  it("returns null for plain prose", () => {
    expect(detectLanguage(undefined, "Dear team, the meeting moved to Tuesday.")).toBeNull();
  });
});
