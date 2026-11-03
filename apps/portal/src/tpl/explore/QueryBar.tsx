// Query bar of the explorer: one calm row (wrapping; a horizontal scroller on phones) of filter buttons, each
// with the current value and a popover: Wskaźniki, Obszar, one button per shared dimension (Płeć, Wiek…),
// Okres, Wykres (type, layout, filters, comparison), then "Wyczyść" when the query differs from the default and
// "Zapisane widoki (n)". Every change goes through `onPatch` (normalised by applyPatch) and lands in the URL.

import { useId, useState, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import type { Catalog, GeoLevel } from "../../data";
import { Link } from "../../router";
import type { SavedView } from "../../savedViews";
import { geoName, kpiName } from "../chartData";
import { Segmented } from "../ui/blocks";
import { Icon } from "../ui/icons";
import { IndicatorPicker } from "./IndicatorPicker";
import { FilterPopover } from "./Popover";
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
import { dimName, memberLabel } from "./view";

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
    two: pl ? "Dwa okresy" : "Two periods",
    areas: pl ? "Obszary" : "Areas",
    axes: pl ? "Osie X i Y" : "X and Y axes",
    points: pl ? "Punkty" : "Points",
  }[r];
}

function short(names: string[], max = 2): string {
  return names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

export function chartLabel(c: ChartKind, lang: Lang): string {
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

/** Summary of the period on its button, e.g. "ostatnie 10 lat" or "2015–2024". */
export function periodText(q: Query, shape: Shape, lang: Lang): string {
  const pl = lang === "pl";
  if (!("last" in q.time)) return shape.window[0] === shape.window[1] ? String(shape.window[0]) : `${shape.window[0]}–${shape.window[1]}`;
  const n = q.time.last;
  if (n === 0) return pl ? "wszystkie lata" : "all years";
  if (n === 1) return pl ? "ostatni rok" : "last year";
  return `${pl ? "ostatnie" : "last"} ${n} ${plural(n, lang, ["rok", "lata", "lat"], ["year", "years"])}`;
}

function Section({ title, children, id }: { title?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="xp-sec">
      {title ? (
        <p className="xp-label ex-m0" id={id}>
          {title}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function QueryBar({
  cat,
  q,
  shape,
  lang,
  onPatch,
  dirty,
  onReset,
  views,
  onRemoveView,
}: {
  cat: Catalog;
  q: Query;
  shape: Shape;
  lang: Lang;
  onPatch: Patch;
  /** The query differs from the default: show "Wyczyść". */
  dirty: boolean;
  onReset: () => void;
  views: SavedView[];
  onRemoveView: (id: string) => void;
}) {
  const pl = lang === "pl";
  const closeLabel = pl ? "Zamknij" : "Close";
  const kpis = kpisOf(cat, q.i);
  const names = kpis.map((k) => kpiName(k, lang));
  return (
    <div className="xp-bar" role="group" aria-label={pl ? "Zapytanie" : "Query"}>
      <FilterPopover
        label={pl ? "Wskaźniki" : "Indicators"}
        value={names.length ? short(names) : pl ? "wybierz" : "choose"}
        count={kpis.length}
        closeLabel={closeLabel}
        size="lg"
        overflow
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
      </FilterPopover>
      {kpis.length ? (
        <>
          <FilterPopover
            label={pl ? "Obszar" : "Area"}
            value={short(q.geo.map((g) => geoName(cat, g, lang)))}
            count={q.geo.length}
            closeLabel={closeLabel}
          >
            <AreasPop cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} />
          </FilterPopover>
          {shape.shared.map((d) => {
            const chosen = q.members[d] ?? ["total"];
            return (
              <FilterPopover
                key={d}
                label={dimName(cat, d, lang)}
                value={short(chosen.map((m) => memberLabel(cat, d, m, lang).toLocaleLowerCase(lang)))}
                count={chosen.length}
                closeLabel={closeLabel}
                size="sm"
              >
                <MemberPop cat={cat} q={q} dim={d} lang={lang} onPatch={onPatch} />
              </FilterPopover>
            );
          })}
          <FilterPopover label={pl ? "Okres" : "Period"} value={periodText(q, shape, lang)} closeLabel={closeLabel}>
            <PeriodPop q={q} shape={shape} lang={lang} onPatch={onPatch} />
          </FilterPopover>
          <FilterPopover label={pl ? "Wykres" : "Chart"} value={chartLabel(q.chart, lang)} closeLabel={closeLabel} size="lg">
            <ChartPop cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} />
          </FilterPopover>
        </>
      ) : null}
      {dirty ? (
        <button type="button" className="zt-btn zt-btn--ghost xp-bar__clear" onClick={onReset}>
          {pl ? "Wyczyść" : "Clear"}
        </button>
      ) : null}
      {views.length ? (
        <div className="xp-bar__end">
          <SavedViewsPop views={views} lang={lang} onRemove={onRemoveView} closeLabel={closeLabel} />
        </div>
      ) : null}
    </div>
  );
}

function SavedViewsPop({
  views,
  lang,
  onRemove,
  closeLabel,
}: {
  views: SavedView[];
  lang: Lang;
  onRemove: (id: string) => void;
  closeLabel: string;
}) {
  const pl = lang === "pl";
  return (
    <FilterPopover label={pl ? "Zapisane widoki" : "Saved views"} value={`(${views.length})`} closeLabel={closeLabel} quiet>
      {(close) => (
        <Section>
          <ul
            className="xp-saved__list"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) close();
            }}
          >
            {views.slice(0, 12).map((s) => (
              <li key={s.id}>
                <Link to={s.url} className="small">
                  {s.name}
                </Link>
                <button
                  type="button"
                  className="xp-icon"
                  aria-label={(pl ? "Usuń widok: " : "Remove view: ") + s.name}
                  onClick={() => onRemove(s.id)}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
          <p className="xp-help">{pl ? "Zapisane w tej przeglądarce." : "Stored in this browser."}</p>
        </Section>
      )}
    </FilterPopover>
  );
}

/** Checkable list with "Wszystkie / Wyczyść" (areas and dimension members). */
function CheckList({
  name,
  items,
  chosen,
  onToggle,
  onAll,
  onClear,
  lang,
  search,
}: {
  name: string;
  items: { key: string; label: string }[];
  chosen: string[];
  onToggle: (key: string, on: boolean) => void;
  onAll: () => void;
  onClear: () => void;
  lang: Lang;
  search?: boolean;
}) {
  const pl = lang === "pl";
  const [text, setText] = useState("");
  const id = useId();
  const t = text.trim().toLocaleLowerCase(lang);
  const shown = t ? items.filter((it) => it.label.toLocaleLowerCase(lang).includes(t)) : items;
  const only = chosen.length === 1;
  return (
    <fieldset className="xp-fieldset xp-sec">
      <legend className="xp-label">
        {name} <span className="xp-count">{`${chosen.length} ${pl ? "z" : "of"} ${items.length}`}</span>
      </legend>
      {search ? (
        <label className="zt-search xp-find">
          <Icon name="search" size={16} />
          <span className="zt-sr">{pl ? `Szukaj: ${name}` : `Search: ${name}`}</span>
          <input
            type="search"
            value={text}
            autoComplete="off"
            placeholder={pl ? "Szukaj" : "Search"}
            aria-controls={id}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
      ) : null}
      <div className="xp-row">
        <button type="button" className="xp-link" onClick={onAll} disabled={chosen.length === items.length}>
          {pl ? "Wszystkie" : "All"}
        </button>
        <span aria-hidden="true" className="ex-muted">
          ·
        </span>
        <button type="button" className="xp-link" onClick={onClear} disabled={only}>
          {pl ? "Wyczyść" : "Clear"}
        </button>
      </div>
      <div className="xp-checks" id={id}>
        {shown.map((it) => {
          const on = chosen.includes(it.key);
          return (
            <label key={it.key} className="xp-check">
              <input type="checkbox" checked={on} disabled={on && only} onChange={() => onToggle(it.key, !on)} />
              <span>{it.label}</span>
            </label>
          );
        })}
        {!shown.length ? <p className="xp-help">{pl ? "Brak wyników." : "No matches."}</p> : null}
      </div>
    </fieldset>
  );
}

function AreasPop({ cat, q, shape, lang, onPatch }: { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const kpis = shape.kpis;
  const voiv = kpis.every(hasVoivodeships);
  const avail = commonGeos(kpis, cat, q.level);
  const some = [...new Set(kpis.flatMap((k) => levelGeos(k, cat, q.level)))].filter((g) => !avail.includes(g));
  return (
    <>
      {voiv ? (
        <Segmented<GeoLevel>
          label={pl ? "Poziom geograficzny" : "Geographic level"}
          small
          value={q.level}
          onChange={(level) => onPatch({ level, geo: [] })}
          options={[
            { value: "country", label: pl ? "Kraje" : "Countries" },
            { value: "voivodeship", label: pl ? "Województwa" : "Voivodeships" },
          ]}
        />
      ) : null}
      <CheckList
        key={q.level}
        name={pl ? "Obszary" : "Areas"}
        items={avail.map((g) => ({ key: g, label: geoName(cat, g, lang) }))}
        chosen={q.geo}
        lang={lang}
        search={avail.length > 8}
        onToggle={(g, on) => onPatch({ geo: on ? avail.filter((x) => x === g || q.geo.includes(x)) : q.geo.filter((x) => x !== g) })}
        onAll={() => onPatch({ geo: avail })}
        onClear={() => onPatch({ geo: q.geo.slice(0, 1) })}
      />
      {!voiv ? (
        <p className="xp-help">
          {pl ? "Województwa: nie dla wszystkich wybranych wskaźników." : "Voivodeships: not for every selected indicator."}
        </p>
      ) : null}
      {some.length ? (
        <p className="xp-help">
          {pl ? "Niedostępne dla wszystkich wskaźników: " : "Not available for every indicator: "}
          {short(
            some.map((g) => geoName(cat, g, lang)),
            3,
          )}
        </p>
      ) : null}
    </>
  );
}

function MemberPop({ cat, q, dim, lang, onPatch }: { cat: Catalog; q: Query; dim: string; lang: Lang; onPatch: Patch }) {
  const all = cat.dimensions.find((x) => x.dimension_key === dim)?.members ?? [];
  const chosen = q.members[dim] ?? ["total"];
  const set = (ms: string[]) => onPatch({ members: { ...q.members, [dim]: ms.length ? ms : ["total"] } });
  return (
    <CheckList
      name={dimName(cat, dim, lang)}
      items={all.map((m) => ({ key: m.key, label: lang === "pl" ? m.name_pl : m.name_en }))}
      chosen={chosen}
      lang={lang}
      onToggle={(m, on) => set(on ? all.map((x) => x.key).filter((x) => x === m || chosen.includes(x)) : chosen.filter((x) => x !== m))}
      onAll={() => set(all.map((m) => m.key))}
      onClear={() => set(["total"])}
    />
  );
}

function PeriodPop({ q, shape, lang, onPatch }: { q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const win = shape.window[0] === shape.window[1] ? String(shape.window[0]) : `${shape.window[0]}–${shape.window[1]}`;
  const ids = { from: useId(), to: useId(), range: useId() };
  const years: number[] = [];
  for (let y = shape.span[0]; y <= shape.span[1]; y++) years.push(y);
  const nPer = `${shape.periods.length} ${plural(shape.periods.length, lang, ["okres", "okresy", "okresów"], ["period", "periods"])}`;
  return (
    <>
      <Segmented<string>
        label={pl ? "Ostatnie lata" : "Recent years"}
        small
        value={"last" in q.time ? String(q.time.last) : "range"}
        onChange={(v) => onPatch({ time: { last: Number(v) } })}
        options={LAST_YEARS.map((n) => ({
          value: String(n),
          label: n === 0 ? (pl ? "Wszystkie" : "All") : `${n} ${plural(n, lang, ["rok", "lata", "lat"], ["year", "years"])}`,
        }))}
      />
      <fieldset className="xp-fieldset xp-sec">
        <legend className="xp-label">{pl ? "Własny zakres" : "Custom range"}</legend>
        <div className="xp-two">
          <div className="xp-inline">
            <label htmlFor={ids.from}>{pl ? "Od" : "From"}</label>
            <select
              id={ids.from}
              className="ex-select ex-select--full"
              value={shape.window[0]}
              onChange={(e) => onPatch({ time: { from: Number(e.target.value), to: Math.max(Number(e.target.value), shape.window[1]) } })}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="xp-inline">
            <label htmlFor={ids.to}>{pl ? "Do" : "To"}</label>
            <select
              id={ids.to}
              className="ex-select ex-select--full"
              value={shape.window[1]}
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
      </fieldset>
      <p className="xp-help">
        {"last" in q.time
          ? pl
            ? `Teraz ${win} (${nPer}); okres przesuwa się z nowymi danymi.`
            : `Now ${win} (${nPer}); the window moves with new data.`
          : pl
            ? `Dane od ${shape.span[0]} do ${shape.span[1]}; wybrano ${nPer}.`
            : `Data from ${shape.span[0]} to ${shape.span[1]}; ${nPer} selected.`}
      </p>
      {shape.mixed ? (
        <p className="xp-note">
          {pl
            ? `Różne częstotliwości: wszystko pokazano ${shape.freq === "A" ? "rocznie" : "kwartalnie"} (średnia z pełnych okresów).`
            : `Mixed frequencies: everything is shown ${shape.freq === "A" ? "annually" : "quarterly"} (mean of complete periods).`}
        </p>
      ) : null}
    </>
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

function ChartPop({ cat, q, shape, lang, onPatch }: { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
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
  const fixed = dims.filter((d) => fixedRole(q.chart, d));
  const filters = dims.filter((d) => !placed.has(d) && count(d) > 1);
  const years: number[] = [];
  for (let y = shape.span[0]; y <= shape.span[1]; y++) years.push(y);
  const cmpOpts: { value: Compare; label: string; off?: string }[] = [
    {
      value: "same",
      label: pl ? "Ta sama oś" : "Same axis",
      off: shape.sameUnit ? undefined : pl ? "różne jednostki" : "different units",
    },
    {
      value: "index",
      label: pl ? "Indeks (rok bazowy = 100)" : "Index (base year = 100)",
      off: shape.indexable ? undefined : pl ? "stóp i odsetków nie indeksujemy" : "rates and percentages are not indexed",
    },
    {
      value: "panels",
      label: pl ? "Osobne panele" : "Separate panels",
      off: isTimeChart(q.chart) ? undefined : pl ? "tylko linia i słupki w czasie" : "line and columns only",
    },
  ];
  return (
    <>
      <Section title={pl ? "Typ wykresu" : "Chart type"} id={`${baseId}-ct`}>
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
      </Section>

      {slots.length || fixed.length ? (
        <Section title={pl ? "Układ" : "Layout"}>
          <div className="xp-slots">
            {fixed.map((d) => (
              <div key={d} className="xp-slot">
                <span className="xp-slot__name">{fixedName(fixedRole(q.chart, d)!, lang)}</span>
                <span className="xp-slot__fixed">{dimText(d)}</span>
              </div>
            ))}
            {slots.map((s) => {
              const issue = issues[s];
              const id = `${baseId}-${s}`;
              return (
                <div key={s} className={`xp-slot${issue ? " xp-slot--bad" : ""}`}>
                  <label className="xp-slot__name" htmlFor={id}>
                    {slotName(s, lang)}
                  </label>
                  <select
                    id={id}
                    className="ex-select ex-select--full"
                    value={q.slots[s] ?? ""}
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
                      {pl ? issue.pl : issue.en}
                    </p>
                  ) : null}
                </div>
              );
            })}
            {filters.map((d) => {
              const ms = shape.members[d] ?? [];
              const id = `${baseId}-f-${d}`;
              return (
                <div key={d} className="xp-slot">
                  <label className="xp-slot__name" htmlFor={id}>
                    {dimName(cat, d, lang)}
                  </label>
                  <select
                    id={id}
                    className="ex-select ex-select--full"
                    value={filterValue(q, shape, d) ?? ""}
                    onChange={(e) => onPatch({ filters: { ...q.filters, [d]: e.target.value } })}
                  >
                    {(d === "t" ? ms.slice().reverse() : ms).map((m) => (
                      <option key={m} value={m}>
                        {memberLabel(cat, d, m, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
          {slots.length ? (
            <div className="xp-row">
              {swap && slots.length === 2 ? (
                <button type="button" className="xp-link" onClick={() => onPatch({ slots: swap })}>
                  {q.chart === "heatmap"
                    ? pl
                      ? "Zamień wiersze i kolumny"
                      : "Swap rows and columns"
                    : `${pl ? "Zamień" : "Swap"}: ${slotName(slots[0]!, lang).toLowerCase()} ↔ ${slotName(slots[1]!, lang).toLowerCase()}`}
                </button>
              ) : null}
              <button type="button" className="xp-link" onClick={() => onPatch({ slots: {}, filters: {} })}>
                {pl ? "Przywróć układ" : "Reset layout"}
              </button>
            </div>
          ) : null}
          {filters.length ? (
            <p className="xp-help">
              {pl
                ? "Wymiary bez miejsca na wykresie pokazują jedną wybraną wartość."
                : "Dimensions without a place on the chart show one chosen value."}
            </p>
          ) : null}
        </Section>
      ) : null}

      {showCmp ? (
        <fieldset className="xp-fieldset xp-sec">
          <legend className="xp-label">{pl ? "Porównanie" : "Comparison"}</legend>
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
            <div className="xp-slot">
              <label className="xp-slot__name" htmlFor={`${baseId}-base`}>
                {pl ? "Rok bazowy" : "Base year"}
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
        </fieldset>
      ) : null}
    </>
  );
}
