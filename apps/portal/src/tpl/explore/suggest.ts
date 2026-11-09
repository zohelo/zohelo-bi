// "Smart without AI" (docs/product-principles.md): from the fields in the wells the explorer proposes the looks that
// answer the likely business questions, each with its reason. The rules are the rows of the rule table in
// docs/chart-catalogue.md §3 (From Data to Viz) and §4 (Storytelling with Data); nothing here guesses.

import type { Catalog } from "../../data";
import { applyPatch, type Query, type QueryInput, type Shape } from "./exploreState";
import { possible } from "./layout";
import {
  LOOKS,
  TYPE_NAME,
  WARDROBE_BASE,
  lookContext,
  lookInEffect,
  lookQuestion,
  lookUsable,
  pickLookPatch,
  wardrobeOf,
  type Look,
  type LookCtx,
  type WardrobeType,
} from "./looks";
import { QUESTIONS, type QuestionId } from "./questions";

export type Suggestion = {
  look: Look;
  question: QuestionId;
  /** "Liniowy · Bohater i tło" (the type is named when it differs from the current one). */
  label: string;
  questionLabel: string;
  reason: string;
  patch: Partial<QueryInput>;
};

type Rule = {
  look: string;
  when: (f: Facts) => boolean;
  pl: (f: Facts) => string;
  en: (f: Facts) => string;
};

type Facts = LookCtx & { measures: number; areas: number };

/** The spaghetti limit (SWD: four or five lines; From Data to Viz: about five). */
export const MAX_LINES = 5;

const RULES: Rule[] = [
  {
    look: "line.highlight",
    when: (f) => f.timeX && f.seriesCount > MAX_LINES,
    pl: (f) => `Masz ${f.seriesCount} serii. Powyżej pięciu linie zlewają się: wyróżnij jedną, reszta zostanie tłem.`,
    en: (f) => `You have ${f.seriesCount} series. Above five the lines blur: highlight one, the rest becomes context.`,
  },
  {
    look: "line.panels",
    when: (f) => f.timeX && f.seriesCount > MAX_LINES,
    pl: () => "Każda seria w osobnym panelu na wspólnej skali: widać kształt każdej z nich.",
    en: () => "Each series in its own panel on a shared scale: every shape stays readable.",
  },
  {
    look: "line.seasonal",
    when: (f) => f.timeX && (f.grain === "m" || f.grain === "q") && f.years >= 2,
    pl: (f) => `Dane ${f.grain === "m" ? "miesięczne" : "kwartalne"} z kilku lat: sprawdź, czy wzór powtarza się co roku.`,
    en: (f) => `${f.grain === "m" ? "Monthly" : "Quarterly"} data over several years: see whether the pattern repeats each year.`,
  },
  {
    look: "column.ibcs",
    when: (f) => f.years >= 2 && f.seriesCount <= 1,
    pl: () => "Są dane z co najmniej dwóch lat: zobacz wynik na tle poprzedniego roku, z odchyleniem.",
    en: () => "There are at least two years of data: see the result against last year, with the variance.",
  },
  {
    look: "bar.variance",
    when: (f) => !f.timeX && f.years >= 2,
    pl: () => "Są dane z poprzedniego roku: zobacz, w której kategorii zmieniło się najwięcej.",
    en: () => "Last year's data exist: see which category changed most.",
  },
  {
    look: "line.indexed",
    when: (f) => f.timeX && f.seriesCount >= 2 && f.seriesCount <= MAX_LINES && !f.rates,
    pl: () => "Serie mają różne poziomy: indeks = 100 pokaże, która rosła najszybciej.",
    en: () => "The series sit at different levels: index = 100 shows which grew fastest.",
  },
  {
    look: "area.stacked",
    when: (f) => f.timeX && f.additive && f.seriesCount >= 2,
    pl: () => "Części sumują się do całości: zobacz, jak zmieniała się całość i jej skład.",
    en: () => "The parts add up to a whole: see how the whole and its make-up changed.",
  },
  {
    look: "bar.percent",
    when: (f) => !f.timeX && f.additive && f.seriesCount >= 2,
    pl: () => "Części sumują się do całości: porównaj udziały w każdej kategorii.",
    en: () => "The parts add up to a whole: compare the shares in each category.",
  },
  {
    look: "bar.benchmark",
    when: (f) => f.hasEU && f.areas >= 3,
    pl: () => "Wśród obszarów jest UE-27: ustaw ją jako punkt odniesienia rankingu.",
    en: () => "EU-27 is among the areas: make it the reference of the ranking.",
  },
  {
    look: "bar.ranked",
    when: (f) => f.areas >= 3 || (!f.timeX && f.seriesCount <= 1),
    pl: (f) =>
      f.areas >= 3
        ? `Wybrano ${f.areas} obszarów: ranking od największego od razu pokaże lidera.`
        : "Kategorie na osi: uporządkuj je od największej.",
    en: (f) =>
      f.areas >= 3
        ? `${f.areas} areas are chosen: a ranking from the largest shows the leader at once.`
        : "Categories on the axis: order them from the largest.",
  },
  {
    look: "combo.column-line",
    when: (f) => f.measures === 2 && f.timeX,
    pl: () => "Dwie miary: kolumny i linia na jednej osi pokażą, czy idą razem.",
    en: () => "Two measures: columns and a line on one axis show whether they move together.",
  },
  {
    look: "line.reference",
    when: (f) => f.timeX && f.seriesCount <= 1 && f.years >= 3,
    pl: () => "Jedna seria: pokaż ją na tle średniej z okresu, żeby było widać, kiedy była powyżej.",
    en: () => "One series: show it against the period average to see when it ran above.",
  },
];

const findLook = (id: string): Look | undefined => {
  const t = id.split(".")[0] as WardrobeType;
  return LOOKS[t]?.find((l) => l.id === id);
};

/** Up to `max` looks worth trying for the current fields, one per question, never the look already worn. */
export function suggestLooks(q: Query, shape: Shape, cat: Catalog, lang: "pl" | "en", max = 3): Suggestion[] {
  if (!q.i.length) return [];
  const pl = lang === "pl";
  const worn = lookInEffect(q, shape, lang);
  const ctx = worn?.ctx ?? lookContext(q, shape);
  const facts: Facts = { ...ctx, measures: q.i.length, areas: q.geo.length };
  const currentType = wardrobeOf(q.chart);
  const out: Suggestion[] = [];
  const seen = new Set<QuestionId>();
  if (worn) seen.add(lookQuestion(worn.look, ctx.timeX));
  for (const r of RULES) {
    if (out.length >= max) break;
    if (!r.when(facts)) continue;
    const look = findLook(r.look);
    if (!look || look.id === worn?.look.id) continue;
    const base = WARDROBE_BASE[look.type];
    if (!possible(base, shape, q).ok) continue;
    const next = base === q.chart ? q : applyPatch(q, { chart: base }, cat);
    const nctx = lookContext(next, shape, look, {});
    if (!lookUsable(look, next, nctx)) continue;
    const question = lookQuestion(look, nctx.timeX);
    if (seen.has(question)) continue;
    seen.add(question);
    const patch: Partial<QueryInput> = { chart: base, v: look.id, o: {}, ...pickLookPatch(next, look, nctx) };
    if (base === q.chart && !patch.slots) patch.slots = q.slots;
    const name = pl ? look.pl : look.en;
    out.push({
      look,
      question,
      label: look.type === currentType ? name : `${pl ? TYPE_NAME[look.type].pl : TYPE_NAME[look.type].en} · ${name}`,
      questionLabel: pl ? QUESTIONS[question].pl : QUESTIONS[question].en,
      reason: pl ? r.pl(facts) : r.en(facts),
      patch,
    });
  }
  return out;
}
