// Pure route table of the template portal.
//   /                      overview (Przegląd)
//   /d                     dashboards landing page (Dashboardy)
//   /d/<domain>            domain dashboard, its overview page
//   /d/<domain>/<page>     domain dashboard page (one per domain group, from dashboards/domains/<domain>.yaml)
//   /explore               explorer
//   /catalogue             indicator catalogue
//   /analizy               guided statistical analyses (trend, season, forecast, relationship, convergence)
//   /kolekcje              the reader's collections; /kolekcje/<id> one collection (board or slides)
//   /kpi/<kpi_key>         indicator page
//   /przewodnik            guide index; /przewodnik/<section> one guide page
//   old-portal addresses (/d/poland-overview, /explore?metric=…, /embed …) are rewritten first: legacy.ts

export type TplPage =
  | { kind: "overview" }
  | { kind: "dashboards" }
  | { kind: "domain"; domain: string; page: string | null }
  | { kind: "explore" }
  | { kind: "catalogue" }
  | { kind: "analysis" }
  | { kind: "collections"; id: string | null }
  | { kind: "kpi"; key: string }
  | { kind: "guide"; section: string | null }
  | { kind: "not-found" };

export function tplPageFor(pathname: string): TplPage {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "overview" };
  if (path === "/d") return { kind: "dashboards" };
  if (path === "/explore") return { kind: "explore" };
  if (path === "/catalogue") return { kind: "catalogue" };
  if (path === "/analizy") return { kind: "analysis" };
  if (path === "/kolekcje") return { kind: "collections", id: null };
  const c = /^\/kolekcje\/([a-z0-9]+)$/.exec(path);
  if (c) return { kind: "collections", id: c[1]! };
  if (path === "/przewodnik") return { kind: "guide", section: null };
  const g = /^\/przewodnik\/([a-z0-9-]+)$/.exec(path);
  if (g) return { kind: "guide", section: g[1]! };
  const k = /^\/kpi\/([a-z0-9_]+)$/.exec(path);
  if (k) return { kind: "kpi", key: k[1]! };
  const d = /^\/d\/([a-z_]+)(?:\/([a-z0-9_-]+))?$/.exec(path);
  if (d) return { kind: "domain", domain: d[1]!, page: d[2] ?? null };
  return { kind: "not-found" };
}
