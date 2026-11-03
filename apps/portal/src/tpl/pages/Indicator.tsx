// Strona wskaźnika (design template: Indicator page type): breadcrumb, facts as tags, latest reading beside
// the main chart, comparisons (EU ranking, voivodeship tile map and ranking), breakdown, the same measure in
// other sources, methodology and licence, citation, related indicators. Unknown key: friendly not-found.

import { Fragment, useMemo, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Latest, type Series } from "../../data";
import { Link, navigate } from "../../router";
import { legendItems, toTable, ZChart, type ZChartProps, type ZSeries } from "@zohelo/visuals";
import { useMeta, usePage } from "../context";
import { basisFor, fmtChange, fmtPeriod, fmtValue, freqLabel } from "../format";
import { geoName, kpiName, sourceName, toZSeries, zUnit } from "../chartData";
import { ChartCard, KpiTile, PageHeader, Sr, StatusTag, type CardState } from "../ui/blocks";
import { TableView } from "../ui/TableView";
import { CopyButton } from "../explore/actions";
import { fmtFor, rankGeos, rankedBars, tileMap, type Ranked } from "../explore/charts";
import { buildCsv, csvFileName, downloadCsv } from "../explore/csv";
import { exploreLink } from "../explore/exploreState";
import { findingTitle, lastPoint, peakPoint } from "../explore/findings";
import { domainOf, euGeographies, geoCoverage, groupPath, hasVoivodeships, nameOf, unitName, voivodeshipKeys } from "../explore/kpiInfo";
import { plural, searchDocs, suggestKpis } from "../explore/search";
import { exportMeta, licenceOf, matrixCsv, registerId, sampleNotice, seriesMatrix } from "../explore/sources";
import { DataTable, Legend } from "../explore/ui";
import { bandFor, citationText, fmtDate, relatedKpis } from "../explore/indicatorInfo";
import { seriesWindow } from "../explore/fetch";
import "../explore/explore.css";

export function IndicatorPage({ kpiKey }: { kpiKey: string }) {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  const kpi = catalog?.kpis.find((k) => k.kpi_key === kpiKey);
  const dom = catalog && kpi ? domainOf(catalog, kpi.domain_key) : undefined;
  const grp = catalog && kpi ? domainOf(catalog, kpi.group_key) : undefined;
  const title = kpi
    ? kpiName(kpi, lang)
    : catalog
      ? pl
        ? "Nie znaleziono wskaźnika"
        : "Indicator not found"
      : pl
        ? "Wskaźnik"
        : "Indicator";
  useMeta(
    title,
    kpi && catalog
      ? [
          { label: pl ? "Dashboardy" : "Dashboards", to: "/" },
          { label: nameOf(dom, lang, kpi.domain_key), to: `/d/${kpi.domain_key}` },
          { label: nameOf(grp, lang, kpi.group_key), to: groupPath(kpi.group_key) },
          { label: title },
        ]
      : [{ label: pl ? "Katalog danych" : "Data catalogue", to: "/catalogue" }, { label: title }],
    [lang, kpi ? 1 : 0, catalog ? 1 : 0],
  );

  if (!catalog)
    return (
      <>
        <PageHeader title={title} />
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie" : "Loading"}
        </div>
      </>
    );
  if (!kpi) return <KpiNotFound cat={catalog} kpiKey={kpiKey} lang={lang} />;
  return <IndicatorBody cat={catalog} kpi={kpi} lang={lang} />;
}

function KpiNotFound({ cat, kpiKey, lang }: { cat: Catalog; kpiKey: string; lang: Lang }) {
  const pl = lang === "pl";
  const words = kpiKey.replace(/_/g, " ");
  const docs = useMemo(() => searchDocs(cat), [cat]);
  const suggestions = suggestKpis(docs, words);
  return (
    <>
      <PageHeader
        title={pl ? "Nie znaleziono wskaźnika" : "Indicator not found"}
        lead={
          pl
            ? `W katalogu nie ma wskaźnika o kluczu „${kpiKey}”. Mógł zmienić nazwę albo link jest niepełny.`
            : `The catalogue has no indicator with the key “${kpiKey}”. It may have been renamed or the link is incomplete.`
        }
      />
      <section className="zt-card ex-notfound" aria-labelledby="ex-nf-h">
        <h2 className="card-title ex-m0" id="ex-nf-h">
          {pl ? "Co możesz zrobić" : "What you can do"}
        </h2>
        <ul className="ex-list">
          <li>
            <Link to={`/catalogue?q=${encodeURIComponent(words)}`}>
              {pl ? `Szukaj „${words}” w katalogu wskaźników` : `Search the catalogue for “${words}”`}
            </Link>
          </li>
          <li>
            <Link to="/catalogue">{pl ? "Przejrzyj cały katalog" : "Browse the whole catalogue"}</Link>
          </li>
          <li>
            <Link to="/">{pl ? "Wróć do przeglądu" : "Back to the overview"}</Link>
          </li>
        </ul>
        {suggestions.length ? (
          <>
            <h3 className="small ex-m0 ex-strong">{pl ? "Może chodziło o:" : "Did you mean:"}</h3>
            <ul className="ex-list">
              {suggestions.map((k) => (
                <li key={k.kpi_key}>
                  <Link to={`/kpi/${k.kpi_key}`}>{kpiName(k, lang)}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>
    </>
  );
}

const loadingState: CardState = { kind: "loading" };

function IndicatorBody({ cat, kpi, lang }: { cat: Catalog; kpi: Kpi; lang: Lang }) {
  const pl = lang === "pl";
  const key = kpi.kpi_key;
  const fmt = fmtFor(cat, kpi, lang);
  const eu = euGeographies(kpi, cat);
  const voiv = hasVoivodeships(kpi);
  const last = kpi.last_period;
  const lastYear = Number(last.slice(0, 4));

  const latest = useData(`kpi-latest:${key}`, () => data.latest(key));
  const history = useData(`kpi-hist:${key}`, () => data.series(key, { geographies: ["PL"] }));
  const euData = useData(eu.length ? `kpi-eu:${key}` : null, () => seriesWindow(key, { geographies: ["PL", ...eu], from: last, to: last }));
  const voivData = useData(voiv ? `kpi-voiv:${key}` : null, () =>
    seriesWindow(key, { geographies: ["PL", ...voivodeshipKeys(cat)], from: last, to: last }),
  );
  const srcData = useData(kpi.source_keys.length > 1 ? `kpi-src:${key}` : null, () =>
    seriesWindow(key, { sources: kpi.source_keys, from: last, to: last }),
  );
  const dims = kpi.dimension_keys.slice(0, 2);
  const dimData = useData(dims.length ? `kpi-dims:${key}` : null, () =>
    Promise.all(dims.map((d) => seriesWindow(key, { split: d, from: String(lastYear - 10) }))),
  );
  const related = relatedKpis(cat, kpi);
  const relLatest = useData(`kpi-rel:${key}`, () => Promise.all(related.map((k) => data.latest(k.kpi_key).catch(() => undefined))));

  const hist = history.data?.[0];
  const points = useMemo(() => (hist ? hist.points.map((p) => ({ x: p.period, y: p.value })) : []), [hist]);
  const peak = peakPoint(points);
  const euRank = euData.data ? rankGeos(euData.data, cat, lang) : [];
  const voivRank = voivData.data ? rankGeos(voivData.data, cat, lang) : [];
  const l = latest.data;
  const unit = zUnit(cat, kpi.unit_key, l?.value ?? 1);
  const band = bandFor(kpi);
  const plName = geoName(cat, "PL", lang);

  // Main chart
  const lastP = lastPoint(points);
  const mainTitle =
    peak && lastP && peak.x !== lastP.x
      ? pl
        ? `Szczyt ${fmt.value(peak.y)} w ${fmt.period(peak.x)}, teraz ${fmt.value(lastP.y)}`
        : `Peak of ${fmt.value(peak.y)} in ${fmt.period(peak.x)}, now ${fmt.value(lastP.y)}`
      : findingTitle([{ id: "PL", label: plName, points }], fmt, lang);
  const main: ZChartProps = {
    type: "line-band",
    series: [{ id: "PL", label: plName, role: "hero", points }],
    unit,
    lang,
    ariaLabel: `${kpiName(kpi, lang)}: ${mainTitle}`,
    band,
    bandLabel: band ? (pl ? "cel NBP 2,5% ± 1 pp" : "NBP target 2.5% ± 1 pp") : undefined,
    annotate:
      peak && lastP && peak.x !== lastP.x
        ? { x: peak.x, label: `${pl ? "Szczyt" : "Peak"}: ${fmt.value(peak.y)} (${fmt.period(peak.x)})` }
        : undefined,
    formatPeriod: fmt.period,
    height: 300,
  };
  const range = `${fmtPeriod(kpi.first_period, lang)}–${fmtPeriod(last, lang)}`;
  const measure = `${unitName(cat, kpi.unit_key, lang)}, ${freqLabel(kpi.frequency, lang)}`;
  const src0 = kpi.source_keys[0]!;
  const sourceLine = (keys: string[], extra?: string) => (
    <>
      <span>
        {pl ? "Źródło: " : "Source: "}
        {keys.map((s) => `${sourceName(cat, s, lang)} (${registerId(cat, s)})`).join(", ")}
      </span>
      {extra ? <span>{extra}</span> : null}
    </>
  );
  const nextRel = l?.next_release ? `${pl ? "Następna publikacja" : "Next release"}: ${fmtDate(l.next_release, lang)}` : undefined;

  // Comparison cards
  const cards: { key: string; node: (span: 6 | 12) => ReactNode }[] = [];
  if (eu.length) {
    const avg = euRank.find((r) => r.key === "EU27");
    const rows = euRank.filter((r) => r.key !== "EU27");
    const pos = rows.findIndex((r) => r.key === "PL") + 1;
    const plRow = rows.find((r) => r.key === "PL");
    const t = !plRow
      ? pl
        ? "Polska na tle UE"
        : "Poland in the EU"
      : avg
        ? `${pl ? "Polska" : "Poland"} ${plRow.value > avg.value ? (pl ? "powyżej" : "above") : plRow.value < avg.value ? (pl ? "poniżej" : "below") : pl ? "na poziomie" : "at"} ${pl ? "średniej UE-27" : "the EU-27 average"} (${pos}. ${pl ? "z" : "of"} ${rows.length})`
        : `${pl ? "Polska" : "Poland"}: ${pos}. ${pl ? "miejsce z" : "of"} ${rows.length}`;
    const chart: ZChartProps = {
      ...rankedBars(rows, {
        unit,
        lang,
        ariaLabel: t,
        highlight: "PL",
        reference: avg ? { value: avg.value, label: `${geoName(cat, "EU27", lang)} ${fmt.value(avg.value)}` } : undefined,
        seriesLabel: unitName(cat, kpi.unit_key, lang),
      }),
      height: rows.length * 28 + 40,
    };
    cards.push({
      key: "eu",
      node: (span) => (
        <ChartCard
          span={span}
          lang={lang}
          title={t}
          sub={`${measure}, ${fmt.period(last)} · ${rows.length} ${plural(rows.length, lang, ["kraj", "kraje", "krajów"], ["country", "countries"])}${avg ? (pl ? " i średnia UE-27" : " and the EU-27 average") : ""}`}
          state={euData.error ? { kind: "error", text: euData.error } : euData.data ? undefined : loadingState}
          chart={() => <ZChart {...chart} />}
          table={() => <TableView table={toTable(chart)} />}
          legend={legendItems(chart).length > 1 ? <Legend chart={chart} bare /> : undefined}
          source={sourceLine([src0])}
        />
      ),
    });
  }
  if (voiv) {
    const rows = voivRank.filter((r) => r.key !== "PL");
    const plRow = voivRank.find((r) => r.key === "PL");
    const mapTitle = rows.length
      ? findingTitle(
          rows.map((r) => ({ id: r.key, label: r.label, points: [{ x: r.period, y: r.value }] })),
          fmt,
          lang,
        )
      : pl
        ? "Województwa"
        : "Voivodeships";
    const map: ZChartProps = { ...tileMap(rows, cat, { unit, lang, ariaLabel: mapTitle, seriesLabel: fmt.period(last) }), height: 280 };
    const above = plRow ? rows.filter((r) => r.value > plRow.value).length : 0;
    const rankTitle = plRow
      ? pl
        ? `${above} z ${rows.length} województw powyżej średniej krajowej`
        : `${above} of ${rows.length} voivodeships above the national figure`
      : mapTitle;
    const bars: ZChartProps = {
      ...rankedBars(rows, {
        unit,
        lang,
        ariaLabel: rankTitle,
        highlight: rows[0]?.key,
        reference: plRow ? { value: plRow.value, label: `${plName} ${fmt.value(plRow.value)}` } : undefined,
        seriesLabel: unitName(cat, kpi.unit_key, lang),
      }),
      height: rows.length * 26 + 40,
    };
    const st: CardState | undefined = voivData.error ? { kind: "error", text: voivData.error } : voivData.data ? undefined : loadingState;
    const sub = `${measure}, ${fmt.period(last)}, 16 ${pl ? "województw" : "voivodeships"}`;
    cards.push({
      key: "map",
      node: (span) => (
        <ChartCard
          span={span}
          lang={lang}
          title={mapTitle}
          sub={sub}
          state={st}
          chart={() => <ZChart {...map} />}
          table={() => <TableView table={toTable(map)} />}
          legend={legendItems(map).length > 1 ? <Legend chart={map} bare /> : undefined}
          source={sourceLine([src0])}
        />
      ),
    });
    cards.push({
      key: "voivrank",
      node: (span) => (
        <ChartCard
          span={span}
          lang={lang}
          title={rankTitle}
          sub={`${sub} · ${pl ? "linia: Polska" : "line: Poland"}`}
          state={st}
          chart={() => <ZChart {...bars} />}
          table={() => <TableView table={toTable(bars)} />}
          legend={legendItems(bars).length > 1 ? <Legend chart={bars} bare /> : undefined}
          source={sourceLine([src0])}
        />
      ),
    });
  }
  dims.forEach((d, i) => {
    const series: Series[] | undefined = dimData.data?.[i];
    const zs: ZSeries[] = series ? toZSeries(series, cat, lang).map((z) => ({ ...z, role: "series" as const })) : [];
    const dimName = nameOf(
      cat.dimensions.find((x) => x.dimension_key === d),
      lang,
      d,
    );
    const t = zs.length ? findingTitle(zs, fmt, lang) : dimName;
    const chart: ZChartProps = { type: "line-highlight", series: zs, unit, lang, ariaLabel: t, formatPeriod: fmt.period, height: 260 };
    cards.push({
      key: `dim-${d}`,
      node: (span) => (
        <ChartCard
          span={span}
          lang={lang}
          title={t}
          sub={`${measure}, ${lastYear - 10}–${lastYear} · ${pl ? "podział" : "breakdown"}: ${dimName}`}
          state={dimData.error ? { kind: "error", text: dimData.error } : series ? undefined : loadingState}
          chart={() => <ZChart {...chart} />}
          table={() => <TableView table={toTable(chart)} />}
          legend={legendItems(chart).length > 1 ? <Legend chart={chart} bare /> : undefined}
          source={sourceLine([src0])}
        />
      ),
    });
  });
  if (kpi.source_keys.length > 1)
    cards.push({
      key: "sources",
      node: (span) => <OtherSources cat={cat} kpi={kpi} lang={lang} series={srcData.data} error={srcData.error} span={span} />,
    });

  // Facts
  const status = l?.flags.includes("p") ? "preliminary" : "current";
  const statusWord = status === "preliminary" ? (pl ? "Wstępne" : "Preliminary") : pl ? "Aktualne" : "Current";

  return (
    <>
      <PageHeader
        title={kpiName(kpi, lang)}
        lead={
          pl
            ? `${nameOf(domainOf(cat, kpi.group_key), lang)} (${nameOf(domainOf(cat, kpi.domain_key), lang)}). Dane ${freqLabel(kpi.frequency, lang)} dla zasięgu: ${geoCoverage(kpi, cat, lang)}.${kpi.source_keys.length > 1 ? ` Ta sama miara z ${kpi.source_keys.length} źródeł.` : ""}`
            : `${nameOf(domainOf(cat, kpi.group_key), lang)} (${nameOf(domainOf(cat, kpi.domain_key), lang)}). ${freqLabel(kpi.frequency, lang)} data for: ${geoCoverage(kpi, cat, lang)}.${kpi.source_keys.length > 1 ? ` The same measure from ${kpi.source_keys.length} sources.` : ""}`
        }
        right={
          <>
            <Link to={exploreLink(kpi, cat)} className="zt-btn">
              {pl ? "Otwórz w eksploratorze" : "Open in explorer"}
            </Link>
            <button type="button" className="zt-btn zt-btn--primary" onClick={() => void downloadHistory(cat, kpi, lang)}>
              {pl ? "Pobierz dane" : "Download data"}
            </button>
          </>
        }
      />
      <div className="ex-facts">
        <ul className="ex-tags" aria-label={pl ? "Fakty o wskaźniku" : "Indicator facts"}>
          <li className="zt-chip ex-fact">{unitName(cat, kpi.unit_key, lang)}</li>
          <li className="zt-chip ex-fact">{freqLabel(kpi.frequency, lang)}</li>
          <li className="zt-chip ex-fact">{geoCoverage(kpi, cat, lang)}</li>
          <li className="zt-chip ex-fact">
            {pl ? "od " : "since "}
            {fmtPeriod(kpi.first_period, lang)}
          </li>
          <li>
            <StatusTag kind={status}>
              {statusWord} · {fmtPeriod(last, lang)}
            </StatusTag>
          </li>
        </ul>
        {l ? (
          <p className="caption ex-muted ex-m0">
            {pl
              ? `Ostatni odczyt ${fmtPeriod(l.period, lang)}, pobrany ${fmtDate(l.loaded_at, lang)}.${l.next_release ? ` Następny: ${fmtDate(l.next_release, lang)}.` : ""}`
              : `Latest reading ${fmtPeriod(l.period, lang)}, loaded ${fmtDate(l.loaded_at, lang)}.${l.next_release ? ` Next: ${fmtDate(l.next_release, lang)}.` : ""}`}
          </p>
        ) : null}
      </div>

      <section className="t-grid" aria-labelledby="ex-kpi-now">
        <h2 className="zt-sr" id="ex-kpi-now">
          {pl ? "Najnowszy odczyt i historia" : "Latest reading and history"}
        </h2>
        <LatestPanel cat={cat} kpi={kpi} lang={lang} latest={l} error={latest.error} peak={peak} euRank={euRank} band={band} />
        <ChartCard
          span={8}
          lang={lang}
          title={mainTitle}
          sub={`${measure}, ${range}${band ? (pl ? " · pasmo: cel NBP 2,5% ± 1 pp" : " · band: NBP target 2.5% ± 1 pp") : ""}`}
          state={history.error ? { kind: "error", text: history.error } : hist ? undefined : loadingState}
          chart={() => <ZChart {...main} />}
          table={() => <TableView table={toTable(main)} />}
          legend={legendItems(main).length > 1 ? <Legend chart={main} bare /> : undefined}
          source={sourceLine([src0], nextRel)}
          actions={[{ label: pl ? "Otwórz w eksploratorze" : "Open in explorer", onSelect: () => navigate(exploreLink(kpi, cat)) }]}
        />
      </section>

      {cards.length ? (
        <section className="t-grid" aria-labelledby="ex-kpi-cmp">
          <h2 className="zt-sr" id="ex-kpi-cmp">
            {pl ? "Porównania i źródła" : "Comparisons and sources"}
          </h2>
          {cards.map((c, i) => (
            <Fragment key={c.key}>{c.node(cards.length % 2 === 1 && i === cards.length - 1 ? 12 : 6)}</Fragment>
          ))}
        </section>
      ) : null}

      <section className="t-grid" aria-labelledby="ex-kpi-about">
        <h2 className="zt-sr" id="ex-kpi-about">
          {pl ? "Metodologia i cytowanie" : "Methodology and citation"}
        </h2>
        <Methodology cat={cat} kpi={kpi} lang={lang} />
        <Citation cat={cat} kpi={kpi} lang={lang} />
      </section>

      {related.length ? (
        <section className="t-section" aria-labelledby="ex-kpi-rel">
          <h2 id="ex-kpi-rel" className="section-title">
            {pl ? "Powiązane wskaźniki" : "Related indicators"}
          </h2>
          <div className="t-kpis">
            {related.map((k, i) => {
              const r: Latest | undefined = relLatest.data?.[i];
              return (
                <KpiTile
                  key={k.kpi_key}
                  to={`/kpi/${k.kpi_key}`}
                  label={kpiName(k, lang)}
                  period={r ? fmtPeriod(r.period, lang) : "…"}
                  value={r ? fmtValue(r.value, k.unit_key, cat, lang) : "…"}
                  change={r ? fmtChange(r.value, r.previous_value, k.unit_key, basisFor(k.frequency), cat, lang) : undefined}
                  context={nameOf(domainOf(cat, k.group_key), lang)}
                  source={r ? sourceName(cat, r.source_key, lang) : undefined}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}

function LatestPanel({
  cat,
  kpi,
  lang,
  latest,
  error,
  peak,
  euRank,
  band,
}: {
  cat: Catalog;
  kpi: Kpi;
  lang: Lang;
  latest: Latest | undefined;
  error?: string;
  peak: { x: string; y: number } | undefined;
  euRank: Ranked[];
  band?: [number, number];
}) {
  const pl = lang === "pl";
  const l = latest;
  const fmt = fmtFor(cat, kpi, lang);
  const rows = euRank.filter((r) => r.key !== "EU27");
  const pos = rows.findIndex((r) => r.key === "PL") + 1;
  const avg = euRank.find((r) => r.key === "EU27");
  const ctx: string[] = [];
  if (l && band)
    ctx.push(
      l.value >= band[0] && l.value <= band[1]
        ? pl
          ? "W paśmie celu NBP (1,5–3,5%)."
          : "Within the NBP target band (1.5–3.5%)."
        : l.value > band[1]
          ? pl
            ? "Powyżej pasma celu NBP (1,5–3,5%)."
            : "Above the NBP target band (1.5–3.5%)."
          : pl
            ? "Poniżej pasma celu NBP (1,5–3,5%)."
            : "Below the NBP target band (1.5–3.5%).",
    );
  if (l && peak && peak.x !== l.period)
    ctx.push(
      pl ? `Szczyt serii: ${fmt.value(peak.y)} (${fmt.period(peak.x)}).` : `Series peak: ${fmt.value(peak.y)} (${fmt.period(peak.x)}).`,
    );
  if (pos && rows.length)
    ctx.push(
      pl
        ? `${pos}. miejsce wśród ${rows.length} krajów${avg ? `; UE-27: ${fmt.value(avg.value)}` : ""}.`
        : `${pos}. of ${rows.length} countries${avg ? `; EU-27: ${fmt.value(avg.value)}` : ""}.`,
    );
  const ch = l ? fmtChange(l.value, l.previous_value, kpi.unit_key, basisFor(kpi.frequency), cat, lang) : undefined;
  const yr =
    l && l.year_ago_value !== null && kpi.frequency !== "A"
      ? fmtChange(l.value, l.year_ago_value, kpi.unit_key, "r/r", cat, lang)
      : undefined;
  const longPeriod = (p: string) => fmtPeriod(p, lang, true);
  return (
    <section className="zt-card t-span-4 ex-latest" aria-labelledby="ex-latest-h" aria-busy={!l && !error ? true : undefined}>
      <h3 className="zt-card__title ex-latest__h" id="ex-latest-h">
        {pl ? "Najnowszy odczyt" : "Latest reading"}
        {l ? (
          <>
            <Sr>, </Sr>
            <span className="ex-muted ex-normal"> · {longPeriod(l.period)}</span>
          </>
        ) : null}
      </h3>
      {error ? (
        <p role="alert" className="small">
          {error}
        </p>
      ) : !l ? (
        <div className="zt-skel ex-latest__skel" />
      ) : (
        <>
          <p className="kpi-hero ex-m0 ex-latest__value">{fmtValue(l.value, kpi.unit_key, cat, lang)}</p>
          {ch ? (
            <p className="body ex-m0 ex-ink2">
              <span aria-hidden="true">{ch.shown}</span>
              <Sr>{ch.spoken}</Sr>
              <span>
                {" · "}
                {pl ? "wobec" : "vs"} {fmtPeriod(l.previous_period, lang)} ({fmtValue(l.previous_value, kpi.unit_key, cat, lang)})
              </span>
            </p>
          ) : null}
          {yr ? (
            <p className="small ex-m0 ex-ink2">
              <span aria-hidden="true">{yr.shown}</span>
              <Sr>{yr.spoken}</Sr>
            </p>
          ) : null}
          {ctx.length ? <p className="small ex-m0 ex-ink2">{ctx.join(" ")}</p> : null}
          <dl className="ex-dl">
            <div>
              <dt>{pl ? "Źródło" : "Source"}</dt>
              <dd>{sourceName(cat, l.source_key, lang)}</dd>
            </div>
            <div>
              <dt>{pl ? "Opublikowano" : "Published"}</dt>
              <dd>{fmtDate(l.loaded_at, lang)}</dd>
            </div>
            <div>
              <dt>{pl ? "Następna publikacja" : "Next release"}</dt>
              <dd>{l.next_release ? fmtDate(l.next_release, lang) : "–"}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

function OtherSources({
  cat,
  kpi,
  lang,
  series,
  error,
  span,
}: {
  cat: Catalog;
  kpi: Kpi;
  lang: Lang;
  series?: Series[];
  error?: string;
  span: 6 | 12;
}) {
  const pl = lang === "pl";
  const fmt = fmtFor(cat, kpi, lang);
  const rows = kpi.source_keys.map((s) => {
    const p = series
      ? lastPoint((series.find((x) => x.source_key === s)?.points ?? []).map((q) => ({ x: q.period, y: q.value })))
      : undefined;
    return { s, p };
  });
  const vals = rows.map((r) => r.p?.y).filter((v): v is number => v !== undefined);
  const spread = vals.length > 1 ? Math.max(...vals) - Math.min(...vals) : null;
  const rate = cat.units.find((u) => u.unit_key === kpi.unit_key)?.is_rate;
  return (
    <section className={`zt-card t-card t-span-${span}`} aria-labelledby="ex-src-h">
      <div>
        <h3 className="zt-card__title" id="ex-src-h">
          {pl ? "Ta sama miara w innych źródłach" : "The same measure in other sources"}
        </h3>
        <p className="zt-card__sub">
          {pl
            ? `${freqLabel(kpi.frequency, lang)[0]!.toUpperCase()}${freqLabel(kpi.frequency, lang).slice(1)} w każdym źródle; liczą ją różnie, więc sprawdź różnice, zanim porównasz liczby.`
            : `${freqLabel(kpi.frequency, lang)[0]!.toUpperCase()}${freqLabel(kpi.frequency, lang).slice(1)} in every source; they compute it differently, so check the gaps before comparing numbers.`}
        </p>
      </div>
      {error ? (
        <p role="alert" className="small">
          {error}
        </p>
      ) : (
        <DataTable
          label={pl ? "Tabela: ta sama miara w innych źródłach" : "Table: the same measure in other sources"}
          table={{
            caption: pl ? "Ostatnia wartość według źródła" : "Latest value by source",
            columns: [pl ? "Źródło" : "Source", pl ? "Zbiór" : "Dataset", pl ? "Ostatnio" : "Latest", pl ? "Wartość" : "Value"],
            numeric: [false, false, false, true],
            rows: rows.map((r, i) => ({
              key: r.s,
              strong: i === 0,
              cells: [
                sourceName(cat, r.s, lang),
                <code key="c">{registerId(cat, r.s)}</code>,
                r.p ? fmt.period(r.p.x) : "…",
                r.p ? fmt.value(r.p.y) : "…",
              ],
            })),
          }}
        />
      )}
      {spread !== null ? (
        <p className="small ex-note ex-m0">
          {pl ? "Rozrzut między źródłami w ostatnim okresie: " : "Spread between sources in the latest period: "}
          {rate ? `${fmtValue(spread, "pct", cat, lang).replace("%", "")} pp` : fmt.value(spread)}.{" "}
          {pl ? "Pierwsze źródło jest podstawą wykresów na tej stronie." : "The first source drives the charts on this page."}
        </p>
      ) : null}
      <div className="zt-card__foot">
        <span>
          {pl ? "Źródła: " : "Sources: "}
          {kpi.source_keys.map((s) => sourceName(cat, s, lang)).join(", ")}
        </span>
      </div>
    </section>
  );
}

function Methodology({ cat, kpi, lang }: { cat: Catalog; kpi: Kpi; lang: Lang }) {
  const pl = lang === "pl";
  const lic = [
    ...new Map(
      kpi.source_keys
        .map((s) => licenceOf(cat, s))
        .filter((x) => !!x)
        .map((x) => [x.licence_key, x]),
    ).values(),
  ];
  const dims = kpi.dimension_keys.map((d) =>
    nameOf(
      cat.dimensions.find((x) => x.dimension_key === d),
      lang,
      d,
    ),
  );
  return (
    <section className="zt-card t-span-8 ex-method" aria-labelledby="ex-meth-h">
      <h3 className="zt-card__title" id="ex-meth-h">
        {pl ? "Metodologia i licencja" : "Methodology and licence"}
      </h3>
      <dl className="ex-dl ex-dl--wide">
        <div>
          <dt>{pl ? "Zbiory danych" : "Datasets"}</dt>
          <dd>
            {kpi.source_keys.map((s, i) => (
              <span key={s}>
                {i ? "; " : ""}
                {sourceName(cat, s, lang)} <code>{registerId(cat, s)}</code>
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>{pl ? "Miara" : "Measure"}</dt>
          <dd>
            {unitName(cat, kpi.unit_key, lang)}, {freqLabel(kpi.frequency, lang)}
          </dd>
        </div>
        <div>
          <dt>{pl ? "Zasięg" : "Coverage"}</dt>
          <dd>
            {geoCoverage(kpi, cat, lang)}, {fmtPeriod(kpi.first_period, lang)}–{fmtPeriod(kpi.last_period, lang)}
          </dd>
        </div>
        <div>
          <dt>{pl ? "Podziały" : "Breakdowns"}</dt>
          <dd>{dims.length ? dims.join(", ") : pl ? "brak (tylko ogółem)" : "none (totals only)"}</dd>
        </div>
        <div>
          <dt>{pl ? "Licencja" : "Licence"}</dt>
          <dd>
            {lic.map((x, i) => (
              <span key={x.licence_key}>
                {i ? "; " : ""}
                <a href={x.url} rel="noopener noreferrer" target="_blank">
                  {x.name}
                </a>
                {x.commercial_ok ? (pl ? " (także do użytku komercyjnego)" : " (commercial use allowed)") : ""}
              </span>
            ))}
          </dd>
        </div>
        {cat.sample ? (
          <div>
            <dt>{pl ? "Status danych" : "Data status"}</dt>
            <dd>
              <StatusTag kind="sample">{pl ? "Dane przykładowe" : "Sample data"}</StatusTag>{" "}
              <span className="small">{sampleNotice(lang)}.</span>
            </dd>
          </div>
        ) : null}
      </dl>
      <p className="small ex-m0">
        <Link to="/przewodnik/metodologia">{pl ? "Metodologia i źródła zohelo bi" : "zohelo bi methodology and sources"}</Link>
      </p>
    </section>
  );
}

function Citation({ cat, kpi, lang }: { cat: Catalog; kpi: Kpi; lang: Lang }) {
  const pl = lang === "pl";
  return (
    <section className="zt-card t-span-4 ex-cite" aria-labelledby="ex-cite-h">
      <h3 className="zt-card__title" id="ex-cite-h">
        {pl ? "Jak cytować" : "How to cite"}
      </h3>
      <p className="ex-cite__text small">{citationText(cat, kpi, lang)}</p>
      <CopyButton
        lang={lang}
        text={() => citationText(cat, kpi, lang)}
        label={pl ? "Kopiuj cytowanie" : "Copy citation"}
        done={pl ? "Skopiowano cytowanie" : "Citation copied"}
      />
    </section>
  );
}

async function downloadHistory(cat: Catalog, kpi: Kpi, lang: Lang) {
  const series = await data.series(kpi.kpi_key, { geographies: ["PL"], sources: kpi.source_keys });
  const zs = toZSeries(series, cat, lang).map((z, i) => ({
    ...z,
    label: `${geoName(cat, "PL", lang)} · ${sourceName(cat, series[i]!.source_key, lang)}`,
  }));
  const meta = exportMeta(cat, kpi, kpi.source_keys, lang, { url: window.location.href });
  downloadCsv(csvFileName(kpi.kpi_key), buildCsv(meta, matrixCsv(seriesMatrix(zs), lang === "pl" ? "okres" : "period")));
}
