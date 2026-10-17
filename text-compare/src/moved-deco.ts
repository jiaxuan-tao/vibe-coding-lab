import { type EditorState, type Range, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view";
import { t } from "./i18n";

export interface MovedBlock {
  /** 1-based line numbers, inclusive. */
  fromLine: number;
  toLine: number;
  label: string;
  jump?: () => void;
}

export const setMovedBlocks = StateEffect.define<MovedBlock[]>();

class MoveTag extends WidgetType {
  constructor(readonly label: string, readonly jump?: () => void) {
    super();
  }
  eq(other: MoveTag) {
    return other.label === this.label;
  }
  toDOM() {
    const el = document.createElement(this.jump ? "button" : "span");
    el.className = "cm-moveTag";
    el.textContent = this.label;
    if (this.jump) {
      (el as HTMLButtonElement).type = "button";
      el.title = t("Jump to where this block is on the other side");
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.jump!();
      });
    }
    return el;
  }
  ignoreEvent() {
    return false;
  }
}

function build(state: EditorState, blocks: MovedBlock[]): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const lines = state.doc.lines;
  for (const b of blocks) {
    if (b.fromLine > lines) continue;
    const last = Math.min(b.toLine, lines);
    for (let n = b.fromLine; n <= last; n++) ranges.push(Decoration.line({ class: "cm-movedLine" }).range(state.doc.line(n).from));
    const first = state.doc.line(b.fromLine);
    ranges.push(Decoration.widget({ widget: new MoveTag(b.label, b.jump), side: 1 }).range(first.to));
  }
  return Decoration.set(ranges, true);
}

export const movedBlocksField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    let next = tr.docChanged ? Decoration.none : deco; // stale after an edit; fresh results follow shortly
    for (const e of tr.effects) if (e.is(setMovedBlocks)) next = build(tr.state, e.value);
    return next;
  },
  provide: (f) => EditorView.decorations.from(f),
});
