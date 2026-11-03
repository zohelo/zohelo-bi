import { describe, expect, it } from "vitest";
import { dummy } from "../../data/dummy";
import type { Lang } from "../../i18n";
import { parseExplore, serialiseExplore, type Query } from "../explore/exploreState";
import { buildView, proposalUrlOk, words, EXAMPLE_PROMPTS, type ViewProposal } from "./intent";

const cat = await dummy.catalog();
const VOIV = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);

/** Builds the view and checks the contract every proposal must keep. */
function view(text: string, lang: Lang = "pl"): ViewProposal {
  const v = buildView(text, cat, lang);
  expect(proposalUrlOk(v.url, cat), `${text}: ${v.url}`).toBe(true);
  for (const a of v.alternatives) expect(proposalUrlOk(a.url, cat), `${text}: alternative ${a.url}`).toBe(true);
  expect(v.alternatives.length).toBeLessThanOrEqual(3);
  expect(v.alternatives.map((a) => a.url)).not.toContain(v.url);
  expect(v.title.length).toBeGreaterThan(0);
  expect(v.explanation.length).toBeGreaterThan(0);
  return v;
}

/** The explorer state a proposal opens: the URL parses back to itself. */
function state(v: ViewProposal): Query {
  expect(v.kind).toBe("explore");
  const search = v.url.slice("/explore".length);
  const q = parseExplore(search, cat);
  expect(serialiseExplore(q)).toBe(search);
  return q;
}

describe("AI view builder: explorer views", () => {
  it("inflation in Poland and Germany since 2015 → HICP (comparable across the EU), line, from 2015", () => {
    const v = view("inflacja w Polsce i Niemczech od 2015");
    const q = state(v);
    expect(q).toMatchObject({ i: ["hicp_annual_rate"], level: "country", geo: ["PL", "DE"], chart: "line" });
    expect(q.time).toMatchObject({ from: 2015 });
    expect(v.explanation).toEqual(["Wskaźnik: Inflacja HICP, r/r", "Obszary: Polska, Niemcy", "Okres: od 2015", "Wykres: linia"]);
    expect(v.confidence).toBe("high");
    expect(v.alternatives.some((a) => a.url.includes("i=cpi_annual_rate"))).toBe(true);
  });

  it("unemployment in the voivodeships on a map → every voivodeship, tile map", () => {
    const q = state(view("bezrobocie w województwach na mapie"));
    expect(q).toMatchObject({ i: ["unemployment_lfs"], level: "voivodeship", chart: "map" });
    expect(q.geo).toEqual(VOIV);
  });

  it("GDP growth vs EU (English) → Poland added for the comparison", () => {
    const v = view("show me GDP growth vs EU", "en");
    expect(state(v)).toMatchObject({ i: ["gdp_real_growth"], geo: ["PL", "EU27"], chart: "line", time: { last: 10 } });
    expect(v.title).toBe("GDP, real growth y/y · Poland, EU-27 · last 10 years");
    expect(v.explanation).toContain("Chart: line");
  });

  it('wages and inflation ("a") → two indicators in separate panels (different units)', () => {
    const q = state(view("płace a inflacja"));
    expect(q.i).toEqual(["avg_wage", "cpi_annual_rate"]);
    expect(q.cmp).toBe("panels");
  });

  it("inflects voivodeship names and reads a year range with an en dash", () => {
    const v = view("stopa bezrobocia na Mazowszu i Śląsku w latach 2015–2020");
    expect(state(v)).toMatchObject({ level: "voivodeship", geo: ["PL14", "PL24"], time: { from: 2015, to: 2020 } });
    expect(v.explanation).toContain("Okres: 2015–2020");
  });

  it('countries in the locative (Czechach, Węgrzech, Unii) and "ostatnie 5 lat"', () => {
    const q = state(view("PKB w Czechach, na Węgrzech i w Unii ostatnie 5 lat"));
    expect(q).toMatchObject({ i: ["gdp_real_growth"], geo: ["CZ", "HU", "EU27"], time: { last: 5 } });
  });

  it("a ranking of voivodeships in one year → ranked bars", () => {
    const v = view("ranking województw wynagrodzenia w 2024");
    expect(state(v)).toMatchObject({ i: ["avg_wage"], level: "voivodeship", chart: "bars", time: { from: 2024, to: 2024 } });
    expect(v.explanation).toContain("Wykres: ranking");
  });

  it("a ranking of countries takes every country with data", () => {
    const q = state(view("ranking inflacji HICP w 2023"));
    expect(q.chart).toBe("bars");
    expect(q.geo.length).toBeGreaterThan(5);
  });

  it('"last 3 years" is not an explorer window: becomes fixed years', () => {
    const q = state(view("unemployment in voivodeships last 3 years", "en"));
    expect(q.time).toEqual({ from: 2024, to: 2026 });
  });

  it("cities stand for their voivodeship and say so", () => {
    const v = view("wynagrodzenia w Warszawie");
    expect(state(v)).toMatchObject({ level: "voivodeship", geo: ["PL14"] });
    expect(v.explanation).toContain("Warszawa → mazowieckie");
  });

  it('"na tle UE" compares Poland with the EU', () => {
    expect(state(view("dług publiczny na tle UE"))).toMatchObject({ i: ["gg_debt_gdp"], geo: ["PL", "EU27"] });
  });

  it("multi-word topics win over their parts (ceny mieszkań ≠ mieszkania)", () => {
    expect(state(view("ceny mieszkań w województwie małopolskim"))).toMatchObject({ i: ["price_m2_secondary"], geo: ["PL12"] });
  });

  it("kujawsko-pomorskie is one voivodeship, not Pomerania", () => {
    expect(state(view("inflacja w kujawsko-pomorskim")).geo).toEqual(["PL04"]);
  });

  it("two indicators across the voivodeships → scatter", () => {
    const q = state(view("płace a bezrobocie w regionach"));
    expect(q).toMatchObject({ i: ["avg_wage", "unemployment_lfs"], chart: "scatter", level: "voivodeship" });
  });

  it("upper-case country codes and a start year before the data (noted, medium confidence)", () => {
    const v = view("inflation in DE, CZ and FR since 2005", "en");
    expect(state(v)).toMatchObject({ geo: ["DE", "CZ", "FR"], time: { from: 2010 } });
    expect(v.explanation).toContain("Data available 2010–2026");
    expect(v.confidence).toBe("medium");
  });

  it('"kraje UE" expands to every EU country with data', () => {
    const q = state(view("kraje UE dług"));
    expect(q.geo[0]).toBe("PL");
    expect(q.geo).toEqual(expect.arrayContaining(["DE", "CZ", "FR", "IT"]));
  });

  it("a map for an indicator without voivodeship data falls back and says so", () => {
    const v = view("inflacja HICP na mapie");
    expect(state(v).level).toBe("country");
    expect(v.explanation.some((e) => e.startsWith("Brak danych dla województw"))).toBe(true);
    expect(v.confidence).toBe("medium");
  });

  it("the euro exchange rate is not Europe (kurs euro ≠ UE)", () => {
    expect(state(view("kurs euro od 2020"))).toMatchObject({ i: ["eurpln"], geo: ["PL"], time: { from: 2020 } });
  });
});

describe("AI view builder: existing content", () => {
  it("an indicator alone → its indicator page", () => {
    const v = view("inflacja");
    expect(v).toMatchObject({ kind: "kpi", url: "/kpi/cpi_annual_rate", confidence: "high" });
    expect(v.alternatives.some((a) => a.url.startsWith("/explore?"))).toBe(true);
    expect(view("Unemployment rate", "en").url).toBe("/kpi/unemployment_lfs");
  });

  it('"co to jest HICP" → the HICP page', () => {
    expect(view("co to jest HICP")).toMatchObject({ kind: "kpi", url: "/kpi/hicp_annual_rate" });
  });

  it("catalogue names the synonym table does not know (szkoły podstawowe)", () => {
    expect(view("szkoły podstawowe")).toMatchObject({ kind: "kpi", url: "/kpi/schools_count", confidence: "medium" });
  });

  it("dashboard about public finance → the domain page of that group", () => {
    const v = view("dashboard o finansach publicznych");
    expect(v).toMatchObject({ kind: "dashboard", url: "/d/finance/public_finance", confidence: "high" });
    expect(v.alternatives).toContainEqual({ label: "Dashboard: Finanse", url: "/d/finance" });
    expect(view("public finance dashboard", "en").url).toBe("/d/finance/public_finance");
  });

  it("dashboard about an indicator → the dashboard page of its group", () => {
    expect(view("dashboard o inflacji").url).toBe("/d/economy/prices");
  });

  it("a topic word alone → that domain's dashboard (medium confidence)", () => {
    expect(view("zdrowie")).toMatchObject({ kind: "dashboard", url: "/d/health", confidence: "medium" });
    expect(view("finanse publiczne").url).toBe("/d/finance/public_finance");
  });

  it("guide topics → guide sections", () => {
    expect(view("jak czytać wykres")).toMatchObject({ kind: "guide", url: "/przewodnik/wykresy", confidence: "high" });
    expect(view("kolory").url).toBe("/przewodnik/kolory-i-typografia");
    expect(view("dostępność").url).toBe("/przewodnik/dostepnosc");
    expect(view("accessibility and keyboard", "en").url).toBe("/przewodnik/dostepnosc");
    expect(view("jak zbudować dashboard").url).toBe("/przewodnik/pulpit");
    expect(view("przewodnik").url).toBe("/przewodnik");
  });
});

describe("AI view builder: unknown input", () => {
  it("nonsense → kind none, catalogue link and popular views", () => {
    const v = view("asdf qwerty");
    expect(v).toMatchObject({ kind: "none", confidence: "low", title: "Nie udało się dopasować widoku" });
    expect(v.url.startsWith("/catalogue")).toBe(true);
    expect(v.alternatives).toHaveLength(3);
  });

  it("an area without an indicator → views of popular indicators for that area", () => {
    const v = view("Mazowsze");
    expect(v.kind).toBe("none");
    expect(v.explanation[0]).toBe("Obszary: mazowieckie");
    for (const a of v.alternatives) expect(parseExplore(a.url.slice("/explore".length), cat).geo).toEqual(["PL14"]);
  });

  it("empty text and English UI", () => {
    const v = view("", "en");
    expect(v).toMatchObject({ kind: "none", title: "No view matched", url: "/catalogue" });
  });
});

describe("AI view builder: parsing details", () => {
  it("normalises accents, dashes and EU-27", () => {
    expect(words("Łódź, UE-27, 2015–2020")).toEqual(["lodz", "ue27", "2015", "do", "2020"]);
  });

  it("every example prompt builds a valid view", () => {
    for (const lang of ["pl", "en"] as Lang[]) for (const t of EXAMPLE_PROMPTS[lang]) expect(view(t, lang).kind).not.toBe("none");
  });

  it("rejects URLs the pages would not open", () => {
    expect(proposalUrlOk("/kpi/nope", cat)).toBe(false);
    expect(proposalUrlOk("/d/finance/nope", cat)).toBe(false);
    expect(proposalUrlOk("/przewodnik/nope", cat)).toBe(false);
    expect(proposalUrlOk("/explore?i=hicp_annual_rate&geo=XX", cat)).toBe(false); // not in normal form
    expect(proposalUrlOk("https://example.com/kpi/eurpln", cat)).toBe(false);
  });
});
