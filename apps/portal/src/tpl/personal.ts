// Personal state of a reader, kept in this browser until accounts exist: favourites (starred items), visits
// (for "Często oglądane"), the role used to preview the portal (użytkownik / administrator) and the plan.
// Every read and write survives blocked storage; a change notifies open components through one event.

export type Personal = { id: string; label: string; to: string; kind: "kpi" | "dashboard" | "view" };
export type Visit = Personal & { count: number; last: string };
export type Role = "user" | "admin";

const FAV_KEY = "zohelo-bi.favourites.v1";
const VISIT_KEY = "zohelo-bi.visits.v1";
const ROLE_KEY = "zohelo-bi.role.v1";
export const PERSONAL_EVENT = "zohelo-bi-personal";

function read<T>(key: string, fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: lasts for this page view */
  }
  window.dispatchEvent(new Event(PERSONAL_EVENT));
}

export const loadFavourites = (): Personal[] => read<Personal[]>(FAV_KEY, []);
export const isFavourite = (id: string) => loadFavourites().some((f) => f.id === id);
export function toggleFavourite(item: Personal): boolean {
  const all = loadFavourites();
  const on = all.some((f) => f.id === item.id);
  write(FAV_KEY, on ? all.filter((f) => f.id !== item.id) : [item, ...all].slice(0, 50));
  return !on;
}

export const loadVisits = (): Visit[] => read<Visit[]>(VISIT_KEY, []);
/** Count a visit of an indicator page or a dashboard page (the home page and the explorer are not counted). */
export function recordVisit(item: Personal, now = new Date()) {
  const all = loadVisits();
  const cur = all.find((v) => v.id === item.id);
  const next = cur
    ? all.map((v) => (v.id === item.id ? { ...v, label: item.label, count: v.count + 1, last: now.toISOString() } : v))
    : [{ ...item, count: 1, last: now.toISOString() }, ...all];
  try {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify(next.slice(0, 100)));
  } catch {
    /* storage blocked */
  }
}
/** Most visited first, then most recent. */
export function frequent(n = 6): Visit[] {
  return [...loadVisits()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last)).slice(0, n);
}

export const loadRole = (): Role => (read<string>(ROLE_KEY, "user") === "admin" ? "admin" : "user");
export const saveRole = (r: Role) => write(ROLE_KEY, r);
