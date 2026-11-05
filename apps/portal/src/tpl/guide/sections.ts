// Section table of Przewodnik (the guide): the design template's rules as pages. Order = reading order;
// the sidebar (under Przewodnik, by group), the index cards and the previous/next links all come from this list.

import type { Lang } from "../../i18n";

export type GuideGroup = "basics" | "layout" | "content" | "quality";

/** Groups of the guide in the sidebar (under Przewodnik) and on the guide's index page. */
export const GUIDE_GROUPS: { key: GuideGroup; pl: string; en: string }[] = [
  { key: "basics", pl: "Podstawy", en: "Basics" },
  { key: "layout", pl: "Układ i nawigacja", en: "Layout and navigation" },
  { key: "content", pl: "Wykresy i treści", en: "Charts and content" },
  { key: "quality", pl: "Jakość i dane", en: "Quality and data" },
];

export type GuideSection = {
  slug: string;
  pl: string;
  en: string;
  /** Group in the sidebar and on the index page. */
  group: GuideGroup;
  /** One sentence for the index card and the page lead. */
  sumPl: string;
  sumEn: string;
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    slug: "marka",
    group: "basics",
    pl: "Marka",
    en: "Brand",
    sumPl: "Znak, warianty logo, pole ochronne, tła, obraz do udostępniania i kroje pisma.",
    sumEn: "The mark, logo variants, clear space, backgrounds, the sharing image and typefaces.",
  },
  {
    slug: "kolory-i-typografia",
    group: "basics",
    pl: "Kolory i typografia",
    en: "Colour and type",
    sumPl: "Każdy token koloru z kontrastem, skala pisma, odstępy i promienie.",
    sumEn: "Every colour token with its contrast, the type scale, spacing and radii.",
  },
  {
    slug: "uklad",
    group: "layout",
    pl: "Układ strony",
    en: "Page layout",
    sumPl: "Powłoka aplikacji i serwisu, obszary i ich rozmiary, zachowanie na różnych szerokościach, typy stron.",
    sumEn: "App and site shells, regions and sizes, behaviour across widths, page types.",
  },
  {
    slug: "menu",
    group: "layout",
    pl: "Menu boczne",
    en: "Sidebar",
    sumPl: "Budowa menu, stany elementów, pasek ikon i menu wysuwane na telefonie.",
    sumEn: "Sidebar anatomy, item states, the icon rail and the phone drawer.",
  },
  {
    slug: "pulpit",
    group: "layout",
    pl: "Pulpit",
    en: "Dashboard",
    sumPl: "Kolejność czytania, siatka, kafelki KPI, karta wykresu, filtry i stany.",
    sumEn: "Reading order, grid, KPI tiles, chart card, filters and states.",
  },
  {
    slug: "wykresy",
    group: "content",
    pl: "Biblioteka wykresów",
    en: "Chart library",
    sumPl:
      "37 typów wykresów w czterech stylach (standard, IBCS, odchylenia, redakcyjny) i według zadania, kolory według roli, znaczniki, interakcja i liczby.",
    sumEn:
      "37 chart types in four styles (standard, IBCS, variances, editorial) and by job, colour by role, marks, interaction and numbers.",
  },
  {
    slug: "komponenty",
    group: "content",
    pl: "Komponenty",
    en: "Components",
    sumPl: "Przyciski, przełączniki, wyszukiwarka, filtry, etykiety, kafelek KPI, karta wykresu, menu, tabela.",
    sumEn: "Buttons, toggles, search, filters, tags, KPI tile, chart card, menus, table.",
  },
  {
    slug: "tresci",
    group: "content",
    pl: "Treści i liczby",
    en: "Content and numbers",
    sumPl: "Jak pisać tytuły, liczby, jednostki i okresy; formy mówione symboli.",
    sumEn: "How to write titles, numbers, units and periods; spoken forms of symbols.",
  },
  {
    slug: "dostepnosc",
    group: "quality",
    pl: "Dostępność",
    en: "Accessibility",
    sumPl: "Wymagania WCAG 2.2 AA, klawiatura, kontrast i wnioski z testów z czytnikami ekranu.",
    sumEn: "WCAG 2.2 AA requirements, keyboard, contrast and findings from screen-reader tests.",
  },
  {
    slug: "tworzenie-i-testy",
    group: "quality",
    pl: "Tworzenie i testy",
    en: "Building and testing",
    sumPl: "Kto za co odpowiada, definicja ukończenia, polecenia i znane problemy.",
    sumEn: "Who does what, the definition of done, commands and known issues.",
  },
  {
    slug: "metodologia",
    group: "quality",
    pl: "Metodologia i źródła",
    en: "Methodology and sources",
    sumPl: "Skąd pochodzą dane, na jakich licencjach, jak są uporządkowane i jak świeże.",
    sumEn: "Where the data comes from, under which licences, how it is organised and how fresh it is.",
  },
];

export const GUIDE_TITLE = { pl: "Przewodnik", en: "Guide" } as const;

export function findSection(slug: string | null): GuideSection | undefined {
  return slug === null ? undefined : GUIDE_SECTIONS.find((s) => s.slug === slug);
}

export function sectionName(s: GuideSection, lang: Lang): string {
  return lang === "pl" ? s.pl : s.en;
}

export function sectionPath(slug: string | null): string {
  return slug === null ? "/przewodnik" : `/przewodnik/${slug}`;
}

/** Previous and next page in reading order; the index comes before the first section. */
export function neighbours(slug: string | null): { prev: string | null | undefined; next: string | undefined } {
  if (slug === null) return { prev: undefined, next: GUIDE_SECTIONS[0]?.slug };
  const i = GUIDE_SECTIONS.findIndex((s) => s.slug === slug);
  if (i < 0) return { prev: undefined, next: undefined };
  return { prev: i === 0 ? null : GUIDE_SECTIONS[i - 1]!.slug, next: GUIDE_SECTIONS[i + 1]?.slug };
}
