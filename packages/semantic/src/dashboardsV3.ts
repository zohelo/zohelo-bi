// Dashboard format version 3 (docs/dashboards.md, "Version 3"): one YAML file per catalogue domain in
// dashboards/domains/<domain>.yaml; the domain overview plus one page per domain group. Shared by the portal
// (structure is checked when the files are bundled) and ops/check-dashboards.ts (structure plus every key
// against the catalogue), so the two cannot drift. Messages are Polish / English and name the file and path.

/** The chart types of the zohelo chart library (packages/visuals CHART_TYPES; a portal test keeps them equal). */
export const V3_CHART_TYPES = [
  "line-band",
  "line-highlight",
  "columns",
  "contributions",
  "small-multiples",
  "area-share",
  "ranked-bars",
  "grouped-bars",
  "dumbbell",
  "slope",
  "diverging-bars",
  "bullet",
  "waterfall",
  "stacked-bars",
  "segmented-bar",
  "pyramid",
  "histogram",
  "scatter",
  "tile-map",
  "heatmap",
  "sparkline-table",
] as const;

export type V3ChartType = (typeof V3_CHART_TYPES)[number];

/** Window of a card or of the period filter: the last 1, 5 or 10 years, all data, or explicit bounds. */
export type V3Period = "1y" | "5y" | "10y" | "max" | { from: string; to?: string };
export const V3_PERIODS = ["1y", "5y", "10y", "max"] as const;

/** Page filters: these four plus any dimension key (sex, age, nace…). */
export const V3_FILTERS = ["period", "geography", "geo_level", "source"] as const;

/** Text tokens a card title may use; the portal fills them from the card's data. */
export const V3_TOKENS = ["value", "period", "geo", "top", "bottom", "from", "to"] as const;

export type V3KpiTile = string | { kpi: string; geography?: string; context_pl?: string; context_en?: string };

export type V3Reference = number | string | { value: number; label_pl: string; label_en: string };
export type V3Annotate = "max" | "min" | "last" | { x: string; label_pl: string; label_en: string };

export type V3Card = {
  kpi: string;
  chart: V3ChartType;
  /** States the finding; may use {value} {period} {geo} {top} {bottom} {from} {to}. */
  title_pl: string;
  title_en: string;
  /** Measure, unit, frequency, range; built from the KPI when omitted. */
  sub_pl?: string;
  sub_en?: string;
  span?: 12 | 8 | 6 | 4;
  /** Categories or comparison lines: geography keys, or "voivodeships" / "eu". */
  geographies?: string[] | "voivodeships" | "eu";
  /** Other KPIs: scatter = the x-axis KPI (one); bullet and sparkline-table = further rows. */
  compare?: string[];
  /** Dimension whose members become series or parts. */
  split?: string;
  period?: V3Period;
  band?: [number, number];
  /** A number, a geography key whose value is the reference (EU27, PL), or a labelled number. */
  reference?: V3Reference;
  /** Geography or member key to emphasise; default the page's geography. */
  highlight?: string;
  annotate?: V3Annotate;
};

/**
 * A section of a page: a logical block of content the page's section navigation jumps to (third level under
 * domain → page). `id` is the anchor (#id); `nav_*` the short label in the navigation (default: title).
 */
export type V3Section = {
  id?: string;
  title_pl: string;
  title_en: string;
  nav_pl?: string;
  nav_en?: string;
  lead_pl?: string;
  lead_en?: string;
  cards: V3Card[];
};

export type V3Page = {
  id: string;
  group_key: string;
  title_pl: string;
  title_en: string;
  lead_pl: string;
  lead_en: string;
  filters?: string[];
  kpis: V3KpiTile[];
  sections: V3Section[];
};

export type V3Overview = { lead_pl: string; lead_en: string; filters?: string[]; kpis: V3KpiTile[]; sections?: V3Section[] };

export type DashboardV3 = {
  schema: 3;
  id: string;
  domain_key: string;
  title_pl: string;
  title_en: string;
  description_pl?: string;
  description_en?: string;
  overview: V3Overview;
  pages: V3Page[];
};

/** The catalogue fields the catalogue check needs (the portal's Catalog satisfies it). */
export type V3Catalog = {
  domains: { domain_key: string; level: string; parent_key: string | null }[];
  kpis: {
    kpi_key: string;
    unit_key: string;
    frequency: string;
    group_key: string;
    domain_key: string;
    geo_levels: string[];
    geographies: string[];
    dimension_keys: string[];
    source_keys: string[];
  }[];
  dimensions: { dimension_key: string; members: { key: string }[] }[];
  geographies: { key: string; level: string }[];
};

const SPANS = [12, 8, 6, 4];
/** Allowed rows of cards (design template, Dashboard: Grid). */
const ROWS = ["12", "8+4", "4+8", "6+6", "4+4+4"];
const KEY = /^[a-z][a-z0-9_]*$/;
const PERIOD = /^\d{4}(-(0[1-9]|1[0-2]|Q[1-4]))?$/;
/** Chart cards per section and per page (sections make long pages navigable). */
const MAX_SECTION_CARDS = 6;
const MAX_CARDS = 18;

const filled = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

type Say = (path: string, pl: string, en: string) => void;

function sayer(file: string, out: string[]): Say {
  return (path, pl, en) => out.push(`${file}: ${path ? path + ": " : ""}${pl} / ${en}`);
}

function checkText(o: Record<string, unknown>, path: string, fields: string[], say: Say, optional = false) {
  for (const f of fields) {
    if (optional && o[f] === undefined) continue;
    if (!filled(o[f])) say(`${path}.${f}`.replace(/^\./, ""), "brak tekstu", "text is missing");
  }
}

function checkTokens(text: unknown, path: string, say: Say) {
  if (typeof text !== "string") return;
  for (const m of text.matchAll(/\{([^}]*)\}/g))
    if (!(V3_TOKENS as readonly string[]).includes(m[1]!))
      say(
        path,
        `nieznany znacznik {${m[1]}} (dozwolone: ${V3_TOKENS.join(", ")})`,
        `unknown token {${m[1]}} (allowed: ${V3_TOKENS.join(", ")})`,
      );
}

function checkPeriod(p: unknown, path: string, say: Say) {
  if (typeof p === "string") {
    if (!(V3_PERIODS as readonly string[]).includes(p))
      say(
        path,
        `okres musi być jednym z ${V3_PERIODS.join(", ")} albo {from, to}`,
        `period must be one of ${V3_PERIODS.join(", ")} or {from, to}`,
      );
    return;
  }
  if (!isObj(p) || !filled(p.from)) {
    say(path, "okres musi mieć pole from", "period needs from");
    return;
  }
  for (const f of ["from", "to"] as const)
    if (p[f] !== undefined && !(typeof p[f] === "string" && PERIOD.test(p[f])))
      say(`${path}.${f}`, "okres w postaci 2015, 2015-01 lub 2015-Q1", "period as 2015, 2015-01 or 2015-Q1");
  if (typeof p.to === "string" && typeof p.from === "string" && p.to < p.from) say(path, "to jest przed from", "to is before from");
}

function checkKpiTiles(list: unknown, path: string, say: Say) {
  if (!Array.isArray(list) || list.length < 3 || list.length > 5) {
    say(path, "potrzeba 3–5 kafelków KPI", "needs 3–5 KPI tiles");
    return;
  }
  list.forEach((t, i) => {
    const p = `${path}[${i}]`;
    if (typeof t === "string") {
      if (!KEY.test(t)) say(p, "klucz KPI w postaci a_z0_9", "KPI key must be snake_case");
    } else if (isObj(t)) {
      if (!filled(t.kpi) || !KEY.test(t.kpi)) say(`${p}.kpi`, "brak klucza KPI", "KPI key is missing");
      checkText(t, p, ["context_pl", "context_en", "geography"], say, true);
    } else say(p, "kafelek to klucz KPI albo {kpi, context_pl, context_en}", "a tile is a KPI key or {kpi, context_pl, context_en}");
  });
}

function checkFilters(list: unknown, path: string, say: Say) {
  if (list === undefined) return;
  if (!Array.isArray(list)) {
    say(path, "filtry to lista", "filters must be a list");
    return;
  }
  const seen = new Set<string>();
  list.forEach((f, i) => {
    if (typeof f !== "string" || !KEY.test(f))
      say(
        `${path}[${i}]`,
        "filtr: period, geography, geo_level, source albo klucz wymiaru",
        "filter: period, geography, geo_level, source or a dimension key",
      );
    else if (seen.has(f)) say(`${path}[${i}]`, `filtr ${f} powtórzony`, `filter ${f} repeated`);
    else seen.add(f);
  });
}

function checkCard(c: unknown, path: string, say: Say) {
  if (!isObj(c)) {
    say(path, "karta musi być obiektem", "a card must be an object");
    return;
  }
  if (!filled(c.kpi) || !KEY.test(c.kpi)) say(`${path}.kpi`, "brak klucza KPI (snake_case)", "KPI key missing (snake_case)");
  if (!(V3_CHART_TYPES as readonly string[]).includes(c.chart as string))
    say(`${path}.chart`, `nieznany typ wykresu „${String(c.chart)}”`, `unknown chart type "${String(c.chart)}"`);
  checkText(c, path, ["title_pl", "title_en"], say);
  checkText(c, path, ["sub_pl", "sub_en"], say, true);
  for (const f of ["title_pl", "title_en", "sub_pl", "sub_en"]) checkTokens(c[f], `${path}.${f}`, say);
  if (c.span !== undefined && !SPANS.includes(c.span as number))
    say(`${path}.span`, "szerokość 12, 8, 6 albo 4", "span must be 12, 8, 6 or 4");
  const g = c.geographies;
  if (g !== undefined && g !== "voivodeships" && g !== "eu" && !(Array.isArray(g) && g.length > 0 && g.every((x) => filled(x))))
    say(`${path}.geographies`, "lista kluczy obszarów albo voivodeships / eu", "a list of geography keys or voivodeships / eu");
  if (c.compare !== undefined && !(Array.isArray(c.compare) && c.compare.length > 0 && c.compare.every((x) => filled(x) && KEY.test(x))))
    say(`${path}.compare`, "lista kluczy KPI", "a list of KPI keys");
  if (c.split !== undefined && !(filled(c.split) && KEY.test(c.split))) say(`${path}.split`, "klucz wymiaru", "a dimension key");
  if (c.period !== undefined) checkPeriod(c.period, `${path}.period`, say);
  if (c.band !== undefined) {
    const b = c.band;
    if (!(Array.isArray(b) && b.length === 2 && b.every((x) => typeof x === "number") && (b[0] as number) < (b[1] as number)))
      say(`${path}.band`, "pasmo to [dolna, górna], dolna < górna", "band is [low, high] with low < high");
  }
  const r = c.reference;
  if (
    r !== undefined &&
    typeof r !== "number" &&
    !filled(r) &&
    !(isObj(r) && typeof r.value === "number" && filled(r.label_pl) && filled(r.label_en))
  )
    say(
      `${path}.reference`,
      "liczba, klucz obszaru albo {value, label_pl, label_en}",
      "a number, a geography key or {value, label_pl, label_en}",
    );
  if (c.highlight !== undefined && !filled(c.highlight))
    say(`${path}.highlight`, "klucz obszaru lub elementu wymiaru", "a geography or member key");
  const a = c.annotate;
  if (
    a !== undefined &&
    !["max", "min", "last"].includes(a as string) &&
    !(isObj(a) && filled(a.x) && filled(a.label_pl) && filled(a.label_en))
  )
    say(`${path}.annotate`, "max, min, last albo {x, label_pl, label_en}", "max, min, last or {x, label_pl, label_en}");
}

function checkSections(list: unknown, path: string, say: Say, required: boolean) {
  if (list === undefined && !required) return;
  if (!Array.isArray(list) || list.length === 0) {
    say(path, "potrzeba co najmniej jednej sekcji", "needs at least one section");
    return;
  }
  let charts = 0;
  const ids = new Set<string>();
  list.forEach((s, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(s)) {
      say(p, "sekcja musi być obiektem", "a section must be an object");
      return;
    }
    checkText(s, p, ["title_pl", "title_en"], say);
    if (s.id !== undefined) {
      if (typeof s.id !== "string" || !/^[a-z0-9][a-z0-9-]{0,39}$/.test(s.id))
        say(`${p}.id`, "id sekcji: małe litery, cyfry, myślniki", "section id: lower-case letters, digits, hyphens");
      else if (ids.has(s.id)) say(`${p}.id`, `powtórzone id sekcji „${s.id}”`, `duplicate section id "${s.id}"`);
      else ids.add(s.id);
    }
    for (const f of ["nav_pl", "nav_en"])
      if (s[f] !== undefined && (typeof s[f] !== "string" || !(s[f] as string).trim() || (s[f] as string).length > 28))
        say(`${p}.${f}`, "krótka etykieta nawigacji (do 28 znaków)", "short navigation label (up to 28 characters)");
    for (const f of ["lead_pl", "lead_en"]) if (s[f] !== undefined && typeof s[f] !== "string") say(`${p}.${f}`, "tekst", "text");
    if (!Array.isArray(s.cards) || s.cards.length === 0) {
      say(`${p}.cards`, "sekcja potrzebuje kart", "a section needs cards");
      return;
    }
    s.cards.forEach((c, j) => checkCard(c, `${p}.cards[${j}]`, say));
    const inSection = s.cards.filter((c) => isObj(c) && c.chart !== "sparkline-table").length;
    charts += inSection;
    if (inSection > MAX_SECTION_CARDS)
      say(
        `${p}.cards`,
        `najwyżej ${MAX_SECTION_CARDS} kart z wykresem w sekcji (jest ${inSection})`,
        `at most ${MAX_SECTION_CARDS} chart cards in a section (found ${inSection})`,
      );
    // Rows: spans fill 12 columns in an allowed pattern.
    let row: number[] = [];
    const close = () => {
      const pattern = row.join("+");
      if (row.length && !ROWS.includes(pattern))
        say(
          `${p}.cards`,
          `rząd kart ${pattern} niedozwolony (dozwolone: ${ROWS.join(", ")})`,
          `card row ${pattern} not allowed (allowed: ${ROWS.join(", ")})`,
        );
      row = [];
    };
    for (const c of s.cards) {
      const span = isObj(c) && SPANS.includes(c.span as number) ? (c.span as number) : 12;
      if (row.reduce((a, b) => a + b, 0) + span > 12) close();
      row.push(span);
      if (row.reduce((a, b) => a + b, 0) === 12) close();
    }
    close();
  });
  if (charts > MAX_CARDS)
    say(
      path,
      `najwyżej ${MAX_CARDS} kart z wykresem na stronie (jest ${charts})`,
      `at most ${MAX_CARDS} chart cards on a page (found ${charts})`,
    );
}

/** Structural problems of a parsed schema-3 file; empty when valid. `file` prefixes every message. */
export function validateDashboardV3(d: unknown, file: string): string[] {
  const out: string[] = [];
  const say = sayer(file, out);
  if (!isObj(d)) return [`${file}: plik nie jest obiektem YAML / the file is not a YAML mapping`];
  if (d.schema !== 3) say("schema", "wymagane schema: 3", "schema: 3 is required");
  if (!filled(d.domain_key) || !KEY.test(d.domain_key)) say("domain_key", "brak klucza dziedziny", "domain key is missing");
  if (d.id !== d.domain_key) say("id", "id musi być równe domain_key", "id must equal domain_key");
  const base = (file.split("/").pop() ?? "").replace(/\.ya?ml$/, "");
  if (file.endsWith(".yaml") && d.id !== base)
    say("id", `id musi być równe nazwie pliku (${base})`, `id must equal the file name (${base})`);
  checkText(d, "", ["title_pl", "title_en"], say);
  checkText(d, "", ["description_pl", "description_en"], say, true);
  if (!isObj(d.overview)) say("overview", "brak strony przeglądu dziedziny", "the domain overview is missing");
  else {
    checkText(d.overview, "overview", ["lead_pl", "lead_en"], say);
    checkFilters(d.overview.filters, "overview.filters", say);
    checkKpiTiles(d.overview.kpis, "overview.kpis", say);
    checkSections(d.overview.sections, "overview.sections", say, false);
  }
  if (!Array.isArray(d.pages) || d.pages.length === 0) {
    say("pages", "potrzeba co najmniej jednej strony", "needs at least one page");
    return out;
  }
  const ids = new Set<string>();
  d.pages.forEach((pg, i) => {
    const p = `pages[${i}]`;
    if (!isObj(pg)) {
      say(p, "strona musi być obiektem", "a page must be an object");
      return;
    }
    if (!filled(pg.id) || !/^[a-z0-9_-]+$/.test(pg.id))
      say(`${p}.id`, "id strony: małe litery, cyfry, _ i -", "page id: lower case, digits, _ and -");
    else if (ids.has(pg.id)) say(`${p}.id`, `id ${pg.id} powtórzone`, `id ${pg.id} repeated`);
    else ids.add(pg.id);
    if (filled(d.domain_key) && pg.group_key !== `${d.domain_key}.${String(pg.id)}`)
      say(
        `${p}.group_key`,
        `musi być ${String(d.domain_key)}.${String(pg.id)} (id strony to końcówka klucza grupy)`,
        `must be ${String(d.domain_key)}.${String(pg.id)} (the page id is the group key suffix)`,
      );
    checkText(pg, p, ["title_pl", "title_en", "lead_pl", "lead_en"], say);
    checkFilters(pg.filters, `${p}.filters`, say);
    checkKpiTiles(pg.kpis, `${p}.kpis`, say);
    checkSections(pg.sections, `${p}.sections`, say, true);
  });
  return out;
}

// --- catalogue checks -------------------------------------------------------------------------------------

type CatKpi = V3Catalog["kpis"][number];

/** Units whose dimension members add up to a whole; part-of-whole charts (NEEDS_SPLIT) need one. */
export const V3_ADDITIVE_UNITS = ["pln_bn", "eur_bn", "persons_th", "persons_mn", "count", "count_th", "twh", "t_th"];

const TWO_POINT: V3ChartType[] = ["grouped-bars", "dumbbell", "slope", "diverging-bars"];
/** Units of contributions to growth: components in percentage points that add up to the headline rate. */
export const V3_CONTRIBUTION_UNITS = ["pp"];
/** Most components a contributions chart takes (the design template: at most ~7). */
export const V3_MAX_CONTRIBUTIONS = 7;

const NEEDS_SPLIT: V3ChartType[] = ["area-share", "stacked-bars", "segmented-bar", "waterfall", "contributions"];
const NEEDS_CATEGORIES: V3ChartType[] = ["line-highlight", "small-multiples", "ranked-bars", ...TWO_POINT];

/** Geographies of a KPI besides Poland and the EU aggregate, per level. */
export function v3Areas(kpi: Pick<CatKpi, "geographies">, cat: Pick<V3Catalog, "geographies">, level: "country" | "voivodeship"): string[] {
  return kpi.geographies.filter((g) => g !== "PL" && g !== "EU27" && cat.geographies.find((x) => x.key === g)?.level === level);
}

/**
 * Why a chart type does not suit a KPI (Polish / English), or null when it does. The rules follow what the
 * portal needs to draw the type: voivodeship values for tile-map and histogram, sex × age for the pyramid,
 * monthly data for the heatmap, a dimension to split for part-of-whole charts, several categories for
 * comparisons, and a second KPI on a shared geography level for the scatter.
 */
export function v3ChartFit(
  card: Pick<V3Card, "chart" | "split" | "compare" | "geographies">,
  kpi: CatKpi,
  cat: V3Catalog,
): [string, string] | null {
  const chart = card.chart;
  const voiv = v3Areas(kpi, cat, "voivodeship").length;
  const countries = v3Areas(kpi, cat, "country").length;
  const split = card.split;
  if (split !== undefined && !kpi.dimension_keys.includes(split))
    return [`${kpi.kpi_key} nie ma wymiaru ${split}`, `${kpi.kpi_key} has no dimension ${split}`];
  if (chart === "heatmap" && kpi.frequency !== "M") return ["mapa ciepła potrzebuje danych miesięcznych", "a heatmap needs monthly data"];
  if (chart === "pyramid" && !(kpi.dimension_keys.includes("sex") && kpi.dimension_keys.includes("age")))
    return ["piramida potrzebuje wymiarów płeć i wiek", "a pyramid needs the sex and age dimensions"];
  if ((chart === "tile-map" || chart === "histogram") && voiv < 8) return ["potrzebne dane dla województw", "needs voivodeship data"];
  if (NEEDS_SPLIT.includes(chart) && split === undefined)
    return [
      "ten typ wykresu potrzebuje pola split (wymiar dzielący całość)",
      "this chart type needs split (the dimension that divides the whole)",
    ];
  if (chart === "contributions") {
    if (!V3_CONTRIBUTION_UNITS.includes(kpi.unit_key))
      return [
        `wkłady do wzrostu wymagają jednostki pp (punkty procentowe); ${kpi.unit_key} nie jest wkładem`,
        `contributions need the unit pp (percentage points); ${kpi.unit_key} is not a contribution`,
      ];
    const parts = cat.dimensions.find((d) => d.dimension_key === split)?.members.filter((m) => m.key !== "total").length ?? 0;
    if (parts > V3_MAX_CONTRIBUTIONS)
      return [
        `${split} ma ${parts} składników; wkłady do wzrostu pokazują najwyżej ${V3_MAX_CONTRIBUTIONS}`,
        `${split} has ${parts} components; contributions show at most ${V3_MAX_CONTRIBUTIONS}`,
      ];
  } else if (NEEDS_SPLIT.includes(chart) && !V3_ADDITIVE_UNITS.includes(kpi.unit_key))
    return [
      `części całości wymagają miary sumowalnej; ${kpi.unit_key} się nie sumuje`,
      `parts of a whole need an additive measure; ${kpi.unit_key} does not add up`,
    ];
  if (NEEDS_CATEGORIES.includes(chart) && split === undefined && card.geographies === undefined && voiv + countries < 2)
    return [
      "potrzeba kilku obszarów lub pola split; ten KPI ma dane tylko dla Polski",
      "needs several geographies or split; this KPI has data for Poland only",
    ];
  if (chart === "scatter") {
    const other = card.compare?.[0];
    if (!other || card.compare!.length !== 1)
      return ["wykres rozrzutu potrzebuje compare z jednym KPI (oś X)", "a scatter needs compare with one KPI (the x axis)"];
    const x = cat.kpis.find((k) => k.kpi_key === other);
    if (x) {
      const shared = Math.max(
        ...(["voivodeship", "country"] as const).map((l) => {
          const a = new Set(v3Areas(kpi, cat, l));
          return v3Areas(x, cat, l).filter((g) => a.has(g)).length;
        }),
      );
      if (shared < 5) return [`${kpi.kpi_key} i ${other} nie mają wspólnych obszarów`, `${kpi.kpi_key} and ${other} share no geographies`];
    }
  }
  if (chart === "bullet" && !card.compare?.length && split === undefined && voiv + countries < 2)
    return ["wykres pociskowy potrzebuje compare, split lub kilku obszarów", "a bullet chart needs compare, split or several geographies"];
  return null;
}

/** Problems of a structurally valid schema-3 dashboard against a catalogue; empty when every key exists and fits. */
export function validateDashboardV3Catalog(d: DashboardV3, file: string, cat: V3Catalog): string[] {
  const out: string[] = [];
  const say = sayer(file, out);
  const domain = cat.domains.find((x) => x.domain_key === d.domain_key && x.level === "domain");
  if (!domain) say("domain_key", `brak dziedziny ${d.domain_key} w katalogu`, `no domain ${d.domain_key} in the catalogue`);
  const groups = cat.domains.filter((x) => x.level === "group" && x.parent_key === d.domain_key).map((x) => x.domain_key);
  for (const g of groups)
    if (!d.pages.some((p) => p.group_key === g))
      say(
        "pages",
        `brak strony dla grupy ${g} (każda grupa dziedziny ma swoją stronę)`,
        `no page for group ${g} (every domain group has a page)`,
      );
  const kpiOf = (key: string) => cat.kpis.find((k) => k.kpi_key === key);
  const geoKeys = new Set(cat.geographies.map((g) => g.key));
  const dimKeys = new Set(cat.dimensions.map((x) => x.dimension_key));
  const memberKeys = new Set(cat.dimensions.flatMap((x) => x.members.map((m) => m.key)));

  const checkTiles = (tiles: V3KpiTile[], path: string): string[] =>
    tiles.map((t, i) => {
      const key = typeof t === "string" ? t : t.kpi;
      if (!kpiOf(key)) say(`${path}[${i}]`, `nieznany KPI ${key}`, `unknown KPI ${key}`);
      if (typeof t !== "string" && t.geography && !geoKeys.has(t.geography))
        say(`${path}[${i}].geography`, `nieznany obszar ${t.geography}`, `unknown geography ${t.geography}`);
      return key;
    });

  const checkPage = (filters: string[] | undefined, sections: V3Section[] | undefined, tiles: string[], path: string) => {
    const keys = [...tiles, ...(sections ?? []).flatMap((s) => s.cards.flatMap((c) => [c.kpi, ...(c.compare ?? [])]))];
    const kpis = keys.map(kpiOf).filter((k): k is CatKpi => !!k);
    (filters ?? []).forEach((f, i) => {
      const p = `${path}.filters[${i}]`;
      if ((V3_FILTERS as readonly string[]).includes(f)) {
        if (f === "source" && !kpis.some((k) => k.source_keys.length > 1))
          say(p, "żaden KPI strony nie ma kilku źródeł", "no KPI of the page has several sources");
        if (f === "geo_level" && !kpis.some((k) => k.geo_levels.includes("voivodeship")))
          say(p, "żaden KPI strony nie ma danych dla województw", "no KPI of the page has voivodeship data");
        if (f === "geography" && !kpis.some((k) => k.geographies.length > 1))
          say(p, "wszystkie KPI strony mają dane tylko dla Polski", "every KPI of the page has data for Poland only");
      } else if (!dimKeys.has(f)) say(p, `nieznany filtr lub wymiar ${f}`, `unknown filter or dimension ${f}`);
      else if (!kpis.some((k) => k.dimension_keys.includes(f)))
        say(p, `żaden KPI strony nie ma wymiaru ${f}`, `no KPI of the page has dimension ${f}`);
    });
    (sections ?? []).forEach((s, i) =>
      s.cards.forEach((c, j) => {
        const p = `${path}.sections[${i}].cards[${j}]`;
        const k = kpiOf(c.kpi);
        if (!k) {
          say(`${p}.kpi`, `nieznany KPI ${c.kpi}`, `unknown KPI ${c.kpi}`);
          return;
        }
        for (const x of c.compare ?? []) {
          const o = kpiOf(x);
          if (!o) say(`${p}.compare`, `nieznany KPI ${x}`, `unknown KPI ${x}`);
          else if (c.chart === "bullet" && o.unit_key !== k.unit_key)
            say(
              `${p}.compare`,
              `${x} ma inną jednostkę niż ${c.kpi} (wykres pociskowy ma jedną skalę)`,
              `${x} has another unit than ${c.kpi} (a bullet chart has one scale)`,
            );
        }
        if (c.split !== undefined && !dimKeys.has(c.split)) say(`${p}.split`, `nieznany wymiar ${c.split}`, `unknown dimension ${c.split}`);
        if (Array.isArray(c.geographies))
          for (const g of c.geographies)
            if (!geoKeys.has(g)) say(`${p}.geographies`, `nieznany obszar ${g}`, `unknown geography ${g}`);
            else if (!k.geographies.includes(g))
              say(`${p}.geographies`, `${c.kpi} nie ma danych dla ${g}`, `${c.kpi} has no data for ${g}`);
        if (typeof c.reference === "string" && !geoKeys.has(c.reference))
          say(`${p}.reference`, `nieznany obszar ${c.reference}`, `unknown geography ${c.reference}`);
        if (c.highlight !== undefined && !geoKeys.has(c.highlight) && !memberKeys.has(c.highlight))
          say(`${p}.highlight`, `nieznany obszar lub element ${c.highlight}`, `unknown geography or member ${c.highlight}`);
        const misfit = v3ChartFit(c, k, cat);
        if (misfit) say(`${p}.chart`, `${c.chart}: ${misfit[0]}`, `${c.chart}: ${misfit[1]}`);
      }),
    );
  };

  checkPage(d.overview.filters, d.overview.sections, checkTiles(d.overview.kpis, "overview.kpis"), "overview");
  d.pages.forEach((pg, i) => {
    if (!groups.includes(pg.group_key)) say(`pages[${i}].group_key`, `nieznana grupa ${pg.group_key}`, `unknown group ${pg.group_key}`);
    checkPage(pg.filters, pg.sections, checkTiles(pg.kpis, `pages[${i}].kpis`), `pages[${i}]`);
  });
  return out;
}
