import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";

// All colours come from CSS custom properties in styles.css, so switching
// between light and dark needs no editor reconfiguration.

const editorTheme = EditorView.theme({
  "&": { color: "var(--ink)", backgroundColor: "var(--surface)", fontSize: "var(--code-size)" },
  ".cm-scroller": { fontFamily: "var(--mono)", lineHeight: "1.6" },
  ".cm-content": { caretColor: "var(--accent)", padding: "6px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
  "&.cm-focused": { outline: "none" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": { backgroundColor: "var(--selection) !important" },
  ".cm-activeLine": { backgroundColor: "var(--active-line)" },
  ".cm-gutters": { backgroundColor: "var(--surface)", color: "var(--faint)", border: "none", borderRight: "1px solid var(--line)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--active-line)", color: "var(--muted)" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 12px", minWidth: "3.5ch" },
  ".cm-placeholder": { color: "var(--faint)", fontStyle: "normal" },
  ".cm-searchMatch": { backgroundColor: "var(--search)", outline: "1px solid var(--search-edge)" },
  ".cm-panels": { backgroundColor: "var(--panel)", color: "var(--ink)", borderColor: "var(--line)" },
  ".cm-panel.cm-search input, .cm-panel.cm-search button": { fontFamily: "var(--sans)", fontSize: "13px" },
  ".cm-textfield": { border: "1px solid var(--line-strong)", borderRadius: "4px", background: "var(--surface)", color: "var(--ink)" },
  ".cm-button": { backgroundImage: "none", background: "var(--button)", border: "1px solid var(--line-strong)", borderRadius: "4px", color: "var(--ink)" },

  // added text (right side, unified inserted lines)
  ".cm-changedLine, .cm-inlineChangedLine": { backgroundColor: "var(--add-line) !important" },
  ".cm-changedText": { background: "var(--add-text) !important", borderRadius: "2px" },
  ".cm-changedLineGutter": { background: "var(--add-strong) !important" },
  // removed text (left side, unified deleted chunks)
  "&.cm-merge-a .cm-changedLine, .cm-deletedChunk": { backgroundColor: "var(--del-line) !important" },
  "&.cm-merge-a .cm-changedText, .cm-deletedChunk .cm-deletedText, .cm-deletedText": { background: "var(--del-text) !important", borderRadius: "2px" },
  "&.cm-merge-a .cm-changedLineGutter, .cm-deletedLineGutter": { background: "var(--del-strong) !important" },
  ".cm-changeGutter": { width: "3px", paddingLeft: "0" },
  ".cm-deletedChunk": { paddingLeft: "0" },
  ".cm-deletedChunk .cm-chunkButtons": { insetInlineEnd: "8px", zIndex: "2" },
  ".cm-deletedChunk button": {
    font: "600 11px/1 var(--sans)", padding: "4px 7px", borderRadius: "4px", border: "1px solid var(--line-strong)",
    background: "var(--surface) !important", color: "var(--ink) !important",
  },
  ".cm-deletedChunk button:hover": { borderColor: "var(--accent)" },
  // moved blocks: violet instead of red/green, with a tag saying where they went
  "& .cm-line.cm-movedLine": { backgroundColor: "var(--move-line) !important" },
  "& .cm-movedLine .cm-changedText, & .cm-movedLine .cm-deletedText": { background: "none !important" },
  ".cm-moveTag": {
    marginLeft: "12px", padding: "0 7px", border: "1px solid var(--move-strong)", borderRadius: "10px",
    background: "var(--surface)", color: "var(--move-strong)", font: "600 11px/17px var(--sans)",
    verticalAlign: "1px", cursor: "pointer", whiteSpace: "nowrap",
  },
  "span.cm-moveTag": { cursor: "default" },
  "button.cm-moveTag:hover": { background: "var(--move-strong)", color: "var(--surface)" },
  ".cm-collapsedLines": {
    background: "var(--collapsed) !important", color: "var(--muted) !important",
    fontFamily: "var(--sans)", fontSize: "12px", padding: "4px 12px", borderBlock: "1px dashed var(--line)",
  },
  ".cm-collapsedLines:hover": { color: "var(--accent) !important" },
  ".cm-collapsedLines:before, .cm-collapsedLines:after": { content: '""', margin: "0" },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: "var(--tok-keyword)" },
  { tag: [t.string, t.special(t.string), t.regexp], color: "var(--tok-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--tok-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--tok-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--tok-function)" },
  { tag: [t.typeName, t.className, t.namespace], color: "var(--tok-type)" },
  { tag: [t.propertyName, t.attributeName], color: "var(--tok-property)" },
  { tag: [t.tagName, t.angleBracket], color: "var(--tok-tag)" },
  { tag: [t.heading], color: "var(--tok-keyword)", fontWeight: "700" },
  { tag: [t.link, t.url], color: "var(--tok-string)", textDecoration: "underline" },
  { tag: [t.emphasis], fontStyle: "italic" },
  { tag: [t.strong], fontWeight: "700" },
  { tag: [t.meta, t.processingInstruction], color: "var(--tok-comment)" },
  { tag: [t.invalid], color: "var(--del-strong)" },
]);

export const appTheme = [editorTheme, syntaxHighlighting(highlight)];
