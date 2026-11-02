// Pure page choice for the portal's paths: /explore, /catalogue, /kpi/<kpi_key>, / and /d/<id>; later routes
// (v2 dashboards) extend pageFor.

export type Page =
  { kind: "explore" } | { kind: "catalogue" } | { kind: "kpi"; key: string } | { kind: "dashboard"; id: string } | { kind: "not-found" };

export function pageFor(pathname: string, dashboardIds: string[]): Page {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/explore") return { kind: "explore" };
  if (path === "/catalogue") return { kind: "catalogue" };
  if (path === "/") {
    const first = dashboardIds[0];
    return first === undefined ? { kind: "not-found" } : { kind: "dashboard", id: first };
  }
  const k = /^\/kpi\/([a-z0-9_]+)$/.exec(path);
  if (k) return { kind: "kpi", key: k[1]! };
  const m = /^\/d\/([a-z0-9-]+)$/.exec(path);
  if (m && dashboardIds.includes(m[1]!)) return { kind: "dashboard", id: m[1]! };
  return { kind: "not-found" };
}
