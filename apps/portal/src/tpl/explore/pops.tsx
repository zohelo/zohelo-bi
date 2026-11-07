// Popover contents of explorer v3 (wells and chips): areas, members of a breakdown, the period window, the compare
// mode of several indicators and the saved views, plus the names of slots and fixed roles. Every change goes
// through `onPatch` (normalised by applyPatch) and lands in the URL.

import { useId, useState, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import type { Catalog, GeoLevel } from "../../data";
import { Link } from "../../router";
import type { SavedView } from "../../savedViews";
import { geoName } from "../chartData";
import { Segmented } from "../ui/blocks";
import { Icon } from "../ui/icons";
import { FilterPopover } from "./Popover";
import {
  LAST_YEARS,
  commonGeos,
  indexBase,
  levelGeos,
  placedDims,
  type ChartKind,
  type Compare,
  type Query,
  type QueryInput,
  type Shape,
  type SlotKey,
} from "./exploreState";
import { hasVoivodeships } from "./kpiInfo";
import { isTimeChart } from "./layout";
import { plural } from "./search";
import { dimName } from "./view";
import { kindLabel, slotLabel } from "./kinds";
import { GRAINS, supportsGrain, type Grain } from "./model";

export type Patch = (p: Partial<QueryInput>) => void;

/** Name of a well of the current chart ("Oś X", "Legenda", "Punkty (szczegóły)"…). */
export function slotName(s: SlotKey, lang: Lang, chart: ChartKind = "line"): string {
  return slotLabel(chart, s, lang);
}

function short(names: string[], max = 2): string {
  return names.length <= max ? names.join(", ") : `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

export function chartLabel(c: ChartKind, lang: Lang): string {
  return kindLabel(c, lang);
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

export function SavedViewsPop({
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

export function AreasPop({ cat, q, shape, lang, onPatch }: { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
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

export function MemberPop({ cat, q, dim, lang, onPatch }: { cat: Catalog; q: Query; dim: string; lang: Lang; onPatch: Patch }) {
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

export function PeriodPop({ q, shape, lang, onPatch }: { q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const win = shape.window[0] === shape.window[1] ? String(shape.window[0]) : `${shape.window[0]}–${shape.window[1]}`;
  const ids = { from: useId(), to: useId(), range: useId() };
  const years: number[] = [];
  for (let y = shape.span[0]; y <= shape.span[1]; y++) years.push(y);
  const nPer = `${shape.periods.length} ${plural(shape.periods.length, lang, ["okres", "okresy", "okresów"], ["period", "periods"])}`;
  const grains = GRAINS.filter((g) => shape.kpis.some((k) => supportsGrain(k, g)));
  const grainName: Record<Grain, string> = pl ? { y: "Rok", q: "Kwartał", m: "Miesiąc" } : { y: "Year", q: "Quarter", m: "Month" };
  return (
    <>
      {grains.length > 1 ? (
        <Segmented<Grain>
          label={pl ? "Poziom kalendarza" : "Calendar level"}
          small
          value={shape.grain}
          onChange={(grain) => onPatch({ grain })}
          options={grains.map((g) => ({ value: g, label: grainName[g] }))}
        />
      ) : null}
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

/** Comparison of several indicators: same axis, index (base year) or separate panels. */
export function CompareOptions({ q, shape, lang, onPatch }: { q: Query; shape: Shape; lang: Lang; onPatch: Patch }) {
  const pl = lang === "pl";
  const baseId = useId();
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
  if (q.i.length < 2 || !placedDims(q).has("i")) return null;
  return (
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
  );
}
