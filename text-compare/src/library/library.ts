import type { CompareOptions } from "../normalize";
import { idb } from "./idb";
import { t } from "../i18n";

export type ItemKind = "history" | "saved";

/** Small summary shown in lists. */
export interface ComparisonMeta {
  title: string;
  nameA: string;
  nameB: string;
  linesA: number;
  linesB: number;
  preview: string;
}

/** Everything needed to reopen a comparison. */
export interface ComparisonBody {
  a: string;
  b: string;
  nameA: string;
  nameB: string;
  options?: CompareOptions;
  lang?: string;
}

export interface LibraryItem {
  id: string;
  kind: ItemKind;
  meta: ComparisonMeta;
  createdAt: string;
  updatedAt: string;
  size: number;
}

export interface NewItem {
  id: string;
  kind: ItemKind;
  meta: ComparisonMeta;
  body: ComparisonBody;
}

const HISTORY_LIMIT = 50;

interface DeviceRecord extends NewItem {
  createdAt: string;
  updatedAt: string;
  size: number;
}

/** Comparisons kept in this browser only (IndexedDB). */
export class DeviceLibrary {
  async list(kind: ItemKind): Promise<LibraryItem[]> {
    const all = (await idb.all<DeviceRecord>("items")).filter((r) => r.kind === kind);
    all.sort((x, y) => y.updatedAt.localeCompare(x.updatedAt));
    return all.map((r) => ({ id: r.id, kind: r.kind, meta: r.meta, createdAt: r.createdAt, updatedAt: r.updatedAt, size: r.size }));
  }

  async load(id: string): Promise<ComparisonBody> {
    const r = await idb.get<DeviceRecord>("items", id);
    if (!r) throw new Error(t("That comparison is no longer here."));
    return r.body;
  }

  async put(item: NewItem): Promise<void> {
    const old = await idb.get<DeviceRecord>("items", item.id);
    const now = new Date().toISOString();
    const size = item.body.a.length + item.body.b.length;
    await idb.put("items", { ...item, createdAt: old?.createdAt ?? now, updatedAt: now, size } satisfies DeviceRecord);
    if (item.kind === "history") {
      const history = await this.list("history");
      for (const extra of history.slice(HISTORY_LIMIT)) await idb.delete("items", extra.id);
    }
  }

  async rename(id: string, title: string): Promise<void> {
    const r = await idb.get<DeviceRecord>("items", id);
    if (r) await idb.put("items", { ...r, meta: { ...r.meta, title } });
  }

  remove(id: string): Promise<void> {
    return idb.delete("items", id).then(() => undefined);
  }

  clear(): Promise<void> {
    return idb.clear("items").then(() => undefined);
  }
}
