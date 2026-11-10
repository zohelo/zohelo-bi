// Dashboard filter bar: one row under the page header. Period is a segmented control (aria-pressed); area,
// level, source and dimension filters are labelled native selects styled as filter buttons. Every change is
// written to the URL (replaceState), so the address reproduces the view.

import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Segmented } from "../ui/blocks";
import { PERIOD_CHOICES, filterLabel, filterOptions, paramOf, withFilter, type DashState } from "./state";

/** Replace the URL without scrolling and tell the router. */
export function replaceUrl(to: string) {
  window.history.replaceState(null, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const PERIOD_LABEL: Record<string, [string, string]> = {
  "": ["Domyślny", "Default"],
  "1y": ["1 rok", "1 year"],
  "5y": ["5 lat", "5 years"],
  "10y": ["10 lat", "10 years"],
  max: ["Maks.", "Max"],
};

/** Period control (Domyślny | 1 rok | 5 lat | 10 lat | Maks.), right-aligned in the page header. */
export function PeriodControl({ state, lang, url }: { state: DashState; lang: Lang; url: URL }) {
  const pl = lang === "pl";
  return (
    <Segmented
      label={pl ? "Okres" : "Period"}
      value={state.period ?? ""}
      onChange={(v) => replaceUrl(withFilter(url, "period", v || null))}
      options={(["", ...PERIOD_CHOICES] as const).map((v) => ({ value: v, label: PERIOD_LABEL[v]![pl ? 0 : 1] }))}
    />
  );
}

/** Area, level, source and dimension filters (every declared filter except period). */
export function FilterBar({
  filters,
  state,
  kpis,
  cat,
  lang,
  url,
}: {
  filters: string[];
  state: DashState;
  kpis: Kpi[];
  cat: Catalog;
  lang: Lang;
  url: URL;
}) {
  const pl = lang === "pl";
  const set = (f: string, v: string | null) => replaceUrl(withFilter(url, f, v));
  const selects = filters.filter((f) => f !== "period");
  const current = (f: string): string =>
    f === "geography"
      ? (state.geo ?? "")
      : f === "geo_level"
        ? (state.level ?? "")
        : f === "source"
          ? (state.source ?? "")
          : (state.members[f] ?? "");
  return (
    <div className="t-dfilters" role="group" aria-label={pl ? "Filtry pulpitu" : "Dashboard filters"}>
      {selects.map((f) => {
        const opts = filterOptions(f, kpis, cat);
        const label = filterLabel(f, cat, pl);
        const groups = f === "geography" ? (["pl", "voivodeship", "country"] as const) : null;
        const id = `dfilter-${paramOf(f)}`;
        const option = (o: (typeof opts)[number]) => (
          <option key={o.value} value={o.value}>
            {pl ? o.label_pl : o.label_en}
          </option>
        );
        return (
          <label key={f} className="zt-filter t-dfilter" htmlFor={id}>
            <span>{label}</span>
            <select id={id} value={current(f)} onChange={(e) => set(f, e.target.value || null)}>
              {groups
                ? groups.map((g) => {
                    const list = opts.filter((o) => o.group === g);
                    if (!list.length) return null;
                    if (g === "pl") return list.map(option);
                    return (
                      <optgroup
                        key={g}
                        label={g === "voivodeship" ? (pl ? "Województwa" : "Voivodeships") : pl ? "Kraje UE" : "EU countries"}
                      >
                        {list.map(option)}
                      </optgroup>
                    );
                  })
                : opts.map(option)}
            </select>
          </label>
        );
      })}
    </div>
  );
}
