import { type ComparisonBody, type ComparisonMeta, DeviceLibrary, type ItemKind, type LibraryItem } from "../library/library";
import { ago, h, modal } from "./dom";
import { toast } from "./toast";
import { t, onLocaleChange } from "../i18n";

/** What the page gives the library. */
export interface AppBridge {
  /** The comparison on screen, or null when there is nothing worth keeping. */
  current(): { meta: ComparisonMeta; body: ComparisonBody } | null;
  /** Put a saved comparison back on screen. */
  open(body: ComparisonBody): void;
  historyEnabled(): boolean;
}

const HISTORY_DELAY = 4000;

function busy(btn: HTMLButtonElement, text: string): () => void {
  const old = btn.dataset.i18n ?? btn.textContent ?? "";
  btn.disabled = true;
  btn.dataset.i18n = text;
  btn.textContent = t(text);
  return () => {
    btn.disabled = false;
    btn.dataset.i18n = old;
    btn.textContent = t(old);
  };
}

function field(label: string, input: HTMLInputElement, hint?: HTMLElement): HTMLElement {
  return h("label", { class: "field" }, h("span", { class: "field-name", "data-i18n": label }, t(label)), input, hint ?? null);
}

/** Saved comparisons and history, kept in this browser. */
export class LibraryUI {
  private library = new DeviceLibrary();
  private historyId: string | null = null;
  private historyTimer = 0;
  private drawer!: HTMLElement;
  private tab: ItemKind = "saved";
  private query = "";
  private renderToken = 0;

  constructor(private bridge: AppBridge, private libraryBtn: HTMLButtonElement, saveBtn: HTMLButtonElement) {
    this.buildDrawer();
    onLocaleChange(() => {
      const old = this.drawer;
      const show = !old.hidden;
      const search = old.querySelector<HTMLInputElement>("input[type=search]");
      const value = search?.value ?? this.query;
      const focused = document.activeElement === search;
      this.buildDrawer();
      this.drawer.hidden = !show;
      this.drawer.querySelector<HTMLInputElement>("input[type=search]")!.value = value;
      old.remove();
      if (show) void this.renderList();
      if (focused) this.drawer.querySelector<HTMLInputElement>("input[type=search]")?.focus();
    });
    libraryBtn.addEventListener("click", () => this.toggleDrawer());
    saveBtn.addEventListener("click", () => this.saveCurrent());
  }

  // ---------------------------------------------------------------- history

  /** Call after edits; the comparison is added to history once things settle. */
  noteChange(): void {
    clearTimeout(this.historyTimer);
    if (!this.bridge.historyEnabled()) return;
    this.historyTimer = window.setTimeout(() => void this.recordHistory(), HISTORY_DELAY);
  }

  /** Start a new history entry next time (after clearing, opening something, and so on). */
  startNewEntry(): void {
    clearTimeout(this.historyTimer);
    this.historyId = null;
  }

  private async recordHistory() {
    const cur = this.bridge.current();
    if (!cur) return;
    if (cur.body.a.length + cur.body.b.length > 8_000_000) return; // too big to keep; still works on screen
    this.historyId ??= crypto.randomUUID();
    try {
      await this.library.put({ id: this.historyId, kind: "history", ...cur });
      if (!this.drawer.hidden && this.tab === "history") void this.renderList();
    } catch {
      /* history is best-effort; saving explicitly reports errors */
    }
  }

  // ---------------------------------------------------------------- save

  async saveCurrent(): Promise<void> {
    const cur = this.bridge.current();
    if (!cur) return toast(t("Add some text to both sides first, then save."));
    const name = h("input", { type: "text", value: cur.meta.title, maxlength: 120, required: true, "aria-label": t("Name"), "data-i18n-label": "Name" });
    modal("Save comparison", (m) => {
      const save = h("button", { type: "submit", class: "btn primary", "data-i18n": "Save" }, t("Save"));
      const form = h(
        "form",
        {
          onsubmit: async (e: Event) => {
            e.preventDefault();
            const done = busy(save, "Saving…");
            try {
              await this.library.put({ id: crypto.randomUUID(), kind: "saved", meta: { ...cur.meta, title: name.value.trim() || cur.meta.title }, body: cur.body });
              m.close();
              toast(t("Saved to this browser"), "success");
              if (!this.drawer.hidden) void this.renderList();
            } catch (err) {
              done();
              toast(err instanceof Error ? err.message : t("Couldn't save."), "error", 6000);
            }
          },
        },
        field("Name", name),
        h("p", { class: "fine", "data-i18n": "Saved to this browser." }, t("Saved to this browser.")),
        h("div", { class: "dialog-actions" }, save),
      );
      return [form];
    });
    name.select();
  }

  // ---------------------------------------------------------------- library drawer

  private buildDrawer() {
    const search = h("input", { type: "search", placeholder: t("Search"), "aria-label": t("Search saved comparisons"), oninput: (e: Event) => { this.query = (e.target as HTMLInputElement).value.toLowerCase(); void this.renderList(); } });
    const tabs = (["saved", "history"] as const).map((k) =>
      h("button", { type: "button", role: "tab", "data-tab": k, onclick: () => { this.tab = k; void this.renderList(); } }, t(k === "saved" ? "Saved" : "History")),
    );
    this.drawer = h(
      "aside",
      { class: "library", id: "library", hidden: true, "aria-label": t("Library") },
      h("div", { class: "library-head" },
        h("h2", {}, t("Library")),
        h("button", { type: "button", class: "dialog-x", "aria-label": t("Close library"), onclick: () => this.toggleDrawer(false) }, "×"),
      ),
      h("div", { class: "library-tabs seg", role: "tablist" }, ...tabs),
      search,
      h("div", { class: "library-note" }),
      h("div", { class: "library-list" }),
      h("div", { class: "library-foot" }),
    );
    this.drawer.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.toggleDrawer(false);
    });
    document.body.append(this.drawer);
  }

  toggleDrawer(show: boolean = this.drawer.hidden === true): void {
    this.drawer.hidden = !show;
    this.libraryBtn.setAttribute("aria-expanded", String(show));
    document.body.classList.toggle("library-open", show);
    if (show) {
      void this.renderList();
      this.drawer.querySelector<HTMLInputElement>("input[type=search]")?.focus();
    }
  }

  private async renderList() {
    const token = ++this.renderToken;
    this.drawer.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tab === this.tab)));
    const list = this.drawer.querySelector(".library-list")!;
    const note = this.drawer.querySelector(".library-note")!;
    const foot = this.drawer.querySelector(".library-foot")!;
    note.replaceChildren(t("Saved in this browser only."));

    foot.replaceChildren(
      this.tab === "saved"
        ? h("button", { type: "button", class: "btn primary wide", onclick: () => this.saveCurrent() }, t("Save current comparison"))
        : h("p", { class: "fine" }, t(this.bridge.historyEnabled() ? "Comparisons are added here as you work. Turn this off in Options." : "History is off. Turn it on in Options.")),
    );

    list.replaceChildren(h("p", { class: "library-empty" }, t("Loading…")));
    let items: LibraryItem[];
    try {
      items = await this.library.list(this.tab);
    } catch (err) {
      if (token !== this.renderToken) return;
      list.replaceChildren(h("p", { class: "library-empty" }, err instanceof Error ? err.message : t("Couldn't load your library.")));
      return;
    }
    if (token !== this.renderToken) return;
    const q = this.query;
    const shown = q ? items.filter((i) => `${i.meta.title} ${i.meta.nameA} ${i.meta.nameB} ${i.meta.preview}`.toLowerCase().includes(q)) : items;
    if (!shown.length) {
      list.replaceChildren(h("p", { class: "library-empty" }, t(q ? "Nothing matches your search." : this.tab === "saved" ? "Nothing saved yet. Save a comparison to find it here later." : "No history yet.")));
      return;
    }
    list.replaceChildren(...shown.map((item) => this.renderItem(item)));
  }

  private renderItem(item: LibraryItem): HTMLElement {
    const names = item.meta.nameA || item.meta.nameB ? t("{nameA} and {nameB}, ", { nameA: item.meta.nameA || t("Original"), nameB: item.meta.nameB || t("Changed") }) : "";
    const open = h(
      "button",
      { type: "button", class: "item-open", onclick: () => this.openItem(item) },
      h("span", { class: "item-title" }, item.meta.title || t("Untitled comparison")),
      h("span", { class: "item-sub" }, `${names}${ago(item.updatedAt)}`),
      item.meta.preview ? h("span", { class: "item-preview" }, item.meta.preview) : null,
    );
    const actions = h("div", { class: "item-actions" });
    if (item.kind === "saved") actions.append(h("button", { type: "button", class: "icon-btn", title: t("Rename"), "aria-label": t("Rename {name}", { name: item.meta.title }), onclick: () => this.renameItem(item) }, "✎"));
    if (item.kind === "history") actions.append(h("button", { type: "button", class: "icon-btn", title: t("Save"), "aria-label": t("Save {name}", { name: item.meta.title }), onclick: () => this.keepHistoryItem(item) }, "★"));
    actions.append(h("button", { type: "button", class: "icon-btn danger", title: t("Delete"), "aria-label": t("Delete {name}", { name: item.meta.title }), onclick: () => this.deleteItem(item) }, "✕"));
    return h("div", { class: "item" }, open, actions);
  }

  private async openItem(item: LibraryItem) {
    try {
      const body = await this.library.load(item.id);
      this.startNewEntry();
      if (item.kind === "history") this.historyId = item.id; // keep editing the same history entry
      this.bridge.open(body);
      if (matchMedia("(max-width: 760px)").matches) this.toggleDrawer(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("Couldn't open that comparison."), "error", 6000);
    }
  }

  private renameItem(item: LibraryItem) {
    const name = h("input", { type: "text", value: item.meta.title, maxlength: 120, "aria-label": t("Name"), "data-i18n-label": "Name" });
    modal("Rename", (m) => [
      h("form", {
        onsubmit: async (e: Event) => {
          e.preventDefault();
          try {
            await this.library.rename(item.id, name.value.trim() || item.meta.title);
            m.close();
            void this.renderList();
          } catch (err) {
            toast(err instanceof Error ? err.message : t("Couldn't rename."), "error");
          }
        },
      }, field("Name", name), h("div", { class: "dialog-actions" }, h("button", { type: "submit", class: "btn primary", "data-i18n": "Rename" }, t("Rename")))),
    ]);
    name.select();
  }

  private async keepHistoryItem(item: LibraryItem) {
    try {
      const body = await this.library.load(item.id);
      await this.library.put({ id: crypto.randomUUID(), kind: "saved", meta: item.meta, body });
      toast(t("Saved"), "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : t("Couldn't save."), "error");
    }
  }

  private async deleteItem(item: LibraryItem) {
    try {
      await this.library.remove(item.id);
      if (this.historyId === item.id) this.historyId = null;
      void this.renderList();
      toast(t("Deleted"));
    } catch (err) {
      toast(err instanceof Error ? err.message : t("Couldn't delete."), "error");
    }
  }
}
