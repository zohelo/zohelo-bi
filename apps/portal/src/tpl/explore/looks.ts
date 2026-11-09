// Looks (owner's "outfits", 2026-11-09): a chart type comes with prepared looks, flipped with ‹ › on the chart, and
// a short list of settings (the accessories). A look is only a preset of the settings: changing a setting marks the
// look as modified, with a way back. Prototype for the line chart; the other types follow once it is approved.

import type { ZChartProps, ZSeries } from "@zohelo/visuals";

export type SettingKey = "emphasis" | "reference" | "shape" | "scale" | "labels" | "markers" | "uncertainty";

export type SettingDef = {
  key: SettingKey;
  pl: string;
  en: string;
  group: "emphasis" | "reference" | "scale" | "labels" | "layout";
  options: { value: string; pl: string; en: string }[];
  /** Why the setting cannot be changed with the current data (template: the catalogue lacks it). */
  lockedPl?: string;
  lockedEn?: string;
  /** Locked when the measures are rates or shares (index of a rate is meaningless). */
  lockedForRatesPl?: string;
  lockedForRatesEn?: string;
};

export type Settings = Record<SettingKey, string>;

export const LINE_SETTINGS: SettingDef[] = [
  {
    key: "emphasis",
    pl: "Wyróżnienie",
    en: "Emphasis",
    group: "emphasis",
    options: [
      { value: "none", pl: "Wszystkie w kolorach", en: "All in colour" },
      { value: "hero", pl: "Jedna na tle szarych", en: "One against grey" },
    ],
  },
  {
    key: "reference",
    pl: "Linia odniesienia",
    en: "Reference line",
    group: "reference",
    options: [
      { value: "none", pl: "Brak", en: "None" },
      { value: "zero", pl: "Zero", en: "Zero" },
      { value: "avg", pl: "Średnia okresu", en: "Period average" },
    ],
  },
  {
    key: "scale",
    pl: "Skala",
    en: "Scale",
    group: "scale",
    options: [
      { value: "value", pl: "Wartości", en: "Values" },
      { value: "index", pl: "Indeks, start = 100", en: "Index, start = 100" },
    ],
    lockedForRatesPl: "Indeks ma sens dla poziomów (PKB, płace, ludność), nie dla stóp i udziałów.",
    lockedForRatesEn: "An index makes sense for levels (GDP, wages, population), not for rates and shares.",
  },
  {
    key: "shape",
    pl: "Przebieg",
    en: "Line shape",
    group: "layout",
    options: [
      { value: "line", pl: "Linia", en: "Line" },
      { value: "step", pl: "Schodki", en: "Steps" },
    ],
  },
  {
    key: "markers",
    pl: "Punkty",
    en: "Points",
    group: "layout",
    options: [
      { value: "off", pl: "Bez punktów", en: "No points" },
      { value: "on", pl: "Punkt w każdym okresie", en: "A point per period" },
    ],
  },
  {
    key: "labels",
    pl: "Nazwy serii",
    en: "Series names",
    group: "labels",
    options: [
      { value: "end", pl: "Na końcu linii", en: "At the line ends" },
      { value: "legend", pl: "W legendzie", en: "In the legend" },
    ],
  },
  {
    key: "uncertainty",
    pl: "Niepewność",
    en: "Uncertainty",
    group: "reference",
    options: [
      { value: "off", pl: "Bez przedziału", en: "No interval" },
      { value: "band", pl: "Przedział ufności", en: "Confidence band" },
    ],
    lockedPl: "Ta miara nie ma przedziałów ufności.",
    lockedEn: "This measure has no confidence intervals.",
  },
];

export const SETTING_GROUPS: Record<SettingDef["group"], { pl: string; en: string }> = {
  emphasis: { pl: "Wyróżnienie", en: "Emphasis" },
  reference: { pl: "Odniesienie", en: "Reference" },
  scale: { pl: "Skala", en: "Scale" },
  labels: { pl: "Etykiety", en: "Labels" },
  layout: { pl: "Wygląd linii", en: "Line style" },
};

const BASE: Settings = {
  emphasis: "none",
  reference: "none",
  shape: "line",
  scale: "value",
  labels: "end",
  markers: "off",
  uncertainty: "off",
};

export type Look = {
  id: string;
  pl: string;
  en: string;
  notePl: string;
  noteEn: string;
  settings: Settings;
  style: "standard" | "business" | "scientific" | "editorial";
  /** Shown, but not available with the current data. */
  lockedPl?: string;
  lockedEn?: string;
  /** Only for levels (amounts, counts), not for rates and shares. */
  forLevelsOnly?: boolean;
};

/** Prepared looks of the line chart, in carousel order; the first is the blank start. */
export const LINE_LOOKS: Look[] = [
  {
    id: "line.blank",
    pl: "Pusty",
    en: "Blank",
    notePl: "Same linie i legenda: zacznij od zera i dodaj, co potrzebne.",
    noteEn: "Just the lines and a legend: start from scratch and add what you need.",
    settings: { ...BASE, labels: "legend" },
    style: "standard",
  },
  {
    id: "line.multi",
    pl: "Czysty",
    en: "Clean",
    notePl: "Każda seria w swoim kolorze, nazwy na końcach linii.",
    noteEn: "Every series in its colour, names at the line ends.",
    settings: { ...BASE },
    style: "standard",
  },
  {
    id: "line.highlight",
    pl: "Bohater i tło",
    en: "Hero and context",
    notePl: "Polska (lub pierwsza seria) wyróżniona, reszta szara jako tło.",
    noteEn: "Poland (or the first series) stands out, the rest is grey context.",
    settings: { ...BASE, emphasis: "hero" },
    style: "editorial",
  },
  {
    id: "line.reference",
    pl: "Wobec średniej",
    en: "Against the average",
    notePl: "Bohater na tle średniej okresu: widać, kiedy był powyżej, a kiedy poniżej.",
    noteEn: "The hero against the period average: when it was above and when below.",
    settings: { ...BASE, emphasis: "hero", reference: "avg" },
    style: "standard",
  },
  {
    id: "line.indexed",
    pl: "Indeks = 100",
    en: "Indexed = 100",
    notePl: "Wszystkie serie od 100 w pierwszym okresie: porównanie tempa, nie poziomu.",
    noteEn: "Every series from 100 in the first period: compares pace, not level.",
    settings: { ...BASE, scale: "index", reference: "none" },
    style: "editorial",
    forLevelsOnly: true,
  },
  {
    id: "line.step",
    pl: "Schodkowy",
    en: "Steps",
    notePl: "Wartość obowiązuje do następnej zmiany, np. stopy procentowe.",
    noteEn: "A value holds until the next change, e.g. interest rates.",
    settings: { ...BASE, shape: "step", markers: "on" },
    style: "standard",
  },
  {
    id: "line.band",
    pl: "Z przedziałem ufności",
    en: "With confidence band",
    notePl: "Wynik badania z niepewnością (BAEL, EU-SILC).",
    noteEn: "A survey result with its uncertainty (LFS, EU-SILC).",
    settings: { ...BASE, emphasis: "hero", uncertainty: "band" },
    style: "scientific",
    lockedPl: "Ta miara nie ma przedziałów ufności.",
    lockedEn: "This measure has no confidence intervals.",
  },
];

/** Looks of a chart kind (prototype: line only). */
export function looksOf(chart: string): Look[] | undefined {
  return chart === "line" ? LINE_LOOKS : undefined;
}

/** The look in effect for a kind: the chosen id when it is one of the kind's looks, else the default (Clean). */
export function currentLook(chart: string, id: string | null | undefined): Look | undefined {
  const ls = looksOf(chart);
  if (!ls) return undefined;
  return ls.find((l) => l.id === id) ?? ls.find((l) => l.id === "line.multi");
}

/** Settings in effect: the look's preset with the reader's changes on top (only known keys and values). */
export function effectiveSettings(look: Look, o: Record<string, string>): Settings {
  const out = { ...look.settings };
  for (const def of LINE_SETTINGS)
    if (o[def.key] && !def.lockedPl && def.options.some((x) => x.value === o[def.key])) out[def.key] = o[def.key]!;
  return out;
}

/** Changes the reader made to the look (empty = the look as prepared). */
export function changedSettings(look: Look, o: Record<string, string>): SettingKey[] {
  const eff = effectiveSettings(look, o);
  return LINE_SETTINGS.map((d) => d.key).filter((k) => eff[k] !== look.settings[k]);
}

const num = (y: number | null | undefined): y is number => typeof y === "number" && Number.isFinite(y);

/** Draw the line chart with the settings (data transforms such as the index are applied before, in the view). */
export function applyLineSettings(z: ZChartProps, s: Settings, lang: "pl" | "en"): ZChartProps {
  const pl = lang === "pl";
  const heroSeries = z.series.find((x) => x.id === "PL") ?? z.series[0];
  const series: ZSeries[] = z.series.map((x) => ({
    ...x,
    role: s.emphasis === "hero" ? (x === heroSeries ? "hero" : "context") : "series",
  }));
  let reference = z.reference;
  if (s.reference === "none") reference = undefined;
  if (s.reference === "zero") reference = { value: 0, label: "0" };
  if (s.reference === "avg") {
    const vals = (heroSeries?.points ?? []).map((p) => p.y).filter(num);
    reference = vals.length
      ? { value: vals.reduce((a, b) => a + b, 0) / vals.length, label: pl ? "średnia okresu" : "period average" }
      : undefined;
  }
  return {
    ...z,
    type: "line-highlight",
    series,
    highlight: s.emphasis === "hero" ? heroSeries?.id : undefined,
    reference,
    opts: { ...(z.opts ?? {}), step: s.shape === "step", markers: s.markers === "on", endLabels: s.labels === "end" },
  };
}
