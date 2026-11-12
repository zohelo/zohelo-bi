// Katalog danych (design template: Catalogue page type): large search, filter buttons (Dziedzina, Obszar,
// Częstotliwość, Źródło, Zasięg), sort, dense rows with sparkline, latest value, coverage and sources.
// Filters live in the URL. Latest values and sparklines load only for the rows on screen.

import { useEffect, useId, useMemo, useState } from "react";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Latest, type Series } from "../../data";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { fmtPeriod, fmtValue, freqLabel, latestUnit } from "../format";
import { kpiName, sourceName } from "../chartData";
import { DraftBadge, PageHeader, Sparkline, Sr } from "../ui/blocks";
import { Icon } from "../ui/icons";
import {
  activeFilterCount,
  applyCatalogue,
  CAT_SORTS,
  EMPTY_FILTERS,
  effectiveSort,
  parseCatalogue,
  serialiseCatalogue,
  type CatFilters,
  type CatSort,
} from "../explore/catalogueState";
import { domainOf, freqRange, geoCoverage, nameOf, SCOPES, scopeLabel, yearOf } from "../explore/kpiInfo";
import { ListboxButton, type ListOption } from "../explore/Listbox";
import { plural, searchDocs } from "../explore/search";
import { seriesWindow } from "../explore/fetch";
import "../explore/explore.css";

const PAGE = 50;
const ALL = "";

function sortLabel(s: CatSort, pl: boolean): string {
  return {
    relevance: pl ? "Trafność" : "Relevance",
    newest: pl ? "Najnowsze dane" : "Newest data",
    name: pl ? "Nazwa" : "Name",
    longest: pl ? "Najdłuższe serie" : "Longest series",
  }[s];
}

export function CataloguePage() {
  const { lang, catalog, url } = usePage();
  const pl = lang === "pl";
  const title = pl ? "Katalog danych" : "Data catalogue";

  const [f, setF] = useState<CatFilters>(() => parseCatalogue(url.search));
  const [shown, setShown] = useState(PAGE);
  // Back/forward or a link to the catalogue with other filters: follow the URL (during render, not in an effect).
  const [seenSearch, setSeenSearch] = useState(url.search);
  if (url.search !== seenSearch) {
    setSeenSearch(url.search);
    const next = parseCatalogue(url.search);
    if (serialiseCatalogue(next) !== serialiseCatalogue(f)) setF(next);
  }
  const qs = serialiseCatalogue(f);
  useEffect(() => {
    if (window.location.pathname.startsWith("/catalogue") && window.location.search !== qs)
      window.history.replaceState(null, "", `/catalogue${qs}`);
  }, [qs]);
  const update = (patch: Partial<CatFilters>) => {
    setF((old) => ({ ...old, ...patch }));
    setShown(PAGE);
  };

  const docs = useMemo(() => (catalog ? searchDocs(catalog) : []), [catalog]);
  const list = useMemo(() => (catalog ? applyCatalogue(catalog, f, docs) : []), [catalog, f, docs]);
  const rows = list.slice(0, shown);

  useMeta(title, [{ label: title }], [lang, qs, catalog ? 1 : 0]);

  if (!catalog)
    return (
      <>
        <PageHeader title={title} />
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie katalogu" : "Loading the catalogue"}
        </div>
      </>
    );

  const sort = effectiveSort(f);
  const domains = catalog.domains.filter((d) => d.level === "domain" && catalog.kpis.some((k) => k.domain_key === d.domain_key));
  const groups = catalog.domains
    .filter(
      (g) => g.level === "group" && (!f.domain || g.parent_key === f.domain) && catalog.kpis.some((k) => k.group_key === g.domain_key),
    )
    .sort(
      (a, b) => (domainOf(catalog, a.parent_key ?? "")?.sort ?? 0) - (domainOf(catalog, b.parent_key ?? "")?.sort ?? 0) || a.sort - b.sort,
    );
  const count = (patch: Partial<CatFilters>) => String(applyCatalogue(catalog, { ...f, ...patch, sort: "name" }, docs).length);
  const all = pl ? "wszystkie" : "all";
  const opt = (patch: Partial<CatFilters>, value: string, label: string): ListOption => ({ value, label, hint: count(patch) });

  const sources = catalog.sources.filter((s) => catalog.kpis.some((k) => k.source_keys.includes(s.source_key)));
  const n = list.length;
  const nWord = plural(n, lang, ["wskaźnik", "wskaźniki", "wskaźników"], ["indicator", "indicators"]);
  const active = activeFilterCount(f);
  const total = catalog.kpis.length;

  return (
    <>
      <PageHeader
        title={title}
        lead={
          pl
            ? `${total} ${plural(total, lang, ["wskaźnik", "wskaźniki", "wskaźników"], ["indicator", "indicators"])} z ${sources.length} źródeł, uporządkowanych w ${domains.length} dziedzinach statystyki publicznej.`
            : `${total} indicators from ${sources.length} sources, organised in ${domains.length} domains of official statistics.`
        }
        right={
          <>
            <SortControl value={sort} searching={!!f.q.trim()} pl={pl} onChange={(s) => update({ sort: s })} />
          </>
        }
      />

      <div role="search" className="ex-cat__find" aria-label={pl ? "Szukaj i filtruj wskaźniki" : "Search and filter indicators"}>
        <label className="zt-search ex-search-lg">
          <Icon name="search" size={20} />
          <input
            type="search"
            value={f.q}
            onChange={(e) => update({ q: e.target.value })}
            aria-label={pl ? "Szukaj w katalogu wskaźników" : "Search the indicator catalogue"}
            placeholder={
              pl
                ? "Czego szukasz? np. bezrobocie w województwach, kurs euro"
                : "What are you looking for? e.g. unemployment by region, euro rate"
            }
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className="ex-filters">
          <ListboxButton
            label={pl ? "Dziedzina" : "Domain"}
            value={f.domain ?? ALL}
            onChange={(v) => update({ domain: v || null, group: v && f.group && !f.group.startsWith(`${v}.`) ? null : f.group })}
            options={[opt({ domain: null }, ALL, all), ...domains.map((d) => opt({ domain: d.domain_key }, d.domain_key, nameOf(d, lang)))]}
          />
          <ListboxButton
            label={pl ? "Obszar" : "Area"}
            value={f.group ?? ALL}
            onChange={(v) => update({ group: v || null })}
            options={[opt({ group: null }, ALL, all), ...groups.map((g) => opt({ group: g.domain_key }, g.domain_key, nameOf(g, lang)))]}
          />
          <ListboxButton
            label={pl ? "Częstotliwość" : "Frequency"}
            value={f.freq ?? ALL}
            onChange={(v) => update({ freq: (v || null) as CatFilters["freq"] })}
            options={[opt({ freq: null }, ALL, all), ...(["M", "Q", "A"] as const).map((q) => opt({ freq: q }, q, freqLabel(q, lang)))]}
          />
          <ListboxButton
            label={pl ? "Źródło" : "Source"}
            value={f.source ?? ALL}
            onChange={(v) => update({ source: v || null })}
            options={[opt({ source: null }, ALL, all), ...sources.map((s) => opt({ source: s.source_key }, s.source_key, nameOf(s, lang)))]}
          />
          <ListboxButton
            label={pl ? "Zasięg" : "Coverage"}
            value={f.scope ?? ALL}
            onChange={(v) => update({ scope: (v || null) as CatFilters["scope"] })}
            options={[opt({ scope: null }, ALL, all), ...SCOPES.map((s) => opt({ scope: s }, s, scopeLabel(s, lang)))]}
          />
          {active ? (
            <button type="button" className="zt-btn zt-btn--ghost" onClick={() => update({ ...EMPTY_FILTERS, sort: f.sort })}>
              {pl ? "Wyczyść filtry" : "Clear filters"}
            </button>
          ) : null}
        </div>
      </div>

      <p className="zt-sr" role="status">
        {n} {nWord}
      </p>

      <section className="zt-card ex-cat" aria-labelledby="ex-cat-count">
        <div className="ex-cat__head">
          <h2 className="card-title" id="ex-cat-count">
            {n} {nWord}
          </h2>
          <span className="caption ex-muted">
            {pl ? "Sortowanie: " : "Sorted by: "}
            {sortLabel(sort, pl).toLowerCase()}
            {n > rows.length ? (pl ? ` · pokazano ${rows.length}` : ` · showing ${rows.length}`) : ""}
          </span>
        </div>
        {n ? (
          <CatalogueRows cat={catalog} rows={rows} lang={lang} />
        ) : (
          <div className="zt-state ex-cat__empty">
            <strong>{pl ? "Nie znaleziono wskaźników" : "No indicators found"}</strong>
            <span>
              {f.q.trim()
                ? pl
                  ? `Brak wyników dla „${f.q.trim()}” przy wybranych filtrach. Sprawdź pisownię albo wyczyść filtry.`
                  : `No results for “${f.q.trim()}” with these filters. Check the spelling or clear the filters.`
                : pl
                  ? "Żaden wskaźnik nie spełnia wszystkich filtrów naraz."
                  : "No indicator matches all filters at once."}
            </span>
            <button type="button" className="zt-btn" onClick={() => update({ ...EMPTY_FILTERS, sort: f.sort })}>
              {pl ? "Wyczyść wyszukiwanie i filtry" : "Clear search and filters"}
            </button>
          </div>
        )}
        {n > rows.length ? (
          <div className="ex-cat__more">
            <button type="button" className="zt-btn" onClick={() => setShown((s) => s + PAGE)}>
              {pl
                ? `Pokaż kolejne (${Math.min(PAGE, n - rows.length)} z ${n - rows.length})`
                : `Show more (${Math.min(PAGE, n - rows.length)} of ${n - rows.length})`}
            </button>
          </div>
        ) : null}
      </section>
      <p className="caption ex-muted">
        {pl
          ? "Dziedziny bez wskaźników są w menu w wierszu „Wkrótce”, więc widać, co jest w planie."
          : "Domains without indicators are listed under “Coming soon” in the menu."}
      </p>
    </>
  );
}

function SortControl({
  value,
  searching,
  pl,
  onChange,
}: {
  value: CatSort;
  searching: boolean;
  pl: boolean;
  onChange: (s: CatSort) => void;
}) {
  const id = useId();
  return (
    <div className="ex-sort">
      <label htmlFor={id} className="small ex-muted">
        {pl ? "Sortuj" : "Sort"}
      </label>
      <select id={id} className="ex-select" value={value} onChange={(e) => onChange(e.target.value as CatSort)}>
        {CAT_SORTS.filter((s) => s !== "relevance" || searching).map((s) => (
          <option key={s} value={s}>
            {sortLabel(s, pl)}
          </option>
        ))}
      </select>
    </div>
  );
}

type RowData = { latest?: Latest | null; spark?: Series };

function CatalogueRows({ cat, rows, lang }: { cat: Catalog; rows: Kpi[]; lang: "pl" | "en" }) {
  const pl = lang === "pl";
  const keys = rows.map((k) => k.kpi_key).join(",");
  const loaded = useData(`cat-rows:${keys}`, () =>
    Promise.all(
      rows.map((k): Promise<RowData> =>
        Promise.all([
          data.latest(k.kpi_key).catch(() => undefined),
          seriesWindow(k.kpi_key, { from: String(yearOf(k.last_period) - 5) })
            .then((s) => s[0])
            .catch(() => undefined),
        ]).then(([latest, spark]) => ({ latest, spark })),
      ),
    ).then((list) => new Map(rows.map((k, i) => [k.kpi_key, list[i]!]))),
  );
  return (
    <div className="ex-cat__wrap">
      <table className="zt-table ex-cat__table">
        <caption className="zt-sr">
          {pl ? "Wskaźniki: ostatnia wartość, zasięg i źródła" : "Indicators: latest value, coverage and sources"}
        </caption>
        <thead>
          <tr>
            <th scope="col">{pl ? "Wskaźnik" : "Indicator"}</th>
            <th scope="col" className="ex-c-trend">
              {pl ? "Trend (5 lat)" : "Trend (5 years)"}
            </th>
            <th scope="col" className="num">
              {pl ? "Ostatnia wartość" : "Latest value"}
            </th>
            <th scope="col" className="ex-c-cov">
              {pl ? "Zasięg" : "Coverage"}
            </th>
            <th scope="col" className="ex-c-src">
              {pl ? "Źródła" : "Sources"}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const d = loaded.data?.get(k.kpi_key);
            const l = d?.latest;
            return (
              <tr key={k.kpi_key}>
                <th scope="row" className="ex-cat__namecell">
                  <Link to={`/kpi/${k.kpi_key}`} className="ex-cat__name">
                    {kpiName(k, lang)}
                  </Link>{" "}
                  <DraftBadge kpis={[k]} lang={lang} small />
                  <span className="caption ex-muted ex-block">
                    {nameOf(domainOf(cat, k.domain_key), lang)} · {nameOf(domainOf(cat, k.group_key), lang)}
                  </span>
                </th>
                <td className="ex-c-trend">{d?.spark ? <Sparkline values={d.spark.points.map((p) => p.value)} /> : null}</td>
                <td className="num ex-cat__value">
                  {l ? (
                    <>
                      <strong className="ex-block">{fmtValue(l.value, latestUnit(l, k), cat, lang)}</strong>
                      <Sr>, </Sr>
                      <span className="caption ex-muted">{fmtPeriod(l.period, lang)}</span>
                    </>
                  ) : loaded.loading ? (
                    <span className="caption ex-muted">…</span>
                  ) : (
                    "–"
                  )}
                </td>
                <td className="ex-c-cov">
                  <span className="ex-block">{geoCoverage(k, cat, lang)}</span>
                  <span className="caption ex-muted">{freqRange(k, lang)}</span>
                </td>
                <td className="ex-c-src small">{k.source_keys.map((s) => sourceName(cat, s, lang)).join(" · ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
