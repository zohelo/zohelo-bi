// Saved explorer views, kept in the browser (localStorage) until accounts exist. Storage can be missing
// or throw (private windows, blocked site data), so every read and write is guarded; the functions take
// the storage as a parameter.

export type SavedView = { id: string; name: string; url: string; saved_at: string };
export const VIEWS_KEY = "zohelo-bi.saved-views.v1";
export const MAX_VIEWS = 50;
type Store = Pick<Storage, "getItem" | "setItem">;

export function browserStorage(): Store | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

const isView = (x: unknown): x is SavedView => {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.name === "string" && typeof v.url === "string" && typeof v.saved_at === "string";
};

export function loadViews(store: Store | null): SavedView[] {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(VIEWS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isView) : [];
  } catch {
    return [];
  }
}

function write(store: Store | null, views: SavedView[]): SavedView[] {
  try {
    store?.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    // A failed write still returns the list.
  }
  return views;
}

export function saveView(store: Store | null, input: { name: string; url: string }, now = new Date()): SavedView[] {
  const view: SavedView = {
    id: now.getTime().toString(36),
    name: input.name.trim() || input.url,
    url: input.url,
    saved_at: now.toISOString(),
  };
  return write(store, [view, ...loadViews(store).filter((v) => v.url !== input.url)].slice(0, MAX_VIEWS));
}

export function removeView(store: Store | null, id: string): SavedView[] {
  return write(
    store,
    loadViews(store).filter((v) => v.id !== id),
  );
}
