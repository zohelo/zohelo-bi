// Field placement of the explorer (Power BI-style field list and wells): which well a field may go to (and why
// not), the sensible well for the "+" button, and the query patch of a placement. Used by click, keyboard (menu
// "Dodaj do…") and drag and drop alike, so the three ways always agree.
//   wells: Wartości (measures) · the chart's wells (Oś X, Legenda, Małe wielokrotności, Wiersze…) · Filtry
// A dimension field may carry a level (Rok/Kwartał/Miesiąc, Kraj/Województwo) or be the whole hierarchy.

import type { Catalog, GeoLevel, Kpi } from "../../data";
import {
  MAX_KPIS,
  commonGeos,
  defaultAreas,
  kpisOf,
  type DimId,
  type Query,
  type QueryInput,
  type Shape,
  type SlotKey,
} from "./exploreState";
import { hasVoivodeships } from "./kpiInfo";
import { KIND_INFO, measureWells } from "./kinds";
import { SLOTS, TIME_X, canPlace, moveDim } from "./layout";
import { supportsGrain, type Grain } from "./model";

export type WellKey = "values" | SlotKey | "filters";
export type Field =
  | { kind: "kpi"; key: string }
  | { kind: "dim"; key: DimId; grain?: Grain; level?: GeoLevel; hier?: boolean }
  /** "Nazwy miar": the measures as a dimension (legend, axis or small multiples). */
  | { kind: "names"; key: "i" };
export type Fit = { ok: true } | { ok: false; why: { pl: string; en: string } };

const no = (pl: string, en: string): Fit => ({ ok: false, why: { pl, en } });
const dimOf = (f: Field): DimId => (f.kind === "kpi" ? "" : f.key);

export function wellsOf(q: Query): WellKey[] {
  return ["values", ...SLOTS[q.chart], "filters"];
}

/** Measures of the selection without a breakdown (they show their total for it). */
export function missingIn(kpis: Kpi[], dim: DimId): Kpi[] {
  if (dim === "i" || dim === "geo" || dim.startsWith("t")) return [];
  return kpis.filter((k) => !k.dimension_keys.includes(dim));
}

/** Whether a field can go into a well, with the reason when it cannot. */
export function fitWell(q: Query, shape: Shape, _cat: Catalog, f: Field, well: WellKey): Fit {
  if (f.kind === "kpi") {
    if (well !== "values") return no("Miary trafiają do „Wartości”.", "Measures go to “Values”.");
    if (q.i.includes(f.key)) return no("Już w wartościach.", "Already in values.");
    if (q.i.length >= MAX_KPIS) return no(`Limit ${MAX_KPIS} miar.`, `Limit of ${MAX_KPIS} measures.`);
    return { ok: true };
  }
  const d = dimOf(f);
  if (well === "values") return no("„Wartości” przyjmują tylko miary.", "“Values” take measures only.");
  if (f.kind === "dim" && f.level === "voivodeship" && q.i.length && !shape.kpis.some(hasVoivodeships))
    return no("Wybrane miary nie mają danych dla województw.", "The chosen measures have no voivodeship data.");
  if (f.kind === "dim" && f.grain && q.i.length && !shape.kpis.some((k) => supportsGrain(k, f.grain!)))
    return no("Wybrane miary nie mają danych na tym poziomie kalendarza.", "The chosen measures have no data at this calendar level.");
  if (well === "filters")
    return d === "i" && q.i.length < 2 ? no("Jedna miara nie potrzebuje filtra.", "One measure needs no filter.") : { ok: true };
  if (!SLOTS[q.chart].includes(well)) return no("Ten wykres nie ma tego miejsca.", "This chart has no such well.");
  if (d === "i" && measureWells(q.chart))
    return no("Ten wykres ma osobną studzienkę dla każdej miary.", "This chart has a separate well for each measure.");
  const sp = KIND_INFO[q.chart].slots.find((s) => s.key === well)!;
  if (sp.only && !sp.only.includes(d))
    return sp.only.includes("geo")
      ? no("Tu pasuje tylko Geografia (województwa).", "Only Geography (voivodeships) fits here.")
      : no("Tu pasuje tylko Kalendarz (okresy).", "Only the Calendar (periods) fits here.");
  if (!canPlace(q.chart, well, d)) return no("To pole tu nie pasuje.", "This field does not fit here.");
  return { ok: true };
}

/** The well "+" uses: values for measures; for a dimension the first free well that takes it, else filters. */
export function sensibleWell(q: Query, shape: Shape, cat: Catalog, f: Field): WellKey | null {
  if (f.kind === "kpi") return fitWell(q, shape, cat, f, "values").ok ? "values" : null;
  const d = dimOf(f);
  const at = SLOTS[q.chart].find((s) => q.slots[s] === d);
  const sameLevel = f.kind !== "dim" || ((!f.grain || f.grain === shape.grain) && (!f.level || f.level === q.level));
  if (at && sameLevel && !(f.kind === "dim" && f.hier && !q.hier.includes(d))) return null;
  if (at) return at;
  const order = [...SLOTS[q.chart]];
  if (d === "t" && TIME_X.includes(q.chart)) order.sort((a) => (a === "x" ? -1 : 0));
  const free = order.find((s) => !q.slots[s] && fitWell(q, shape, cat, f, s).ok);
  if (free) return free;
  return fitWell(q, shape, cat, f, "filters").ok ? "filters" : null;
}

/** The well a field is in now (null = not on the chart). */
export function wellOf(q: Query, f: Field): WellKey | null {
  if (f.kind === "kpi") return q.i.includes(f.key) ? "values" : null;
  const s = SLOTS[q.chart].find((x) => q.slots[x] === f.key);
  return s ?? null;
}

/** Several members for a dimension that goes onto the chart (a breakdown shows its parts, the area several areas). */
function spread(q: Query, shape: Shape, cat: Catalog, f: Field, well: SlotKey): Partial<QueryInput> {
  const d = dimOf(f);
  if (d === "geo") {
    const level = (f.kind === "dim" && f.level) || q.level;
    const kpis = shape.kpis.length ? shape.kpis : kpisOf(cat, q.i);
    const avail = commonGeos(kpis, cat, level).filter((g) => level === "country" || g !== "PL");
    const axis = well === "x" || well === "rows" || well === "cols";
    if (level === q.level && q.geo.length > 1 && !axis) return {};
    if (axis) return { level, geo: avail.slice(0, 40) };
    const prefer = level === "voivodeship" ? ["PL-14", "PL-24", "PL-12", "PL-30", "PL-02"] : ["PL", "EU27", "DE", "CZ", "SK"];
    const geo = prefer.filter((g) => avail.includes(g));
    return { level, geo: geo.length > 1 ? geo : defaultAreas(kpis, cat, level) };
  }
  if (d === "i" || d.startsWith("t")) return {};
  if ((q.members[d]?.length ?? 0) > 1) return {};
  const all = cat.dimensions.find((x) => x.dimension_key === d)?.members.map((m) => m.key) ?? [];
  const parts = all.filter((m) => m !== "total");
  return parts.length > 1 ? { members: { ...q.members, [d]: parts } } : {};
}

/** Level and hierarchy changes a field brings (Rok/Kwartał/Miesiąc, Kraj/Województwo, the whole hierarchy). */
function levelPatch(q: Query, f: Field): Partial<QueryInput> {
  if (f.kind !== "dim") return {};
  const p: Partial<QueryInput> = {};
  if (f.grain) p.grain = f.grain;
  if (f.level && f.level !== q.level) {
    p.level = f.level;
    p.geo = [];
  }
  if (f.hier) {
    p.hier = [...new Set([...q.hier, f.key])];
    if (f.key === "t" && !f.grain) p.grain = "y";
    if (f.key === "geo" && !f.level) {
      p.level = "country";
      if (q.level !== "country") p.geo = [];
    }
  } else if (f.grain || f.level) p.hier = q.hier.filter((x) => x !== f.key);
  return p;
}

/** The patch that puts a field into a well (null when it cannot go there). */
export function placePatch(q: Query, shape: Shape, cat: Catalog, f: Field, well: WellKey): Partial<QueryInput> | null {
  if (!fitWell(q, shape, cat, f, well).ok) return null;
  if (f.kind === "kpi") return { i: [...q.i, f.key] };
  const lv = levelPatch(q, f);
  if (well === "filters") {
    const from = SLOTS[q.chart].find((s) => q.slots[s] === f.key);
    return { ...lv, hier: q.hier.filter((x) => x !== f.key), ...(from ? { slots: moveDim(q, from, null) } : {}) };
  }
  if (well === "values") return null;
  return { ...lv, ...spread({ ...q, ...(lv as Partial<Query>) }, shape, cat, f, well), slots: moveDim(q, well, f.key) };
}

/** The patch that takes a field out of the chart: a measure leaves the query, a dimension becomes a filter. */
export function removePatch(q: Query, f: Field): Partial<QueryInput> {
  if (f.kind === "kpi") return { i: q.i.filter((x) => x !== f.key) };
  const from = SLOTS[q.chart].find((s) => q.slots[s] === f.key);
  return { hier: q.hier.filter((x) => x !== f.key), ...(from ? { slots: moveDim(q, from, null) } : {}) };
}

/** Drag payload type (dataTransfer). */
export const DRAG_TYPE = "application/x-zohelo-field";
