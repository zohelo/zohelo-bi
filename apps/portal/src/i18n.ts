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
    "explorer.title": "Explorer",
    "explorer.lede": "Pick a measure, narrow it down, compare sources. Every view has its own link.",
    "explorer.saveView": "Save view",
    "explorer.loadingFilters": "Loading filters…",
    "explorer.view": "View",
    "explorer.matrix": "Matrix",
    "explorer.chart": "Chart",
    "explorer.swap": "Swap rows and columns",
    "explorer.transform": "Transform",
    "explorer.transformNone": "None",
    "explorer.transformChange": "Change on previous period",
    "explorer.transformYoy": "Year on year %",
    "explorer.transformIndex": "Index (base = 100)",
    "explorer.transformLatest": "Latest value",
    "explorer.transformShare": "Share of total",
    "explorer.transformRank": "Rank (1 = largest)",
    "explorer.basePeriod": "Base period",
    "explorer.yearPlaceholder": "YYYY",
    "explorer.from": "From",
    "explorer.to": "To",
    "explorer.transformsNeedPeriod": "Transforms need Period as the only column.",
    "explorer.copyEmbed": "Copy embed code",
    "explorer.copied": "Copied",
    "explorer.copyFailed": "Copy failed",
    "explorer.latestPeriods": "Latest period per row:",
    "explorer.truncated": "The first 20,000 rows are shown. Narrow the filters to see everything.",
    "explorer.rows": "Rows",
    "explorer.downloadCsv": "Download CSV",
    "explorer.savedViews": "Saved views",
    "explorer.remove": "Remove",
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
    "explorer.title": "Eksplorator",
    "explorer.lede": "Wybierz miarę, zawęź ją i porównaj źródła. Każdy widok ma własny link.",
    "explorer.saveView": "Zapisz widok",
    "explorer.loadingFilters": "Ładowanie filtrów…",
    "explorer.view": "Widok",
    "explorer.matrix": "Macierz",
    "explorer.chart": "Wykres",
    "explorer.swap": "Zamień wiersze i kolumny",
    "explorer.transform": "Przekształcenie",
    "explorer.transformNone": "Brak",
    "explorer.transformChange": "Zmiana do poprzedniego okresu",
    "explorer.transformYoy": "Rok do roku %",
    "explorer.transformIndex": "Indeks (baza = 100)",
    "explorer.transformLatest": "Ostatnia wartość",
    "explorer.transformShare": "Udział w sumie",
    "explorer.transformRank": "Pozycja (1 = największa)",
    "explorer.basePeriod": "Okres bazowy",
    "explorer.yearPlaceholder": "RRRR",
    "explorer.from": "Od",
    "explorer.to": "Do",
    "explorer.transformsNeedPeriod": "Przekształcenia wymagają okresu jako jedynej kolumny.",
    "explorer.copyEmbed": "Kopiuj kod do osadzenia",
    "explorer.copied": "Skopiowano",
    "explorer.copyFailed": "Nie udało się skopiować",
    "explorer.latestPeriods": "Ostatni okres w wierszu:",
    "explorer.truncated": "Pokazano pierwsze 20 000 wierszy. Zawęź filtry, aby zobaczyć wszystko.",
    "explorer.rows": "Wiersze",
    "explorer.downloadCsv": "Pobierz CSV",
    "explorer.savedViews": "Zapisane widoki",
    "explorer.remove": "Usuń",
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
