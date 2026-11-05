// Field placement of explorer v3 (Power BI-style field list and wells): which well a field may go to (and why
// not), the sensible well for the "+" button, and the query patch of a placement. Used by click, keyboard (menu
// "Dodaj do…") and drag and drop alike, so the three ways always agree.
//   wells: Wartości (indicators) · the chart's slots (Seria/Legenda, Panele, Kategorie, Wiersze, Kolumny) · Filtry

import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { kpiName } from "../chartData";
import { MAX_KPIS, commonGeos, kpisOf, type DimId, type Query, type QueryInput, type Shape, type SlotKey } from "./exploreState";
import { hasVoivodeships } from "./kpiInfo";
import { SLOTS, canPlace, fixedRole, moveDim } from "./layout";

export type WellKey = "values" | SlotKey | "filters";
export type Field = { kind: "kpi"; key: string } | { kind: "dim"; key: DimId };
export type Fit = { ok: true } | { ok: false; why: { pl: string; en: string } };

const no = (pl: string, en: string): Fit => ({ ok: false, why: { pl, en } });

export function wellsOf(q: Query): WellKey[] {
  return ["values", ...SLOTS[q.chart], "filters"];
}

/** Dimensions offered in the field list: area, period, every catalogue breakdown, indicators (when two or more). */
export function dimFields(cat: Catalog, q: Query): DimId[] {
  return [...(q.i.length > 1 ? ["i"] : []), "geo", "t", ...cat.dimensions.map((d) => d.dimension_key)];
}

/** Indicators of the selection that lack a breakdown (a dimension not shared by all of them). */
export function missingIn(kpis: Kpi[], dim: DimId): Kpi[] {
  if (dim === "i" || dim === "geo" || dim === "t") return [];
  return kpis.filter((k) => !k.dimension_keys.includes(dim));
}

/** Whether a field can go into a well, with the reason when it cannot. */
export function fitWell(q: Query, shape: Shape, cat: Catalog, f: Field, well: WellKey, lang: Lang): Fit {
  if (f.kind === "kpi") {
    if (well !== "values") return no("Wskaźniki trafiają do „Wartości”.", "Indicators go to “Values”.");
    if (q.i.includes(f.key)) return no("Już w wartościach.", "Already in values.");
    if (q.i.length >= MAX_KPIS) return no(`Limit ${MAX_KPIS} wskaźników.`, `Limit of ${MAX_KPIS} indicators.`);
    return { ok: true };
  }
  const d = f.key;
  if (well === "values") return no("„Wartości” przyjmują tylko wskaźniki (miary).", "“Values” take indicators (measures) only.");
  if (!q.i.length) return no("Najpierw wybierz wskaźnik.", "Choose an indicator first.");
  const lack = missingIn(shape.kpis, d);
  if (lack.length) {
    const names = lack.map((k) => kpiName(k, lang)).join(", ");
    return no(`Nie ma tego podziału: ${names}.`, `Not broken down this way: ${names}.`);
  }
  if (well === "filters") return { ok: true };
  if (fixedRole(q.chart, d))
    return no("Ten typ wykresu sam umieszcza to pole (patrz „Ustalone przez wykres”).", "This chart type places this field itself.");
  if (d === "t" && !canPlace(q.chart, well, d))
    return no(
      "Okres może być wierszem lub kolumną tylko w mapie cieplnej i macierzy.",
      "Period can be rows or columns only in the heatmap and the matrix.",
    );
  if (!canPlace(q.chart, well, d)) return no("Ten wykres nie ma tego miejsca.", "This chart has no such slot.");
  return { ok: true };
}

/** The well "+" uses: values for indicators; for a dimension the first free slot that takes it, else filters. */
export function sensibleWell(q: Query, shape: Shape, cat: Catalog, f: Field, lang: Lang): WellKey | null {
  if (f.kind === "kpi") return fitWell(q, shape, cat, f, "values", lang).ok ? "values" : null;
  const placedIn = SLOTS[q.chart].find((s) => q.slots[s] === f.key);
  if (placedIn) return null;
  const slots = SLOTS[q.chart].filter((s) => fitWell(q, shape, cat, f, s, lang).ok);
  const free = slots.find((s) => !q.slots[s]);
  if (free) return free;
  return fitWell(q, shape, cat, f, "filters", lang).ok ? "filters" : null;
}

/** The well a field is in now (null = not in the query). */
export function wellOf(q: Query, f: Field): WellKey | null {
  if (f.kind === "kpi") return q.i.includes(f.key) ? "values" : null;
  const s = SLOTS[q.chart].find((x) => q.slots[x] === f.key);
  return s ?? null;
}

/** Several members for a dimension that goes onto the chart (a breakdown shows its parts, an area several areas). */
function spread(q: Query, shape: Shape, cat: Catalog, d: DimId): Partial<QueryInput> {
  if (d === "geo") {
    if (q.geo.length > 1) return {};
    const avail = commonGeos(shape.kpis, cat, q.level);
    const prefer = q.level === "voivodeship" ? ["PL14", "PL24", "PL12", "PL30", "PL02"] : ["PL", "EU27", "DE", "CZ", "SK"];
    const geo = prefer.filter((g) => avail.includes(g));
    return { geo: geo.length > 1 ? geo : avail.slice(0, 5) };
  }
  if (d === "i" || d === "t") return {};
  if ((q.members[d]?.length ?? 0) > 1) return {};
  const all = cat.dimensions.find((x) => x.dimension_key === d)?.members.map((m) => m.key) ?? [];
  const parts = all.filter((m) => m !== "total");
  return parts.length > 1 ? { members: { ...q.members, [d]: parts } } : {};
}

/** The patch that puts a field into a well (null when it cannot go there). */
export function placePatch(q: Query, shape: Shape, cat: Catalog, f: Field, well: WellKey, lang: Lang): Partial<QueryInput> | null {
  if (!fitWell(q, shape, cat, f, well, lang).ok) return null;
  if (f.kind === "kpi") {
    const k = cat.kpis.find((x) => x.kpi_key === f.key);
    // A regional selection keeps its level only when the new indicator has voivodeships too.
    return { i: [...q.i, f.key], ...(k && q.level === "voivodeship" && !hasVoivodeships(k) ? { level: "country", geo: [] } : {}) };
  }
  if (well === "filters") {
    const from = SLOTS[q.chart].find((s) => q.slots[s] === f.key);
    return from ? { slots: moveDim(q, from, null) } : {};
  }
  if (well === "values") return null;
  return { ...spread(q, shape, cat, f.key), slots: moveDim(q, well, f.key) };
}

/** The patch that takes a field out of the chart: an indicator leaves the query, a dimension becomes a filter. */
export function removePatch(q: Query, f: Field): Partial<QueryInput> {
  if (f.kind === "kpi") return { i: q.i.filter((x) => x !== f.key) };
  const from = SLOTS[q.chart].find((s) => q.slots[s] === f.key);
  return from ? { slots: moveDim(q, from, null) } : {};
}

/** Indicators of the query in order (for the Values well). */
export function valueKpis(q: Query, cat: Catalog): Kpi[] {
  return kpisOf(cat, q.i);
}

/** Drag payload type (dataTransfer). */
export const DRAG_TYPE = "application/x-zohelo-field";
