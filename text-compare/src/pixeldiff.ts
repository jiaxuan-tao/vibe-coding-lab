/**
 * Compare two RGBA buffers of the same size. Changed pixels are painted
 * magenta in `out`; unchanged ones are a faded grey copy of the original.
 */
export function diffPixels(
  a: Uint8ClampedArray, b: Uint8ClampedArray, width: number, height: number, threshold = 0.1,
): { out: Uint8ClampedArray; changed: number } {
  const out = new Uint8ClampedArray(width * height * 4);
  const limit = threshold * 255;
  let changed = 0;
  for (let i = 0; i < out.length; i += 4) {
    const d = Math.max(
      Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]),
    );
    if (d > limit) {
      changed++;
      out[i] = 255;
      out[i + 1] = 0;
      out[i + 2] = 170;
    } else {
      const alpha = a[i + 3] / 255;
      const luma = (0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]) * alpha + 255 * (1 - alpha);
      const faded = 255 - (255 - luma) * 0.25;
      out[i] = out[i + 1] = out[i + 2] = faded;
    }
    out[i + 3] = 255;
  }
  return { out, changed };
}
