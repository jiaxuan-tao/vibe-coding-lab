import { t, getLocale, onLocaleChange } from "../i18n";

type Attrs = Record<string, string | number | boolean | ((e: Event) => void) | undefined>;
type Child = Node | string | null | undefined | false;

/** Create an element: h("button", { class: "btn", onclick: fn }, "Label"). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.replace(/^on/, ""), v);
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

export interface Modal {
  dialog: HTMLDialogElement;
  body: HTMLElement;
  close: () => void;
}

/** Open a modal dialog with a title; it removes itself when closed. */
export function modal(title: string, build: (m: Modal) => Child[], opts: { onClose?: () => void; dismissable?: boolean; titleKey?: string } = {}): Modal {
  const body = h("div", { class: "dialog-body" });
  const titleKey = opts.titleKey ?? title;
  const dialog = h("dialog", { class: "modal-dialog", "aria-label": t(titleKey) });
  const m: Modal = { dialog, body, close: () => dialog.close() };
  const closeBtn = opts.dismissable === false ? null : h("button", { type: "button", class: "dialog-x", "aria-label": t("Close"), onclick: () => m.close() }, "×");
  const heading = h("h2", {}, t(titleKey));
  body.append(h("div", { class: "dialog-head" }, heading, closeBtn), ...(build(m).filter(Boolean) as (Node | string)[]));
  const unsubscribe = onLocaleChange(() => {
    heading.textContent = t(titleKey);
    dialog.setAttribute("aria-label", t(titleKey));
    closeBtn?.setAttribute("aria-label", t("Close"));
    // Only explicitly marked chrome is refreshed; form values stay untouched.
    body.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n!); });
    body.querySelectorAll<HTMLElement>("[data-i18n-label]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nLabel!)); });
  });
  dialog.append(body);
  if (opts.dismissable === false) dialog.addEventListener("cancel", (e) => e.preventDefault());
  dialog.addEventListener("close", () => {
    unsubscribe();
    opts.onClose?.();
    dialog.remove();
  });
  document.body.append(dialog);
  dialog.showModal();
  return m;
}

/** Relative time like "3 min ago" or a short date. */
export function ago(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 45) return t("just now");
  if (s < 3600) return t("{count} min ago", { count: Math.round(s / 60) });
  if (s < 86400) return t("{count} h ago", { count: Math.round(s / 3600) });
  if (s < 86400 * 7) return t("{count} d ago", { count: Math.round(s / 86400) });
  return new Date(iso).toLocaleDateString(getLocale(), { month: "short", day: "numeric", year: "numeric" });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
