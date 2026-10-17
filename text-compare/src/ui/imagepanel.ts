import { diffPixels } from "../pixeldiff";
import { t, onLocaleChange } from "../i18n";

export type ImageMode = "side" | "slider" | "onion" | "diff";
type Side = "a" | "b";

interface Loaded {
  url: string;
  name: string;
  size: number;
  img: HTMLImageElement;
}

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** Side by side, slider, onion skin and pixel-difference views for two images. */
export class ImagePanel {
  private images: Partial<Record<Side, Loaded>> = {};
  private operations: Record<Side, number> = { a: 0, b: 0 };
  private mode: ImageMode = "side";
  private opacity = 0.5;
  private split = 0.5;
  private diffCache: { key: string; canvas: HTMLCanvasElement; ratio: number } | null = null;

  constructor(private stage: HTMLElement, private info: HTMLElement) {
    onLocaleChange(() => { if (!this.isEmpty) this.render(); });
  }

  /** Both sides have an image. */
  get complete(): boolean {
    return !!(this.images.a && this.images.b);
  }

  get isEmpty(): boolean {
    return !this.images.a && !this.images.b;
  }

  async set(side: Side, file: File, isCurrent = () => true): Promise<boolean> {
    const operation = ++this.operations[side];
    const current = () => this.operations[side] === operation && isCurrent();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      if (!current()) return false;
      throw new Error(t("{name} couldn't be opened as an image.", { name: file.name }));
    }
    if (!current()) {
      URL.revokeObjectURL(url);
      return false;
    }
    if (this.images[side]) URL.revokeObjectURL(this.images[side]!.url);
    this.images[side] = { url, name: file.name, size: file.size, img };
    this.diffCache = null;
    this.render();
    return true;
  }

  clear(): void {
    this.operations.a++;
    this.operations.b++;
    for (const s of ["a", "b"] as const) if (this.images[s]) URL.revokeObjectURL(this.images[s]!.url);
    this.images = {};
    this.diffCache = null;
    this.stage.replaceChildren();
    this.info.textContent = "";
  }

  swap(): void {
    this.operations.a++;
    this.operations.b++;
    [this.images.a, this.images.b] = [this.images.b, this.images.a];
    this.diffCache = null;
    this.render();
  }

  setMode(mode: ImageMode): void {
    this.mode = mode;
    this.render();
  }

  setOpacity(v: number): void {
    this.opacity = v;
    const top = this.stage.querySelector<HTMLElement>(".onion-top");
    if (top) top.style.opacity = String(v);
  }

  render(): void {
    const { a, b } = this.images;
    this.renderInfo();
    this.stage.hidden = false;
    if (this.mode === "side" || !a || !b) {
      this.stage.replaceChildren(this.figure("a"), this.figure("b"));
      this.stage.className = "img-stage side";
      return;
    }
    const w = Math.max(a.img.naturalWidth, b.img.naturalWidth);
    const h = Math.max(a.img.naturalHeight, b.img.naturalHeight);
    const frame = document.createElement("div");
    frame.className = "img-frame";
    frame.style.aspectRatio = `${w} / ${h}`;
    frame.style.maxWidth = `min(100%, ${w}px)`;
    const layer = (src: Loaded, cls: string) => {
      const el = document.createElement("img");
      el.src = src.url;
      el.alt = src.name;
      el.className = cls;
      el.style.width = `${(src.img.naturalWidth / w) * 100}%`;
      return el;
    };
    this.stage.className = `img-stage ${this.mode}`;

    if (this.mode === "slider") {
      const under = layer(b, "layer");
      const over = layer(a, "layer slider-top");
      const handle = document.createElement("input");
      handle.type = "range";
      handle.min = "0";
      handle.max = "1000";
      handle.value = String(this.split * 1000);
      handle.className = "slider-handle";
      handle.setAttribute("aria-label", t("Slide between original and changed"));
      const line = document.createElement("div");
      line.className = "slider-line";
      const apply = () => {
        this.split = Number(handle.value) / 1000;
        over.style.clipPath = `inset(0 ${(1 - this.split) * 100}% 0 0)`;
        line.style.left = `${this.split * 100}%`;
      };
      handle.addEventListener("input", apply);
      apply();
      frame.append(under, over, line, handle);
    } else if (this.mode === "onion") {
      const top = layer(b, "layer onion-top");
      top.style.opacity = String(this.opacity);
      frame.append(layer(a, "layer"), top);
    } else {
      const { canvas } = this.computeDiff(a, b, w, h);
      canvas.className = "layer";
      frame.append(canvas);
    }
    this.stage.replaceChildren(frame);
  }

  private computeDiff(a: Loaded, b: Loaded, w: number, h: number) {
    const key = `${a.url}|${b.url}`;
    if (this.diffCache?.key === key) return this.diffCache;
    const draw = (src: Loaded) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(src.img, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const { out, changed } = diffPixels(draw(a), draw(b), w, h, 0.1);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(out), w, h), 0, 0);
    this.diffCache = { key, canvas, ratio: changed / (w * h) };
    this.renderInfo();
    return this.diffCache;
  }

  private figure(side: Side): HTMLElement {
    const fig = document.createElement("figure");
    fig.className = `img-figure side-${side}`;
    const item = this.images[side];
    if (item) {
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = item.name;
      fig.append(img);
    } else {
      const empty = document.createElement("div");
      empty.className = "img-empty";
      empty.textContent = t(side === "a" ? "Drop an image here or use Open file to add the original image" : "Drop an image here or use Open file to add the changed image");
      fig.append(empty);
    }
    const cap = document.createElement("figcaption");
    cap.textContent = item ? `${item.name}, ${item.img.naturalWidth}×${item.img.naturalHeight}, ${kb(item.size)}` : t(side === "a" ? "Original" : "Changed");
    fig.append(cap);
    return fig;
  }

  private renderInfo(): void {
    const { a, b } = this.images;
    if (!a || !b) {
      this.info.textContent = t("Add an image to both sides to compare them.");
      return;
    }
    const parts: string[] = [];
    const sameSize = a.img.naturalWidth === b.img.naturalWidth && a.img.naturalHeight === b.img.naturalHeight;
    const sizeA = `${a.img.naturalWidth}×${a.img.naturalHeight}`, sizeB = `${b.img.naturalWidth}×${b.img.naturalHeight}`;
    parts.push(sameSize ? t("Both {size}", { size: sizeA }) : t("Sizes differ: {sizeA} and {sizeB}", { sizeA, sizeB }));
    if (this.diffCache) {
      const pct = this.diffCache.ratio * 100;
      parts.push(pct === 0 ? t("pixels identical") : t("{percent}% of pixels differ", { percent: pct < 0.1 ? "<0.1" : pct.toFixed(1) }));
    }
    this.info.textContent = parts.join(", ");
  }
}
