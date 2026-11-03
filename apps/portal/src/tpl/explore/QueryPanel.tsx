// Query panel of the explorer: four numbered steps as native disclosure sections (<details>), each with a
// one-line summary of the current choice in its <summary>: 1 Wskaźniki, 2 Obszary i wymiary, 3 Okres,
// 4 Układ i wykres. Every change goes through `onPatch` (normalised by applyPatch) and lands in the URL.

import { useId, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import type { Catalog, GeoLevel } from "../../data";
import { geoName, kpiName } from "../chartData";
import { Segmented } from "../ui/blocks";
import { Icon } from "../ui/icons";
import { IndicatorPicker } from "./IndicatorPicker";
import { ListboxButton } from "./Listbox";
import {
  LAST_YEARS,
  commonGeos,
  filterValue,
  indexBase,
  kpisOf,
  levelGeos,
  placedDims,
  type ChartKind,
  type Compare,
  type DimId,
  type Query,
  type QueryInput,
  type Shape,
  type SlotKey,
} from "./exploreState";
import { hasVoivodeships } from "./kpiInfo";
import { CHARTS, SLOTS, canPlace, chartOk, fixedRole, isTimeChart, layoutIssues, moveDim, swapSlots, type FixedRole } from "./layout";
import { plural } from "./search";
import { chartName, dimName, memberLabel } from "./view";

type Patch = (p: Partial<QueryInput>) => void;

export function slotName(s: SlotKey, lang: Lang): string {
  const pl = lang === "pl";
  if (s === "series") return pl ? "Seria" : "Series";
  if (s === "panels") return pl ? "Panele" : "Panels";
  if (s === "cats") return pl ? "Kategorie" : "Categories";
  if (s === "rows") return pl ? "Wiersze" : "Rows";
  return pl ? "Kolumny" : "Columns";
}

function fixedName(r: FixedRole, lang: Lang): string {
  const pl = lang === "pl";
  return {
    x: pl ? "Oś X" : "X axis",
    two: pl ? "Dwa okresy (pierwszy i ostatni)" : "Two periods (first and last)",
    areas: pl ? "Obszary (16 województw)" : "Areas (16 voivodeships)",
    axes: pl ? "Osie X i Y (dwa pierwsze)" : "X and Y axes (first two)",
    points: pl ? "Punkty" : "Points",
  }[r];
}

function Step({ n, title, summary, children }: { n: number; title: string; summary: string; children: ReactNode }) {
  return (
    <details className="xp-step" open>
      <summary className="xp-step__sum">
        <span className="xp-step__n" aria-hidden="true">
          {n}
        </span>
        <span className="xp-step__titles">
          <span className="xp-step__title">{title}</span>
          <span className="xp-step__val">{summary}</span>
        </span>
        <Icon name="chevronDown" size={16} className="xp-step__chev" />
      </summary>
      <div className="xp-step__body">{children}</div>
    </details>
  );
}

function short(names: string[], max = 2): string {
  return names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

export function QueryPanel({ cat, q, shape, lang, onPatch }: { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const kpis = kpisOf(cat, q.i);
  const names = kpis.map((k) => kpiName(k, lang));
  const win = shape.window[0] === shape.window[1] ? String(shape.window[0]) : `${shape.window[0]}–${shape.window[1]}`;
  const periodSummary =
    "last" in q.time
      ? q.time.last === 0
        ? `${pl ? "Wszystkie lata" : "All years"} (${win})`
        : q.time.last === 1
          ? `${pl ? "Ostatni rok" : "Last year"} (${win})`
          : `${pl ? "Ostatnie" : "Last"} ${q.time.last} ${plural(q.time.last, lang, ["rok", "lata", "lat"], ["year", "years"])} (${win})`
      : win;
  const dimSummary = shape.shared
    .filter((d) => (shape.members[d]?.length ?? 0) > 1 || shape.members[d]?.[0] !== "total")
    .map((d) => `${dimName(cat, d, lang)}: ${shape.members[d]!.length}`);
  return (
    <div className="xp-steps">
      <Step
        n={1}
        title={pl ? `Wskaźniki (${kpis.length} z 6)` : `Indicators (${kpis.length} of 6)`}
        summary={names.length ? short(names, 1) : pl ? "brak" : "none"}
      >
        <IndicatorPicker
          cat={cat}
          q={q}
          lang={lang}
          onAdd={(k) => onPatch({ i: [...q.i, k] })}
          onRemove={(k) => onPatch({ i: q.i.filter((x) => x !== k) })}
          onMove={(k, by) => {
            const i = q.i.indexOf(k);
            const next = q.i.slice();
            next.splice(i, 1);
            next.splice(i + by, 0, k);
            onPatch({ i: next, cmp: q.cmp });
          }}
          onSource={(k, s) => onPatch({ src: { ...q.src, [k]: s } })}
        />
      </Step>
      {kpis.length ? (
        <>
          <Step
            n={2}
            title={pl ? "Obszary i wymiary" : "Areas and dimensions"}
            summary={[short(q.geo.map((g) => geoName(cat, g, lang))), ...dimSummary].join(" · ")}
          >
            <AreasStep cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} />
          </Step>
          <Step n={3} title={pl ? "Okres" : "Period"} summary={periodSummary}>
            <PeriodStep q={q} shape={shape} lang={lang} onPatch={onPatch} />
          </Step>
          <Step n={4} title={pl ? "Układ i wykres" : "Layout and chart"} summary={chartName(q.chart, lang)}>
            <LayoutStep cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} />
          </Step>
        </>
      ) : null}
    </div>
  );
}

function AreasStep({ cat, q, shape, lang, onPatch }: { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const kpis = shape.kpis;
  const voiv = kpis.every(hasVoivodeships);
  const avail = commonGeos(kpis, cat, q.level);
  const some = [...new Set(kpis.flatMap((k) => levelGeos(k, cat, q.level)))].filter((g) => !avail.includes(g));
  const free = avail.filter((g) => !q.geo.includes(g));
  return (
    <div className="xp-stack">
      <div className="xp-field">
        <span className="xp-label" id="xp-lvl">
          {pl ? "Poziom geograficzny" : "Geographic level"}
        </span>
        {voiv ? (
          <Segmented<GeoLevel>
            label={pl ? "Poziom geograficzny" : "Geographic level"}
            value={q.level}
            onChange={(level) => onPatch({ level, geo: [] })}
            options={[
              { value: "country", label: pl ? "Kraje" : "Countries" },
              { value: "voivodeship", label: pl ? "Województwa" : "Voivodeships" },
            ]}
          />
        ) : (
          <p className="xp-help">
            {pl
              ? "Dane wojewódzkie mają nie wszystkie wybrane wskaźniki: dostępny jest poziom krajów."
              : "Not every selected indicator has voivodeship data: country level only."}
          </p>
        )}
      </div>
      <fieldset className="xp-field xp-fieldset">
        <legend className="xp-label">
          {pl ? "Obszary" : "Areas"} <span className="xp-count">{`${q.geo.length} ${pl ? "z" : "of"} ${avail.length}`}</span>
        </legend>
        <ul className="xp-chips" aria-label={pl ? "Wybrane obszary" : "Selected areas"}>
          {q.geo.map((g) => {
            const name = geoName(cat, g, lang);
            return (
              <li key={g} className="zt-chip xp-chip">
                {name}
                {q.geo.length > 1 ? (
                  <button
                    type="button"
                    aria-label={(pl ? "Usuń obszar: " : "Remove area: ") + name}
                    onClick={() => onPatch({ geo: q.geo.filter((x) => x !== g) })}
                  >
                    ×
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="xp-row">
          {free.length ? (
            <ListboxButton
              label={pl ? "Dodaj obszar" : "Add area"}
              value=""
              buttonClass="zt-btn xp-btn-sm"
              trigger={<>+ {pl ? "Dodaj obszar" : "Add area"}</>}
              options={free.map((g) => ({ value: g, label: geoName(cat, g, lang) }))}
              onChange={(g) => onPatch({ geo: [...q.geo, g] })}
            />
          ) : null}
          {free.length ? (
            <button type="button" className="zt-btn zt-btn--ghost xp-btn-sm" onClick={() => onPatch({ geo: avail })}>
              {pl ? `Wszystkie (${avail.length})` : `All (${avail.length})`}
            </button>
          ) : null}
          {q.geo.length > 1 ? (
            <button type="button" className="zt-btn zt-btn--ghost xp-btn-sm" onClick={() => onPatch({ geo: q.geo.slice(0, 1) })}>
              {pl ? "Zostaw pierwszy" : "Keep first"}
            </button>
          ) : null}
        </div>
        {some.length ? (
          <p className="xp-help">
            {pl ? "Niedostępne dla wszystkich wybranych wskaźników: " : "Not available for every selected indicator: "}
            {short(
              some.map((g) => geoName(cat, g, lang)),
              4,
            )}
          </p>
        ) : null}
      </fieldset>
      {shape.shared.map((d) => (
        <MemberList key={d} cat={cat} q={q} dim={d} lang={lang} onPatch={onPatch} />
      ))}
      {kpis.length > 1 && !shape.shared.length && kpis.some((k) => k.dimension_keys.length) ? (
        <p className="xp-help">
          {pl
            ? "Wybrane wskaźniki nie mają wspólnych wymiarów (płeć, wiek…): pokazano wartości ogółem."
            : "The selected indicators share no breakdown (sex, age…): totals are shown."}
        </p>
      ) : null}
    </div>
  );
}

function MemberList({ cat, q, dim, lang, onPatch }: { cat: Catalog; q: Query; dim: string; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const all = cat.dimensions.find((x) => x.dimension_key === dim)?.members ?? [];
  const chosen = q.members[dim] ?? ["total"];
  const set = (ms: string[]) => onPatch({ members: { ...q.members, [dim]: ms.length ? ms : ["total"] } });
  const name = dimName(cat, dim, lang);
  return (
    <fieldset className="xp-field xp-fieldset">
      <legend className="xp-label">
        {name} <span className="xp-count">{`${chosen.length} ${pl ? "z" : "of"} ${all.length}`}</span>
      </legend>
      <div className="xp-row">
        <button
          type="button"
          className="zt-btn zt-btn--ghost xp-btn-sm"
          onClick={() => set(all.map((m) => m.key))}
          disabled={chosen.length === all.length}
        >
          {pl ? "Zaznacz wszystkie" : "Select all"}
          <span className="zt-sr">: {name}</span>
        </button>
        <button
          type="button"
          className="zt-btn zt-btn--ghost xp-btn-sm"
          onClick={() => set(["total"])}
          disabled={chosen.length === 1 && chosen[0] === "total"}
        >
          {pl ? "Wyczyść" : "Clear"}
          <span className="zt-sr">: {name}</span>
        </button>
      </div>
      <div className="xp-checks">
        {all.map((m) => {
          const on = chosen.includes(m.key);
          return (
            <label key={m.key} className="xp-check">
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  set(on ? chosen.filter((x) => x !== m.key) : all.map((x) => x.key).filter((x) => x === m.key || chosen.includes(x)))
                }
              />
              <span>{lang === "pl" ? m.name_pl : m.name_en}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function PeriodStep({ q, shape, lang, onPatch }: { q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const win = shape.window[0] === shape.window[1] ? String(shape.window[0]) : `${shape.window[0]}–${shape.window[1]}`;
  const ids = { from: useId(), to: useId() };
  const years: number[] = [];
  for (let y = shape.span[0]; y <= shape.span[1]; y++) years.push(y);
  const mode = "last" in q.time ? "last" : "range";
  return (
    <div className="xp-stack">
      <Segmented<"last" | "range">
        label={pl ? "Rodzaj okresu" : "Period type"}
        value={mode}
        onChange={(m) => onPatch({ time: m === "last" ? { last: 10 } : { from: shape.window[0], to: shape.window[1] } })}
        options={[
          { value: "last", label: pl ? "Ostatnie lata" : "Last years" },
          { value: "range", label: pl ? "Od–do" : "From–to" },
        ]}
      />
      {"last" in q.time ? (
        <Segmented<string>
          label={pl ? "Ile ostatnich lat" : "How many recent years"}
          small
          value={String(q.time.last)}
          onChange={(v) => onPatch({ time: { last: Number(v) } })}
          options={LAST_YEARS.map((n) => ({
            value: String(n),
            label: n === 0 ? (pl ? "Wszystkie" : "All") : `${n} ${plural(n, lang, ["rok", "lata", "lat"], ["year", "years"])}`,
          }))}
        />
      ) : (
        <div className="xp-two">
          <div className="xp-field">
            <label className="xp-label" htmlFor={ids.from}>
              {pl ? "Od roku" : "From year"}
            </label>
            <select
              id={ids.from}
              className="ex-select ex-select--full"
              value={q.time.from}
              onChange={(e) => onPatch({ time: { from: Number(e.target.value), to: Math.max(Number(e.target.value), shape.window[1]) } })}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="xp-field">
            <label className="xp-label" htmlFor={ids.to}>
              {pl ? "Do roku" : "To year"}
            </label>
            <select
              id={ids.to}
              className="ex-select ex-select--full"
              value={q.time.to}
              onChange={(e) => onPatch({ time: { from: Math.min(Number(e.target.value), shape.window[0]), to: Number(e.target.value) } })}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <p className="xp-help">
        {"last" in q.time
          ? pl
            ? `Okres przesuwa się z nowymi danymi. Teraz: ${win}, ${shape.periods.length} ${plural(shape.periods.length, lang, ["okres", "okresy", "okresów"], ["period", "periods"])}.`
            : `The window moves with new data. Now: ${win}, ${shape.periods.length} ${plural(shape.periods.length, lang, ["okres", "okresy", "okresów"], ["period", "periods"])}.`
          : pl
            ? `Dane od ${shape.span[0]} do ${shape.span[1]}; wybrano ${shape.periods.length} okresów.`
            : `Data from ${shape.span[0]} to ${shape.span[1]}; ${shape.periods.length} periods selected.`}
      </p>
      {shape.mixed ? (
        <p className="xp-note">
          {pl
            ? `Różne częstotliwości: wszystkie wskaźniki pokazano ${shape.freq === "A" ? "rocznie" : "kwartalnie"} jako średnią z pełnych okresów.`
            : `Mixed frequencies: every indicator is shown ${shape.freq === "A" ? "annually" : "quarterly"} as the mean of complete periods.`}
        </p>
      ) : null}
    </div>
  );
}

const CHART_ICON: Record<ChartKind, string> = {
  line: "M2 14l4-5 3 3 4-6 3 3",
  columns: "M3 15V9M7 15V5M11 15v-4M15 15V7",
  bars: "M3 4h12M3 8h9M3 12h6M3 16h3",
  dumbbell: "M4 5h9M4 9h6M4 13h10M4 5h.01M13 5h.01M4 9h.01M10 9h.01M4 13h.01M14 13h.01",
  slope: "M4 4v11M14 4v11M4 6l10 4M4 12l10-6",
  heatmap: "M3 3h4v4H3zM8 3h4v4H8zM13 3h2v4h-2zM3 8h4v4H3zM8 8h4v4H8zM3 13h4v2H3z",
  map: "M3 4h4v4H3zM8 4h4v4H8zM5 9h4v4H5zM10 9h4v4h-4z",
  scatter: "M4 13h.01M7 9h.01M10 11h.01M12 6h.01M14 4h.01M3 3v12h12",
};

function chartLabel(c: ChartKind, lang: Lang): string {
  const pl = lang === "pl";
  return {
    line: pl ? "Linia" : "Line",
    columns: pl ? "Słupki w czasie" : "Columns",
    bars: pl ? "Ranking" : "Ranking",
    dumbbell: pl ? "Zmiana" : "Change",
    slope: pl ? "Nachylenie" : "Slope",
    heatmap: pl ? "Mapa cieplna" : "Heatmap",
    map: pl ? "Mapa" : "Map",
    scatter: pl ? "Rozrzut" : "Scatter",
  }[c];
}

function LayoutStep({ cat, q, shape, lang, onPatch }: { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const baseId = useId();
  const issues = layoutIssues(q, shape);
  const slots = SLOTS[q.chart];
  const dims: DimId[] = ["i", "geo", "t", ...shape.shared];
  const placed = placedDims(q, shape);
  const count = (d: DimId) => (d === "geo" && q.chart === "map" ? 16 : (shape.members[d]?.length ?? 0));
  const dimText = (d: DimId) => `${dimName(cat, d, lang)} (${count(d)})`;
  const swap = swapSlots(q);
  const showCmp = q.i.length > 1 && placed.has("i");
  const years: number[] = [];
  for (let y = shape.span[0]; y <= shape.span[1]; y++) years.push(y);
  const cmpOpts: { value: Compare; label: string; off?: string }[] = [
    {
      value: "same",
      label: pl ? "Ta sama oś" : "Same axis",
      off: shape.sameUnit ? undefined : pl ? "wskaźniki mają różne jednostki" : "the indicators have different units",
    },
    {
      value: "index",
      label: pl ? "Indeks (rok bazowy = 100)" : "Index (base year = 100)",
      off: shape.indexable ? undefined : pl ? "stóp i odsetków (%) nie indeksujemy" : "rates and percentages are not indexed",
    },
    {
      value: "panels",
      label: pl ? "Osobne panele (własne osie)" : "Separate panels (own axes)",
      off: isTimeChart(q.chart) ? undefined : pl ? "tylko dla linii i słupków w czasie" : "line and column charts only",
    },
  ];
  return (
    <div className="xp-stack">
      <div className="xp-field">
        <span className="xp-label" id={`${baseId}-ct`}>
          {pl ? "Typ wykresu" : "Chart type"}
        </span>
        <div className="xp-charts" role="group" aria-labelledby={`${baseId}-ct`}>
          {CHARTS.map((c) => {
            const v = chartOk(c, shape, q);
            const why = v.ok ? null : pl ? v.reason.pl : v.reason.en;
            return (
              <button
                key={c}
                type="button"
                className="xp-chart"
                aria-pressed={q.chart === c}
                disabled={!v.ok}
                onClick={() => onPatch({ chart: c })}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
                  <path
                    d={CHART_ICON[c]}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="xp-chart__name">{chartLabel(c, lang)}</span>
                {why ? <span className="xp-chart__why">{why}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="xp-field">
        <span className="xp-label">{pl ? "Rozmieszczenie wymiarów" : "Dimension layout"}</span>
        <div className="xp-slots">
          {dims
            .filter((d) => fixedRole(q.chart, d))
            .map((d) => (
              <div key={d} className="xp-slot xp-slot--fixed">
                <span className="xp-slot__name">{fixedName(fixedRole(q.chart, d)!, lang)}</span>
                <span className="xp-slot__fixed">{dimText(d)}</span>
              </div>
            ))}
          {slots.map((s) => {
            const issue = issues[s];
            const id = `${baseId}-${s}`;
            const current = q.slots[s] ?? "";
            return (
              <div key={s} className={`xp-slot${issue ? " xp-slot--bad" : ""}`}>
                <label className="xp-slot__name" htmlFor={id}>
                  {slotName(s, lang)}
                </label>
                <select
                  id={id}
                  className="ex-select ex-select--full"
                  value={current}
                  aria-invalid={issue ? true : undefined}
                  aria-describedby={issue ? `${id}-err` : undefined}
                  onChange={(e) => onPatch({ slots: moveDim(q, s, e.target.value || null) })}
                >
                  <option value="">{pl ? "— brak —" : "— none —"}</option>
                  {dims
                    .filter((d) => canPlace(q.chart, s, d))
                    .map((d) => (
                      <option key={d} value={d}>
                        {dimText(d)}
                      </option>
                    ))}
                </select>
                {issue ? (
                  <p className="xp-issue" id={`${id}-err`}>
                    <span aria-hidden="true">!</span> {pl ? issue.pl : issue.en}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        {slots.length ? (
          <div className="xp-row">
            {swap && slots.length === 2 ? (
              <button type="button" className="zt-btn xp-btn-sm" onClick={() => onPatch({ slots: swap })}>
                {q.chart === "heatmap"
                  ? pl
                    ? "Zamień wiersze i kolumny"
                    : "Swap rows and columns"
                  : `${pl ? "Zamień" : "Swap"}: ${slotName(slots[0]!, lang).toLowerCase()} ↔ ${slotName(slots[1]!, lang).toLowerCase()}`}
              </button>
            ) : null}
            <button type="button" className="zt-btn zt-btn--ghost xp-btn-sm" onClick={() => onPatch({ slots: {}, filters: {} })}>
              {pl ? "Przywróć układ" : "Reset layout"}
            </button>
          </div>
        ) : null}
      </div>

      {dims.some((d) => !placed.has(d) && count(d) > 0) ? (
        <div className="xp-field">
          <span className="xp-label">{pl ? "Filtry (jedna wartość)" : "Filters (one value)"}</span>
          <div className="xp-filters">
            {dims
              .filter((d) => !placed.has(d) && count(d) > 0)
              .map((d) => {
                const ms = shape.members[d] ?? [];
                const v = filterValue(q, shape, d) ?? "";
                const id = `${baseId}-f-${d}`;
                return (
                  <div key={d} className="xp-filter">
                    <label className="xp-filter__name" htmlFor={ms.length > 1 ? id : undefined}>
                      {dimName(cat, d, lang)}
                    </label>
                    {ms.length > 1 ? (
                      <select
                        id={id}
                        className="ex-select ex-select--full"
                        value={v}
                        onChange={(e) => onPatch({ filters: { ...q.filters, [d]: e.target.value } })}
                      >
                        {(d === "t" ? ms.slice().reverse() : ms).map((m) => (
                          <option key={m} value={m}>
                            {memberLabel(cat, d, m, lang)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="xp-filter__val">{memberLabel(cat, d, v, lang)}</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      {showCmp ? (
        <fieldset className="xp-field xp-fieldset">
          <legend className="xp-label">{pl ? "Porównanie wskaźników" : "Comparing indicators"}</legend>
          <div className="xp-radios">
            {cmpOpts.map((o) => (
              <label key={o.value} className={`xp-radio${o.off ? " xp-radio--off" : ""}`}>
                <input
                  type="radio"
                  name={`${baseId}-cmp`}
                  value={o.value}
                  checked={q.cmp === o.value}
                  disabled={!!o.off}
                  onChange={() => onPatch({ cmp: o.value, ...(o.value === "panels" ? {} : { slots: q.slots }) })}
                />
                <span>
                  {o.label}
                  {o.off ? <span className="xp-radio__why">{o.off}</span> : null}
                </span>
              </label>
            ))}
          </div>
          {q.cmp === "index" ? (
            <div className="xp-field">
              <label className="xp-label" htmlFor={`${baseId}-base`}>
                {pl ? "Rok bazowy (= 100)" : "Base year (= 100)"}
              </label>
              <select
                id={`${baseId}-base`}
                className="ex-select ex-select--full"
                value={indexBase(q, shape)}
                onChange={(e) => onPatch({ base: Number(e.target.value) })}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <p className="xp-help">
            {pl
              ? "Bez podwójnej osi: dwie skale na jednym wykresie sugerują zależność, której nie ma."
              : "No dual axis: two scales on one chart suggest a relationship that is not there."}
          </p>
        </fieldset>
      ) : null}
    </div>
  );
}
