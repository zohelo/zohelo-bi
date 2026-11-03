// Pure route table of the template portal.
//   /                      overview (Przegląd)
//   /d/<domain>            domain dashboard, its overview page
//   /d/<domain>/<page>     domain dashboard page (one per domain group, from dashboards/domains/<domain>.yaml)
//   /explore               explorer
//   /catalogue             indicator catalogue
//   /kpi/<kpi_key>         indicator page
//   /przewodnik            guide index; /przewodnik/<section> one guide page
//   /embed                 chart-only page for iframes (legacy)

export type TplPage =
  | { kind: "overview" }
  | { kind: "domain"; domain: string; page: string | null }
  | { kind: "explore" }
  | { kind: "catalogue" }
  | { kind: "kpi"; key: string }
  | { kind: "guide"; section: string | null }
  | { kind: "not-found" };

export function tplPageFor(pathname: string): TplPage {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "overview" };
  if (path === "/explore") return { kind: "explore" };
  if (path === "/catalogue") return { kind: "catalogue" };
  if (path === "/przewodnik") return { kind: "guide", section: null };
  const g = /^\/przewodnik\/([a-z0-9-]+)$/.exec(path);
  if (g) return { kind: "guide", section: g[1]! };
  const k = /^\/kpi\/([a-z0-9_]+)$/.exec(path);
  if (k) return { kind: "kpi", key: k[1]! };
  const d = /^\/d\/([a-z_]+)(?:\/([a-z0-9_-]+))?$/.exec(path);
  if (d) return { kind: "domain", domain: d[1]!, page: d[2] ?? null };
  return { kind: "not-found" };
}
