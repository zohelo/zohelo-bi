// Analizy (/analizy): statistics and econometrics as guided recipes (docs/analysis-design.md). The reader picks a
// question, then one or two indicators; the answer is one sentence, the chart that shows it, a few facts, the
// cautions that apply and the method in one paragraph. URL: ?r=<recipe>&i=<kpi>[,<kpi>]&geo=<area>&s=<woj|eu>.
// Numbers: @zohelo/stats; wording and guardrails: analysis/recipes.ts.

import { useId, useState } from "react";
import { legendItems, toTable, ZChart } from "@zohelo/visuals";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Series } from "../../data";
import type { Lang } from "../../i18n";
import { Link, navigate } from "../../router";
import {
  RECIPES,
  analyseConvergence,
  analyseForecast,
  analyseRelation,
  analyseSeason,
  analyseTrend,
  type Analysis,
  type Recipe,
  type RecipeId,
} from "../analysis/recipes";
import { geoName, kpiName } from "../chartData";
import { useMeta, usePage } from "../context";
import { euGeographies, hasVoivodeships, voivodeshipKeys } from "../explore/kpiInfo";
import { searchDocs, searchKpis } from "../explore/search";
import { Legend } from "../explore/ui";
import { freqLabel } from "../format";
import { ChartCard, DraftBadge, PageHeader } from "../ui/blocks";
import { Icon } from "../ui/icons";
import { TableView } from "../ui/TableView";
import "../analysis/analysis.css";

type State = { recipe: Recipe; kpis: string[]; geo: string; scope: "woj" | "eu" };

function readState(search: string, cat: Catalog): State {
  const p = new URLSearchParams(search);
  const recipe = RECIPES.find((r) => r.id === p.get("r")) ?? RECIPES[0]!;
  const known = (k: string) => cat.kpis.some((x) => x.kpi_key === k);
  const asked = (p.get("i") ?? "").split(",").filter(known);
  const want = recipe.needs === "pair" ? 2 : 1;
  const kpis = (asked.length ? asked : recipe.example.filter(known)).slice(0, want);
  const geo = cat.geographies.some((g) => g.key === p.get("geo")) ? p.get("geo")! : "PL";
  return { recipe, kpis, geo, scope: p.get("s") === "eu" ? "eu" : "woj" };
}

function link(s: { recipe: RecipeId; kpis: string[]; geo: string; scope: "woj" | "eu" }): string {
  const p = new URLSearchParams({ r: s.recipe });
  if (s.kpis.length) p.set("i", s.kpis.join(","));
  if (s.geo !== "PL") p.set("geo", s.geo);
  if (s.scope !== "woj") p.set("s", s.scope);
  return `/analizy?${p.toString()}`;
}

/** The total series of an area (no breakdown members). */
const totalOf = (series: Series[], geo: string) =>
  series.find((s) => s.geography === geo && Object.keys(s.members).length === 0) ?? series.find((s) => s.geography === geo);

function KpiPicker({
  label,
  value,
  cat,
  lang,
  onChange,
}: {
  label: string;
  value: Kpi | undefined;
  cat: Catalog;
  lang: Lang;
  onChange: (k: Kpi) => void;
}) {
  const pl = lang === "pl";
  const [editing, setEditing] = useState(!value);
  const [query, setQuery] = useState("");
  const id = useId();
  const docs = searchDocs(cat);
  const hits = query.trim() ? searchKpis(docs, query).slice(0, 8) : [];
  if (!editing && value)
    return (
      <div className="an-pick">
        <span className="an-pick__label">{label}</span>
        <span className="an-pick__chosen">
          <strong>{kpiName(value, lang)}</strong> <DraftBadge kpis={[value]} lang={lang} small />
          <span className="caption">{freqLabel(value.frequency, lang)}</span>
        </span>
        <button type="button" className="zt-btn zt-btn--ghost" onClick={() => setEditing(true)}>
          {pl ? "Zmień" : "Change"}
          <span className="zt-sr">: {label}</span>
        </button>
      </div>
    );
  return (
    <div className="an-pick an-pick--edit">
      <label className="an-pick__label" htmlFor={id}>
        {label}
      </label>
      <div className="zt-search an-pick__search">
        <Icon name="search" size={16} />
        <input
          id={id}
          type="search"
          autoComplete="off"
          value={query}
          placeholder={pl ? "Szukaj wskaźnika, np. płace, inflacja" : "Search an indicator, e.g. wages, inflation"}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {hits.length ? (
        <ul className="an-pick__hits">
          {hits.map((k) => (
            <li key={k.kpi_key}>
              <button
                type="button"
                className="an-pick__hit"
                onClick={() => {
                  onChange(k);
                  setEditing(false);
                  setQuery("");
                }}
              >
                <span>{kpiName(k, lang)}</span>
                <span className="caption">
                  {freqLabel(k.frequency, lang)}
                  {k.status === "draft" ? (pl ? " · wersja robocza" : " · draft") : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : query.trim() ? (
        <p className="small an-pick__none">{pl ? "Brak wyników. Spróbuj innego słowa." : "No results. Try another word."}</p>
      ) : null}
      {value ? (
        <button type="button" className="zt-btn zt-btn--ghost" onClick={() => setEditing(false)}>
          {pl ? "Anuluj" : "Cancel"}
        </button>
      ) : null}
    </div>
  );
}

function Result({ a, kpis, lang }: { a: Analysis; kpis: Kpi[]; lang: Lang }) {
  const pl = lang === "pl";
  if (!a.ok)
    return (
      <div className="zt-card an-problem" role="status">
        <Icon name="info" size={18} />
        <p>{a.problem}</p>
      </div>
    );
  return (
    <>
      <section className="zt-card an-answer" aria-labelledby="an-answer-h">
        <p className="eyebrow">{pl ? "Odpowiedź" : "Answer"}</p>
        <h2 id="an-answer-h" className="an-answer__finding">
          {a.finding}
        </h2>
        <dl className="an-facts">
          {a.facts.map((f) => (
            <div key={f.label} className="an-fact">
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="t-grid an-charts">
        {a.cards.map((c, i) => (
          <ChartCard
            key={i}
            span={a.cards.length > 1 ? 6 : 12}
            lang={lang}
            title={c.title}
            sub={c.sub}
            badge={<DraftBadge kpis={kpis} lang={lang} small />}
            chart={() => <ZChart {...c.chart} />}
            table={() => <TableView table={toTable(c.chart)} />}
            legend={legendItems(c.chart).length > 1 ? <Legend chart={c.chart} bare /> : undefined}
            copyData={() => {
              const t = toTable(c.chart);
              return { columns: t.columns, rows: t.rows, numeric: t.numeric };
            }}
          />
        ))}
      </div>
      <div className="an-notes">
        <section className="zt-card an-note" aria-labelledby="an-caution-h">
          <h3 id="an-caution-h" className="an-note__title">
            {pl ? "Zanim użyjesz tej liczby" : "Before you use this number"}
          </h3>
          <ul>
            {a.cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
        <section className="zt-card an-note" aria-labelledby="an-method-h">
          <h3 id="an-method-h" className="an-note__title">
            {pl ? "Jak to policzono" : "How it was calculated"}
          </h3>
          <p>{a.method}</p>
        </section>
      </div>
    </>
  );
}

function Runner({ s, cat, lang }: { s: State; cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  const kpis = s.kpis.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
  const need = s.recipe.needs === "pair" ? 2 : 1;
  const ready = kpis.length === need;
  const regions = s.recipe.needs === "regions";
  const units =
    ready && regions ? (s.scope === "eu" ? ["PL", ...euGeographies(kpis[0]!, cat).filter((g) => g !== "EU27")] : voivodeshipKeys(cat)) : [];
  const key = ready ? `an|${s.recipe.id}|${s.kpis.join(",")}|${regions ? s.scope : s.geo}` : null;
  const loaded = useData(key, () => Promise.all(kpis.map((k) => data.series(k.kpi_key, { geographies: regions ? units : [s.geo] }))));
  if (!ready)
    return (
      <p className="small an-wait">
        {need === 2
          ? pl
            ? "Wybierz dwa wskaźniki, by zobaczyć odpowiedź."
            : "Choose two indicators to see the answer."
          : pl
            ? "Wybierz wskaźnik, by zobaczyć odpowiedź."
            : "Choose an indicator to see the answer."}
      </p>
    );
  if (loaded.error) return <p role="alert">{loaded.error}</p>;
  if (!loaded.data || loaded.loading)
    return (
      <p className="small an-wait" aria-busy="true">
        {pl ? "Liczenie" : "Calculating"}
      </p>
    );
  const ctx = { cat, lang };
  const one = (i: number) => ({ kpi: kpis[i]!, geo: s.geo, points: totalOf(loaded.data![i] ?? [], s.geo)?.points ?? [] });
  let a: Analysis;
  switch (s.recipe.id) {
    case "trend":
      a = analyseTrend(one(0), ctx);
      break;
    case "season":
      a = analyseSeason(one(0), ctx);
      break;
    case "forecast":
      a = analyseForecast(one(0), ctx);
      break;
    case "relation":
      a = analyseRelation(one(0), one(1), ctx);
      break;
    default:
      a = analyseConvergence(
        {
          kpi: kpis[0]!,
          units: units.map((g) => ({ geo: g, points: totalOf(loaded.data![0] ?? [], g)?.points ?? [] })),
          scopePl: s.scope === "eu" ? "krajami UE" : "województwami",
          scopeEn: s.scope === "eu" ? "EU countries" : "voivodeships",
        },
        ctx,
      );
  }
  return <Result a={a} kpis={kpis} lang={lang} />;
}

export function AnalysisPage() {
  const { lang, catalog, url } = usePage();
  const pl = lang === "pl";
  const title = pl ? "Analizy" : "Analyses";
  useMeta(title, [{ label: title }], [lang]);
  if (!catalog)
    return (
      <div className="zt-state" aria-busy="true">
        {pl ? "Wczytywanie" : "Loading"}
      </div>
    );
  const s = readState(url.search, catalog);
  const go = (over: Partial<{ recipe: RecipeId; kpis: string[]; geo: string; scope: "woj" | "eu" }>) =>
    navigate(link({ recipe: s.recipe.id, kpis: s.kpis, geo: s.geo, scope: s.scope, ...over }));
  const kpis = s.kpis.map((k) => catalog.kpis.find((x) => x.kpi_key === k));
  const first = kpis[0];
  const pair = s.recipe.needs === "pair";
  const regions = s.recipe.needs === "regions";
  const areas = first && hasVoivodeships(first) ? ["PL", ...voivodeshipKeys(catalog)] : ["PL"];
  const setKpi = (i: number, k: Kpi) => {
    const next = [...s.kpis];
    next[i] = k.kpi_key;
    go({ kpis: next.filter(Boolean), geo: i === 0 && !areas.includes(s.geo) ? "PL" : s.geo });
  };
  return (
    <>
      <PageHeader
        title={title}
        lead={
          pl
            ? "Wybierz pytanie i wskaźnik. Odpowiedź dostajesz jednym zdaniem, z wykresem, z zastrzeżeniami i z opisem metody. Liczą to sprawdzone metody statystyczne, nie sztuczna inteligencja."
            : "Choose a question and an indicator. The answer comes as one sentence with its chart, its cautions and the method. Proven statistical methods do the counting, not artificial intelligence."
        }
      />
      <section className="t-section" aria-labelledby="an-q-h">
        <h2 id="an-q-h" className="section-title">
          {pl ? "1. Pytanie" : "1. Question"}
        </h2>
        <ul className="an-recipes">
          {RECIPES.map((r) => (
            <li key={r.id}>
              <Link
                to={link({ recipe: r.id, kpis: r.needs === s.recipe.needs ? s.kpis : [], geo: s.geo, scope: s.scope })}
                className="zt-card an-recipe"
                aria-current={r.id === s.recipe.id ? "true" : undefined}
              >
                <strong className="an-recipe__q">{pl ? r.pl : r.en}</strong>
                <span className="small">{pl ? r.leadPl : r.leadEn}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="t-section" aria-labelledby="an-d-h">
        <h2 id="an-d-h" className="section-title">
          {pl ? "2. Dane" : "2. Data"}
        </h2>
        <div className="zt-card an-inputs">
          <KpiPicker
            key={`a-${s.recipe.id}-${s.kpis[0] ?? ""}`}
            label={pair ? (pl ? "Pierwszy wskaźnik" : "First indicator") : pl ? "Wskaźnik" : "Indicator"}
            value={first}
            cat={catalog}
            lang={lang}
            onChange={(k) => setKpi(0, k)}
          />
          {pair ? (
            <KpiPicker
              key={`b-${s.recipe.id}-${s.kpis[1] ?? ""}`}
              label={pl ? "Drugi wskaźnik" : "Second indicator"}
              value={kpis[1]}
              cat={catalog}
              lang={lang}
              onChange={(k) => setKpi(1, k)}
            />
          ) : null}
          {regions ? (
            <div className="an-pick">
              <label className="an-pick__label" htmlFor="an-scope">
                {pl ? "Porównaj" : "Compare"}
              </label>
              <select
                id="an-scope"
                className="ex-select"
                value={s.scope}
                onChange={(e) => go({ scope: e.target.value === "eu" ? "eu" : "woj" })}
              >
                <option value="woj">{pl ? "województwa" : "voivodeships"}</option>
                <option value="eu">{pl ? "kraje UE" : "EU countries"}</option>
              </select>
            </div>
          ) : areas.length > 1 ? (
            <div className="an-pick">
              <label className="an-pick__label" htmlFor="an-geo">
                {pl ? "Obszar" : "Area"}
              </label>
              <select id="an-geo" className="ex-select" value={s.geo} onChange={(e) => go({ geo: e.target.value })}>
                {areas.map((g) => (
                  <option key={g} value={g}>
                    {geoName(catalog, g, lang)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>
      <section className="t-section" aria-labelledby="an-r-h">
        <h2 id="an-r-h" className="section-title">
          {pl ? "3. Odpowiedź" : "3. Answer"}
        </h2>
        <Runner s={s} cat={catalog} lang={lang} />
      </section>
    </>
  );
}
