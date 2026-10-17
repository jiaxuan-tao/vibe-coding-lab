import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, foldKeymap, indentOnInput } from "@codemirror/language";
import {
  type Chunk, MergeView, getChunks, getOriginalDoc, goToNextChunk, goToPreviousChunk,
  originalDocChangeEffect, unifiedMergeView, updateOriginalDoc,
} from "@codemirror/merge";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { ChangeSet, Compartment, EditorSelection, EditorState, type Extension, type StateCommand } from "@codemirror/state";
import {
  EditorView, drawSelection, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars,
  keymap, lineNumbers, placeholder,
} from "@codemirror/view";
import { findLanguage } from "./lang";
import { makeDiffOverride } from "./merge-override";
import type { LineOp } from "./diff-core";
import type { Move } from "./moves";
import { movedBlocksField, setMovedBlocks } from "./moved-deco";
import type { CompareOptions } from "./normalize";
import type { Granularity } from "./worddiff";
import { appTheme } from "./theme";
import { t, getLocale, onLocaleChange } from "./i18n";

export type ViewMode = "split" | "unified";
export type RevertDirection = "a-to-b" | "b-to-a";

export interface EditorSettings {
  view: ViewMode;
  options: CompareOptions;
  collapse: boolean;
  wrap: boolean;
  revert: RevertDirection;
  granularity: Granularity;
  /** Resolved language name, or null for plain text. */
  lang: string | null;
}

export interface ChunkMark {
  kind: "add" | "del" | "mod" | "move";
  /** Position within the right-hand document, 0..1. */
  top: number;
  height: number;
}

export type UpdateKind = "doc" | "selection";

const PLACEHOLDER_A = "Paste the original text here, or drop a file";
const PLACEHOLDER_B = "Paste the changed text here, or drop a file";

const CM_PHRASES = [
  "Find", "Replace", "next", "previous", "all", "match case", "regexp", "by word", "replace", "replace all", "close",
  "Go to line", "go", "current match", "on line", "replaced match on line $", "replaced $ matches",
  "Folded lines", "Unfolded lines", "to", "folded code", "unfold", "Fold line", "Unfold line", "Control character",
  "$ unchanged lines", "Revert this chunk", "Accept", "Reject",
];

export class DiffEditor {
  private merge: MergeView | null = null;
  private single: EditorView | null = null;
  private langA = new Compartment();
  private langB = new Compartment();
  private wrapA = new Compartment();
  private wrapB = new Compartment();
  private localeA = new Compartment();
  private localeB = new Compartment();
  private locale = getLocale();
  private unsubscribeLocale = () => {};
  private active: "a" | "b" = "b";
  private langToken = 0;
  private moves: Move[] = [];

  constructor(
    private host: HTMLElement,
    private settings: EditorSettings,
    docs: { a: string; b: string },
    private onUpdate: (kind: UpdateKind) => void,
  ) {
    this.build(docs.a, docs.b);
    this.unsubscribeLocale = onLocaleChange(() => this.update({}));
  }

  get a(): string {
    return this.merge ? this.merge.a.state.doc.toString() : getOriginalDoc(this.single!.state).toString();
  }

  get b(): string {
    return this.merge ? this.merge.b.state.doc.toString() : this.single!.state.doc.toString();
  }

  get settingsSnapshot(): EditorSettings {
    return { ...this.settings };
  }

  /** Replace one or both documents (undoable where the editor allows it). */
  setDocs(docs: { a?: string; b?: string }): void {
    if (this.merge) {
      if (docs.a !== undefined) replaceDoc(this.merge.a, docs.a);
      if (docs.b !== undefined) replaceDoc(this.merge.b, docs.b);
    } else if (this.single) {
      const view = this.single;
      if (docs.a !== undefined) {
        const old = getOriginalDoc(view.state);
        const changes = ChangeSet.of({ from: 0, to: old.length, insert: docs.a }, old.length);
        view.dispatch({ effects: originalDocChangeEffect(view.state, changes) });
      }
      if (docs.b !== undefined) replaceDoc(view, docs.b);
    }
  }

  update(next: Partial<EditorSettings>): void {
    const localeChanged = this.locale !== getLocale();
    this.locale = getLocale();
    const prev = this.settings;
    this.settings = { ...prev, ...next };
    const s = this.settings;
    const needsRebuild =
      s.view !== prev.view ||
      JSON.stringify(s.options) !== JSON.stringify(prev.options) ||
      s.granularity !== prev.granularity ||
      (s.view === "unified" && s.collapse !== prev.collapse);
    if (needsRebuild) {
      this.rebuild();
      return;
    }
    if (this.merge && (s.collapse !== prev.collapse || s.revert !== prev.revert)) {
      this.merge.reconfigure({
        collapseUnchanged: s.collapse ? { margin: 3, minSize: 6 } : undefined,
        revertControls: s.revert,
        renderRevertControl: () => revertButton(s.revert),
      });
    }
    if (s.wrap !== prev.wrap) {
      const wrap = s.wrap ? EditorView.lineWrapping : [];
      for (const [view, c] of this.views()) view.dispatch({ effects: c.wrap.reconfigure(wrap) });
    }
    if (s.lang !== prev.lang) this.loadLanguage();
    if (localeChanged) {
      for (const [view, c] of this.views()) view.dispatch({ effects: c.locale.reconfigure(this.localized(view === this.merge?.a ? "a" : "b")) });
      this.refreshChrome();
      this.setMoves(this.moves);
    }
  }

  focus(): void {
    this.activeView().focus();
  }

  next(): void {
    this.move(goToNextChunk);
  }

  prev(): void {
    this.move(goToPreviousChunk);
  }

  /** Chunks, for the change map and the "3 of 12" counter. */
  chunkInfo(): { marks: ChunkMark[]; count: number; current: number } {
    const view = this.merge ? this.merge.b : this.single!;
    const info = getChunks(view.state);
    const chunks = info?.chunks ?? [];
    const doc = view.state.doc;
    // positions are relative to the scrollable height, so short texts map to the top of the strip
    const total = Math.max(view.contentHeight, this.host.clientHeight, 1);
    const docA = this.merge ? this.merge.a.state.doc : getOriginalDoc(view.state);
    const moved = (c: Chunk) =>
      this.moves.some((m) => {
        const [bFirst, bLast] = [doc.lineAt(Math.min(c.fromB, doc.length)).number - 1, doc.lineAt(Math.min(c.endB, doc.length)).number];
        const [aFirst, aLast] = [docA.lineAt(Math.min(c.fromA, docA.length)).number - 1, docA.lineAt(Math.min(c.endA, docA.length)).number];
        return c.fromB === c.toB ? m.a0 < aLast && m.a1 > aFirst : m.b0 < bLast && m.b1 > bFirst;
      });
    const marks = chunks.map((c): ChunkMark => {
      const kind = moved(c) ? "move" : c.fromA === c.toA ? "add" : c.fromB === c.toB ? "del" : "mod";
      const top = view.lineBlockAt(Math.min(c.fromB, doc.length)).top;
      const bottom = c.fromB === c.toB ? top : view.lineBlockAt(Math.min(c.endB, doc.length)).bottom;
      return { kind, top: top / total, height: (bottom - top) / total };
    });

    const av = this.activeView();
    const side = this.merge ? this.active : "b";
    const head = av.state.selection.main.head;
    let current = -1;
    chunks.forEach((c, i) => {
      const [from, to] = side === "a" ? [c.fromA, c.endA] : [c.fromB, c.endB];
      if (head >= from && head <= to) current = i;
    });
    return { marks, count: chunks.length, current };
  }

  /** Jump to the chunk at a relative position (0..1) in the right-hand document. */
  gotoChunk(index: number): void {
    const view = this.merge ? this.merge.b : this.single!;
    const chunk: Chunk | undefined = getChunks(view.state)?.chunks[index];
    if (!chunk) return;
    this.active = "b";
    view.dispatch({
      selection: { anchor: Math.min(chunk.fromB, view.state.doc.length) },
      effects: EditorView.scrollIntoView(Math.min(chunk.fromB, view.state.doc.length), { y: "center" }),
    });
    view.focus();
  }

  /** The displayed change blocks as line ranges (0-based, end exclusive). */
  lineOps(): LineOp[] {
    const view = this.merge ? this.merge.b : this.single!;
    const docA = this.merge ? this.merge.a.state.doc : getOriginalDoc(view.state);
    const docB = view.state.doc;
    const range = (doc: typeof docB, from: number, to: number, end: number) => {
      const first = doc.lineAt(Math.min(from, doc.length)).number - 1;
      return from === to ? [first, first] : [first, doc.lineAt(Math.min(end, doc.length)).number];
    };
    return (getChunks(view.state)?.chunks ?? []).map((c) => {
      const [a0, a1] = range(docA, c.fromA, c.toA, c.endA);
      const [b0, b1] = range(docB, c.fromB, c.toB, c.endB);
      return { type: "change", a0, a1, b0, b1 };
    });
  }

  /** Show moved blocks (line indexes from the analysis of the current texts). */
  setMoves(moves: Move[]): void {
    this.moves = moves;
    const tag = (n: number) => n.toLocaleString(getLocale());
    if (this.merge) {
      const { a, b } = this.merge;
      const jump = (view: EditorView, line: number) => () => {
        const pos = view.state.doc.line(Math.min(line, view.state.doc.lines)).from;
        view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
        view.focus();
      };
      a.dispatch({ effects: setMovedBlocks.of(moves.map((m) => ({ fromLine: m.a0 + 1, toLine: m.a1, label: t("Moved to line {line}", { line: tag(m.b0 + 1) }), jump: jump(b, m.b0 + 1) }))) });
      b.dispatch({ effects: setMovedBlocks.of(moves.map((m) => ({ fromLine: m.b0 + 1, toLine: m.b1, label: t("Moved from line {line}", { line: tag(m.a0 + 1) }), jump: jump(a, m.a0 + 1) }))) });
    } else if (this.single) {
      this.single.dispatch({ effects: setMovedBlocks.of(moves.map((m) => ({ fromLine: m.b0 + 1, toLine: m.b1, label: t("Moved from original line {line}", { line: tag(m.a0 + 1) }) }))) });
    }
  }

  destroy(): void {
    this.unsubscribeLocale();
    this.destroyViews();
  }

  private destroyViews(): void {
    this.merge?.destroy();
    this.single?.destroy();
    this.merge = this.single = null;
  }

  // ---------------------------------------------------------------------------

  private views(): Array<[EditorView, { lang: Compartment; wrap: Compartment; locale: Compartment }]> {
    if (this.merge)
      return [
        [this.merge.a, { lang: this.langA, wrap: this.wrapA, locale: this.localeA }],
        [this.merge.b, { lang: this.langB, wrap: this.wrapB, locale: this.localeB }],
      ];
    return [[this.single!, { lang: this.langB, wrap: this.wrapB, locale: this.localeB }]];
  }

  private activeView(): EditorView {
    if (this.merge) return this.active === "a" ? this.merge.a : this.merge.b;
    return this.single!;
  }

  private move(cmd: StateCommand): void {
    const view = this.activeView();
    if (!cmd({ state: view.state, dispatch: (tr) => view.dispatch(tr) })) {
      // wrap around
      const chunks = getChunks(view.state)?.chunks ?? [];
      if (!chunks.length) return;
      const side = this.merge ? this.active : "b";
      const target = cmd === goToNextChunk ? chunks[0] : chunks[chunks.length - 1];
      const pos = Math.min(side === "a" ? target.fromA : target.fromB, view.state.doc.length);
      view.dispatch({ selection: EditorSelection.cursor(pos), effects: EditorView.scrollIntoView(pos, { y: "center" }) });
    }
    view.focus();
  }

  private rebuild(): void {
    const a = this.a, b = this.b;
    const scroller = this.host.querySelector<HTMLElement>(this.merge ? ".cm-mergeView" : ".cm-scroller");
    const top = scroller?.scrollTop ?? 0;
    this.destroyViews();
    this.build(a, b);
    const next = this.host.querySelector<HTMLElement>(this.merge ? ".cm-mergeView" : ".cm-scroller");
    if (next) next.scrollTop = top;
  }

  private shared(side: "a" | "b"): Extension[] {
    const lang = side === "a" ? this.langA : this.langB;
    const wrap = side === "a" ? this.wrapA : this.wrapB;
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      EditorState.allowMultipleSelections.of(true),
      keymap.of([
        { key: "F7", run: goToNextChunk, shift: goToPreviousChunk, preventDefault: true },
        { key: "Alt-ArrowDown", run: goToNextChunk, preventDefault: true },
        { key: "Alt-ArrowUp", run: goToPreviousChunk, preventDefault: true },
        ...defaultKeymap, ...historyKeymap, ...searchKeymap, ...foldKeymap, indentWithTab,
      ]),
      (side === "a" ? this.localeA : this.localeB).of(this.localized(side)),
      lang.of([]),
      wrap.of(this.settings.wrap ? EditorView.lineWrapping : []),
      appTheme,
      movedBlocksField,
      EditorView.domEventHandlers({ focus: () => { this.active = side; } }),
      EditorView.updateListener.of((u) => {
        const originalChanged = u.transactions.some((tr) => tr.effects.some((e) => e.is(updateOriginalDoc)));
        if (u.docChanged || originalChanged) this.onUpdate("doc");
        else if (u.selectionSet || u.focusChanged) this.onUpdate("selection");
      }),
    ];
  }

  private localized(side: "a" | "b"): Extension[] {
    return [
      EditorState.phrases.of(Object.fromEntries(CM_PHRASES.map((key) => [key, t(key)]))),
      placeholder(t(side === "a" ? PLACEHOLDER_A : PLACEHOLDER_B)),
      EditorView.contentAttributes.of({ "aria-label": t(side === "a" ? "Original text" : "Changed text") }),
    ];
  }

  private refreshChrome(): void {
    // CodeMirror's existing panel/widget DOM does not refresh when phrases change.
    this.host.querySelectorAll<HTMLElement>(".cm-collapsedLines").forEach((el) => {
      const count = /[\d,]+/.exec(el.textContent ?? "")?.[0];
      if (count) el.textContent = t("$ unchanged lines").replace("$", count);
    });
    this.host.querySelectorAll<HTMLButtonElement>(".revert-btn").forEach((el) => {
      el.title = t(this.settings.revert === "a-to-b" ? "Copy this block to the right side" : "Copy this block to the left side");
      el.setAttribute("aria-label", el.title);
    });
    this.host.querySelectorAll<HTMLButtonElement>(".cm-chunkButtons button[name]").forEach((el) => {
      if (el.name !== "accept" && el.name !== "reject") return;
      el.textContent = t(el.name === "accept" ? "Keep change" : "Undo change");
      el.title = t(el.name === "accept" ? "Keep this change in both versions" : "Restore the original text here");
    });
    this.host.querySelectorAll<HTMLElement>(".cm-search").forEach((panel) => {
      const buttons: Record<string, string> = { next: "next", prev: "previous", select: "all", replace: "replace", replaceAll: "replace all" };
      panel.querySelectorAll<HTMLButtonElement>("button").forEach((el) => {
        if (buttons[el.name]) el.textContent = t(buttons[el.name]);
        if (el.name === "close") el.setAttribute("aria-label", t("close"));
      });
      panel.querySelectorAll<HTMLInputElement>('input[name="search"], input[name="replace"]').forEach((el) => {
        el.placeholder = t(el.name === "search" ? "Find" : "Replace");
        el.setAttribute("aria-label", el.placeholder);
      });
      const labels: Record<string, string> = { case: "match case", re: "regexp", word: "by word" };
      panel.querySelectorAll<HTMLLabelElement>("label").forEach((el) => {
        const input = el.querySelector<HTMLInputElement>("input");
        if (!input || !labels[input.name]) return;
        for (const node of Array.from(el.childNodes)) if (node.nodeType === Node.TEXT_NODE) node.textContent = t(labels[input.name]);
      });
    });
  }

  private build(a: string, b: string): void {
    const s = this.settings;
    const diffConfig = { override: makeDiffOverride(s.options, s.granularity) };
    const collapse = s.collapse ? { margin: 3, minSize: 6 } : undefined;

    if (s.view === "split") {
      this.merge = new MergeView({
        a: { doc: a, extensions: this.shared("a") },
        b: { doc: b, extensions: this.shared("b") },
        parent: this.host,
        revertControls: s.revert,
        renderRevertControl: () => revertButton(s.revert),
        highlightChanges: true,
        gutter: true,
        collapseUnchanged: collapse,
        diffConfig,
      });
    } else {
      this.single = new EditorView({
        parent: this.host,
        state: EditorState.create({
          doc: b,
          extensions: [
            this.shared("b"),
            unifiedMergeView({
              original: a,
              gutter: true,
              highlightChanges: true,
              syntaxHighlightDeletions: true,
              mergeControls: (type, action) => {
                const btn = document.createElement("button");
                btn.name = type;
                btn.type = "button";
                btn.textContent = t(type === "accept" ? "Keep change" : "Undo change");
                btn.title = t(type === "accept" ? "Keep this change in both versions" : "Restore the original text here");
                btn.onmousedown = action;
                return btn;
              },
              collapseUnchanged: collapse,
              diffConfig,
            }),
          ],
        }),
      });
    }
    this.loadLanguage();
    if (this.moves.length) this.setMoves(this.moves);
    this.onUpdate("doc");
  }

  private loadLanguage(): void {
    const token = ++this.langToken;
    const desc = findLanguage(this.settings.lang);
    const apply = (ext: Extension) => {
      if (token !== this.langToken) return;
      for (const [view, c] of this.views()) view.dispatch({ effects: c.lang.reconfigure(ext) });
    };
    if (!desc) return apply([]);
    if (desc.support) return apply(desc.support);
    desc.load().then(apply, () => apply([]));
  }
}

function replaceDoc(view: EditorView, text: string): void {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
}

function revertButton(dir: RevertDirection): HTMLElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "revert-btn";
  const toRight = dir === "a-to-b";
  btn.textContent = toRight ? "→" : "←";
  btn.title = t(toRight ? "Copy this block to the right side" : "Copy this block to the left side");
  btn.setAttribute("aria-label", btn.title);
  return btn;
}
