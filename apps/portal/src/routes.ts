// Pure page choice for the portal's paths: /explore, /catalogue, /kpi/<kpi_key>, / and /d/<id>; later routes
// (v2 dashboards) extend pageFor.

export type Page =
  | { kind: "explore" }
  | { kind: "catalogue" }
  | { kind: "kpi"; key: string }
  | { kind: "dashboard"; id: string }
  | { kind: "dashboard-v2"; id: string }
  | { kind: "not-found" };

const START_V2 = "poland-overview";

export function pageFor(pathname: string, dashboardIds: string[], v2Ids: string[] = []): Page {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/explore") return { kind: "explore" };
  if (path === "/catalogue") return { kind: "catalogue" };
  if (path === "/") {
    // The v2 Poland overview opens the portal (in both languages, #335); the v1 boards stay at /d/<id>.
    if (v2Ids.includes(START_V2)) return { kind: "dashboard-v2", id: START_V2 };
    const first = dashboardIds[0];
    return first === undefined ? { kind: "not-found" } : { kind: "dashboard", id: first };
  }
  const k = /^\/kpi\/([a-z0-9_]+)$/.exec(path);
  if (k) return { kind: "kpi", key: k[1]! };
  const m = /^\/d\/([a-z0-9-]+)$/.exec(path);
  if (m && dashboardIds.includes(m[1]!)) return { kind: "dashboard", id: m[1]! };
  if (m && v2Ids.includes(m[1]!)) return { kind: "dashboard-v2", id: m[1]! };
  return { kind: "not-found" };
}
