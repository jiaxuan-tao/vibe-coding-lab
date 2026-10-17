let host: HTMLElement | null = null;

export type ToastKind = "info" | "success" | "error";

export function toast(message: string, kind: ToastKind = "info", ms = 3200): void {
  if (!host) {
    host = document.createElement("div");
    host.className = "toasts";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.append(host);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  host.append(el);
  setTimeout(() => {
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 250);
  }, ms);
}
