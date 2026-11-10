// Sample hot topics (sample mode only; part of the sample chunk with dummy.ts). The shape is exactly
// 06_published/v2/topics.json (zohelo-data docs/published.md, "topics.json"). Everything here is invented: the
// outlets are fictional ("… (przykład)"), every link points to example.com, and the headlines describe no real
// article. Topics, their KPI links and the heat formula follow zohelo-data docs/topics.md, so the portal can be
// built and reviewed before the real file is published. Deterministic: fixed date, no randomness.

import type { TopicEntry, TopicHeadline, TopicPeriodKey, TopicRelease, TopicSignals, Topics } from "./types";

/** The day the sample ranking was "run" (the sample catalogue's data end in 2026). */
export const SAMPLE_TOPICS_DAY = "2026-11-10";

const OUTLETS = [
  { name: "Dziennik Przykładowy (przykład)", slug: "dziennik-przykladowy" },
  { name: "Portal Ekonomiczny Demo (przykład)", slug: "portal-ekonomiczny-demo" },
  { name: "Gazeta Testowa (przykład)", slug: "gazeta-testowa" },
  { name: "Kurier Fikcyjny (przykład)", slug: "kurier-fikcyjny" },
  { name: "Sample Business Daily (sample)", slug: "sample-business-daily" },
] as const;

/** [days before SAMPLE_TOPICS_DAY, time UTC "HH:MM", outlet index, title]; English titles come from outlet 4. */
type H = [number, string, number, string];

type SampleTopic = {
  key: string;
  pl: string;
  en: string;
  /** Sample KPI keys, main first; empty = no indicator linked yet. */
  kpis: string[];
  release: TopicRelease | null;
  headlines: H[];
};

const TOPICS: SampleTopic[] = [
  {
    key: "inflacja",
    pl: "Inflacja i ceny",
    en: "Inflation and prices",
    kpis: ["cpi_annual_rate", "core_inflation", "hicp_annual_rate", "inflation_expectations"],
    release: {
      date: "2026-11-16",
      source_key: "gus",
      title_pl: "Wskaźniki cen towarów i usług konsumpcyjnych w październiku",
      title_en: "Consumer price indices, October",
    },
    headlines: [
      [0, "07:40", 0, "Ceny w sklepach znów w górę? Ekonomiści przed publikacją danych o inflacji"],
      [0, "06:15", 1, "Inflacja bazowa może spaść poniżej 3 proc. Co to oznacza dla kredytobiorców"],
      [1, "18:20", 4, "Polish inflation seen easing further ahead of final October data"],
      [2, "09:05", 2, "Masło, jajka, kawa: które produkty podrożały najbardziej w tym roku"],
      [4, "11:30", 3, "Oczekiwania inflacyjne konsumentów najniższe od dwóch lat"],
      [12, "08:00", 1, "Szybki szacunek: inflacja w październiku bez niespodzianek"],
      [40, "10:00", 0, "Ceny usług rosną szybciej niż ceny towarów"],
      [130, "09:00", 2, "Inflacja wróciła do celu NBP. Na jak długo?"],
    ],
  },
  {
    key: "stopy_procentowe",
    pl: "Stopy procentowe i RPP",
    en: "Interest rates and the MPC",
    kpis: ["nbp_reference_rate", "wibor_3m", "lending_rate_new", "deposit_rate_new"],
    release: {
      date: "2026-12-02",
      source_key: "nbp",
      title_pl: "Decyzja Rady Polityki Pieniężnej",
      title_en: "Monetary Policy Council decision",
    },
    headlines: [
      [0, "08:50", 3, "RPP podzielona przed grudniowym posiedzeniem. Obniżka coraz mniej pewna"],
      [0, "05:30", 1, "WIBOR spada trzeci tydzień z rzędu. Raty kredytów niższe od stycznia"],
      [1, "16:00", 4, "Polish central bank seen on hold in December, minutes suggest"],
      [3, "12:10", 0, "Prezes NBP: przestrzeń do obniżek jest ograniczona"],
      [6, "10:45", 2, "Lokaty tracą na atrakcyjności. Gdzie jeszcze 5 proc.?"],
      [35, "14:00", 1, "RPP obniżyła stopy o 25 pkt bazowych"],
      [100, "14:00", 3, "Pierwsza obniżka stóp od dwóch lat"],
    ],
  },
  {
    key: "place",
    pl: "Wynagrodzenia",
    en: "Wages",
    kpis: ["avg_wage", "real_wage_growth", "nominal_wage_growth", "min_wage"],
    release: {
      date: "2026-11-20",
      source_key: "gus",
      title_pl: "Przeciętne wynagrodzenie w sektorze przedsiębiorstw w październiku",
      title_en: "Average wage in the enterprise sector, October",
    },
    headlines: [
      [0, "09:10", 2, "Płaca minimalna 2027: rząd przyjął rozporządzenie"],
      [1, "07:00", 0, "Realne płace rosną najwolniej od półtora roku"],
      [2, "13:25", 1, "Podwyżki w 2027 r.: firmy planują mniej niż pracownicy oczekują"],
      [5, "10:00", 4, "Polish real wages still rising, but momentum fades"],
      [20, "10:00", 3, "Przeciętne wynagrodzenie przekroczyło kolejny próg"],
      [90, "10:00", 2, "Luka płacowa między województwami się nie zmniejsza"],
    ],
  },
  {
    key: "rynek_pracy",
    pl: "Rynek pracy i bezrobocie",
    en: "Labour market and unemployment",
    kpis: ["unemployment_lfs", "registered_unemployment", "job_vacancy_rate", "employment_rate"],
    release: {
      date: "2026-11-24",
      source_key: "gus",
      title_pl: "Bezrobocie rejestrowane w październiku",
      title_en: "Registered unemployment, October",
    },
    headlines: [
      [1, "11:00", 1, "Firmy ograniczają rekrutacje. Mniej ofert pracy niż przed rokiem"],
      [3, "08:30", 3, "Bezrobocie wciąż blisko rekordowo niskiego poziomu"],
      [6, "09:40", 0, "Zwolnienia grupowe w przemyśle: które branże tną etaty"],
      [15, "10:00", 4, "Poland's jobless rate holds near record low"],
      [60, "10:00", 2, "Cudzoziemcy coraz ważniejsi dla rynku pracy"],
      [200, "10:00", 1, "Rekordowo niskie bezrobocie w województwie wielkopolskim"],
    ],
  },
  {
    key: "kurs_zlotego",
    pl: "Kurs złotego",
    en: "The zloty",
    kpis: ["eurpln", "usdpln", "chfpln", "reer"],
    release: null,
    headlines: [
      [0, "10:05", 4, "Zloty firms to strongest level against the euro in months"],
      [0, "08:20", 1, "Złoty najmocniejszy od miesięcy. Euro poniżej ważnej granicy"],
      [2, "15:45", 2, "Mocny złoty: kto zyskuje, a kto traci"],
      [8, "09:00", 0, "Frank szwajcarski tanieje. Ulga dla frankowiczów"],
      [70, "09:00", 3, "Dolar słabnie na świecie, złoty korzysta"],
    ],
  },
  {
    key: "pkb",
    pl: "PKB i wzrost gospodarczy",
    en: "GDP and growth",
    kpis: ["gdp_real_growth", "gdp_qoq_sa", "esi", "gfcf_growth"],
    release: {
      date: "2026-11-13",
      source_key: "gus",
      title_pl: "Szybki szacunek PKB za III kwartał",
      title_en: "Flash estimate of GDP, Q3",
    },
    headlines: [
      [0, "07:05", 0, "Szybki szacunek PKB w piątek. Ekonomiści spodziewają się przyspieszenia"],
      [0, "06:30", 1, "Inwestycje w centrum uwagi przed danymi o PKB za III kwartał"],
      [2, "10:30", 4, "Investment rebound to lift Polish growth in Q3, economists say"],
      [5, "12:00", 3, "Komisja Europejska podniosła prognozę wzrostu dla Polski"],
      [25, "09:00", 1, "Nastroje w gospodarce najlepsze od początku roku"],
      [110, "10:00", 2, "PKB w II kwartale: konsumpcja ciągnie gospodarkę"],
      [300, "10:00", 0, "Polska gospodarka przekroczyła 1 bln dolarów"],
    ],
  },
  {
    key: "finanse_publiczne",
    pl: "Finanse publiczne i dług",
    en: "Public finances and debt",
    kpis: ["gg_deficit_gdp", "gg_debt_gdp", "pdp_gdp", "gg_interest_gdp"],
    release: {
      date: "2026-11-11",
      source_key: "eurostat",
      title_pl: "Notyfikacja fiskalna EDP (dane półroczne)",
      title_en: "EDP fiscal notification (half-year data)",
    },
    headlines: [
      [0, "06:45", 2, "Deficyt w procedurze nadmiernego deficytu: co dalej z budżetem na 2027 r."],
      [0, "05:10", 4, "Poland's deficit in focus ahead of tomorrow's fiscal notification"],
      [1, "17:30", 1, "Koszty obsługi długu rosną szybciej niż wydatki na obronność"],
      [3, "09:20", 4, "Rating agency keeps Poland's outlook, flags rising debt"],
      [9, "08:00", 0, "Sejm przyjął ustawę budżetową. Deficyt bez zmian"],
      [45, "10:00", 3, "Dług publiczny przekroczy 60 proc. PKB?"],
      [150, "10:00", 2, "Unia otwiera procedurę nadmiernego deficytu wobec kolejnych krajów"],
    ],
  },
  {
    key: "mieszkania",
    pl: "Mieszkania i kredyty hipoteczne",
    en: "Housing and mortgages",
    kpis: ["price_m2_secondary", "dwellings_started", "dwellings_completed", "lending_rate_new"],
    release: {
      date: "2026-11-19",
      source_key: "gus",
      title_pl: "Budownictwo mieszkaniowe w październiku",
      title_en: "Housing construction, October",
    },
    headlines: [
      [1, "08:15", 3, "Ceny mieszkań na rynku wtórnym: w których miastach spadają"],
      [2, "14:40", 0, "Deweloperzy rozpoczynają mniej budów. Podaż w 2027 r. może być niższa"],
      [4, "10:10", 1, "Kredyty hipoteczne: banki luzują wymagania"],
      [18, "10:00", 2, "Program dopłat do kredytów: rząd wycofuje się z planów"],
      [80, "10:00", 4, "Polish house price growth slows to single digits"],
      [250, "10:00", 0, "Najwięcej oddanych mieszkań od 1979 roku"],
    ],
  },
  {
    key: "ceny_energii",
    pl: "Ceny energii",
    en: "Energy prices",
    kpis: ["electricity_price_household", "res_share", "electricity_generation"],
    release: null,
    headlines: [
      [2, "07:30", 2, "Taryfy na prąd na 2027 r.: URE dostał wnioski sprzedawców"],
      [6, "11:15", 0, "Mrożenie cen energii: czy będzie przedłużone"],
      [20, "09:00", 1, "Rekordowy udział OZE w produkcji energii w październiku"],
      [95, "09:00", 3, "Rachunki za prąd w górę po zniesieniu mrożenia cen"],
      [180, "09:00", 4, "Poland's coal share in power falls below 50% for the first time"],
    ],
  },
  {
    key: "demografia",
    pl: "Demografia i migracje",
    en: "Demography and migration",
    kpis: ["tfr", "population_total", "net_migration", "old_age_dependency"],
    release: {
      date: "2027-01-28",
      source_key: "gus",
      title_pl: "Sytuacja demograficzna Polski: wstępne dane za 2026 r.",
      title_en: "Demographic situation of Poland: preliminary data for 2026",
    },
    headlines: [
      [3, "06:00", 1, "Najmniej urodzeń od końca wojny. Dzietność wciąż spada"],
      [16, "10:00", 0, "Ludność Polski poniżej 37 mln?"],
      [50, "10:00", 4, "Poland's population decline accelerates, statistics office says"],
      [120, "10:00", 2, "Imigranci zarobkowi: ilu cudzoziemców pracuje w Polsce"],
      [210, "10:00", 3, "Starzejące się społeczeństwo: co trzeci Polak po sześćdziesiątce w 2040 r."],
    ],
  },
  {
    key: "kpo",
    pl: "Fundusze UE i KPO",
    en: "EU funds and the RRF",
    kpis: ["eu_funds_pc"],
    release: null,
    headlines: [
      [1, "12:30", 0, "KPO: ostatni wniosek o płatność. Czy Polska zdąży do sierpnia 2026?"],
      [5, "09:50", 2, "Rewizja KPO: pieniądze przesunięte na obronność i energetykę"],
      [22, "10:00", 1, "Samorządy czekają na zaliczki z funduszy europejskich"],
      [75, "10:00", 4, "Poland receives next tranche of EU recovery funds"],
      [160, "10:00", 3, "Ile pieniędzy z KPO trafiło do województw"],
    ],
  },
  {
    key: "cla_usa",
    pl: "Cła USA i handel",
    en: "US tariffs and trade",
    kpis: [],
    release: null,
    headlines: [
      [0, "09:30", 4, "New US tariff threat weighs on European exporters"],
      [0, "07:55", 3, "Nowe cła USA: polscy eksporterzy mebli i AGD liczą straty"],
      [1, "14:10", 1, "Unia szykuje odpowiedź na amerykańskie cła"],
      [4, "08:40", 2, "Wojna handlowa: które polskie branże są najbardziej narażone"],
      [30, "10:00", 0, "Cła na stal: polskie huty pod presją"],
      [190, "10:00", 1, "USA i UE zawierają rozejm celny"],
    ],
  },
  {
    key: "przemysl",
    pl: "Przemysł",
    en: "Industry",
    kpis: ["industrial_production", "ppi_annual_rate", "capacity_utilisation"],
    release: {
      date: "2026-11-19",
      source_key: "gus",
      title_pl: "Produkcja sprzedana przemysłu w październiku",
      title_en: "Industrial output, October",
    },
    headlines: [
      [2, "11:50", 0, "Produkcja przemysłowa: odbicie w przetwórstwie"],
      [7, "09:00", 4, "Polish factory activity edges higher on new orders"],
      [24, "10:00", 1, "Ceny producentów spadają czternasty miesiąc z rzędu"],
      [85, "10:00", 3, "Przemysł motoryzacyjny hamuje"],
      [230, "10:00", 2, "Najgorszy rok przemysłu od pandemii"],
    ],
  },
  {
    key: "konsumpcja",
    pl: "Konsumpcja i nastroje",
    en: "Consumption and sentiment",
    kpis: ["retail_sales", "consumer_confidence", "business_climate"],
    release: { date: "2026-11-21", source_key: "gus", title_pl: "Sprzedaż detaliczna w październiku", title_en: "Retail sales, October" },
    headlines: [
      [1, "10:20", 2, "Black Friday coraz wcześniej. Sklepy liczą na rekordowy listopad"],
      [3, "13:00", 0, "Nastroje konsumentów najlepsze od 2019 roku"],
      [10, "10:00", 4, "Polish retail sales beat forecasts in September"],
      [65, "10:00", 1, "Polacy więcej oszczędzają, mniej wydają"],
      [170, "10:00", 3, "Sprzedaż w sieciach handlowych hamuje"],
    ],
  },
];

/** Signals (robust z-scores) per period: [topic, news, volume, attention]; null = signal not configured. */
type S = [string, number | null, number | null, number | null];

const SIGNALS: Record<TopicPeriodKey, S[]> = {
  day: [
    ["inflacja", 2.6, 1.9, 1.4],
    ["cla_usa", 3.1, 2.4, null],
    ["kurs_zlotego", 1.8, 0.9, 1.7],
    ["stopy_procentowe", 1.6, 1.2, 0.8],
    ["finanse_publiczne", 1.2, 0.7, 0.4],
    ["pkb", 1.1, 0.6, 0.5],
    ["place", 1.4, 0.4, 0.9],
  ],
  week: [
    ["inflacja", 2.1, 1.6, 1.2],
    ["stopy_procentowe", 1.9, 1.3, 1.0],
    ["cla_usa", 2.4, 1.8, null],
    ["place", 1.5, 0.8, 1.1],
    ["finanse_publiczne", 1.3, 1.0, 0.6],
    ["kurs_zlotego", 1.2, 0.7, 1.0],
    ["mieszkania", 1.0, 0.8, 1.3],
    ["pkb", 1.0, 0.9, 0.4],
    ["rynek_pracy", 0.8, 0.5, 0.6],
    ["kpo", 0.7, 0.6, 0.3],
  ],
  month: [
    ["stopy_procentowe", 1.8, 1.4, 1.2],
    ["inflacja", 1.7, 1.2, 1.0],
    ["finanse_publiczne", 1.4, 1.1, 0.7],
    ["mieszkania", 1.2, 0.9, 1.4],
    ["cla_usa", 1.6, 1.2, null],
    ["place", 1.1, 0.7, 0.9],
    ["kpo", 1.0, 0.8, 0.5],
    ["konsumpcja", 0.9, 0.6, 0.7],
    ["ceny_energii", 0.8, 0.7, 0.9],
    ["przemysl", 0.6, 0.5, 0.3],
  ],
  quarter: [
    ["stopy_procentowe", 1.5, 1.2, 1.1],
    ["finanse_publiczne", 1.3, 1.1, 0.8],
    ["inflacja", 1.2, 1.0, 0.9],
    ["ceny_energii", 1.1, 0.9, 1.2],
    ["mieszkania", 1.0, 0.8, 1.1],
    ["kpo", 0.9, 0.9, 0.6],
    ["cla_usa", 1.0, 0.8, null],
    ["rynek_pracy", 0.7, 0.6, 0.5],
    ["konsumpcja", 0.6, 0.5, 0.6],
    ["przemysl", 0.6, 0.4, 0.3],
  ],
  year: [
    ["inflacja", 1.4, 1.1, 1.0],
    ["stopy_procentowe", 1.3, 1.0, 0.9],
    ["finanse_publiczne", 1.0, 0.9, 0.6],
    ["mieszkania", 0.9, 0.8, 1.0],
    ["ceny_energii", 0.9, 0.8, 0.9],
    ["demografia", 0.6, 0.5, 1.2],
    ["place", 0.7, 0.6, 0.7],
    ["rynek_pracy", 0.6, 0.5, 0.5],
    ["pkb", 0.6, 0.5, 0.4],
    ["przemysl", 0.5, 0.4, 0.3],
  ],
};

/** Trend against the previous window of the same length (sample choice per period and topic). */
const UP = new Set([
  "day:inflacja",
  "day:cla_usa",
  "day:kurs_zlotego",
  "week:inflacja",
  "week:cla_usa",
  "week:place",
  "month:mieszkania",
  "month:cla_usa",
  "quarter:ceny_energii",
  "year:finanse_publiczne",
  "year:demografia",
]);
const DOWN = new Set(["day:pkb", "week:rynek_pracy", "month:konsumpcja", "quarter:inflacja", "year:inflacja"]);

const DAYS: Record<TopicPeriodKey, number> = { day: 1, week: 7, month: 30, quarter: 91, year: 365 };

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The heat formula of docs/topics.md: weights 0.5/0.3/0.2, rescaled when a signal is missing. */
export function heatOf(s: TopicSignals): number {
  const parts: [number | null, number][] = [
    [s.news, 0.5],
    [s.volume, 0.3],
    [s.attention, 0.2],
  ];
  const present = parts.filter((p): p is [number, number] => p[0] !== null);
  const weight = present.reduce((a, [, w]) => a + w, 0);
  if (!weight) return 0;
  return Math.round((present.reduce((a, [z, w]) => a + z * w, 0) / weight) * 100) / 100;
}

function headlinesIn(t: SampleTopic, days: number): TopicHeadline[] {
  return t.headlines
    .filter(([ago]) => ago < days)
    .sort((a, b) => a[0] - b[0] || b[1].localeCompare(a[1]))
    .slice(0, 5)
    .map(([ago, time, o, title], i) => ({
      title,
      url: `https://example.com/${OUTLETS[o]!.slug}/${t.key.replace(/_/g, "-")}-${ago}-${i + 1}`,
      outlet: OUTLETS[o]!.name,
      lang: o === 4 ? "en" : "pl",
      published_at: `${addDays(SAMPLE_TOPICS_DAY, -ago)}T${time}:00Z`,
    }));
}

function period(p: TopicPeriodKey): { window: { from: string; to: string }; topics: TopicEntry[] } {
  const entries = SIGNALS[p].map(([key, news, volume, attention]) => {
    const t = TOPICS.find((x) => x.key === key)!;
    const signals = { news, volume, attention };
    // release(d): +1 on the day of a main KPI's release, +0.5 the day before (day ranking only in this sample).
    const release =
      p === "day" && t.release
        ? t.release.date === SAMPLE_TOPICS_DAY
          ? 1
          : t.release.date === addDays(SAMPLE_TOPICS_DAY, 1)
            ? 0.5
            : 0
        : 0;
    return {
      topic_key: t.key,
      name_pl: t.pl,
      name_en: t.en,
      rank: 0,
      heat: Math.round((heatOf(signals) + release) * 100) / 100,
      trend: UP.has(`${p}:${key}`) ? ("up" as const) : DOWN.has(`${p}:${key}`) ? ("down" as const) : ("flat" as const),
      kpi_keys: t.kpis,
      headlines: headlinesIn(t, DAYS[p]),
      next_release: t.release,
      signals,
    };
  });
  // Ranked by heat, ties by headline count; a topic needs 3 headlines in the window (day: 2).
  const ranked = entries
    .filter((e) => e.headlines.length >= (p === "day" ? 2 : 3))
    .sort((a, b) => b.heat - a.heat || b.headlines.length - a.headlines.length)
    .slice(0, 10)
    .map((e, i) => ({ ...e, rank: i + 1 }));
  return { window: { from: addDays(SAMPLE_TOPICS_DAY, 1 - DAYS[p]), to: SAMPLE_TOPICS_DAY }, topics: ranked };
}

export function sampleTopics(): Topics {
  return {
    version: 2,
    generated_at: `${SAMPLE_TOPICS_DAY}T05:30:00Z`,
    periods: { day: period("day"), week: period("week"), month: period("month"), quarter: period("quarter"), year: period("year") },
  };
}
