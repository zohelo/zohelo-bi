// Dimension model of the explorer (owner review 2026-11-05: dimensions as in Analysis Services, one table with a
// key and attributes, levels forming a hierarchy). The field list shows these groups; a level placed on the chart
// puts its dimension in a well and sets the level:
//   Kalendarz   key = period; levels Rok → Kwartał → Miesiąc (the grain of "t"); attributes Miesiąc roku ("t.moy"),
//               Kwartał roku ("t.qoy") for seasonal views
//   Geografia   key = NUTS code; levels Kraj → Województwo (q.level); powiaty and gminy follow with BDL data
//   one table per breakdown of the catalogue (płeć, wiek, sekcja PKD…): key = member code, one level
// Which dimensions are offered: all with no measure selected; with measures, the union of the dimensions of the
// selected measures. A measure without a placed dimension shows its total for every member (SSAS: unrelated
// dimension), and the view says so.

import type { Catalog, Frequency, GeoLevel, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { hasVoivodeships } from "./kpiInfo";

export type DimId = string;
export type Grain = "y" | "q" | "m";
export const GRAINS: Grain[] = ["y", "q", "m"];
export const GRAIN_FREQ: Record<Grain, Frequency> = { y: "A", q: "Q", m: "M" };
export const FREQ_GRAIN: Record<Frequency, Grain> = { A: "y", Q: "q", M: "m" };
const RANK: Record<Grain, number> = { m: 0, q: 1, y: 2 };

/** A measure has data at a grain when its own frequency is the same or finer. */
export function supportsGrain(k: Pick<Kpi, "frequency">, g: Grain): boolean {
  return RANK[FREQ_GRAIN[k.frequency]] <= RANK[g];
}

/** Time attributes besides the period itself. */
export const TIME_ATTRS: DimId[] = ["t.moy", "t.qoy"];
export const isTimeDim = (d: DimId) => d === "t" || TIME_ATTRS.includes(d);

/** One draggable row of a dimension group: a level of a hierarchy or an attribute. */
export type Level = {
  /** Field id: "t@y", "t.moy", "geo@voivodeship", "sex"… */
  id: string;
  dim: DimId;
  grain?: Grain;
  geo?: GeoLevel;
  pl: string;
  en: string;
};

export type DimGroup = {
  key: string;
  pl: string;
  en: string;
  /** Key and attributes of the dimension table, one line. */
  notePl: string;
  noteEn: string;
  /** The levels form a hierarchy (drill-down). */
  hierarchy: boolean;
  /** The dimension placed as a whole (the hierarchy, or the single level). */
  dim: DimId;
  levels: Level[];
};

const freqs = (kpis: Kpi[]) => new Set(kpis.map((k) => k.frequency));

/** Dimension groups offered for the selected measures (all of them when none is selected). */
export function dimGroups(cat: Catalog, kpis: Kpi[]): DimGroup[] {
  const any = !kpis.length;
  const f = freqs(kpis);
  const monthly = any || f.has("M");
  const quarterly = monthly || f.has("Q");
  const cal: Level[] = [
    { id: "t@y", dim: "t", grain: "y", pl: "Rok", en: "Year" },
    ...(quarterly ? [{ id: "t@q", dim: "t", grain: "q" as Grain, pl: "Kwartał", en: "Quarter" }] : []),
    ...(monthly ? [{ id: "t@m", dim: "t", grain: "m" as Grain, pl: "Miesiąc", en: "Month" }] : []),
    ...(monthly ? [{ id: "t.moy", dim: "t.moy", pl: "Miesiąc roku", en: "Month of year" }] : []),
    ...(quarterly ? [{ id: "t.qoy", dim: "t.qoy", pl: "Kwartał roku", en: "Quarter of year" }] : []),
  ];
  const voiv = any || kpis.some(hasVoivodeships);
  const geo: Level[] = [
    { id: "geo@country", dim: "geo", geo: "country", pl: "Kraj", en: "Country" },
    ...(voiv ? [{ id: "geo@voivodeship", dim: "geo", geo: "voivodeship" as GeoLevel, pl: "Województwo", en: "Voivodeship" }] : []),
  ];
  const keys = any ? cat.dimensions.map((d) => d.dimension_key) : unionDims(kpis, cat);
  const others: DimGroup[] = keys.map((key) => {
    const d = cat.dimensions.find((x) => x.dimension_key === key)!;
    const n = d.members.filter((m) => m.key !== "total").length;
    return {
      key,
      pl: d.name_pl,
      en: d.name_en,
      notePl: `klucz: kod · ${n} wartości + ogółem`,
      noteEn: `key: code · ${n} values + total`,
      hierarchy: false,
      dim: key,
      levels: [{ id: key, dim: key, pl: d.name_pl, en: d.name_en }],
    };
  });
  return [
    {
      key: "cal",
      pl: "Kalendarz",
      en: "Calendar",
      notePl: "klucz: okres · Rok → Kwartał → Miesiąc",
      noteEn: "key: period · Year → Quarter → Month",
      hierarchy: true,
      dim: "t",
      levels: cal,
    },
    {
      key: "geo",
      pl: "Geografia",
      en: "Geography",
      notePl: "klucz: kod NUTS · Kraj → Województwo (powiaty i gminy z danymi BDL)",
      noteEn: "key: NUTS code · Country → Voivodeship (districts and municipalities with BDL data)",
      hierarchy: voiv,
      dim: "geo",
      levels: geo,
    },
    ...others,
  ];
}

/** Breakdowns of any of the measures, in catalogue order. */
export function unionDims(kpis: Kpi[], cat: Catalog): string[] {
  const has = new Set(kpis.flatMap((k) => k.dimension_keys));
  return cat.dimensions.map((d) => d.dimension_key).filter((d) => has.has(d));
}

// ---------- names

type Ctx = { grain?: Grain | null; level?: GeoLevel };

const GRAIN_NAME: Record<Grain, [string, string]> = { y: ["Rok", "Year"], q: ["Kwartał", "Quarter"], m: ["Miesiąc", "Month"] };

/** Name of a dimension in a well chip or a column head ("Rok", "Województwo", "Płeć"). */
export function dimLabel(cat: Catalog, d: DimId, lang: Lang, c: Ctx = {}): string {
  const pl = lang === "pl";
  if (d === "i") return pl ? "Miary" : "Measures";
  if (d === "geo") return c.level === "voivodeship" ? (pl ? "Województwo" : "Voivodeship") : pl ? "Kraj" : "Country";
  if (d === "t") return GRAIN_NAME[c.grain ?? "y"][pl ? 0 : 1];
  if (d === "t.moy") return pl ? "Miesiąc roku" : "Month of year";
  if (d === "t.qoy") return pl ? "Kwartał roku" : "Quarter of year";
  const x = cat.dimensions.find((y) => y.dimension_key === d);
  return x ? (pl ? x.name_pl : x.name_en) : d;
}

/** Genitive plural used after "według" in titles ("według województw i płci"). */
const GEN_PL: Record<string, string> = {
  sex: "płci",
  age: "wieku",
  sector: "sektorów",
  nace: "sekcji PKD",
  coicop: "grup COICOP",
  urban: "miasta i wsi",
  level: "poziomów",
  fuel: "nośników",
  mode: "rodzajów transportu",
  mig: "głównych grupowań przemysłowych",
  mfg_division: "działów przetwórstwa",
  construction_type: "rodzajów robót",
  size: "klas wielkości",
  retail_group: "grup towarów",
  services: "sekcji usług",
  income_driver: "składników zmiany",
  agri_output: "rodzajów produkcji",
  agri_price: "strony rynku",
  agri_product: "produktów",
  crop: "upraw",
  wood: "rodzajów drewna",
  residence: "miejsca zamieszkania",
  origin: "kraju pochodzenia",
  acc_type: "rodzajów obiektów",
  demand: "składników popytu",
  core: "miar inflacji bazowej",
  asset: "rodzajów aktywów",
  bop: "składników rachunku bieżącego",
  partner: "krajów partnerskich",
  cofog: "funkcji (COFOG)",
  gg_revenue: "rodzajów dochodów",
  gg_subsector: "podsektorów",
  debt_driver: "czynników zmiany długu",
  debt_instrument: "instrumentów długu",
  debt_holder: "posiadaczy długu",
  m3_component: "składników M3",
  borrower: "rodzajów kredytu",
  currency: "walut",
  market: "rynków",
  fund_type: "rodzajów funduszy",
  ins_branch: "działów ubezpieczeń",
  ppk_source: "źródeł wpłat",
  lg_type: "rodzajów JST",
  lg_revenue: "źródeł dochodów JST",
  lg_function: "działów wydatków JST",
};

/** "województw" / "voivodeship": the dimension as used in "według …" / "by …". */
export function dimBy(cat: Catalog, d: DimId, lang: Lang, c: Ctx = {}): string {
  const pl = lang === "pl";
  if (d === "i") return pl ? "miar" : "measure";
  if (d === "geo") return c.level === "voivodeship" ? (pl ? "województw" : "voivodeship") : pl ? "krajów" : "country";
  if (d === "t") {
    const g = c.grain ?? "y";
    return pl ? { y: "lat", q: "kwartałów", m: "miesięcy" }[g] : { y: "year", q: "quarter", m: "month" }[g];
  }
  if (d === "t.moy") return pl ? "miesięcy roku" : "month of year";
  if (d === "t.qoy") return pl ? "kwartałów roku" : "quarter of year";
  if (pl && GEN_PL[d]) return GEN_PL[d]!;
  const x = cat.dimensions.find((y) => y.dimension_key === d);
  const name = x ? (pl ? x.name_pl : x.name_en) : d;
  return pl ? `kategorii „${name}”` : name.toLowerCase();
}

/** "A", "A i B", "A, B i C", "4 miary". */
export function listText(items: string[], lang: Lang, many?: string): string {
  const and = lang === "pl" ? " i " : " and ";
  if (items.length <= 1) return items[0] ?? "";
  if (items.length > 3 && many) return many;
  return `${items.slice(0, -1).join(", ")}${and}${items[items.length - 1]}`;
}

const MONTHS_PL = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
];
const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Label of a seasonal attribute member: "05" → "maj", "Q2" → "II kw.". */
export function seasonLabel(d: DimId, key: string, lang: Lang): string {
  if (d === "t.moy") return (lang === "pl" ? MONTHS_PL : MONTHS_EN)[Number(key) - 1] ?? key;
  const q = Number(key.slice(1));
  return lang === "pl" ? `${["I", "II", "III", "IV"][q - 1] ?? key} kw.` : key;
}

/** Calendar coordinates of a native period: the period at a grain, month of year and quarter of year. */
export function periodAt(p: string, g: Grain): string | undefined {
  const isM = /^\d{4}-\d{2}$/.test(p);
  const isQ = /^\d{4}-Q\d$/.test(p);
  const y = p.slice(0, 4);
  if (g === "y") return y;
  if (g === "q") return isM ? `${y}-Q${Math.ceil(Number(p.slice(5, 7)) / 3)}` : isQ ? p : undefined;
  return isM ? p : undefined;
}
export function monthOfYear(p: string): string | undefined {
  return /^\d{4}-\d{2}$/.test(p) ? p.slice(5, 7) : undefined;
}
export function quarterOfYear(p: string): string | undefined {
  if (/^\d{4}-\d{2}$/.test(p)) return `Q${Math.ceil(Number(p.slice(5, 7)) / 3)}`;
  if (/^\d{4}-Q\d$/.test(p)) return p.slice(5);
  return undefined;
}
