// Data of one explorer view: the fetch plan of the query, the series, the built view. Shared by the explorer page
// and by collections, which draw several saved views on one page.

import { useMemo } from "react";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Series } from "../../data";
import type { Lang } from "../../i18n";
import { sourceName } from "../chartData";
import { sourceOf, type Query, type Shape } from "./exploreState";
import { fmtDate } from "./indicatorInfo";
import { missing } from "./layout";
import { licenceOf, registerId } from "./sources";
import { MAX_FETCHES, buildView, fetchPlan, type ExploreView } from "./view";

export type ExploreData = { state: "loading" | "error" | "ready" | "too-big"; error?: string; view: ExploreView | null };

export function useExploreData(cat: Catalog | undefined, q: Query | null, shape: Shape | null, lang: Lang): ExploreData {
  const plan = useMemo(() => (cat && q && shape && !missing(q.chart, q).length ? fetchPlan(q, shape, cat) : []), [cat, q, shape]);
  const tooBig = plan.length > MAX_FETCHES;
  const key = plan.length && !tooBig ? JSON.stringify(plan) : null;
  const loaded = useData<Series[]>(key, async () => {
    const parts = await Promise.all(
      plan.map((f) => data.series(f.kpi, { geographies: f.geographies, sources: [f.source], members: f.members })),
    );
    return parts.flat();
  });
  return useMemo((): ExploreData => {
    if (!cat || !q || !shape || !q.i.length) return { state: "ready", view: null };
    if (missing(q.chart, q).length) return { state: "ready", view: buildView(cat, q, shape, [], lang) };
    if (tooBig) return { state: "too-big", view: null };
    if (loaded.error) return { state: "error", error: loaded.error, view: null };
    if (!loaded.data || loaded.loading) return { state: "loading", view: null };
    return { state: "ready", view: buildView(cat, q, shape, loaded.data, lang) };
  }, [cat, q, shape, loaded, lang, tooBig]);
}

/** "Źródło: GUS (gus_bdl) · licencja CC BY 4.0 · dane z 24 paź 2026": the line under every exported chart. */
export function sourceLineOf(cat: Catalog, q: Query, kpis: Kpi[], lang: Lang): string {
  const pl = lang === "pl";
  const sources = [...new Set(kpis.map((k) => sourceOf(q, k)))];
  return `${pl ? "Źródło" : "Source"}: ${sources.map((s) => `${sourceName(cat, s, lang)} (${registerId(cat, s)})`).join(", ") || "–"} · ${
    pl ? "licencja" : "licence"
  } ${[...new Set(sources.map((s) => licenceOf(cat, s)?.name ?? "–"))].join(", ")} · ${pl ? "dane z" : "data as of"} ${fmtDate(cat.generated_at, lang)}${
    cat.sample ? (pl ? " · dane przykładowe" : " · sample data") : ""
  }`;
}
