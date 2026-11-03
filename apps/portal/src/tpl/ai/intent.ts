// AI view builder, v1: a deterministic intent parser. The text a reader types in the home page search panel
// ("inflacja w Polsce i Niemczech od 2015", "bezrobocie w województwach na mapie", "show me GDP growth vs EU",
// "dashboard o finansach publicznych", "jak czytać wykres") becomes a ViewProposal: either a link to existing
// content (indicator page, dashboard page, guide page) or a Data explorer view built with the explorer's own
// URL state (normaliseQuery + serialiseExplore), so every link opens exactly what the proposal describes.
//
// No server and no LLM: Polish and English words are matched accent-insensitively by stem (prefix), which
// tolerates Polish inflection ("inflacji", "województwach", "Niemczech", "na Mazowszu"). A later backend (an LLM
// behind a Pages Function, docs/ai-view-builder.md) returns the same ViewProposal and is validated with
// `proposalUrlOk`, the same parsers the pages use.

import type { Catalog, GeoLevel, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { dashboardFor } from "../dashboard/load";
import { exploreLink, normaliseQuery, parseExplore, serialiseExplore, shapeOf, LAST_YEARS, emptyQuery } from "../explore/exploreState";
import type { ChartKind, Compare, Query, TimeSel } from "../explore/exploreState";
import { hasVoivodeships } from "../explore/kpiInfo";
import { normalise } from "../explore/search";
import { GUIDE_SECTIONS, findSection } from "../guide/sections";
import { tplPageFor } from "../routes";

// --- output contract -----------------------------------------------------------------------------------------

export type ViewKind = "explore" | "kpi" | "dashboard" | "guide" | "none";

export type ViewProposal = {
  kind: ViewKind;
  /** Where "Otwórz" goes: /explore?…, /kpi/<key>, /d/<domain>[/<page>], /przewodnik[/<slug>]; for "none" the catalogue. */
  url: string;
  /** What will be shown, in the UI language. */
  title: string;
  /** How the request was understood, one short phrase each ("Wskaźnik: Inflacja HICP, r/r", "Okres: od 2015"). */
  explanation: string[];
  /** Up to three other good matches. */
  alternatives: { label: string; url: string }[];
  confidence: "high" | "medium" | "low";
};

/** Any implementation of the builder (this parser now, an LLM backend later) has this shape. */
export type ViewBuilderEngine = (text: string, cat: Catalog, lang: Lang) => ViewProposal | Promise<ViewProposal>;

// --- lexicons ------------------------------------------------------------------------------------------------
// A pattern is space-separated elements matched against consecutive words; an element lists alternatives with "|".
// An alternative matches a word that starts with it (stem), or equals it when it starts with "=" or has at most
// three letters. All patterns are written normalised (lower case, no diacritics, ł = l).

type Entry<T> = { p: string; v: T };

/** Indicator concepts: candidate KPIs in order; `foreign` = order when other countries or the EU are asked for. */
type Concept = { keys: string[]; foreign?: string[] };
const c = (keys: string[], foreign?: string[]): Concept => ({ keys, foreign });

const INDICATORS: Entry<Concept>[] = [
  // prices
  { p: "inflac|inflat bazow|core", v: c(["core_inflation"]) },
  { p: "core inflat", v: c(["core_inflation"]) },
  { p: "oczekiwan|expect inflac|inflat", v: c(["inflation_expectations"]) },
  { p: "inflation expect", v: c(["inflation_expectations"]) },
  { p: "hicp|zharmonizowan", v: c(["hicp_annual_rate"]) },
  { p: "=cpi", v: c(["cpi_annual_rate"]) },
  { p: "inflac|inflat", v: c(["cpi_annual_rate", "hicp_annual_rate"], ["hicp_annual_rate", "cpi_annual_rate"]) },
  { p: "=ceny|=cen|=cena|=price|=prices konsump|consum", v: c(["cpi_annual_rate"], ["hicp_annual_rate"]) },
  { p: "=ppi", v: c(["ppi_annual_rate"]) },
  { p: "=ceny|=cen|=cena producent", v: c(["ppi_annual_rate"]) },
  { p: "producer price", v: c(["ppi_annual_rate"]) },
  // growth and activity
  { p: "=pkb|=gdp na|per mieszkan|capita|head", v: c(["gdp_per_capita_pps"]) },
  { p: "=pkb|=gdp nominal|biezac", v: c(["gdp_nominal"]) },
  { p: "wzrost|wzrostu|growth =pkb|=gdp", v: c(["gdp_real_growth", "gdp_regional_growth"]) },
  { p: "=pkb|=gdp wzrost|growth", v: c(["gdp_real_growth", "gdp_regional_growth"]) },
  { p: "wzrost|wzrostu|rozwoj gospodar", v: c(["gdp_real_growth", "gdp_regional_growth"]) },
  { p: "economic growth", v: c(["gdp_real_growth", "gdp_regional_growth"]) },
  { p: "=pkb|=gdp", v: c(["gdp_real_growth", "gdp_regional_growth"]) },
  { p: "produkt krajow", v: c(["gdp_real_growth", "gdp_regional_growth"]) },
  { p: "produkc|product przemysl|industr", v: c(["industrial_production"]) },
  { p: "industrial product", v: c(["industrial_production"]) },
  { p: "sprzedaz|sprzedazy detal", v: c(["retail_sales"]) },
  { p: "retail", v: c(["retail_sales"]) },
  { p: "koniunktur", v: c(["business_climate"]) },
  { p: "nastroj|ufnosc|zaufani konsumen", v: c(["consumer_confidence"]) },
  { p: "consumer confiden", v: c(["consumer_confidence"]) },
  { p: "inwestycj|investment", v: c(["gfcf_growth"]) },
  // labour
  { p: "bezrob|unemploy rejestrow|registered", v: c(["registered_unemployment"]) },
  { p: "registered unemploy", v: c(["registered_unemployment"]) },
  { p: "bezrob|unemploy|jobless", v: c(["unemployment_lfs"]) },
  { p: "zatrudnien|employment", v: c(["employment_rate"]) },
  { p: "plac|placa|wynagrodz minimal", v: c(["min_wage"]) },
  { p: "minimal plac|placa|wynagrodz", v: c(["min_wage"]) },
  { p: "minimum wage", v: c(["min_wage"]) },
  { p: "luka placow", v: c(["gender_pay_gap"]) },
  { p: "pay gap", v: c(["gender_pay_gap"]) },
  { p: "=place|=placa|=plac|=placach|=placami|wynagrodz|pensj|zarob|=wage|=wages|salar|earning", v: c(["avg_wage"]) },
  { p: "emerytur|pension", v: c(["zus_pension_avg"]) },
  { p: "ubostw|poverty|wyklucz", v: c(["arope_rate"]) },
  { p: "=gini|nierownos|inequal", v: c(["gini"]) },
  { p: "dochod|dochody rozporzadz", v: c(["disposable_income_pc"]) },
  { p: "disposable income", v: c(["disposable_income_pc"]) },
  // public finance and money
  { p: "dlug|dlugu|zadluzen samorzad|=jst|gmin", v: c(["lg_debt_ratio"]) },
  { p: "dlug|dlugu|zadluzen|debt|=edp", v: c(["gg_debt_gdp"]) },
  { p: "deficyt|deficit|niedobor", v: c(["gg_deficit_gdp"]) },
  { p: "saldo budzet|sektor", v: c(["gg_deficit_gdp"]) },
  { p: "stop|stopy|stopa procent|referenc", v: c(["nbp_reference_rate"]) },
  { p: "interest rate", v: c(["nbp_reference_rate"]) },
  { p: "wibor", v: c(["wibor_3m"]) },
  { p: "kurs|kursu =euro|=eur|=eura|=eurpln", v: c(["eurpln"]) },
  { p: "=eurpln", v: c(["eurpln"]) },
  { p: "=eur =pln", v: c(["eurpln"]) },
  { p: "=euro =exchange|=rate", v: c(["eurpln"]) },
  { p: "kurs|kursu =dolar|=dolara|=usd", v: c(["usdpln"]) },
  { p: "=usdpln|=dolar|=dolara|=dollar", v: c(["usdpln"]) },
  { p: "=frank|=franka|=chf|=chfpln", v: c(["chfpln"]) },
  { p: "=funt|=funta|=gbp|=gbppln", v: c(["gbppln"]) },
  { p: "=zloto|=zlota|=zlocie|=gold", v: c(["gold_price_pln"]) },
  // trade
  { p: "saldo|bilans handl", v: c(["trade_balance"]) },
  { p: "trade balance", v: c(["trade_balance"]) },
  { p: "ekspor|export", v: c(["exports_goods"]) },
  // population
  { p: "dzietnos|fertility|urodzen", v: c(["tfr"]) },
  { p: "dlugos|trwani zycia", v: c(["life_expectancy"]) },
  { p: "life expect", v: c(["life_expectancy"]) },
  { p: "migrac|migrat", v: c(["net_migration"]) },
  { p: "mediana|median wieku|=age", v: c(["median_age"]) },
  { p: "ludnos|populac|population|demograf", v: c(["population_total"]) },
  // housing
  { p: "=ceny|=cen|=cena|=cenach mieszkan|metr|=m2", v: c(["price_m2_secondary"]) },
  { p: "house|housing|property price", v: c(["price_m2_secondary"]) },
  { p: "pozwolen budow", v: c(["building_permits"]) },
  { p: "mieszkan|dwelling|housing rozpocz|start", v: c(["dwellings_started"]) },
  { p: "budownictw mieszkan", v: c(["dwellings_completed"]) },
  { p: "mieszkan|dwelling", v: c(["dwellings_completed"]) },
  // other topics
  { p: "=oze|odnawialn|renewab", v: c(["res_share"]) },
  { p: "emisj|emission|=co2|cieplarnian", v: c(["ghg_emissions"]) },
  { p: "smog|=pm25|=pm2|zanieczyszcz", v: c(["pm25_mean"]) },
  { p: "lesistos|=lasy|=lasow|forest", v: c(["forest_cover"]) },
  { p: "turys|nocleg|touris", v: c(["overnight_stays"]) },
  { p: "przestep|crime", v: c(["crimes_per_1000"]) },
  { p: "samochod|=cars|=car", v: c(["cars_per_1000"]) },
  { p: "road death", v: c(["road_deaths"]) },
  { p: "wypadk", v: c(["road_deaths"]) },
  { p: "frekwencj|turnout", v: c(["turnout_parliament"]) },
  { p: "studen", v: c(["students_total"]) },
  { p: "lekarz|lekarzy|doctor", v: c(["doctors_per_1000"]) },
  { p: "upadlos|bankrupt", v: c(["bankruptcies"]) },
  { p: "=nowe|=nowych|=new firm|przedsieb|compan", v: c(["new_firms"]) },
];

type AreaVal = { geo: string[]; note?: { pl: string; en: string } };
const a = (...geo: string[]): AreaVal => ({ geo });
const city = (geo: string, pl: string, en: string): AreaVal => ({ geo: [geo], note: { pl, en } });

const AREAS: Entry<AreaVal>[] = [
  { p: "polsk|polsc|poland|=zzgeopl", v: a("PL") },
  { p: "niemc|niemie|german|=zzgeode", v: a("DE") },
  { p: "czech|czesk|=zzgeocz", v: a("CZ") },
  { p: "slowac|slovak|=zzgeosk", v: a("SK") },
  { p: "wegr|=wegier|hungar|=zzgeohu", v: a("HU") },
  { p: "litw|lithuan|=zzgeolt", v: a("LT") },
  { p: "rumun|romani|=zzgeoro", v: a("RO") },
  { p: "francj|francu|france|french|=zzgeofr", v: a("FR") },
  { p: "hiszpan|spain|spanish|=zzgeoes", v: a("ES") },
  { p: "wloch|wlosz|wlosk|ital|=zzgeoit", v: a("IT") },
  { p: "=ue|=eu|=eu27|=ue27|=unia|=unii|=unie|=union|europ", v: a("EU27") },
  { p: "kraj|panstw|countr =ue|=eu|=unii|europ", v: a("*EU") },
  { p: "=eu|=ue kraj|panstw|countr", v: a("*EU") },
  { p: "sasiad|sasiedz|neighbo", v: a("PL", "DE", "CZ", "SK", "LT") },
  // voivodeships, in all cases, with the historical regions and English names
  { p: "dolnoslas", v: a("PL02") },
  { p: "=dolny|=dolnym|=lower slas|silesi", v: a("PL02") },
  { p: "kujaw|kuyavi pomor|pomer", v: a("PL04") },
  { p: "kujaw|kuyavi", v: a("PL04") },
  { p: "lubel|lublin", v: a("PL06") },
  { p: "lubus", v: a("PL08") },
  { p: "lodz", v: a("PL10") },
  { p: "malopol", v: a("PL12") },
  { p: "lesser pol", v: a("PL12") },
  { p: "mazowi|mazows|masovi", v: a("PL14") },
  { p: "opol", v: a("PL16") },
  { p: "podkarpa|subcarpath", v: a("PL18") },
  { p: "podlas", v: a("PL20") },
  { p: "zachodniopomor", v: a("PL32") },
  { p: "=west pomer", v: a("PL32") },
  { p: "pomorz|pomorze zachod", v: a("PL32") },
  { p: "pomorsk|pomorz|pomorze|pomeran", v: a("PL22") },
  { p: "slask|slaski|slasku|slaskie|slaskim|silesi", v: a("PL24") },
  { p: "swietokrzys", v: a("PL26") },
  { p: "holy cross", v: a("PL26") },
  { p: "warmi|mazur|masuri", v: a("PL28") },
  { p: "wielkopol", v: a("PL30") },
  { p: "greater pol", v: a("PL30") },
  // the largest cities stand for their voivodeship
  { p: "warszaw|warsaw", v: city("PL14", "Warszawa → mazowieckie", "Warsaw → Masovia") },
  { p: "krakow|cracow", v: city("PL12", "Kraków → małopolskie", "Kraków → Lesser Poland") },
  { p: "wroclaw", v: city("PL02", "Wrocław → dolnośląskie", "Wrocław → Lower Silesia") },
  { p: "poznan", v: city("PL30", "Poznań → wielkopolskie", "Poznań → Greater Poland") },
  { p: "gdansk|gdyni|gdynia|trojmiast", v: city("PL22", "Gdańsk → pomorskie", "Gdańsk → Pomerania") },
  { p: "katowic", v: city("PL24", "Katowice → śląskie", "Katowice → Silesia") },
  { p: "szczecin", v: city("PL32", "Szczecin → zachodniopomorskie", "Szczecin → West Pomerania") },
  { p: "bialystok|bialymstoku", v: city("PL20", "Białystok → podlaskie", "Białystok → Podlaskie") },
  { p: "rzeszow", v: city("PL18", "Rzeszów → podkarpackie", "Rzeszów → Subcarpathia") },
  { p: "kielc", v: city("PL26", "Kielce → świętokrzyskie", "Kielce → Holy Cross") },
  { p: "olsztyn", v: city("PL28", "Olsztyn → warmińsko-mazurskie", "Olsztyn → Warmia-Masuria") },
  { p: "bydgoszcz|torun", v: city("PL04", "Bydgoszcz, Toruń → kujawsko-pomorskie", "Bydgoszcz, Toruń → Kuyavia-Pomerania") },
  { p: "zielon|gorzow", v: city("PL08", "Zielona Góra, Gorzów → lubuskie", "Zielona Góra, Gorzów → Lubusz") },
];

const LEVEL: Entry<GeoLevel>[] = [{ p: "wojewodz|region|voivod|provinc|nuts2", v: "voivodeship" }];

const CHARTS: Entry<ChartKind>[] = [
  { p: "mapa|mapie|mapy|mape|=map cieplna|ciepla|cieplnej|ciepl|heat", v: "heatmap" },
  { p: "heat =map|=mapa", v: "heatmap" },
  { p: "heatmap", v: "heatmap" },
  { p: "slupk|=bar poziom|horizont", v: "bars" },
  { p: "mapa|mapie|mapy|mape|mapk|mapach|=map|=maps|kartogram|choropl", v: "map" },
  { p: "rank|najwyzs|najnizs|highest|lowest|=top|zestawien", v: "bars" },
  { p: "=bar|=bars", v: "bars" },
  { p: "linia|linii|liniow|=line|trend|przebieg", v: "line" },
  { p: "slupk|kolumn|column", v: "columns" },
  { p: "rozrzut|scatter|korelac|correlat|zaleznos|relationship", v: "scatter" },
  { p: "hantl|dumbbell", v: "dumbbell" },
  { p: "nachyleni|slope", v: "slope" },
];

type Flag = "compare" | "dashboard" | "kpi" | "index" | "panels" | "explore";
const FLAGS: Entry<Flag>[] = [
  { p: "=vs|versus|porown|compar|=tle|against|wobec", v: "compare" },
  { p: "dashboard|pulpi|przeglad|overview|tablic", v: "dashboard" },
  { p: "=co =to", v: "kpi" },
  { p: "=what =is", v: "kpi" },
  { p: "definic|definit|metadan|strona wskaznik", v: "kpi" },
  { p: "indeks|=index|=indexed", v: "index" },
  { p: "osobn|panel|separate", v: "panels" },
  { p: "eksplorator|explorer", v: "explore" },
];

const GUIDE: Entry<string>[] = [
  { p: "jak|how =zbudowac|=budowac|=projektowac|=build|=design dashboard|pulpi", v: "pulpit" },
  { p: "dashboard|pulpi design|projekt|uklad", v: "pulpit" },
  { p: "kafel|kafelk", v: "pulpit" },
  { p: "=jak czyta", v: "wykresy" },
  { p: "=how =to =read", v: "wykresy" },
  { p: "czyta|read wykres|chart", v: "wykresy" },
  { p: "typy|rodzaj|=chart wykres|type", v: "wykresy" },
  { p: "bibliotek wykres", v: "wykresy" },
  { p: "wykres|=chart|=charts", v: "~wykresy" },
  { p: "kolor|colour|color|typograf|font|pismo|pisma|kontrast|contrast|token", v: "kolory-i-typografia" },
  { p: "marka|marki|marke|logo|brand|znak", v: "marka" },
  { p: "uklad|layout|responsyw|breakpoint|siatk", v: "uklad" },
  { p: "=menu|sidebar|nawigac|navigat", v: "menu" },
  { p: "komponent|component|przycisk|button", v: "komponenty" },
  { p: "jak pisac|pisze", v: "tresci" },
  { p: "=how =to =write", v: "tresci" },
  { p: "tytul|jednost|formatowan|writing|=liczby|=numbers", v: "tresci" },
  { p: "dostepn|accessib|=wcag|=a11y|czytnik|klawiatur|keyboard", v: "dostepnosc" },
  { p: "screen reader", v: "dostepnosc" },
  { p: "testy|testow|testing|=test", v: "tworzenie-i-testy" },
  { p: "definic ukoncz", v: "tworzenie-i-testy" },
  { p: "metodolog|methodolog|zrodl|=source|=sources|licencj|licenc|licens|skad", v: "metodologia" },
  { p: "przewodnik|=guide|zasady", v: "" },
  { p: "design system", v: "" },
];

/** Topic words for dashboards besides the domain and group names of the catalogue. */
const DOMAIN_WORDS: Entry<string>[] = [
  { p: "rynek|rynku pracy", v: "labour" },
  { p: "labour|labor market", v: "labour" },
  { p: "=praca|=pracy|=work", v: "labour" },
  { p: "finanse|finansach|finansow publiczn", v: "finance.public_finance" },
  { p: "public financ", v: "finance.public_finance" },
  { p: "local govern", v: "finance.local_government" },
  { p: "samorzad|=jst", v: "finance.local_government" },
  { p: "demograf", v: "population" },
  { p: "gospodar|ekonomi|economy", v: "economy" },
  { p: "edukac|oswiat|szkol|nauk|education", v: "education" },
  { p: "srodowisk|klimat|environment|climate|ekolog", v: "environment" },
  { p: "mieszkaln|housing|mieszkan", v: "housing" },
  { p: "panstw|administrac|government", v: "state" },
  { p: "spoleczen|society|kultur|culture", v: "society" },
  { p: "biznes|przemysl|business|industry|firm", v: "business" },
  { p: "transport|komunikac", v: "transport" },
  { p: "zdrow|health", v: "health" },
  { p: "finans|financ|bank", v: "finance" },
  { p: "ceny|cen|price", v: "economy.prices" },
];

const STOP = new Set(
  (
    "pokaz pokazac pokazcie mi prosze chce chcialbym chcialabym zobaczyc zobacz daj w we i oraz na o od do z ze dla jak sie jest sa " +
    "jaki jaka jakie ile czy to ten ta te tych po przez dane danych wskaznik wskaznika wskazniki stopa stopy poziom tempo zmiana " +
    "the of in on and me show see i want to for a an with by please data chart rate level my our is are how what which " +
    "rok roku lata lat years year give display pokazac wyswietl zrob narysuj widok view build make plot graph between"
  ).split(" "),
);

// --- matching ------------------------------------------------------------------------------------------------

type Compiled<T> = { els: string[][]; v: T };

function compile<T>(entries: Entry<T>[]): Compiled<T>[] {
  // Longer patterns first, so "inflacja bazowa" wins over "inflacja", "Dolny Śląsk" over "Śląsk".
  return entries.map((e) => ({ els: e.p.split(" ").map((x) => x.split("|")), v: e.v })).sort((x, y) => y.els.length - x.els.length);
}

function altMatch(word: string, alt: string): boolean {
  if (alt.startsWith("=")) return word === alt.slice(1);
  if (alt.length <= 3) return word === alt;
  return word.startsWith(alt);
}

type Hit<T> = { at: number; len: number; v: T };

/** Matches the lexicon against unused words, longest patterns first; marks the matched words as used. */
function scan<T>(words: string[], used: boolean[], lex: Compiled<T>[]): Hit<T>[] {
  const hits: Hit<T>[] = [];
  for (const e of lex) {
    const n = e.els.length;
    for (let i = 0; i + n <= words.length; i++) {
      let ok = true;
      for (let j = 0; j < n && ok; j++) ok = !used[i + j] && e.els[j]!.some((alt) => altMatch(words[i + j]!, alt));
      if (!ok) continue;
      for (let j = 0; j < n; j++) used[i + j] = true;
      hits.push({ at: i, len: n, v: e.v });
    }
  }
  return hits.sort((x, y) => x.at - y.at);
}

const LEX = {
  indicators: compile(INDICATORS),
  areas: compile(AREAS),
  level: compile(LEVEL),
  charts: compile(CHARTS),
  flags: compile(FLAGS),
  guide: compile(GUIDE),
  domains: compile(DOMAIN_WORDS),
};

/** Words of the text: normalised, with "2015–2020" read as "2015 do 2020" and "UE-27" as "ue27". */
export function words(text: string): string[] {
  const pre = text
    // Upper-case ISO codes (DE, CZ…) are areas; in lower case "de", "it" or "es" are ordinary words.
    .replace(/\b(PL|DE|CZ|SK|HU|LT|RO|FR|ES|IT)\b/g, (m) => ` zzgeo${m.toLowerCase()} `)
    .replace(/(\d{4})\s*[-–—]\s*(\d{4})/g, "$1 do $2")
    .replace(/\b(ue|eu)\s*-?\s*27\b/gi, "$127")
    .replace(/pm\s*2[.,]5/gi, "pm25")
    .replace(/(\d)\s*=\s*100/g, "$1 base100");
  return normalise(pre).split(" ").filter(Boolean);
}

/** Simple stem for words not in the lexicon: drops a Polish or English ending (at least 4 letters stay). */
function stem(w: string): string {
  return w.length <= 4 ? w : w.slice(0, Math.max(4, w.length - 3));
}

// --- period --------------------------------------------------------------------------------------------------

type PeriodWish = { time: TimeSel; kind: "from" | "range" | "to" | "year" | "last" | "all" };

const isYear = (w: string | undefined) => !!w && /^(19|20)\d\d$/.test(w);
const FROM = /^(od|since|from|after|po|poczawszy)$/;
const TO = /^(do|to|until|till|before|and|a|i)$/;
const LAST = /^(ostatni|ostatnie|ostatnich|ostatnia|ostatnim|last|past|recent|minione|minionych|poprzednie|poprzednich)$/;
const YEARS = /^(lat|lata|latach|years|year|rok|roku)$/;
const NUMS: Record<string, number> = { piec: 5, five: 5, dziesiec: 10, ten: 10, trzy: 3, three: 3, dwa: 2, two: 2 };

function scanPeriod(ws: string[], used: boolean[]): PeriodWish | null {
  const take = (...idx: number[]) => idx.forEach((i) => (used[i] = true));
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i]!;
    const n1 = ws[i + 1],
      n2 = ws[i + 2],
      n3 = ws[i + 3];
    if (/^(caly|calym|calego|wszystkie|all|full)$/.test(w) && n1 && /^(okres|okresie|lata|time|years|history|historia|dane)/.test(n1)) {
      take(i, i + 1);
      return { time: { last: 0 }, kind: "all" };
    }
    if (w === "od" && n1 && /^poczat/.test(n1)) {
      take(i, i + 1);
      return { time: { last: 0 }, kind: "all" };
    }
    if (LAST.test(w)) {
      if (n1 && /^(dekad|decade)/.test(n1)) {
        take(i, i + 1);
        return { time: { last: 10 }, kind: "last" };
      }
      const num = n1 ? (/^\d{1,2}$/.test(n1) ? Number(n1) : NUMS[n1]) : undefined;
      if (num && n2 && YEARS.test(n2)) {
        take(i, i + 1, i + 2);
        return { time: { last: num }, kind: "last" };
      }
      if (n1 && /^(rok|roku|year|12)$/.test(n1)) {
        take(i, i + 1);
        if (n1 === "12" && n2 && /^(miesi|month)/.test(n2)) take(i + 2);
        return { time: { last: 1 }, kind: "last" };
      }
    }
    if (FROM.test(w) && isYear(n1)) {
      if (n2 && TO.test(n2) && isYear(n3)) {
        take(i, i + 1, i + 2, i + 3);
        return { time: { from: Number(n1), to: Number(n3) }, kind: "range" };
      }
      take(i, i + 1);
      return { time: { from: Number(n1), to: 9999 }, kind: "from" };
    }
    if (/^(between|miedzy|pomiedzy|latach|years)$/.test(w) && isYear(n1) && n2 && TO.test(n2) && isYear(n3)) {
      take(i, i + 1, i + 2, i + 3);
      return { time: { from: Number(n1), to: Number(n3) }, kind: "range" };
    }
    if (isYear(w)) {
      if (n1 && TO.test(n1) && isYear(n2)) {
        take(i, i + 1, i + 2);
        return { time: { from: Number(w), to: Number(n2) }, kind: "range" };
      }
      if (i > 0 && /^(do|until|till|before|to)$/.test(ws[i - 1]!)) {
        take(i - 1, i);
        return { time: { from: 1900, to: Number(w) }, kind: "to" };
      }
      take(i);
      if (i > 0 && /^(w|in|rok|roku|za)$/.test(ws[i - 1]!)) take(i - 1);
      return { time: { from: Number(w), to: Number(w) }, kind: "year" };
    }
  }
  return null;
}

// --- the parse -----------------------------------------------------------------------------------------------

type Parsed = {
  words: string[];
  concepts: Concept[];
  areas: AreaVal[];
  level: GeoLevel | null;
  chart: ChartKind | null;
  flags: Set<Flag>;
  period: PeriodWish | null;
  guide: string[];
  domains: string[];
  /** Words nothing understood (stop words removed). */
  rest: string[];
};

function parse(text: string): Parsed {
  const ws = words(text);
  const used = ws.map(() => false);
  // Order matters: periods first (years and "ostatnie 5 lat"), then indicators (multi-word topics such as
  // "ceny mieszkań" before "mieszkania"), areas, level, chart wishes, guide topics and flags.
  const period = scanPeriod(ws, used);
  const concepts = scan(ws, used, LEX.indicators).map((h) => h.v);
  const areas = scan(ws, used, LEX.areas).map((h) => h.v);
  const level = scan(ws, used, LEX.level)[0]?.v ?? null;
  const charts = scan(ws, used, LEX.charts);
  // Guide topics and dashboard words are read on their own copy: "wykres" is both a chart word and a guide topic.
  const guideUsed = [...used];
  const guide = scan(ws, guideUsed, LEX.guide).map((h) => h.v);
  const flags = new Set(scan(ws, used, LEX.flags).map((h) => h.v));
  const domainUsed = [...used];
  const domains = scan(ws, domainUsed, LEX.domains).map((h) => h.v);
  const rest = ws.filter((w, i) => !used[i] && !STOP.has(w) && !/^\d+$/.test(w) && w !== "base100");
  return { words: ws, concepts, areas, level, chart: charts[0]?.v ?? null, flags, period, guide, domains, rest };
}

// --- helpers -------------------------------------------------------------------------------------------------

const pick = (lang: Lang, pl: string, en: string) => (lang === "pl" ? pl : en);
const nameOf = (x: { name_pl: string; name_en: string }, lang: Lang) => (lang === "pl" ? x.name_pl : x.name_en);

const CHART_NAMES: Record<ChartKind, [string, string]> = {
  line: ["linia", "line"],
  columns: ["słupki w czasie", "columns"],
  bars: ["ranking", "ranked bars"],
  dumbbell: ["zmiana (hantle)", "change (dumbbell)"],
  slope: ["nachylenie", "slope"],
  heatmap: ["mapa cieplna", "heatmap"],
  map: ["mapa kafelkowa", "tile map"],
  scatter: ["rozrzut", "scatter"],
};
const chartName = (ch: ChartKind, lang: Lang) => CHART_NAMES[ch][lang === "pl" ? 0 : 1];

const CMP_NAMES: Record<Compare, [string, string]> = {
  same: ["wspólna oś", "shared axis"],
  index: ["indeks", "index"],
  panels: ["osobne panele", "separate panels"],
};

function kpiByKey(cat: Catalog, key: string): Kpi | undefined {
  return cat.kpis.find((k) => k.kpi_key === key);
}

/** Dashboard page of a KPI's group (/d/<domain>/<page>), or the domain overview when the domain has no such page. */
export function dashboardUrl(cat: Catalog, domainOrGroup: string): string | null {
  const [domain, group] = domainOrGroup.split(".");
  if (!domain || !cat.domains.some((d) => d.domain_key === domain)) return null;
  const dash = dashboardFor(domain);
  if (!dash) return null;
  if (!group) return `/d/${domain}`;
  const pg = dash.pages.find((p) => p.group_key === domainOrGroup);
  return pg ? `/d/${domain}/${pg.id}` : `/d/${domain}`;
}

function dashboardTitle(cat: Catalog, key: string, lang: Lang): string {
  const [domain] = key.split(".");
  const dom = cat.domains.find((d) => d.domain_key === domain);
  const grp = key.includes(".") ? cat.domains.find((d) => d.domain_key === key) : undefined;
  const parts = [dom ? nameOf(dom, lang) : domain, grp ? nameOf(grp, lang) : null].filter(Boolean);
  return `${pick(lang, "Dashboard", "Dashboard")}: ${parts.join(" · ")}`;
}

/** Best domain or group for the words: catalogue names (stemmed) and the topic word table. */
function matchDomain(cat: Catalog, p: Parsed): { key: string; score: number } | null {
  const scores = new Map<string, number>();
  const add = (k: string, s: number) => scores.set(k, Math.max(scores.get(k) ?? 0, s));
  const content = p.words.filter((w) => !STOP.has(w) && w.length >= 3);
  for (const d of cat.domains) {
    if (d.level !== "domain" && d.level !== "group") continue;
    const names = [d.name_pl, d.name_en].map((n) =>
      normalise(n)
        .split(" ")
        .filter((w) => w.length >= 4 && !STOP.has(w)),
    );
    for (const ns of names) {
      if (!ns.length) continue;
      const hit = ns.filter((n) => content.some((w) => w.startsWith(stem(n)) || n.startsWith(stem(w)))).length;
      if (hit) add(d.domain_key, hit * 10 + (hit / ns.length) * 5 - (d.level === "group" ? 0.5 : 0));
    }
  }
  p.domains.forEach((k, i) => add(k, 14 - i * 0.1));
  let best: { key: string; score: number } | null = null;
  for (const [key, score] of scores) if (!best || score > best.score) best = { key, score };
  return best;
}

/** Indicators whose names share stems with the words nothing else understood (catalogue fallback). */
function fuzzyKpis(cat: Catalog, rest: string[]): { k: Kpi; hit: number }[] {
  const ws = rest.filter((w) => w.length >= 3);
  if (!ws.length) return [];
  return cat.kpis
    .map((k) => {
      const names = normalise(`${k.name_pl} ${k.name_en} ${k.kpi_key.replace(/_/g, " ")}`)
        .split(" ")
        .filter((w) => w.length >= 3);
      const hit = ws.filter((w) => names.some((n) => n.startsWith(stem(w)) || (n.length >= 5 && w.startsWith(stem(n))))).length;
      return { k, hit, len: names.length };
    })
    .filter((x) => x.hit > 0 && x.hit / ws.length >= 0.5)
    .sort((x, y) => y.hit - x.hit || x.len - y.len);
}

/** Validates a proposal URL with the parsers the pages use (for this parser's tests and for an LLM backend). */
export function proposalUrlOk(url: string, cat: Catalog): boolean {
  let u: URL;
  try {
    u = new URL(url, "https://bi.zohelo.com");
  } catch {
    return false;
  }
  if (u.origin !== "https://bi.zohelo.com") return false;
  const page = tplPageFor(u.pathname);
  switch (page.kind) {
    case "explore": {
      const q = parseExplore(u.search, cat);
      return q.i.length > 0 && serialiseExplore(q) === u.search;
    }
    case "kpi":
      return !!kpiByKey(cat, page.key);
    case "domain": {
      const dash = dashboardFor(page.domain);
      return !!dash && (page.page === null || dash.pages.some((p) => p.id === page.page));
    }
    case "guide":
      return page.section === null || !!findSection(page.section);
    case "catalogue":
      return true;
    default:
      return false;
  }
}

function areaNames(cat: Catalog, q: Query, lang: Lang, allVoiv: boolean): string {
  const g = new Map(cat.geographies.map((x) => [x.key, x]));
  if (q.chart === "map" || allVoiv) return pick(lang, "województwa", "voivodeships");
  const names = q.geo.map((k) => (g.get(k) ? nameOf(g.get(k)!, lang) : k));
  return names.length > 5 ? `${names.slice(0, 4).join(", ")} +${names.length - 4}` : names.join(", ");
}

function periodPhrase(q: Query, wish: PeriodWish | null, lang: Lang): string {
  const t = q.time;
  if ("last" in t)
    return t.last === 0 ? pick(lang, "cały okres", "all years") : pick(lang, `ostatnie ${t.last} lat`, `last ${t.last} years`);
  if (t.from === t.to) return String(t.from);
  if (wish?.kind === "from") return pick(lang, `od ${t.from}`, `since ${t.from}`);
  if (wish?.kind === "last") {
    const n = t.to - t.from + 1;
    return pick(lang, `ostatnie ${n} ${n < 5 ? "lata" : "lat"}`, `last ${n} years`);
  }
  return `${t.from}–${t.to}`;
}

// --- building the proposal -----------------------------------------------------------------------------------

/** Turns a text request into a proposal. Deterministic; never throws; every URL passes `proposalUrlOk`. */
export function buildView(text: string, cat: Catalog, lang: Lang): ViewProposal {
  const p = parse(text.slice(0, 300));
  const explain: string[] = [];
  /** Adjustments to the request (lower the confidence) and plain information (cities read as voivodeships). */
  const notes: string[] = [];
  const infos: string[] = [];

  // Areas asked for (EU countries expand per indicator later).
  const named: string[] = [];
  let euAll = false;
  for (const ar of p.areas) {
    for (const g of ar.geo)
      if (g === "*EU") euAll = true;
      else if (!named.includes(g)) named.push(g);
    if (ar.note) infos.push(pick(lang, ar.note.pl, ar.note.en));
  }
  const geoLevel = new Map(cat.geographies.map((g) => [g.key, g.level]));
  const namedVoiv = named.filter((g) => geoLevel.get(g) === "voivodeship");
  const namedForeign = named.filter((g) => g !== "PL" && geoLevel.get(g) === "country");
  const wantVoiv = p.level === "voivodeship" || namedVoiv.length > 0 || (p.chart === "map" && !namedForeign.length && !euAll);

  // Indicators: each concept picks the first candidate with the requested scope.
  // A broad concept ("inflacja") yields to a specific one among its candidates ("HICP") in the same request.
  const keys: string[] = [];
  const specific = p.concepts.filter((x) => x.keys.length === 1).map((x) => x.keys[0]!);
  for (const con of p.concepts) {
    if (con.keys.length > 1 && con.keys.some((k) => specific.includes(k))) continue;
    const order = (namedForeign.length || euAll) && con.foreign ? con.foreign : con.keys;
    const cands = order.map((k) => kpiByKey(cat, k)).filter((k): k is Kpi => !!k);
    const fit =
      cands.find((k) => (wantVoiv ? hasVoivodeships(k) : true) && namedForeign.every((g) => k.geographies.includes(g))) ?? cands[0];
    if (fit && !keys.includes(fit.kpi_key)) keys.push(fit.kpi_key);
  }
  const domain = matchDomain(cat, p);
  const dashboardWanted = p.flags.has("dashboard");
  const strongGuide = p.guide.some((g) => !g.startsWith("~"));

  // 1. Dashboards asked for: "dashboard o finansach publicznych", "dashboard o inflacji".
  if (dashboardWanted) {
    const target = domain?.key ?? (keys.length ? kpiByKey(cat, keys[0]!)!.group_key : null);
    const out = target ? dashboardProposal(cat, lang, target, keys, true) : null;
    if (out) return out;
  }

  // 2.–4. No indicator in the synonym table: a guide topic, a catalogue name match or a dashboard topic.
  let fuzzyRest: Kpi[] = [];
  let fuzzy = false;
  if (!keys.length) {
    const fz = fuzzyKpis(cat, p.rest);
    if (strongGuide) return guideProposal(lang, p.guide);
    const strongFuzzy = !!fz[0] && fz[0].hit >= 2;
    if (!strongFuzzy && p.domains.length && domain) {
      const out = dashboardProposal(cat, lang, domain.key, keys, false);
      if (out) return out;
    }
    if (!fz.length && p.guide.length) return guideProposal(lang, p.guide);
    fuzzyRest = fz.map((x) => x.k);
    if (fuzzyRest[0]) {
      keys.push(fuzzyRest[0].kpi_key);
      fuzzy = true;
    }
  }

  // Nothing recognised: explain what was understood and offer ways on.
  if (!keys.length) return nothing(cat, lang, p, named, infos);

  // 5. One indicator and nothing else asked for: its indicator page.
  const onlyPoland = named.length === 0 || (named.length === 1 && named[0] === "PL");
  const plain = !p.period && !p.chart && !p.level && !euAll && onlyPoland && !p.flags.has("compare") && !p.flags.has("explore");
  if (keys.length === 1 && (plain || p.flags.has("kpi")) && !p.flags.has("explore")) {
    const k = kpiByKey(cat, keys[0]!)!;
    explain.push(`${pick(lang, "Wskaźnik", "Indicator")}: ${nameOf(k, lang)}`);
    if (fuzzy) explain.push(pick(lang, "Dopasowano po nazwie w katalogu", "Matched by catalogue name"));
    const alts = [
      { label: pick(lang, "Otwórz w eksploratorze", "Open in the explorer"), url: exploreLink(k, cat) },
      ...dashAlt(cat, k, lang),
      ...fuzzyRest
        .slice(1, 3)
        .map((x) => ({ label: `${pick(lang, "Wskaźnik", "Indicator")}: ${nameOf(x, lang)}`, url: `/kpi/${x.kpi_key}` })),
    ];
    return {
      kind: "kpi",
      url: `/kpi/${k.kpi_key}`,
      title: `${pick(lang, "Strona wskaźnika", "Indicator page")}: ${nameOf(k, lang)}`,
      explanation: explain,
      alternatives: dedupe(alts, `/kpi/${k.kpi_key}`),
      confidence: fuzzy ? "medium" : "high",
    };
  }

  // 6. A Data explorer view.
  const kpis = keys.map((k) => kpiByKey(cat, k)!).slice(0, 3);
  if (keys.length > 3) notes.push(pick(lang, "Pokazano pierwsze 3 wskaźniki", "Showing the first 3 indicators"));
  let chart: ChartKind | undefined = p.chart ?? undefined;
  const allVoivOk = kpis.every(hasVoivodeships);
  let level: GeoLevel = "country";
  if (wantVoiv || chart === "map") {
    if (allVoivOk) level = "voivodeship";
    else {
      notes.push(pick(lang, "Brak danych dla województw: pokazano kraje", "No voivodeship data: showing countries"));
      if (chart === "map") chart = undefined;
    }
  }
  const voivKeys = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);
  const common = (keysAt: GeoLevel) => {
    const lv = new Map(cat.geographies.map((g) => [g.key, g.level]));
    return kpis[0]!.geographies.filter((g) => (g === "PL" || lv.get(g) === keysAt) && kpis.every((k) => k.geographies.includes(g)));
  };
  let geo: string[] = [];
  let allVoiv = false;
  if (level === "voivodeship") {
    const asked = named.filter((g) => g === "PL" || geoLevel.get(g) === "voivodeship");
    if (namedVoiv.length) geo = asked;
    else {
      geo = voivKeys.filter((g) => common("voivodeship").includes(g));
      allVoiv = true;
    }
    if (!chart && allVoiv) chart = kpis.length >= 2 ? "scatter" : "map";
  } else {
    const avail = common("country");
    if (euAll) geo = ["PL", ...avail.filter((g) => g !== "PL" && g !== "EU27")];
    for (const g of named) if (!geo.includes(g) && geoLevel.get(g) === "country") geo.push(g);
    const missing = geo.filter((g) => !avail.includes(g));
    if (missing.length) {
      const nm = missing.map((g) => {
        const x = cat.geographies.find((y) => y.key === g);
        return x ? nameOf(x, lang) : g;
      });
      notes.push(pick(lang, `Brak danych: ${nm.join(", ")}`, `No data: ${nm.join(", ")}`));
      geo = geo.filter((g) => avail.includes(g));
    }
    if (p.flags.has("compare") && geo.length && !geo.includes("PL") && avail.includes("PL")) geo.unshift("PL");
    if (geo.includes("PL")) geo = ["PL", ...geo.filter((g) => g !== "PL")];
    // A ranking or a scatter needs several areas: take every country with data.
    if (chart === "bars" && geo.length < 2 && kpis.length === 1) geo = avail;
    if (chart === "scatter" && geo.length < 3) geo = avail;
  }

  // Period: a rolling window when it is one of the explorer's (1, 5, 10 years, all), else fixed years.
  let time: TimeSel = { last: 10 };
  if (p.period) {
    const t = p.period.time;
    if ("last" in t && !LAST_YEARS.includes(t.last)) {
      const span = shapeOf({ i: keys, geo, members: {}, time: { last: 0 } }, cat).span;
      time = { from: span[1] - t.last + 1, to: span[1] };
    } else time = t;
  }

  let cmp: Compare | undefined;
  if (p.flags.has("index")) cmp = "index";
  else if (p.flags.has("panels")) cmp = "panels";

  const q = normaliseQuery({ ...emptyQuery(), i: kpis.map((k) => k.kpi_key), level, geo, time, chart, cmp }, cat);
  const search = serialiseExplore(q);
  const url = `/explore${search}`;
  const shape = shapeOf(q, cat);

  // Explanation from the normalised view (what the link really shows).
  const kn = q.i.map((k) => nameOf(kpiByKey(cat, k)!, lang));
  explain.push(`${kn.length > 1 ? pick(lang, "Wskaźniki", "Indicators") : pick(lang, "Wskaźnik", "Indicator")}: ${kn.join(", ")}`);
  explain.push(`${pick(lang, "Obszary", "Areas")}: ${areaNames(cat, q, lang, allVoiv)}`);
  const period = periodPhrase(q, p.period, lang);
  explain.push(`${pick(lang, "Okres", "Period")}: ${period}`);
  explain.push(`${pick(lang, "Wykres", "Chart")}: ${chartName(q.chart, lang)}`);
  if (q.i.length > 1 && q.chart !== "scatter")
    explain.push(`${pick(lang, "Porównanie", "Comparison")}: ${CMP_NAMES[q.cmp][lang === "pl" ? 0 : 1]}`);
  if (p.chart && q.chart !== p.chart)
    notes.push(
      pick(
        lang,
        `Wykres „${chartName(p.chart, lang)}” nie pasuje do wyboru`,
        `The ${chartName(p.chart, lang)} chart does not fit this selection`,
      ),
    );
  if (p.period && !("last" in p.period.time)) {
    const want = p.period.time;
    const [a0, a1] = shape.span;
    if ((want.from !== 1900 && want.from < a0) || (want.to !== 9999 && want.to > a1))
      notes.push(pick(lang, `Dane dostępne ${a0}–${a1}`, `Data available ${a0}–${a1}`));
  }
  if (fuzzy) notes.push(pick(lang, "Wskaźnik dopasowany po nazwie w katalogu", "Indicator matched by catalogue name"));
  explain.push(...infos, ...notes);

  const title = `${kn.join(pick(lang, " i ", " and "))} · ${areaNames(cat, q, lang, allVoiv)} · ${period}`;

  // Alternatives: the indicator page, its dashboard page, the other measure (CPI or HICP), other catalogue matches.
  const first = kpiByKey(cat, q.i[0]!)!;
  const alts: { label: string; url: string }[] = [
    { label: `${pick(lang, "Strona wskaźnika", "Indicator page")}: ${nameOf(first, lang)}`, url: `/kpi/${first.kpi_key}` },
    ...dashAlt(cat, first, lang),
  ];
  for (const con of p.concepts.filter((x) => x.foreign)) {
    for (const other of con.keys) {
      if (q.i.includes(other) || alts.length >= 4) continue;
      const ok = kpiByKey(cat, other);
      if (!ok) continue;
      const alt = normaliseQuery({ ...q, i: q.i.map((k) => (con.keys.includes(k) ? other : k)), chart: undefined, cmp: undefined }, cat);
      alts.push({ label: `${pick(lang, "Zamiast tego", "Instead")}: ${nameOf(ok, lang)}`, url: `/explore${serialiseExplore(alt)}` });
    }
  }
  for (const x of fuzzyRest.slice(1, 3))
    alts.push({ label: `${pick(lang, "Wskaźnik", "Indicator")}: ${nameOf(x, lang)}`, url: `/kpi/${x.kpi_key}` });

  return {
    kind: "explore",
    url,
    title,
    explanation: explain,
    alternatives: dedupe(alts, url),
    confidence: fuzzy || notes.length ? "medium" : "high",
  };
}

function dashboardProposal(cat: Catalog, lang: Lang, target: string, keys: string[], asked: boolean): ViewProposal | null {
  const url = dashboardUrl(cat, target);
  if (!url) return null;
  const dom = cat.domains.find((d) => d.domain_key === target);
  const explain = [`${pick(lang, "Temat", "Topic")}: ${dom ? nameOf(dom, lang) : target}`];
  if (!asked) explain.push(pick(lang, "Rozpoznano temat dashboardu", "Recognised a dashboard topic"));
  const alts: { label: string; url: string }[] = [];
  const domainOnly = target.split(".")[0]!;
  if (target.includes(".")) {
    const top = dashboardUrl(cat, domainOnly);
    if (top) alts.push({ label: dashboardTitle(cat, domainOnly, lang), url: top });
  } else {
    for (const pg of dashboardFor(domainOnly)?.pages.slice(0, 2) ?? [])
      alts.push({ label: dashboardTitle(cat, pg.group_key, lang), url: `/d/${domainOnly}/${pg.id}` });
  }
  for (const k of keys.slice(0, 1)) {
    const kk = kpiByKey(cat, k)!;
    alts.push({ label: `${pick(lang, "Wskaźnik", "Indicator")}: ${nameOf(kk, lang)}`, url: `/kpi/${k}` });
  }
  return {
    kind: "dashboard",
    url,
    title: dashboardTitle(cat, target, lang),
    explanation: explain,
    alternatives: dedupe(alts, url),
    confidence: asked ? "high" : "medium",
  };
}

function guideName(slug: string, lang: Lang): string {
  const x = findSection(slug || null);
  return `${pick(lang, "Przewodnik", "Guide")}: ${x ? (lang === "pl" ? x.pl : x.en) : pick(lang, "spis treści", "contents")}`;
}

function guideProposal(lang: Lang, found: string[]): ViewProposal {
  // A weak match ("wykres" alone) loses to a specific topic; "" is the guide's index.
  const slugs = [...new Set(found.map((g) => g.replace(/^~/, "")))];
  const strong = found.filter((g) => !g.startsWith("~") && g !== "");
  const main = strong[0] ?? slugs.find((s) => s !== "") ?? "";
  const url = main ? `/przewodnik/${main}` : "/przewodnik";
  const alts = slugs.filter((s) => s !== main).map((s) => ({ label: guideName(s, lang), url: s ? `/przewodnik/${s}` : "/przewodnik" }));
  if (main) alts.push({ label: guideName("", lang), url: "/przewodnik" });
  return {
    kind: "guide",
    url,
    title: guideName(main, lang),
    explanation: [guideName(main, lang)],
    alternatives: dedupe(alts, url),
    confidence: strong.length ? "high" : "medium",
  };
}

function dashAlt(cat: Catalog, k: Kpi, lang: Lang): { label: string; url: string }[] {
  const url = dashboardUrl(cat, k.group_key);
  return url ? [{ label: dashboardTitle(cat, k.group_key, lang), url }] : [];
}

function dedupe(alts: { label: string; url: string }[], main: string): { label: string; url: string }[] {
  const seen = new Set([main]);
  const out: { label: string; url: string }[] = [];
  for (const x of alts) {
    if (seen.has(x.url)) continue;
    seen.add(x.url);
    out.push(x);
    if (out.length === 3) break;
  }
  return out;
}

/** Popular indicators offered when only an area (or nothing) was recognised. */
const STARTERS_VOIV = ["unemployment_lfs", "avg_wage", "population_total"];
const STARTERS_COUNTRY = ["hicp_annual_rate", "gdp_real_growth", "unemployment_lfs"];

function nothing(cat: Catalog, lang: Lang, p: Parsed, named: string[], notes: string[]): ViewProposal {
  const explain: string[] = [];
  const g = new Map(cat.geographies.map((x) => [x.key, x]));
  if (named.length)
    explain.push(`${pick(lang, "Obszary", "Areas")}: ${named.map((k) => (g.get(k) ? nameOf(g.get(k)!, lang) : k)).join(", ")}`);
  explain.push(...notes);
  explain.push(pick(lang, "Nie rozpoznano wskaźnika ani tematu", "No indicator or topic recognised"));
  const voiv = named.some((k) => g.get(k)?.level === "voivodeship") || p.level === "voivodeship";
  const alts: { label: string; url: string }[] = [];
  for (const key of voiv ? STARTERS_VOIV : STARTERS_COUNTRY) {
    const k = kpiByKey(cat, key);
    if (!k) continue;
    const geo = named.filter((x) => k.geographies.includes(x));
    const q = normaliseQuery(
      { ...emptyQuery(), i: [key], level: voiv && hasVoivodeships(k) ? "voivodeship" : "country", geo, chart: undefined, cmp: undefined },
      cat,
    );
    alts.push({ label: nameOf(k, lang), url: `/explore${serialiseExplore(q)}` });
  }
  const term = [...p.rest].sort((x, y) => y.length - x.length)[0];
  const url = term ? `/catalogue?q=${encodeURIComponent(term)}` : "/catalogue";
  return {
    kind: "none",
    url,
    title: pick(lang, "Nie udało się dopasować widoku", "No view matched"),
    explanation: explain,
    alternatives: dedupe(alts, url),
    confidence: "low",
  };
}

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

/** Guide section slugs (re-exported for the tests and for an LLM backend's tool definitions). */
export const GUIDE_SLUGS = GUIDE_SECTIONS.map((s) => s.slug);
