import { describe, expect, it } from "vitest";
import { diffPixels } from "../src/pixeldiff";

const px = (...rgba: number[][]) => new Uint8ClampedArray(rgba.flat());

describe("diffPixels", () => {
  it("counts pixels that differ beyond the threshold", () => {
    const a = px([0, 0, 0, 255], [100, 100, 100, 255], [10, 10, 10, 255]);
    const b = px([0, 0, 0, 255], [200, 100, 100, 255], [14, 10, 10, 255]);
    const { changed, out } = diffPixels(a, b, 3, 1, 0.1);
    expect(changed).toBe(1);
    expect(Array.from(out.slice(4, 8))).toEqual([255, 0, 170, 255]);
    expect(out[3]).toBe(255);
  });

  it("treats a transparent vs opaque pixel as a change", () => {
    expect(diffPixels(px([0, 0, 0, 0]), px([0, 0, 0, 255]), 1, 1).changed).toBe(1);
  });
});
