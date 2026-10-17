import type { ChunkMark } from "../editor";
import { t } from "../i18n";

/** The strip beside the editor that shows where every change is. */
export function renderChangeMap(
  el: HTMLElement,
  marks: ChunkMark[],
  current: number,
  onPick: (index: number) => void,
): void {
  el.replaceChildren(
    ...marks.map((m, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `mark mark-${m.kind}${i === current ? " current" : ""}`;
      b.style.top = `${(m.top * 100).toFixed(3)}%`;
      b.style.height = `max(3px, ${(m.height * 100).toFixed(3)}%)`;
      const what = t(m.kind === "add" ? "Added" : m.kind === "del" ? "Removed" : m.kind === "move" ? "Moved" : "Changed");
      b.title = t("{kind} ({index} of {count})", { kind: what, index: i + 1, count: marks.length });
      b.setAttribute("aria-label", b.title);
      b.addEventListener("click", () => onPick(i));
      return b;
    }),
  );
}
