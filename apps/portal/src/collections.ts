// Collections (docs/product-principles.md, needs 3 and 4): the reader pins explorer views into a named collection,
// orders them and gives each a title and a comment; a collection is read as a board or as slides and exported to one
// PowerPoint file. One concept instead of separate dashboard and presentation builders, and no free-form grid.
// Kept in the browser (localStorage) like saved views, until accounts exist; every read and write is guarded.

import { browserStorage } from "./savedViews";

export type CollectionItem = {
  id: string;
  /** Explorer link of the view ("/explore?…"). */
  url: string;
  /** The reader's title; empty = the view's own title. */
  title: string;
  comment: string;
};
export type Collection = { id: string; name: string; items: CollectionItem[]; updated_at: string };

export const COLLECTIONS_KEY = "zohelo-bi.collections.v1";
export const MAX_COLLECTIONS = 20;
export const MAX_ITEMS = 30;
type Store = Pick<Storage, "getItem" | "setItem">;

const isItem = (x: unknown): x is CollectionItem => {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.url === "string" && typeof v.title === "string" && typeof v.comment === "string";
};
const isCollection = (x: unknown): x is Collection => {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.updated_at === "string" &&
    Array.isArray(v.items) &&
    v.items.every(isItem)
  );
};

export function loadCollections(store: Store | null = browserStorage()): Collection[] {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(COLLECTIONS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isCollection) : [];
  } catch {
    return [];
  }
}

function write(store: Store | null, list: Collection[]): Collection[] {
  try {
    store?.setItem(COLLECTIONS_KEY, JSON.stringify(list));
  } catch {
    // A failed write still returns the list.
  }
  return list;
}

let seq = 0;
const newId = (now: Date) => `${now.getTime().toString(36)}${(seq++).toString(36)}`;

const touch = (c: Collection, now: Date): Collection => ({ ...c, updated_at: now.toISOString() });

function change(store: Store | null, id: string, fn: (c: Collection) => Collection, now: Date): Collection[] {
  return write(
    store,
    loadCollections(store).map((c) => (c.id === id ? touch(fn(c), now) : c)),
  );
}

/** A new, empty collection at the top of the list. */
export function createCollection(store: Store | null, name: string, now = new Date()): { list: Collection[]; created: Collection } {
  const created: Collection = { id: newId(now), name: name.trim() || "Kolekcja", items: [], updated_at: now.toISOString() };
  return { list: write(store, [created, ...loadCollections(store)].slice(0, MAX_COLLECTIONS)), created };
}

export function renameCollection(store: Store | null, id: string, name: string, now = new Date()): Collection[] {
  return change(store, id, (c) => ({ ...c, name }), now);
}

export function removeCollection(store: Store | null, id: string): Collection[] {
  return write(
    store,
    loadCollections(store).filter((c) => c.id !== id),
  );
}

/** Pins a view at the end of the collection; the same link is not pinned twice. */
export function addItem(store: Store | null, id: string, input: { url: string; title?: string }, now = new Date()): Collection[] {
  return change(
    store,
    id,
    (c) =>
      c.items.some((i) => i.url === input.url) || c.items.length >= MAX_ITEMS
        ? c
        : { ...c, items: [...c.items, { id: newId(now), url: input.url, title: input.title?.trim() ?? "", comment: "" }] },
    now,
  );
}

export function updateItem(
  store: Store | null,
  id: string,
  itemId: string,
  patch: Partial<Pick<CollectionItem, "title" | "comment">>,
  now = new Date(),
): Collection[] {
  return change(store, id, (c) => ({ ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }), now);
}

/** Moves a view one place up (-1) or down (+1). */
export function moveItem(store: Store | null, id: string, itemId: string, dir: 1 | -1, now = new Date()): Collection[] {
  return change(
    store,
    id,
    (c) => {
      const i = c.items.findIndex((x) => x.id === itemId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.items.length) return c;
      const items = c.items.slice();
      [items[i], items[j]] = [items[j]!, items[i]!];
      return { ...c, items };
    },
    now,
  );
}

export function removeItem(store: Store | null, id: string, itemId: string, now = new Date()): Collection[] {
  return change(store, id, (c) => ({ ...c, items: c.items.filter((i) => i.id !== itemId) }), now);
}
