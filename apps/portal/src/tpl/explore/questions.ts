// The business questions the looks answer (docs/product-principles.md: "looks are outfits for an occasion, and the
// occasion is a business need"; the rule table is docs/chart-catalogue.md §3–§5). Every look names one question; the
// look bar groups and orders the looks by them; suggest.ts proposes looks from the fields in the wells.

export type QuestionId =
  "time" | "level" | "compare" | "rank" | "structure" | "py" | "target" | "change" | "outlier" | "season" | "pair" | "soon" | "own";

/** `pl`/`en`: the question in full (notes, suggestions, screen readers); `shortPl`/`shortEn`: the caption over a group of looks. */
export const QUESTIONS: Record<QuestionId, { pl: string; en: string; shortPl: string; shortEn: string }> = {
  time: { pl: "Jak zmieniało się w czasie?", en: "How did it change over time?", shortPl: "W czasie", shortEn: "Over time" },
  level: { pl: "Ile w każdej kategorii?", en: "How much in each category?", shortPl: "Ile", shortEn: "How much" },
  compare: {
    pl: "Jak wypada na tle innych?",
    en: "How does it compare with the others?",
    shortPl: "Na tle innych",
    shortEn: "Against others",
  },
  rank: { pl: "Kto najwyżej?", en: "Who ranks highest?", shortPl: "Kto najwyżej", shortEn: "Who leads" },
  structure: { pl: "Jaka struktura?", en: "What is it made of?", shortPl: "Struktura", shortEn: "Make-up" },
  py: {
    pl: "Jak wypada wobec poprzedniego roku?",
    en: "How does it compare with last year?",
    shortPl: "Rok do roku",
    shortEn: "Year on year",
  },
  target: {
    pl: "Jak wypada wobec odniesienia?",
    en: "How does it compare with a reference?",
    shortPl: "Wobec odniesienia",
    shortEn: "Against a reference",
  },
  change: { pl: "Co się zmieniło?", en: "What changed?", shortPl: "Co się zmieniło", shortEn: "What changed" },
  outlier: { pl: "Gdzie odstaje?", en: "Where does it stand out?", shortPl: "Co odstaje", shortEn: "What stands out" },
  season: { pl: "Czy jest sezon?", en: "Is there a season?", shortPl: "Sezon", shortEn: "Season" },
  pair: { pl: "Jak dwie miary idą razem?", en: "How do two measures go together?", shortPl: "Dwie miary", shortEn: "Two measures" },
  soon: { pl: "Czeka na dane:", en: "Waiting for data:", shortPl: "Czeka na dane", shortEn: "Waiting for data" },
  own: { pl: "Chcesz zacząć od zera?", en: "Want to start from scratch?", shortPl: "Od zera", shortEn: "From scratch" },
};

/** The order of the question groups on the look bar, per chart type: the type's own question first. */
export const QUESTION_ORDER: Record<"line" | "column" | "bar" | "area" | "combo", QuestionId[]> = {
  line: ["time", "compare", "change", "target", "outlier", "season", "soon", "own"],
  column: ["time", "level", "rank", "compare", "structure", "py", "own"],
  bar: ["rank", "compare", "structure", "py", "target", "change", "own"],
  area: ["time", "compare", "structure", "target", "change", "own"],
  combo: ["pair", "compare", "own"],
};
