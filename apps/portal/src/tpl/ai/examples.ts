// The ask box's example prompts, apart from the intent engine (intent.ts) so the home page can show them
// without loading it.

import type { Lang } from "../../i18n";

/** Example prompts shown under the field (each one exercises a different branch). */
export const EXAMPLE_PROMPTS: Record<Lang, string[]> = {
  pl: [
    "inflacja w Polsce i Niemczech od 2015",
    "bezrobocie w województwach na mapie",
    "dashboard o finansach publicznych",
    "płace a inflacja",
  ],
  en: [
    "inflation in Poland and Germany since 2015",
    "unemployment by voivodeship on a map",
    "show me GDP growth vs EU",
    "public finance dashboard",
  ],
};
