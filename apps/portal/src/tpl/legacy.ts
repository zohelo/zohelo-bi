// Addresses of the old portal (bi.zohelo.com before the template, routes on `main` until 2026-11) that someone
// may have bookmarked or linked, mapped to their template equivalents. main.tsx applies the result with
// history.replaceState before the first render, so the old address never shows a "not found" page.
//
//   /d/poland-overview, /d/overview   → /d/poland            (Polska w skrócie)
//   /d/labour-market                  → /d/labour
//   /d/prices-money                   → /d/economy/prices
//   /d/regional-comparison            → /d                   (no voivodeship dashboard yet: the dashboards page)
//   /d/population                     unchanged: the template's population dashboard has the same address
//   /explore?metric=<m>&…             → /explore?i=<kpi>      (old shelves, filters and transforms are dropped)
//   /catalogue?view=…&domain=…&source=…&q=… → /catalogue?q=…  (+ d, s on live data)
//   /embed?metric=<m>&…               → /kpi/<kpi>            (the chart-only iframe page is gone)
//   /kpi/<published key>              → /kpi/<sample key> on sample data only (SAMPLE_KPI); on live data the
//                                       published keys are the template's keys
// `lang` is kept everywhere.

/** Published KPI keys of the old portal → the sample catalogue's closest indicator (sample mode only). */
export const SAMPLE_KPI: Record<string, string> = {
  population: "population_total",
  gdp_current_prices: "gdp_nominal",
  unemployment_rate: "unemployment_lfs",
  registered_unemployment_rate: "registered_unemployment",
  inflation: "hicp_annual_rate",
  fx_rate: "eurpln",
  average_gross_wage: "avg_wage",
  gold_price: "gold_price_pln",
};

/** Old dashboard ids (dashboards/*.yaml, formats v1 and v2) → template path. */
export const OLD_DASHBOARDS: Record<string, string> = {
  overview: "/d/poland",
  "poland-overview": "/d/poland",
  "labour-market": "/d/labour",
  "prices-money": "/d/economy/prices",
  "regional-comparison": "/d",
};

const KEY = /^[a-z0-9_]{1,64}$/;

function withQuery(path: string, params: URLSearchParams): string {
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

/** The template address for an old-portal address, or null when the address is already a template one. */
export function legacyRedirect(url: URL, sample: boolean): string | null {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const p = url.searchParams;
  const keep = new URLSearchParams();
  const lang = p.get("lang");
  if (lang) keep.set("lang", lang);
  const kpi = (key: string) => (sample ? (SAMPLE_KPI[key] ?? key) : key);

  const d = /^\/d\/([a-z0-9-]+)$/.exec(path);
  if (d && OLD_DASHBOARDS[d[1]!]) return withQuery(OLD_DASHBOARDS[d[1]!]!, keep);

  const k = /^\/kpi\/([a-z0-9_]+)$/.exec(path);
  if (k && kpi(k[1]!) !== k[1]) return withQuery(`/kpi/${kpi(k[1]!)}`, keep);

  if (path === "/explore" && p.has("metric")) {
    const m = p.get("metric") ?? "";
    const out = new URLSearchParams();
    if (KEY.test(m)) out.set("i", kpi(m));
    if (lang) out.set("lang", lang);
    return withQuery("/explore", out);
  }

  if (path === "/embed" || path.startsWith("/embed/")) {
    const m = p.get("metric") ?? "";
    return withQuery(KEY.test(m) ? `/kpi/${kpi(m)}` : "/", keep);
  }

  if (path === "/catalogue" && (p.has("view") || p.has("domain") || p.has("source"))) {
    const out = new URLSearchParams();
    const q = p.get("q");
    if (q) out.set("q", q);
    // Old domain and source keys are the published ones: they mean nothing to the sample catalogue.
    if (!sample && p.get("domain")) out.set("d", p.get("domain")!);
    else if (!sample && p.get("source")) out.set("s", p.get("source")!);
    if (lang) out.set("lang", lang);
    return withQuery("/catalogue", out);
  }
  return null;
}
