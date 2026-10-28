// F15: the portal's fixed texts in Polish and English, a lookup and a name picker. The language
// state and the toggle are separate (lang.ts, App.tsx).

export type Lang = "pl" | "en";
export const LANGS: Lang[] = ["pl", "en"];

export const STRINGS = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.explorer": "Explorer",
    "nav.catalogue": "Catalogue",
    "badge.poc": "PoC data",
    "badge.pocTitle": "Built on the Gold proof of concept: small real samples",
    "footer.data": "Data: Eurostat, GUS, World Bank, NBP via",
    "lang.switch": "Polski",
    "freq.A": "Annual",
    "freq.Q": "Quarterly",
    "freq.M": "Monthly",
    "freq.D": "Daily",
  },
  pl: {
    "nav.dashboard": "Pulpit",
    "nav.explorer": "Eksplorator",
    "nav.catalogue": "Katalog",
    "badge.poc": "Dane PoC",
    "badge.pocTitle": "Na podstawie prototypu warstwy Gold: małe próbki prawdziwych danych",
    "footer.data": "Dane: Eurostat, GUS, Bank Światowy, NBP przez",
    "lang.switch": "English",
    "freq.A": "Roczne",
    "freq.Q": "Kwartalne",
    "freq.M": "Miesięczne",
    "freq.D": "Dzienne",
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

export function t(lang: Lang, key: StringKey): string {
  return (STRINGS[lang] as Partial<Record<StringKey, string>>)[key] ?? STRINGS.en[key];
}

/** The name in lang when non-empty, else the other language's, else ''. */
export function pickName(lang: Lang, item: { name_pl?: string | null; name_en?: string | null }): string {
  const own = lang === "pl" ? item.name_pl : item.name_en;
  const other = lang === "pl" ? item.name_en : item.name_pl;
  return own || other || "";
}

export function parseLang(value: string | null | undefined): Lang | null {
  const v = value?.trim().toLowerCase();
  return v === "pl" || v === "en" ? v : null;
}
